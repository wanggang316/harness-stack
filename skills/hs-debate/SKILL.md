---
name: hs-debate
description: Runs a multi-agent debate among heterogeneous LLM agents on a single question. Each round is anonymized so participants argue substance, not source. Final output is a synthesized answer plus a claim catalog. Use when a question is ambiguous, contested, or carries enough risk that a single model's first answer is not enough.
---

# Multi-Agent Debate

## Overview

You orchestrate a deliberation in which several LLM agents argue a question across multiple rounds. Each round, every agent reads anonymized statements from the others and revises its position. After the last round, claims from all rounds are aggregated into a catalog and a synthesis pass produces a single coherent answer.

Two operating principles shape the skill:

**Heterogeneity is recommended, not enforced.** A debate among instances of the same model converges quickly because the participants share priors, training data, and failure modes. We strongly suggest the user pick three or more agents that span different model families (Anthropic + OpenAI-compatible + a third), but the skill does not refuse a homogeneous roster — the user's roster is the user's call. The skill surfaces the recommendation at agent-selection time and lets termination be governed by what actually happens in the debate, not by a static rule about who is talking.

**Peers are anonymized.** Stable identifiers like "Claude said" or "GPT-4 said" introduce status effects. A weaker agent will defer to a perceived stronger one rather than defend its position. Every prompt presented to a participant labels the others as `peer-1`, `peer-2`, etc., and the mapping is kept out of the prompt.

**The debate ends when claims stop moving.** Rather than forcing a fixed number of rounds, the skill checks after each round (starting with round 2) whether the new claims meaningfully extend the prior catalog. When 80% or more of a round's claims are paraphrases or specializations of what was already said, the deliberation has converged and the skill proceeds straight to synthesis. The `--rounds` flag is a maximum budget, not a target.

The runtime substrate is the `@hs/llm` package (`packages/hs-llm/`). All LLM I/O goes through its CLI binary; the skill itself does no network work.

## When to Use

- Open-ended technical decisions with non-trivial trade-offs (architecture choices, ambiguous spec interpretation, design reviews).
- Questions where a single model's first answer would be plausible-but-shallow.
- High-stakes calls where you want a written record of the dissent that did not survive deliberation.

**When NOT to use:**

- Questions with a single correct answer that any competent agent will produce on the first try (look up a fact, run a calculation).
- Questions whose answer depends on tools the participants do not have (live database access, etc.).
- Real-time interactive use — a 3-round, 3-agent debate makes ~12 LLM calls and takes several minutes.

## Inputs

The user invokes this skill with at minimum a question. Optional flags:

| Argument | Default | Notes |
|----------|---------|-------|
| `--question <text>` (or first positional) | required | The question to debate. Phrase it sharply — "should we X or Y given Z" beats "thoughts on X". |
| `--agents <a,b,c>` | (interactive) | Comma-separated agent ids from the config. If omitted, you ask the user to pick from the available roster. |
| `--rounds <n>` | `3` | **Maximum** number of rounds. Round 1 is the opening; rounds 2..n are followups. The skill stops earlier than this if claims converge (see Phase 2). |
| `--config <path>` | auto | Path to the hs-llm config file. The hs-llm CLI resolves the path itself: `--config` → `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`. Pass through to every `hs-llm` invocation if you want to pin a specific file. |
| `--out-dir <path>` | `./debate-runs/<timestamp>` | Where the debate state and outputs land. |
| `--synthesis-agent <id>` | first picked | Which agent runs the convergence checks and the final synthesis. If the config has an agent named like `synth_*` or `judge_*`, prefer that. Otherwise use the first selected debate participant. |

Resolve the question first: if the user invoked the skill without one, ask. Without a question there is nothing to debate.

## Process

### Phase 0 — Preflight

The skill will not run if `hs-llm` is not installed or the config is broken. Check both before doing anything else.

**Locate the binary.**

```bash
HS_LLM_BIN="$(command -v hs-llm)"
if [ -z "$HS_LLM_BIN" ] && [ -f "packages/hs-llm/dist/cli.js" ]; then
  HS_LLM_BIN="node $(realpath packages/hs-llm/dist/cli.js)"
fi
if [ -z "$HS_LLM_BIN" ]; then
  # check repo-relative — if you are inside the harness-stack monorepo, build it
  echo "hs-llm not found. From the repo root: pnpm install && pnpm --filter @hs/llm build" >&2
  exit 1
fi
```

If the binary is missing, tell the user what to run and stop. If you are already inside the harness-stack repo and the user agrees, run the install/build yourself — but do not run those commands silently against an unknown working tree.

