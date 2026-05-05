---
name: hs-decide
description: Runs a parallel multi-agent decision pass on a single question. Each agent answers independently with a structured recommendation; a synthesis pass merges their recommendations into a final decision with confidence and any minority positions surfaced. Use when you want a robust answer to a one-shot decision with explicit dissent tracking, but do not need the back-and-forth of a multi-round debate.
---

# Multi-Agent Decision Support

## Overview

You orchestrate a single-round parallel sampling across several LLM agents. Each agent answers the question independently — none of them sees what the others wrote. Their structured recommendations are then handed to a synthesis agent which produces a final decision, a confidence level, and a list of any minority positions that did not survive the majority.

Three operating principles shape the skill:

**Cross-perspective is recommended, not enforced.** A "decision" produced by three instances of the same model converges to whatever that model already believed; you spend three calls to get one signal. We strongly suggest the user pick three or more agents that span different model families. The skill surfaces this recommendation at agent-selection time and accepts whatever the user chooses.

**Independence between agents.** Each advisor writes without seeing the others. This is the core variance-reduction mechanism — correlated samples are worth less than independent ones, and even subtle peer awareness biases later answers toward the first one written.

**Synthesis sees anonymized peers.** When the synthesis agent aggregates recommendations, it sees them labeled `peer-1`, `peer-2`, etc. Stable identifiers like "Claude said" or "GPT-5 said" introduce status effects at synthesis time too — the agent unconsciously upweights advisors it perceives as stronger. Anonymization at synthesis is the same defense that hs-debate uses between rounds.

The runtime substrate is the `@hs/llm` package (`packages/hs-llm/`). All LLM I/O goes through its CLI binary; the skill itself does no network work.

## When to Use

- One-shot decisions where you want a single concrete answer with confidence-aware dissent (e.g. architecture picks, library selection, operational calls).
- Cases where you have a clear set of options to choose from, or a question that admits a discrete recommendation.
- Situations where the cost of being wrong is real but the cost of running 3-5 LLM calls is acceptable.

**When NOT to use:**

- The question is open-ended and you want to surface and resolve disagreement through interaction. Use a multi-round debate skill instead.
- The question has a single deterministic answer that any competent agent would produce on the first try. One call is enough.
- The decision needs tools (live database, fresh search, code execution) the agents do not have access to.

## Inputs

The user invokes this skill with at minimum a question. Optional flags:

| Argument | Default | Notes |
|----------|---------|-------|
| `--question <text>` (or first positional) | required | The question to decide on. Phrase it as a decision: "should we use X or Y for Z" beats "thoughts on X". |
| `--options <a,b,c>` | (open-ended) | Constrain advisors to pick exactly one of the supplied options. Leave empty for free-form recommendations. |
| `--agents <a,b,c>` | (interactive) | Comma-separated agent ids. If omitted, you ask the user to pick from the available roster. |
| `--config <path>` | auto | Path to the hs-llm config file. The hs-llm CLI resolves the path itself: `--config` → `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`. Pass through to every `hs-llm` invocation if you want to pin a specific file. |
| `--out-dir <path>` | `./decision-runs/<timestamp>` | Where the run state and outputs land. |
| `--synthesis-agent <id>` | first picked | Which agent runs the final synthesis. If the config has an agent named like `synth_*` or `judge_*`, prefer that. Otherwise use the first selected advisor (alphabetical by agent id). |

Resolve the question first. If the user invoked the skill without one, ask. Without a question there is nothing to decide.

## Process

### Phase 0 — Preflight

Do not run if `hs-llm` is missing or the config is broken. Check both before doing anything else.

**Locate the binary.**

```bash
HS_LLM_BIN="$(command -v hs-llm)"
if [ -z "$HS_LLM_BIN" ] && [ -f "packages/hs-llm/dist/cli.js" ]; then
  HS_LLM_BIN="node $(realpath packages/hs-llm/dist/cli.js)"
fi
if [ -z "$HS_LLM_BIN" ]; then
  echo "hs-llm not found. From the repo root: pnpm install && pnpm --filter @hs/llm build" >&2
  exit 1
fi
```

If the binary is missing, surface the build command and stop. If you are inside the harness-stack monorepo and the user agrees, run the install/build yourself — but do not run those commands silently against an unknown working tree.

**Validate the config.** The CLI resolves the config path itself when `--config` is omitted, walking through `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`. Run:

```bash
$HS_LLM_BIN validate-config
```

Three outcomes:

- **Exit 0** — the config parses and every agent reference resolves. The path it used is printed to stdout (e.g. `OK: /home/u/.config/hs-llm/config.json`). Capture it into `$CONFIG` for later phases:

  ```bash
  CONFIG="$($HS_LLM_BIN validate-config | sed -n 's/^OK: //p')"
  ```

