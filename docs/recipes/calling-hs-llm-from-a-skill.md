# Recipe: Calling `hs-llm` from a skill

Skills run in markdown with shell access. To call an LLM from a skill step, write Bash that invokes the `hs-llm` binary and reads its JSON output. The skill provides the config path and agent id; `@hs/llm` handles the provider differences.

## Prerequisites

The skill author owns the config file. A reasonable place for it is `~/.config/hs-llm/config.json` or a project-local `hs-llm.config.json`. The skill instructs the user to set up the file once; the skill itself only references agent ids.

Validate the config before relying on it:

```bash
hs-llm validate-config "$HS_LLM_CONFIG"
```

Exit code 0 means everything resolves; 1 means the user needs to fix something. The skill should fail closed if validation fails.

## Single invocation

The skill writes the prompt to a temp file, then invokes:

```bash
PROMPT_FILE="$(mktemp)"
RESULT_FILE="$(mktemp).json"
cat > "$PROMPT_FILE" <<'EOF'
You are reviewing a pull request. List three concerns.
EOF

hs-llm invoke \
  --config "$HS_LLM_CONFIG" \
  --agent reviewer \
  --prompt-file "$PROMPT_FILE" \
  --out "$RESULT_FILE" \
  --timeout-ms 60000
```

Read the response with `jq`:

```bash
TEXT="$(jq -r .text "$RESULT_FILE")"
LATENCY="$(jq -r .latencyMs "$RESULT_FILE")"
```

If `hs-llm` exits non-zero, the JSON file is not produced; `stderr` carries a structured `error (<kind>): <message>` line the skill can grep for.

## Fan-out (parallel multi-agent)

When a skill samples opinions from several agents, `invoke-many` runs them concurrently and never aborts siblings:

```bash
RESULT_DIR="$(mktemp -d)"

hs-llm invoke-many \
  --config "$HS_LLM_CONFIG" \
  --agents reviewer_a,reviewer_b,reviewer_c \
  --prompt-file "$PROMPT_FILE" \
  --out-dir "$RESULT_DIR" \
  --concurrency 3 \
  --timeout-ms 60000
```

The `--out-dir` produces:

- `$RESULT_DIR/reviewer_a.json` — full response shape per OK agent.
- `$RESULT_DIR/_index.json` — summary with `status: "ok" | "error"`, error kind, and message for each.

Iterate the index to handle partial failures:

```bash
jq -c '.results[]' "$RESULT_DIR/_index.json" | while read -r row; do
  agent="$(echo "$row" | jq -r .agentId)"
  status="$(echo "$row" | jq -r .status)"
  if [ "$status" = "ok" ]; then
    file="$(echo "$row" | jq -r .file)"
    text="$(jq -r .text "$file")"
    # ... aggregate, vote, summarize, etc.
  else
    kind="$(echo "$row" | jq -r .errorKind)"
    msg="$(echo "$row" | jq -r .message)"
    echo "skipping $agent ($kind): $msg" >&2
  fi
done
```

The skill should decide its quorum policy explicitly: how many `ok` responses are enough to proceed, and what to do when a critical agent errors. `@hs/llm` does not make that decision.

## Schema-constrained output

When the skill needs structured JSON back from the LLM, ship a JSON Schema next to the prompt:

```bash
hs-llm invoke \
  --config "$HS_LLM_CONFIG" \
  --agent reviewer \
  --prompt-file "$PROMPT_FILE" \
  --schema-file ./expected-output.schema.json \
  --out "$RESULT_FILE"

PARSED="$(jq .parsed "$RESULT_FILE")"
```

If the LLM's first response does not parse as JSON or fails validation, `hs-llm` appends a repair hint and retries up to 2 times. After exhaustion, it exits 2 with the last raw output preserved in stderr. Two repairs strikes a balance between cost and recovery — increase only when the schema is large and the model is small.

## Error handling pattern

```bash
if ! hs-llm invoke --config "$HS_LLM_CONFIG" --agent X --prompt "..." --out "$RESULT_FILE" 2> "$ERR_FILE"; then
  rc=$?
  case $rc in
    1) echo "config error — ask the user to run validate-config" >&2; exit 1 ;;
    2) echo "invocation failed: $(cat "$ERR_FILE")" >&2 ; exit 1 ;;
    3) echo "skill bug: $(cat "$ERR_FILE")" >&2 ; exit 1 ;;
    *) echo "unexpected exit $rc" >&2 ; exit 1 ;;
  esac
fi
```

Skill authors can choose to retry transient errors at the skill layer too — `hs-llm` only retries within a single invocation. A skill that fans out across many calls may want a separate budget for coordinator-level retries.

## What `@hs/llm` does NOT do

- It does not pick which agents to invoke. The skill chooses; `--agents` is a CSV the skill controls.
- It does not aggregate or vote across responses. A skill that wants consensus reads the per-agent JSON and decides for itself.
- It does not persist conversations. Multi-turn flows are constructed by the skill by appending prior assistant messages to the next prompt.
- It does not stream. `invoke` returns when the model finishes; live streaming is out of scope.