**Validate the config.** The CLI resolves the config path itself when `--config` is omitted, walking through `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`. Run:

```bash
$HS_LLM_BIN validate-config
```

Three outcomes:

- **Exit 0** — the config parses and every agent reference resolves. The path it used is printed to stdout (e.g. `OK: /home/u/.config/hs-llm/config.json`). Capture it into `$CONFIG` so later phases pin to the same file:

  ```bash
  CONFIG="$($HS_LLM_BIN validate-config | sed -n 's/^OK: //p')"
  ```

- **Exit 3** — no config found anywhere. The error lists every path the binary tried. Offer to bootstrap one with `hs-llm init`, which copies the example config to the user-global default:

  ```bash
  $HS_LLM_BIN init
  ```

  After init, tell the user to set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` (or whichever api providers they kept), then re-run validate-config. Some agents in the starter use api providers; those will need keys before they can be used.

- **Exit 1** — a config exists but is broken (bad shape, unknown provider reference, etc). Surface the error to the user and stop. They fix it; you re-run.

If the user wants to use a non-default location, they can set `$HS_LLM_CONFIG` for the duration of the session, or pass `--config <path>` explicitly to every subsequent command. The skill captures `$CONFIG` once and uses it consistently.

### Phase 1 — Agent selection

Read the config and present the available agents.

```bash
jq -r '
  .agents[] as $a |
  .providers[$a.provider] as $p |
  "\($a.id)\t\($p.type)\t\(
    if $p.type == "api" then $p.family
    elif $p.type == "cli" then $p.cliType
    else $p.type
    end)\t\($a.model)"
' "$CONFIG" | column -t -s $'\t'
```

This gives a table like:

```
mock_a          mock  mock                mock-1
claude_haiku    api   anthropic           claude-haiku-4-5
claude_sonnet   api   anthropic           claude-sonnet-4-5
gpt5            api   openai-compatible   gpt-5
```

Show this to the user. If they passed `--agents` already, parse and proceed. Otherwise, ask which to include and surface a one-line recommendation:

> "I recommend at least three agents and ideally two or more different model families (the third column above). A debate among instances of the same model tends to converge quickly with shared blind spots intact. That said, you choose — the skill will accept whatever roster you pick and rely on the convergence check in Phase 2 to terminate at the right time."

If the user picks a homogeneous roster, accept it and continue. The convergence check after round 2 will likely fire early; that is the correct outcome and the skill should not pre-empt it with a refusal.

Save the selection plus a randomized peer-mapping to the debate directory:

```bash
mkdir -p "$OUT_DIR"
jq -n --arg q "$QUESTION" --argjson agents "$AGENTS_JSON" --arg config "$CONFIG" '
  ($agents | length) as $n |
  ($agents | to_entries | map({key: "peer-\(.key + 1)", value: .value}) | from_entries) as $peers |
  {
    question: $q,
    rounds: '"$ROUNDS"',
    createdAt: now | strftime("%Y-%m-%dT%H:%M:%SZ"),
    config: $config,
    peers: $peers,
    agents: $agents
  }