- **Exit 3** — no config found anywhere. The error lists every path the binary tried. Offer to bootstrap one with `hs-llm init`, which copies the example config to the user-global default:

  ```bash
  $HS_LLM_BIN init
  ```

  After init, tell the user to set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` (or whichever api providers they kept), then re-run validate-config.

- **Exit 1** — a config exists but is broken (bad shape, unknown provider reference, etc). Surface the error to the user and stop. They fix it; you re-run.

If the user wants to use a non-default location, they can set `$HS_LLM_CONFIG` for the session or pass `--config <path>` explicitly to every subsequent command.

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

This produces a table:

```
mock_a          mock  mock                mock-1
claude_haiku    api   anthropic           claude-haiku-4-5
claude_sonnet   api   anthropic           claude-sonnet-4-5
gpt5            api   openai-compatible   gpt-5
```

Show this to the user. If they passed `--agents` already, parse and proceed. Otherwise, ask which to include with a one-line recommendation:

> "I recommend at least three agents and ideally two or more different model families (the third column above). Same-family advisors tend to agree for the same reasons and produce a less robust signal. That said, you choose — the skill will accept whatever roster you pick."

Accept the user's selection without further gating. Same-family rosters are allowed; the synthesis output simply reflects the lower information content (typically `confidence: high` with no minority positions, which is the honest signal that "all advisors said the same thing — for whatever that's worth").

**Pick the synthesis agent.** Resolution order:

1. The user's `--synthesis-agent <id>` if provided.
2. An agent in the config whose id starts with `synth_` or `judge_`.
3. The first selected advisor (alphabetical by agent id).

Save the selection plus a randomized peer-mapping to the run directory:

```bash
mkdir -p "$OUT_DIR"
AGENTS_JSON="$(printf '%s\n' "${AGENT_IDS[@]}" | shuf | jq -R . | jq -s .)"
jq -n --arg q "$QUESTION" --argjson agents "$AGENTS_JSON" \
      --arg config "$CONFIG" --arg synth "$SYNTH_AGENT" \
      --argjson options "${OPTIONS_JSON:-null}" '
  ($agents | to_entries | map({key: "peer-\(.key + 1)", value: .value}) | from_entries) as $peers |
  {
    question: $q,
    options: $options,
    createdAt: now | strftime("%Y-%m-%dT%H:%M:%SZ"),
    config: $config,
    synthesisAgent: $synth,
    peers: $peers,
    agents: $agents
  }
' > "$OUT_DIR/meta.json"
```

The `agents` array is shuffled before this so peer-1 does not deterministically map to the first agent the user picked. `shuf` is GNU coreutils; on macOS use `gshuf` (from `brew install coreutils`) or fall back to `sort -R`.

### Phase 2 — Parallel sampling

All advisors get the same prompt: the recommendation template with the question (and optional options block) substituted in.

1. Build the options block. If the user passed `--options A,B,C`:

   ```
   # Constrained options

   You must pick exactly one of the following, verbatim. Do not propose alternatives outside this list.

   - A
   - B
   - C
   ```

   If no options were supplied, the options block is empty.

2. Render the prompt. Substitute `{{QUESTION}}` and `{{OPTIONS_BLOCK}}` into `prompts/recommendation.md`. Use the `Write` tool — the question and options can contain characters that confuse `sed`. Save to `$OUT_DIR/recommendation.prompt.txt`.

3. Fan out:

   ```bash
   AGENTS_CSV="$(jq -r '.agents | join(",")' "$OUT_DIR/meta.json")"
   $HS_LLM_BIN invoke-many \
     --config "$CONFIG" \
     --agents "$AGENTS_CSV" \
     --prompt-file "$OUT_DIR/recommendation.prompt.txt" \
     --schema-file skills/hs-decide/schemas/recommendation.schema.json \
     --out-dir "$OUT_DIR/raw" \
     --concurrency "$(jq '.agents | length' "$OUT_DIR/meta.json")"
   ```

   The schema constrains every advisor to return `{recommendation, rationale, confidence, alternativesConsidered}`. Schema-repair retries are handled inside `hs-llm` — at most two repair attempts before an advisor is dropped. Dropped advisors appear in `raw/_index.json` with `status: "error"`.

4. Translate per-agent files to per-peer files (anonymization for synthesis):

   ```bash
   jq -r '.peers | to_entries[] | "\(.key)\t\(.value)"' "$OUT_DIR/meta.json" |
     while IFS=$'\t' read -r peer agent_id; do
       if [ -f "$OUT_DIR/raw/$agent_id.json" ]; then
         jq '.parsed' "$OUT_DIR/raw/$agent_id.json" > "$OUT_DIR/$peer.json"
       else
         echo "$peer ($agent_id) errored or returned no usable recommendation; check $OUT_DIR/raw/_index.json" >&2
       fi
     done
   ```

   Advisors that erred are dropped — synthesis runs on whoever returned a usable recommendation. If fewer than two peers survive, abort the run with a clear error: a synthesis from a single advisor is just that advisor's answer with extra steps.

### Phase 3 — Synthesis

Build the synthesis prompt. Concatenate every active peer's recommendation into a markdown rendering and substitute it for `{{RECOMMENDATIONS}}`. The format below is a suggestion — what matters is that the synthesis agent sees recommendation, confidence, rationale, and alternatives, with peers anonymized:

```markdown
## peer-1

