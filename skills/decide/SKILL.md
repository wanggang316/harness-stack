---
name: decide
description: 在单个问题上跑一轮并行多 agent 决策。每个 agent 独立作答，给出结构化的 recommendation；再由一道 synthesis 把它们的 recommendation 合并成最终决策，附带 confidence 以及浮现出来的 minority position。当你想为一次性决策拿到稳健答案、并显式追踪异议，但又不需要多轮 debate 的来回拉锯时使用。
---

# name：多 Agent 决策支持

## Overview

你编排的是跨若干 LLM agent 的单轮并行采样。每个 agent 独立作答——谁都看不到别人写了什么。随后它们的结构化 recommendation 交给一个 synthesis agent，由它产出最终决策、一个 confidence 等级，以及一份没能熬过多数派的 minority position 清单。

三条运行原则塑造了本技能：

**跨视角是推荐项，而非强制项。** 由同一个模型的三个实例产出的「决策」会收敛到该模型本就相信的东西；你花了三次调用却只换来一份信号。我们强烈建议用户选三个或更多、跨越不同 model family 的 agent。本技能会在选 agent 时把这条建议摆出来，但接受用户的任意选择。

**agent 之间相互独立。** 每位顾问作答时都看不到其他人。这是降方差的核心机制——相关样本的价值不如独立样本，哪怕只是隐约觉察到同侪的存在，也会让后写的答案偏向最先写下的那个。

**synthesis 看到的是 anonymized peer。** 当 synthesis agent 聚合各份 recommendation 时，它看到的标签是 `peer-1`、`peer-2` 等。像「Claude 说」「GPT-5 说」这类稳定标识，会在 synthesis 阶段同样引入地位效应——agent 会无意识地给它认为更强的顾问加权。synthesis 阶段的匿名化，与 harness-stack:debate 在轮次之间所用的防护是同一招。

运行时基座是 `@hs/llm` 包（`packages/hs-llm/`）。所有 LLM I/O 都走它的 CLI 二进制；技能本身不做任何网络工作。

## When to Use

- 一次性决策，你想拿到单个具体答案并带上 confidence 感知的异议（例如架构选型、库选择、运维抉择）。
- 你有一组清晰可选项要从中挑选，或问题本身允许给出离散的 recommendation。
- 选错的代价是实打实的，但跑 3-5 次 LLM 调用的成本可以接受。

**何时不要用：**

- 问题是开放式的，你想通过交互来浮现并消解分歧。改用多轮 debate 技能。
- 问题有唯一确定答案，任何称职的 agent 第一次就能给出。一次调用足矣。
- 决策需要 agent 无权访问的工具（活数据库、新鲜搜索、代码执行）。

## Inputs

用户调用本技能时至少要给一个问题。可选 flag：

| Argument | Default | Notes |
|----------|---------|-------|
| `--question <text>` (or first positional) | required | 要决策的问题。把它表述成一个决策：「should we use X or Y for Z」胜过「thoughts on X」。 |
| `--options <a,b,c>` | (open-ended) | 约束顾问只能从所给选项里恰好挑一个。留空则为自由形式的 recommendation。 |
| `--agents <a,b,c>` | (interactive) | 逗号分隔的 agent id。省略时，你请用户从可用名册里挑。 |
| `--config <path>` | auto | hs-llm 配置文件路径。hs-llm CLI 自行解析路径：`--config` → `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`。若想钉死某个具体文件，就在每次 `hs-llm` 调用时透传它。 |
| `--out-dir <path>` | `./decision-runs/<timestamp>` | run 状态与产物的落地处。 |
| `--synthesis-agent <id>` | first picked | 由哪个 agent 跑最终 synthesis。若配置里有名字形如 `synth_*` 或 `judge_*` 的 agent，优先用它。否则用首位入选顾问（按 agent id 字母序）。 |

先把问题敲定。若用户调用技能时没给，就问。没有问题就无从决策。

## Process

### Phase 0 — Preflight

若 `hs-llm` 缺失或配置损坏，不要往下跑。动手做任何事之前先把两者都查一遍。

**定位二进制。**

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

若二进制缺失，把构建命令摆出来并停下。若你身处 harness-stack monorepo 内且用户同意，就自己跑安装/构建——但不要对一棵未知的工作树静默执行这些命令。

**校验配置。** 省略 `--config` 时，CLI 自行解析配置路径，依次走 `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`。运行：

```bash
$HS_LLM_BIN validate-config
```

三种结局：

- **Exit 0** — 配置可解析，且每个 agent 引用都能解析到位。它实际使用的路径会打到 stdout（例如 `OK: /home/u/.config/hs-llm/config.json`）。把它捕获进 `$CONFIG` 供后续阶段使用：

  ```bash
  CONFIG="$($HS_LLM_BIN validate-config | sed -n 's/^OK: //p')"
  ```