' > "$OUT_DIR/meta.json"
```

The `agents` array should be shuffled before this — peer-1 should not deterministically be the first agent the user picked. A simple shuffle:

```bash
AGENTS_JSON="$(printf '%s\n' "${AGENT_IDS[@]}" | shuf | jq -R . | jq -s .)"
```

`shuf` is GNU coreutils; on macOS use `gshuf` (from `brew install coreutils`) or fall back to `sort -R`.

**Pick the synthesis agent.** This agent runs both the per-round convergence checks and the final synthesis, so it is decided once at the end of Phase 1. Resolution order:

1. The user's `--synthesis-agent <id>` if provided.
2. An agent in the config whose id starts with `synth_` or `judge_`.
3. The first selected debate participant (alphabetical by agent id).

Record the choice in `meta.json` under `synthesisAgent`. The synthesis agent may also be one of the debate participants; that is acceptable, with the understanding that it carries some bias toward its own claims at synthesis time. The skill notes the choice openly in the final summary.

### Phase 2 — Debate

Run rounds 1..N as a loop. After every round R ≥ 2, run a convergence check (described at the end of this section). If converged, exit the loop early and proceed to Phase 3.

For each round R from 1 to N:

#### Round 1 (opening)

All participants get the same prompt: the opening template with the question substituted in. None of them sees any peer.

1. Render the prompt.

   ```bash
   sed "s|{{QUESTION}}|$QUESTION|" skills/hs-debate/prompts/round-opening.md > "$OUT_DIR/round-1/prompt.txt"
   ```

   `sed` is fine here because the question is a single line. If the question contains characters that would confuse `sed` (slashes, newlines), prefer the `Write` tool with explicit substitution.

2. Fan out. The agent ids come from `meta.json`.

   ```bash
   AGENTS_CSV="$(jq -r '.agents | join(",")' "$OUT_DIR/meta.json")"
   $HS_LLM_BIN invoke-many \
     --config "$CONFIG" \
     --agents "$AGENTS_CSV" \
     --prompt-file "$OUT_DIR/round-1/prompt.txt" \
     --out-dir "$OUT_DIR/round-1/raw" \
     --concurrency "$(jq '.agents | length' "$OUT_DIR/meta.json")"
   ```

3. Translate agent-id files into peer-N files. The mapping is in `meta.json`.

   ```bash
   jq -r '.peers | to_entries[] | "\(.key)\t\(.value)"' "$OUT_DIR/meta.json" |
     while IFS=$'\t' read -r peer agent_id; do
       if [ -f "$OUT_DIR/round-1/raw/$agent_id.json" ]; then
         jq -r .text "$OUT_DIR/round-1/raw/$agent_id.json" > "$OUT_DIR/round-1/$peer.txt"
       else
         # Look at _index.json for the error
         echo "$peer ($agent_id) errored; check $OUT_DIR/round-1/raw/_index.json" >&2
       fi
     done
   ```

   Agents that erred are dropped from this round. Note their absence and continue — the debate remains valid with N-1 participants for that round.

4. Extract claims per peer. Each call needs the peer's statement substituted into the claim-extraction prompt. Build prompts then fan out.

   For each `peer-K` with a non-empty `.txt`:

   - Construct the prompt: take `prompts/claim-extraction.md`, replace `{{STATEMENT}}` with the contents of `$OUT_DIR/round-1/peer-K.txt`. Use the `Write` tool — the statement is multi-line and shell substitution gets fragile.
   - Save to `$OUT_DIR/round-1/peer-K.claim-prompt.txt`.

   Then run extraction in parallel:

   ```bash
   # one invocation per peer; use a strong model for extraction (it's parsing, not generating)
   for peer in $(jq -r '.peers | keys[]' "$OUT_DIR/meta.json"); do
     [ -f "$OUT_DIR/round-1/$peer.txt" ] || continue
     agent_id="$(jq -r ".peers.\"$peer\"" "$OUT_DIR/meta.json")"
     $HS_LLM_BIN invoke \
       --config "$CONFIG" \
       --agent "$agent_id" \
       --prompt-file "$OUT_DIR/round-1/$peer.claim-prompt.txt" \
       --schema-file skills/hs-debate/schemas/claims.schema.json \
       --out "$OUT_DIR/round-1/$peer.claims.json" &
   done
   wait
   ```

   `invoke-many` does not support per-invocation prompts, so this is a parallel-spawn loop. The fanout count is bounded by the number of peers, which is small.

   The output JSON has `parsed.claims` populated. If extraction fails (schema-repair exhausted), the file contains an error and the claims for that peer are missing — record this and continue. Synthesis can run with partial claim coverage.

#### Rounds 2..N (followup)

Each peer gets its own prompt because they need to see *the other* peers' statements (not their own).

For each round R from 2 to N, for each peer P with a prior-round statement:

1. Construct P's prompt:

   - Take `prompts/round-followup.md`.
   - Substitute `{{QUESTION}}` with the question.
   - Substitute `{{YOUR_PREVIOUS}}` with the contents of `$OUT_DIR/round-(R-1)/$P.txt`.
   - Substitute `{{PEER_STATEMENTS}}` with a concatenation of every *other* peer's `$OUT_DIR/round-(R-1)/peer-K.txt`, formatted as:

     ```
     ## peer-1
     <statement>

     ## peer-2
     <statement>
     ```

     (omit P's own peer label)

   - Use the `Write` tool to save to `$OUT_DIR/round-R/$P.prompt.txt`.

2. Invoke each agent against its prompt:

   ```bash
   for peer in $(jq -r '.peers | keys[]' "$OUT_DIR/meta.json"); do
     [ -f "$OUT_DIR/round-$((R-1))/$peer.txt" ] || continue
     agent_id="$(jq -r ".peers.\"$peer\"" "$OUT_DIR/meta.json")"
     $HS_LLM_BIN invoke \
       --config "$CONFIG" \
       --agent "$agent_id" \
       --prompt-file "$OUT_DIR/round-$R/$peer.prompt.txt" \
       --out "$OUT_DIR/round-$R/$peer.raw.json" &
   done
   wait
   ```

3. Pull text out and run claim extraction (same recipe as round 1, with `round-1` swapped for `round-$R`).

If a peer dropped out of round R-1 (no `.txt` file), they are not invited back for round R. The debate proceeds with the remaining peers. If the active peer count drops below 2, abort the round and proceed to synthesis with whatever rounds completed — a one-participant "debate" is not a debate.

#### Convergence check (after every round R ≥ 2)

Once round R's claims are extracted for every active peer, decide whether to run round R+1 or stop. Build two inputs:

- **This round's claims:** flatten every active peer's `round-R/peer-K.claims.json` into a single bullet list of `text` strings.
- **Cumulative prior claims:** the same flattening over rounds 1..R-1.

Render `prompts/convergence-check.md` with these substituted in, save to `$OUT_DIR/round-$R/convergence.prompt.txt`, and run:

```bash
$HS_LLM_BIN invoke \
  --config "$CONFIG" \
  --agent "$SYNTH_AGENT" \
  --prompt-file "$OUT_DIR/round-$R/convergence.prompt.txt" \
  --schema-file skills/hs-debate/schemas/convergence.schema.json \
  --out "$OUT_DIR/round-$R/convergence.json"