**Recommendation:** <text>
**Confidence:** <low|medium|high>
**Rationale:** <text>
**Alternatives considered:**
- <option>: <whyNot>
- <option>: <whyNot>

## peer-2
...
```

Substitute `{{QUESTION}}` and the same `{{OPTIONS_BLOCK}}` from Phase 2 into `prompts/synthesis.md` along with `{{RECOMMENDATIONS}}`. Save to `$OUT_DIR/synthesis.prompt.txt`.

Run synthesis:

```bash
$HS_LLM_BIN invoke \
  --config "$CONFIG" \
  --agent "$(jq -r .synthesisAgent "$OUT_DIR/meta.json")" \
  --prompt-file "$OUT_DIR/synthesis.prompt.txt" \
  --schema-file skills/hs-decide/schemas/synthesis.schema.json \
  --out "$OUT_DIR/synthesis.json"
```

The output's `parsed` field carries the structured decision: `decision`, `rationale`, `support: {agreed, total}`, `confidence`, `minorityPositions`, `uncertainties`.

### Phase 4 — Output

Render `summary.md` from `synthesis.json` and `meta.json`. Format:

```markdown
# Decision: <question>

**Decision.** <synthesis.parsed.decision>

**Confidence.** <confidence> (<agreed>/<total> advisors aligned)

## Rationale

<synthesis.parsed.rationale>

## Minority positions

- **<position>** — <rationale>

(omit the section entirely if there were no minority positions)

## Open uncertainties

- <each>

(omit if empty)

---

**Advisors:** <N anonymous peers>
**Synthesis agent:** <agent id>  *(public, since synthesis was a single voice)*
**Run directory:** <OUT_DIR>
```

Print the path to `summary.md` and the headline decision to stdout. Done.

## Output

After a successful run:

```
$OUT_DIR/
├─ meta.json                  # question, options, peers, synthesisAgent, run metadata
├─ recommendation.prompt.txt  # the shared advisor prompt (after substitution)
├─ raw/                       # raw hs-llm invoke-many output, keyed by agent id
│  ├─ <agent>.json
│  └─ _index.json
├─ peer-1.json                # peer-1's parsed recommendation (anonymized name)
├─ peer-2.json
├─ peer-3.json
├─ synthesis.prompt.txt
├─ synthesis.json             # parsed + raw final synthesis
└─ summary.md                 # human-readable result
```

`meta.json` is the only place the agent-id-to-peer mapping is stored. Treat it like a debug artifact — never feed its contents into a prompt.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Three Sonnets is faster than mixing." | Yes, and they will agree for the same reasons. The signal you get is "this one model is confident", which you could have gotten from a single call. The skill accepts the roster but the resulting `confidence: high` is overstated. |
| "Skip the synthesis step, just print the recommendations." | The synthesis pass merges semantically equivalent recommendations into one, which is what `support.agreed` requires. Without it, three rephrasings of the same answer look like three independent answers. |
| "Skip the schema, just have the agents return free text." | Agreement counting requires structured output. Free text means every recommendation is its own bucket and the skill loses the variance-reduction it exists to provide. |
| "Skip anonymization at synthesis — the final agent is smart enough." | It is smart enough to round answers toward the perceived stronger advisor. Status effects are robust across model sizes. |
| "Use this skill for open-ended questions instead of a debate skill." | This skill collects independent opinions and votes. It does not let advisors react to one another. For questions where the disagreement itself carries information, use a multi-round debate skill instead. |

## Red Flags

- `support.agreed` equals `support.total` and `confidence` is `high` but the question is non-trivial → the roster is probably too homogeneous. Re-run with at least one agent from a different family.
- Every advisor returned `confidence: low` → the question is under-specified. The synthesis will downstream that low confidence; resolve the ambiguity at the question layer rather than re-running with the same prompt.
- Two or more advisors errored out → check `raw/_index.json` for the underlying error. A common cause is missing api keys for one of the api providers in the roster; the skill does not gate on this in Phase 0 because not every selected agent uses every key.
- `summary.md`'s `decision` is one of the participants' verbatim recommendations → synthesis defaulted to its own prior. Re-run with `--synthesis-agent` set to a non-participant if your config has one.
- The minority position is concrete and well-reasoned but the majority view dominates → consider escalating to a multi-round debate; that is the regime where iteration adds information.

## Verification

Before declaring the run complete, confirm:

- [ ] `meta.json` exists with `question`, `peers`, `agents`, and `synthesisAgent` populated.
- [ ] At least two `peer-K.json` files exist with parsed recommendations.
- [ ] `synthesis.json` parses and contains a `parsed` field matching the synthesis schema.
- [ ] `synthesis.parsed.support.total` equals the number of `peer-K.json` files (advisors who returned a usable recommendation).
- [ ] `summary.md` renders cleanly and the headline decision is one sentence.
- [ ] If `--options` was supplied, the headline decision is one of those options verbatim.
- [ ] No agent id appears anywhere outside `meta.json` and the per-run `raw/` subdirectory.