- **Exit 3** — 哪儿都没找到配置。错误信息会列出二进制尝试过的每条路径。提议用 `hs-llm init` 引导一份，它会把示例配置拷到用户全局默认位置：

  ```bash
  $HS_LLM_BIN init
  ```

  init 之后，告诉用户去设 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`（或他们保留的那些 api provider），然后重跑 validate-config。

- **Exit 1** — 配置存在但损坏（结构有误、provider 引用未知等）。把错误摆给用户并停下。由他们修；你重跑。

若用户想用非默认位置，可在本会话设 `$HS_LLM_CONFIG`，或对之后每条命令都显式传 `--config <path>`。

### Phase 1 — Agent selection

读配置，把可用 agent 呈现出来。

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

这会生成一张表：

```
mock_a          mock  mock                mock-1
claude_haiku    api   anthropic           claude-haiku-4-5
claude_sonnet   api   anthropic           claude-sonnet-4-5
gpt5            api   openai-compatible   gpt-5
```

把它给用户看。若他们已经传了 `--agents`，就解析后继续。否则，附一句建议问他们要纳入哪些：

> "我建议至少三个 agent，最好跨两个或更多不同的 model family（上面第三列）。同 family 的顾问往往因为同样的原因达成一致，给出的信号不够稳健。话说回来，由你定——技能会接受你挑的任意名册。"

接受用户的选择，不做进一步设卡。允许同 family 的名册；synthesis 输出只是如实反映其较低的信息量（通常是 `confidence: high` 且无 minority position，这正是「所有顾问说了同一件事——至于这值多少另说」的诚实信号）。

**挑选 synthesis agent。** 解析顺序：

1. 用户提供的 `--synthesis-agent <id>`（若有）。
2. 配置里 id 以 `synth_` 或 `judge_` 开头的 agent。
3. 首位入选顾问（按 agent id 字母序）。

把选择连同一份随机化的 peer 映射存进 run 目录：

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

`agents` 数组在此之前已被打乱，这样 peer-1 就不会确定性地映射到用户最先挑的那个 agent。`shuf` 来自 GNU coreutils；在 macOS 上用 `gshuf`（来自 `brew install coreutils`），或退回到 `sort -R`。

### Phase 2 — Parallel sampling

所有顾问拿到同一个 prompt：把问题（及可选的 options 块）代入 recommendation 模板。

1. 构造 options 块。若用户传了 `--options A,B,C`：

   ```
   # Constrained options

   You must pick exactly one of the following, verbatim. Do not propose alternatives outside this list.

   - A
   - B
   - C
   ```

   若未提供任何选项，options 块为空。

2. 渲染 prompt。把 `{{QUESTION}}` 和 `{{OPTIONS_BLOCK}}` 代入 `prompts/recommendation.md`。用 `Write` 工具——问题和选项里可能含有会扰乱 `sed` 的字符。存到 `$OUT_DIR/recommendation.prompt.txt`。

3. 扇出：

   ```bash
   AGENTS_CSV="$(jq -r '.agents | join(",")' "$OUT_DIR/meta.json")"
   $HS_LLM_BIN invoke-many \
     --config "$CONFIG" \
     --agents "$AGENTS_CSV" \
     --prompt-file "$OUT_DIR/recommendation.prompt.txt" \
     --schema-file skills/decide/schemas/recommendation.schema.json \
     --out-dir "$OUT_DIR/raw" \
     --concurrency "$(jq '.agents | length' "$OUT_DIR/meta.json")"
   ```

   该 schema 约束每位顾问返回 `{recommendation, rationale, confidence, alternativesConsidered}`。Schema 修复重试由 `hs-llm` 内部处理——一位顾问被丢弃前最多两次修复尝试。被丢弃的顾问在 `raw/_index.json` 里以 `status: "error"` 出现。

4. 把按 agent 的文件转成按 peer 的文件（供 synthesis 用的匿名化）：

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

   出错的顾问被丢弃——synthesis 只在那些返回了可用 recommendation 的顾问上运行。若存活的 peer 少于两个，以一条清晰错误中止本次 run：来自单个顾问的 synthesis，不过是那位顾问的答案外加几道工序。

### Phase 3 — Synthesis

构造 synthesis prompt。把每个活跃 peer 的 recommendation 拼成一段 markdown 渲染，代入 `{{RECOMMENDATIONS}}`。下面的格式只是建议——要紧的是让 synthesis agent 看到 recommendation、confidence、rationale 和 alternatives，且 peer 被匿名化：

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

把 `{{QUESTION}}` 和 Phase 2 里用过的同一个 `{{OPTIONS_BLOCK}}`，连同 `{{RECOMMENDATIONS}}` 一起代入 `prompts/synthesis.md`。存到 `$OUT_DIR/synthesis.prompt.txt`。

运行 synthesis：

```bash
$HS_LLM_BIN invoke \
  --config "$CONFIG" \
  --agent "$(jq -r .synthesisAgent "$OUT_DIR/meta.json")" \
  --prompt-file "$OUT_DIR/synthesis.prompt.txt" \
  --schema-file skills/decide/schemas/synthesis.schema.json \
  --out "$OUT_DIR/synthesis.json"
