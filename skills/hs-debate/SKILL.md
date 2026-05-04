---
name: hs-debate
description: Runs a multi-agent debate among heterogeneous LLM agents on a single question. Each round is anonymized so participants argue substance, not source. Final output is a synthesized answer plus a claim catalog. Use when a question is ambiguous, contested, or carries enough risk that a single model's first answer is not enough.
---

# Multi-Agent Debate

## Overview

You orchestrate a deliberation in which several LLM agents argue a question across multiple rounds. Each round, every agent reads anonymized statements from the others and revises its position. After the last round, claims from all rounds are aggregated into a catalog and a synthesis pass produces a single coherent answer.

Two design assumptions matter and you must enforce them:

**Heterogeneity is not optional.** A debate among instances of the same model collapses to consensus quickly because the participants share priors, training data, and failure modes. The only way disagreement uncovers blind spots is if the participants disagree for genuine reasons. The skill rejects a roster that lacks at least two distinct model families unless the user explicitly opts out.

**Peers are anonymized.** Stable identifiers like "Claude said" or "GPT-4 said" introduce status effects. A weaker agent will defer to a perceived stronger one rather than defend its position. Every prompt presented to a participant labels the others as `peer-1`, `peer-2`, etc., and the mapping is kept out of the prompt.

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
| `--rounds <n>` | `3` | Number of rounds total (round 1 = opening, round 2..n = followups). |
| `--config <path>` | auto | Path to the hs-llm config file. Auto-resolution order: `--config` → `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`. |
| `--out-dir <path>` | `./debate-runs/<timestamp>` | Where the debate state and outputs land. |
| `--allow-homogeneous` | off | Skip the heterogeneity check. Use only when you know what you are giving up. |

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

**Locate the config.** Try the four sources in order. If none exists, ask the user where they would like the config to live (typical answers: `./hs-llm.config.json` for project-scoped, `~/.config/hs-llm/config.json` for user-scoped). Then offer to copy the starter template:

```bash
mkdir -p "$(dirname "$CONFIG")"
cp skills/hs-debate/templates/starter-config.json "$CONFIG"
```

The starter has three mock agents (so the smoke path works without any keys) plus commented templates for Anthropic and OpenAI-compatible providers. Tell the user which environment variables the api providers expect (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.) — they need to be set before any api agent will work.

**Validate.**

```bash
$HS_LLM_BIN validate-config "$CONFIG"
```

Exit 0 means the config parses and every agent reference resolves. Anything else is a config error — surface the message to the user and stop. They fix it; you re-run.

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

Show this to the user. If they passed `--agents` already, parse and proceed. Otherwise, ask which to include. Recommend at least three; recommend that the picks span at least two different "family" or "cliType" values (the third column).

**Heterogeneity audit.** Compute the family signature for each selected agent:

```
signature(api)  = provider.family + ":" + agent.model    # e.g. "anthropic:claude-haiku-4-5"
signature(cli)  = "cli:" + provider.cliType
signature(sdk)  = "sdk:" + provider.adapter
signature(mock) = "mock:" + agent.id
```

The roster is heterogeneous if the set of signatures has cardinality ≥ 2 across selected agents. If not, refuse and explain why:

> "All selected agents share the same model family (`anthropic:claude-sonnet-4-5`). A debate among instances of the same model collapses to consensus and reproduces shared blind spots. Pick at least one agent from a different family (e.g. `gpt5`), or pass `--allow-homogeneous` if you accept this trade-off."

If the user passed `--allow-homogeneous`, log a warning and continue.

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

### Phase 2 — Debate

For each round 1..N:

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

Pick a synthesis agent. Two reasonable choices:

- **One of the participants.** Cheaper, but the chosen model has natural bias toward its own claims.
- **A separate "synthesizer" agent in the config.** Cleaner. If the user has one, use it. Otherwise pick the first participant alphabetically and note the choice in `meta.json`.

Run synthesis with the schema:

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
**Rounds:** <N>
**Synthesis agent:** <peer-K>  *(public, since synthesis was a single voice)*
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
├─ round-3/
├─ catalog.json               # all claims across all rounds, grouped by peer
├─ synthesis.prompt.txt
├─ synthesis.json             # parsed + raw synthesis response
└─ summary.md                 # human-readable result
```

`meta.json` is the only place agent ids (the de-anonymizing map) are stored. Treat it like a debug artifact — never feed its contents into a prompt.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Three Sonnets is faster than mixing." | Yes, and they will agree on the same wrong answer. The whole point is variance reduction, not speed. |
| "Skip claim extraction; just synthesize the raw transcripts." | The claim layer is what lets minority positions survive a majority-vote synthesis. Without it, minority arguments get diluted by their wordier neighbors. |
| "Two rounds is enough." | Round 2 is when participants first see disagreement. Round 3 is when they react to the *reaction*. Stopping at 2 captures argument but not refinement. |
| "Skip anonymization, the agents are smart enough." | They are smart enough to be sycophantic. Status effects are robust across model sizes. |
| "Use the same agent for all participants and just resample with high temperature." | Self-MoA works for *decision support* (parallel sampling for a single answer); it does not produce real disagreement, which is what debate is for. Use the `hs-decide` skill for the parallel-sampling pattern. |

## Red Flags

- A run completes but every peer's claims look near-identical → heterogeneity check passed but the agents are still too similar in practice. Try a wider mix (cli + api, or different api families).
- Synthesis confidence is `high` but the catalog shows real dissent → synthesis agent is rounding off the disagreement. Re-run synthesis with a different agent and compare.
- `summary.md` reads like one of the participant statements → synthesis defaulted to its own prior. Re-run with `--synthesis-agent` set to a different participant, or rotate.
- Round R produces near-zero new claims → debate has converged. Stopping early at R-1 would have been fine. Note for next time; do not retroactively shorten the recorded run.

## Verification

Before declaring the run complete, confirm:

- [ ] `meta.json` exists with `peers`, `agents`, and `question` populated.
- [ ] Every active peer has a `.txt` and `.claims.json` file for every round they participated in.
- [ ] `catalog.json` aggregates claims from at least two distinct peers across at least two distinct rounds.
- [ ] `synthesis.json` parses and contains a `parsed` field matching the schema.
- [ ] `summary.md` renders cleanly and the headline is one sentence.
- [ ] No agent id appears anywhere outside `meta.json` and the per-round `raw/` subdirectories.