```

If `parsed.converged === true`, append the round to `meta.json` as the last completed round, record `terminationReason: "converged"`, skip the remaining rounds, and proceed to Phase 3.

If `parsed.converged === false`, continue to round R+1. After the final round (R = N), record `terminationReason: "rounds-exhausted"` and proceed to Phase 3.

The convergence check itself is a deliberate cost: one extra `hs-llm invoke` per round above the first. The cost is bounded by `--rounds - 1`. Skipping it would force every debate to run the full budget; that is wasteful when participants have clearly settled, and it is also misleading when participants are still moving.

If the convergence agent itself errors (schema-repair exhausted, network failure), do not block the run — fall back to "not converged" and continue. Note the failure in `$OUT_DIR/round-$R/convergence.error` for debugging.

### Phase 3 — Aggregation and synthesis

Build the claim catalog by collecting every claim across every round and counting how many distinct peers raised each.

A pragmatic merge rule: two claims merge if they share ≥ 60% of their non-stopword tokens (a Jaccard-on-words threshold). For a first version, just dump every claim with its peer source and stance, group by peer, and let the synthesis prompt do the merge — the LLM is good at this and a string-similarity merge is brittle.

```bash
# Build a catalog of claims, organized as { peer -> [claim, claim, ...] }, with stance and round.
jq -s '
  reduce .[] as $f ({};
    . + ($f.parsed.claims | map(. + {peer: $f.__peer, round: $f.__round}) as $c |
         {($f.__peer): ((.[$f.__peer] // []) + $c)}))
' $(... build a list of all peer.claims.json with peer and round metadata ...) > "$OUT_DIR/catalog.raw.json"
```

The above is sketch — building the metadata-tagged input list is fiddly in pure jq. Use the `Write` tool to construct `catalog.json` directly: read every `round-R/peer-K.claims.json`, attach `peer` and `round` fields, group as one structure. Pseudocode:

```js
const catalog = {};
for (const r of [1..N]) for (const peer of peers) {
  const file = `${OUT_DIR}/round-${r}/${peer}.claims.json`;
  if (!exists(file)) continue;
  const { parsed: { claims } } = readJson(file);
  catalog[peer] ??= [];
  for (const c of claims) catalog[peer].push({ ...c, round: r });
}
write(`${OUT_DIR}/catalog.json`, catalog);
```

Then construct the synthesis prompt: take `prompts/synthesis.md`, substitute `{{QUESTION}}` and `{{CLAIM_CATALOG}}` (a markdown rendering of `catalog.json` — bullets grouped by peer, with stance and round tags).

Use the synthesis agent already chosen at the end of Phase 1. Run synthesis with the schema:

```bash
$HS_LLM_BIN invoke \
  --config "$CONFIG" \
  --agent "$SYNTH_AGENT" \
  --prompt-file "$OUT_DIR/synthesis.prompt.txt" \
  --schema-file skills/hs-debate/schemas/synthesis.schema.json \
  --out "$OUT_DIR/synthesis.json"
```

### Phase 4 — Output

Render `summary.md` from `synthesis.json` plus `meta.json`. Format:

```markdown
# Debate: <question>

**Headline.** <synthesis.parsed.headline>

**Confidence.** <synthesis.parsed.confidence>

## Rationale

<synthesis.parsed.rationale>

## Majority claims
- <each>

## Minority claims
- <each, or "(none)">

## Open questions
- <each, or "(none)">

---

**Participants:** <N anonymous peers>
**Rounds run:** <R> of <N> (terminated: <converged | rounds-exhausted>)
**Synthesis agent:** <agent id>  *(public, since synthesis was a single voice)*
**Run directory:** <OUT_DIR>
```

Print the path to `summary.md` and the headline to stdout. Done.

## Output

After a successful run:

```
$OUT_DIR/
├─ meta.json                  # question, peers, config, run metadata
├─ round-1/
│  ├─ prompt.txt              # the shared opening prompt
│  ├─ raw/                    # raw hs-llm output, keyed by agent id
│  ├─ peer-1.txt              # peer-1's round-1 statement (anonymized name)
│  ├─ peer-1.claim-prompt.txt # the prompt used for extracting peer-1's claims
│  ├─ peer-1.claims.json      # extracted claims (parsed + raw response)
│  └─ peer-2.* / peer-3.*
├─ round-2/                   # same shape, plus per-peer prompt.txt
│  └─ convergence.json        # convergence judgment that decided whether to run round 3
├─ round-3/                   # only present if round 2 did not converge
│  └─ convergence.json
├─ catalog.json               # all claims across all rounds, grouped by peer
├─ synthesis.prompt.txt
├─ synthesis.json             # parsed + raw synthesis response
└─ summary.md                 # human-readable result
```

`meta.json` is the only place agent ids (the de-anonymizing map) are stored. Treat it like a debug artifact — never feed its contents into a prompt.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Three Sonnets is faster than mixing." | Probably yes, and the convergence check after round 2 will likely fire and cap the cost — but you also lose the variance reduction the skill is for. The skill accepts this roster; you carry the consequence. |
| "Skip claim extraction; just synthesize the raw transcripts." | The claim layer is what lets minority positions survive a majority-vote synthesis. Without it, minority arguments get diluted by their wordier neighbors, and the convergence check has nothing structured to compare. |
| "Skip the convergence check, just always run all the rounds." | One extra `hs-llm invoke` per round above the first is cheaper than running rounds that produce no new claims. The check also surfaces the round at which deliberation actually settled, which is useful information for the summary. |
| "Skip anonymization, the agents are smart enough." | They are smart enough to be sycophantic. Status effects are robust across model sizes. |
| "Use the same agent for all participants and just resample with high temperature." | This produces correlated samples that share blind spots. The convergence check will catch this and terminate the debate after round 2 — which is the right outcome but a misleading one (you spent the cost of a debate to get a weakly-deliberated single-model answer). For decision support without real cross-perspective, use the `hs-decide` skill. |

## Red Flags

- The convergence check fires after round 2 with `novelClaimCount` near zero → the roster is probably too homogeneous. Note this in the summary and recommend the user rerun with a more diverse roster if the question is high-stakes.
- The convergence check never fires across the full `--rounds` budget → participants are still moving at round N. Either the budget was too small or the question is too broad. The summary should flag this as `terminationReason: "rounds-exhausted"` rather than masking it.
- Synthesis confidence is `high` but the claim catalog shows real dissent → the synthesis agent rounded off the disagreement. Re-run with a different `--synthesis-agent` and compare.
- `summary.md` reads like one of the participant statements → synthesis defaulted to its own prior. Re-run with `--synthesis-agent` set to a different participant, or rotate.
- A peer drops out before round 2 (round-1 statement missing or extraction failure) → check `round-1/raw/_index.json` for the underlying error. The debate continues with the surviving peers, but a 2-peer debate from round 1 is fragile.

## Verification

Before declaring the run complete, confirm:

- [ ] `meta.json` exists with `peers`, `agents`, `question`, `synthesisAgent`, and `terminationReason` populated.
- [ ] Every active peer has a `.txt` and `.claims.json` file for every round they participated in.
- [ ] For every round R ≥ 2 that ran, `round-R/convergence.json` exists with a `parsed` block matching the convergence schema.
- [ ] If `terminationReason` is `converged`, the convergence.json from the last completed round has `parsed.converged === true`.
- [ ] `catalog.json` aggregates claims from at least two distinct peers across at least two distinct rounds (or one round, if the debate converged after round 2 with sparse round 2 contributions).
- [ ] `synthesis.json` parses and contains a `parsed` field matching the synthesis schema.
- [ ] `summary.md` renders cleanly and the headline is one sentence.
- [ ] No agent id appears anywhere outside `meta.json` and the per-round `raw/` subdirectories.