```

输出的 `parsed` 字段携带结构化决策：`decision`、`rationale`、`support: {agreed, total}`、`confidence`、`minorityPositions`、`uncertainties`。

### Phase 4 — Output

从 `synthesis.json` 和 `meta.json` 渲染 `summary.md`。格式：

```markdown
# Decision: <question>

**Decision.** <synthesis.parsed.decision>

**Confidence.** <confidence> (<agreed>/<total> advisors aligned)

## Rationale

<synthesis.parsed.rationale>

## Minority positions

- **<position>** — <rationale>

(若无 minority position，整节略去)

## Open uncertainties

- <each>

(若为空则略去)

---

**Advisors:** <N anonymous peers>
**Synthesis agent:** <agent id>  *(公开，因为 synthesis 出自单一声音)*
**Run directory:** <OUT_DIR>
```

把 `summary.md` 的路径和首要决策打到 stdout。完成。

## Output

一次成功的 run 之后：

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

`meta.json` 是唯一存放 agent-id 到 peer 映射的地方。把它当作调试产物看待——绝不要把它的内容喂进 prompt。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「三个 Sonnet 比混搭更快。」 | 是更快，而且它们会因为同样的原因达成一致。你拿到的信号是「这一个模型很自信」，单次调用就能得到。技能接受这个名册，但由此得出的 `confidence: high` 被高估了。 |
| 「跳过 synthesis 这步，直接把各份 recommendation 打出来。」 | synthesis 这道会把语义等价的 recommendation 合并成一份，而这正是 `support.agreed` 所要求的。没有它，同一答案的三种改写看起来就像三份独立答案。 |
| 「跳过 schema，让 agent 返回自由文本就行。」 | 一致性计数需要结构化输出。自由文本意味着每份 recommendation 自成一桶，技能也就丢掉了它赖以存在的降方差能力。 |
| 「synthesis 阶段跳过匿名化——最终那个 agent 够聪明。」 | 它聪明到会把答案往它认为更强的那位顾问那边靠。地位效应在各种模型尺寸上都稳健存在。 |
| 「开放式问题就用这个技能，别用 debate 技能。」 | 本技能收集的是独立意见并投票，它不让顾问相互回应。对于分歧本身就携带信息的问题，改用多轮 debate 技能。 |

## Red Flags

- `support.agreed` 等于 `support.total` 且 `confidence` 为 `high`，但问题并不平凡 → 名册多半太同质了。至少换一个来自不同 family 的 agent 重跑。
- 每位顾问都返回 `confidence: low` → 问题被表述得不够清楚。synthesis 会把这个 low confidence 顺势带下去；在问题这一层消解歧义，而不是用同一个 prompt 重跑。
- 两位或更多顾问出错 → 查 `raw/_index.json` 看底层错误。常见原因是名册里某个 api provider 缺 api key；Phase 0 不在此设卡，因为并非每个入选 agent 都用到每把 key。
- `summary.md` 的 `decision` 与某位参与者的 recommendation 一字不差 → synthesis 退回到了它自己的先验。若你的配置里有非参与者，把 `--synthesis-agent` 设成它再重跑。
- minority position 既具体又有理有据，却被多数派意见压过 → 考虑升级到多轮 debate；那才是迭代能增添信息的场域。

## Verification

宣布本次 run 完成前，确认：

- [ ] `meta.json` 存在，且 `question`、`peers`、`agents`、`synthesisAgent` 都已填好。
- [ ] 至少有两个 `peer-K.json` 文件，含已解析的 recommendation。
- [ ] `synthesis.json` 可解析，且含一个匹配 synthesis schema 的 `parsed` 字段。
- [ ] `synthesis.parsed.support.total` 等于 `peer-K.json` 文件数（返回了可用 recommendation 的顾问数）。
- [ ] `summary.md` 渲染干净，且首要决策为一句话。
- [ ] 若提供了 `--options`，首要决策与其中某个选项一字不差。
- [ ] 除 `meta.json` 和本次 run 的 `raw/` 子目录外，任何地方都不出现 agent id。
