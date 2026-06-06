---
name: debate
description: 让多个异构 LLM agent 就同一个问题展开一场 multi-agent debate。每个 round 都做匿名处理，使参与者只就论据本身较量，而不在意来源。最终产出是一份综合后的答案外加一份 claim catalog。当一个问题含糊、有争议、或风险高到单个模型的第一反应不足以采信时使用。
---

# Multi-Agent Debate

## Overview

你编排一场审议：若干 LLM agent 跨多个 round 就一个问题展开辩论。每个 round 里，每个 agent 都读到其他 agent 的匿名陈述并修正自己的立场。最后一个 round 结束后，所有 round 的 claim 被汇聚成一份 catalog，再由一次 synthesis 收束为一个连贯的答案。

两条运作原则塑造了本技能：

**异构是推荐项，而非强制项。** 同一模型的多个实例之间辩论会很快收敛，因为这些参与者共享先验、训练数据和失效模式。我们强烈建议用户选取三个或更多、横跨不同模型族的 agent（Anthropic + OpenAI-compatible + 第三方），但本技能不会拒绝同构阵容——用户的阵容由用户自己定。本技能在选 agent 时把这条建议摆出来，并让终止由辩论中实际发生的事情来决定，而非由一条关于「谁在发言」的静态规则来决定。

**peer 一律匿名。** 「Claude 说」或「GPT-4 说」这类稳定标识会带来地位效应。较弱的 agent 会顺从于它眼中更强的那个，而不去为自己的立场辩护。呈现给每个参与者的每条 prompt 都把其他人标记为 `peer-1`、`peer-2` 等等，且映射关系不进入 prompt。

**当 claim 不再变动时，辩论结束。** 本技能不强行跑固定数量的 round，而是在每个 round 之后（从 round 2 起）检查新增的 claim 是否对既有 catalog 有实质性扩展。当某个 round 80% 或以上的 claim 都只是对既有内容的改写或细化时，审议即已收敛，本技能直接进入 synthesis。`--rounds` 标志是预算上限，不是目标值。

运行底座是 `@hs/llm` 包（`packages/hs-llm/`）。所有 LLM I/O 都经由它的 CLI 二进制；技能本身不做任何网络工作。

## When to Use

- 带有非平凡权衡的开放式技术决策（架构选型、含糊的规格解读、设计评审）。
- 单个模型的第一反应看似合理却失之肤浅的问题。
- 高风险的判断，且你想为审议中未能存活的异见留下书面记录。

**When NOT to use：**

- 有唯一正确答案、任何称职的 agent 一次就能给出的问题（查个事实、做个计算）。
- 答案依赖参与者并不具备的工具的问题（在线数据库访问等）。
- 实时交互场景——一场 3 round、3 agent 的辩论会发出约 12 次 LLM 调用，耗时数分钟。

## Inputs

用户调用本技能时至少要给一个问题。可选标志：

| Argument | Default | Notes |
|----------|---------|-------|
| `--question <text>` (or first positional) | required | 要辩论的问题。把它问得尖锐些——「在 Z 的前提下我们该选 X 还是 Y」胜过「对 X 怎么看」。 |
| `--agents <a,b,c>` | (interactive) | 来自配置的 agent id，逗号分隔。省略时，你请用户从可用阵容中挑选。 |
| `--rounds <n>` | `3` | round 的**最大**数量。round 1 是开场；round 2..n 是后续追问。若 claim 收敛，本技能会早于此值停止（见 Phase 2）。 |
| `--config <path>` | auto | hs-llm 配置文件的路径。hs-llm CLI 自行解析路径：`--config` → `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`。若想固定某个具体文件，就把它透传给每次 `hs-llm` 调用。 |
| `--out-dir <path>` | `./debate-runs/<timestamp>` | 辩论状态与产物的落地位置。 |
| `--synthesis-agent <id>` | first picked | 由哪个 agent 跑 convergence 检查和最终的 synthesis。若配置里有名为 `synth_*` 或 `judge_*` 的 agent，优先用它。否则用第一个被选中的辩论参与者。 |

先把问题确定下来：若用户调用本技能时没带问题，就问。没有问题就无可辩论。

## Process

### Phase 0 — Preflight

若 `hs-llm` 未安装或配置损坏，本技能不会运行。在做任何事之前先把这两项都检查一遍。

**定位二进制。**

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

若二进制缺失，告诉用户该跑什么，然后停下。若你已身处 harness-stack repo 内且用户同意，可自行执行安装/构建——但不要在一个未知的工作树上悄悄跑这些命令。

**校验配置。** 省略 `--config` 时，CLI 自行解析配置路径，依次走 `$HS_LLM_CONFIG` → `./hs-llm.config.json` → `~/.config/hs-llm/config.json`。运行：

```bash
$HS_LLM_BIN validate-config
```

三种结果：

- **Exit 0** — 配置解析通过，且每个 agent 引用都能解析。它所用的路径被打印到 stdout（例如 `OK: /home/u/.config/hs-llm/config.json`）。把它捕获进 `$CONFIG`，使后续各 phase 都固定到同一个文件：

  ```bash
  CONFIG="$($HS_LLM_BIN validate-config | sed -n 's/^OK: //p')"
  ```

- **Exit 3** — 哪里都没找到配置。错误信息会列出二进制尝试过的每个路径。提议用 `hs-llm init` 引导一份，它会把示例配置复制到用户全局的默认位置：

  ```bash
  $HS_LLM_BIN init
  ```

  init 之后，告诉用户设置 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`（或他们保留的那些 api provider 对应的 key），然后重新跑 validate-config。starter 里有些 agent 用的是 api provider；这些 agent 在使用前需要 key。

- **Exit 1** — 配置存在但损坏（结构不对、provider 引用未知等）。把错误抛给用户然后停下。他们修，你再跑。

若用户想用非默认位置，可在本次会话期间设置 `$HS_LLM_CONFIG`，或给后续每条命令都显式传 `--config <path>`。本技能只捕获一次 `$CONFIG` 并始终一致地使用它。

### Phase 1 — Agent selection

读取配置，呈现可用的 agent。

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

这会给出一张类似这样的表：

```
mock_a          mock  mock                mock-1
claude_haiku    api   anthropic           claude-haiku-4-5
claude_sonnet   api   anthropic           claude-sonnet-4-5
gpt5            api   openai-compatible   gpt-5
```

把它展示给用户。若他们已经传了 `--agents`，解析后继续。否则，询问要纳入哪些，并给出一行建议：

> 「我建议至少三个 agent，最好横跨两个或更多不同的模型族（上表第三列）。同一模型的多个实例之间辩论往往很快收敛，共有的盲区却原封不动。话虽如此，由你来定——本技能会接受你挑选的任何阵容，并依靠 Phase 2 的 convergence 检查在恰当的时机终止。」

若用户选了同构阵容，接受它并继续。round 2 之后的 convergence 检查很可能提前触发；那是正确的结果，本技能不应以拒绝的方式抢先阻止它。

把选择连同一份随机化的 peer 映射保存到辩论目录：

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

在此之前应当先打乱 `agents` 数组——peer-1 不应确定性地就是用户挑选的第一个 agent。一个简单的洗牌：

```bash
AGENTS_JSON="$(printf '%s\n' "${AGENT_IDS[@]}" | shuf | jq -R . | jq -s .)"
```

`shuf`属于 GNU coreutils；在 macOS 上用 `gshuf`（来自 `brew install coreutils`），或退而用 `sort -R`。

**挑选 synthesis agent。** 这个 agent 既跑每个 round 的 convergence 检查，也跑最终的 synthesis，因此在 Phase 1 末尾一次定下。解析顺序：

1. 用户提供的 `--synthesis-agent <id>`（若有）。
2. 配置中 id 以 `synth_` 或 `judge_` 打头的 agent。
3. 第一个被选中的辩论参与者（按 agent id 字母序）。

把选择记录到 `meta.json` 的 `synthesisAgent` 下。synthesis agent 也可以是辩论参与者之一；这可以接受，但要明白它在 synthesis 时会对自己的 claim 带些偏向。本技能会在最终的 summary 里坦白地记下这个选择。

### Phase 2 — Debate

把 round 1..N 当成一个循环来跑。每个 round R ≥ 2 之后，跑一次 convergence 检查（见本节末尾的描述）。若已收敛，提前退出循环并进入 Phase 3。

对每个 round R，从 1 到 N：

#### Round 1 (opening)

所有参与者拿到同一条 prompt：代入了问题的 opening 模板。他们谁也看不到任何 peer。

1. 渲染 prompt。

   ```bash
   sed "s|{{QUESTION}}|$QUESTION|" skills/debate/prompts/round-opening.md > "$OUT_DIR/round-1/prompt.txt"
   ```

   这里用 `sed` 没问题，因为问题是单行的。若问题含有会让 `sed` 困惑的字符（斜杠、换行），改用 `Write` 工具做显式替换。

2. 扇出。agent id 来自 `meta.json`。

   ```bash
   AGENTS_CSV="$(jq -r '.agents | join(",")' "$OUT_DIR/meta.json")"
   $HS_LLM_BIN invoke-many \
     --config "$CONFIG" \
     --agents "$AGENTS_CSV" \
     --prompt-file "$OUT_DIR/round-1/prompt.txt" \
     --out-dir "$OUT_DIR/round-1/raw" \
     --concurrency "$(jq '.agents | length' "$OUT_DIR/meta.json")"
   ```

3. 把按 agent-id 命名的文件转换成 peer-N 文件。映射在 `meta.json` 里。

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

   出错的 agent 在本 round 被剔除。记下它们的缺席并继续——本 round 以 N-1 个参与者仍然有效。

4. 逐 peer 抽取 claim。每次调用都需要把该 peer 的陈述代入 claim-extraction prompt。先构造 prompt 再扇出。

   对每个有非空 `.txt` 的 `peer-K`：

   - 构造 prompt：取 `prompts/claim-extraction.md`，把 `{{STATEMENT}}` 替换为 `$OUT_DIR/round-1/peer-K.txt` 的内容。用 `Write` 工具——陈述是多行的，shell 替换会变脆弱。
   - 保存到 `$OUT_DIR/round-1/peer-K.claim-prompt.txt`。

   然后并行跑抽取：

   ```bash
   # one invocation per peer; use a strong model for extraction (it's parsing, not generating)
   for peer in $(jq -r '.peers | keys[]' "$OUT_DIR/meta.json"); do
     [ -f "$OUT_DIR/round-1/$peer.txt" ] || continue
     agent_id="$(jq -r ".peers.\"$peer\"" "$OUT_DIR/meta.json")"
     $HS_LLM_BIN invoke \
       --config "$CONFIG" \
       --agent "$agent_id" \
       --prompt-file "$OUT_DIR/round-1/$peer.claim-prompt.txt" \
       --schema-file skills/debate/schemas/claims.schema.json \
       --out "$OUT_DIR/round-1/$peer.claims.json" &
   done
   wait
   ```

   `invoke-many` 不支持逐次调用各异的 prompt，所以这是一个并行 spawn 的循环。扇出数量受 peer 数量约束，而 peer 数很小。

   输出 JSON 中填好了 `parsed.claims`。若抽取失败（schema-repair 耗尽），文件里会含有错误，该 peer 的 claim 缺失——记下来并继续。synthesis 在 claim 覆盖不全的情况下也能跑。

#### Rounds 2..N (followup)

每个 peer 拿到各自的 prompt，因为他们需要看到*其他* peer 的陈述（而非自己的）。

对每个 round R，从 2 到 N，对每个有上一 round 陈述的 peer P：

1. 构造 P 的 prompt：

   - 取 `prompts/round-followup.md`。
   - 把 `{{QUESTION}}` 替换为问题。
   - 把 `{{YOUR_PREVIOUS}}` 替换为 `$OUT_DIR/round-(R-1)/$P.txt` 的内容。
   - 把 `{{PEER_STATEMENTS}}` 替换为*其他*每个 peer 的 `$OUT_DIR/round-(R-1)/peer-K.txt` 的拼接，格式为：

     ```
     ## peer-1
     <statement>

     ## peer-2
     <statement>
     ```

     （省略 P 自己的 peer 标签）

   - 用 `Write` 工具保存到 `$OUT_DIR/round-R/$P.prompt.txt`。

2. 用各自的 prompt 调用每个 agent：

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

3. 把文本取出并跑 claim 抽取（配方与 round 1 相同，把 `round-1` 换成 `round-$R`）。

若某个 peer 在 round R-1 掉队（无 `.txt` 文件），round R 不会再邀请它回来。辩论以剩下的 peer 继续。若活跃 peer 数跌破 2，中止本 round，并以已完成的各 round 进入 synthesis——只有一个参与者的「辩论」不算辩论。

#### Convergence check (after every round R ≥ 2)

一旦每个活跃 peer 的 round R claim 都抽取完毕，就决定跑 round R+1 还是停下。构造两份输入：

- **本 round 的 claim：** 把每个活跃 peer 的 `round-R/peer-K.claims.json` 摊平成一个 `text` 字符串的列表。
- **此前累积的 claim：** 在 round 1..R-1 上做同样的摊平。

把这些代入后渲染 `prompts/convergence-check.md`，保存到 `$OUT_DIR/round-$R/convergence.prompt.txt`，然后运行：

```bash
$HS_LLM_BIN invoke \
  --config "$CONFIG" \
  --agent "$SYNTH_AGENT" \
  --prompt-file "$OUT_DIR/round-$R/convergence.prompt.txt" \
  --schema-file skills/debate/schemas/convergence.schema.json \
  --out "$OUT_DIR/round-$R/convergence.json"
```

若 `parsed.converged === true`，把本 round 作为最后一个已完成的 round 追加到 `meta.json`，记录 `terminationReason: "converged"`，跳过剩余的 round，进入 Phase 3。

若 `parsed.converged === false`，继续 round R+1。在最后一个 round（R = N）之后，记录 `terminationReason: "rounds-exhausted"` 并进入 Phase 3。

convergence 检查本身是一项有意付出的成本：第一个 round 之后每个 round 多一次 `hs-llm invoke`。该成本受 `--rounds - 1` 约束。跳过它会迫使每场辩论都跑满整个预算；当参与者显然已尘埃落定时这是浪费，而当参与者仍在变动时它又会误导。

若 convergence agent 本身出错（schema-repair 耗尽、网络故障），不要阻塞本次运行——退回「未收敛」并继续。把故障记到 `$OUT_DIR/round-$R/convergence.error` 以便调试。

### Phase 3 — Aggregation and synthesis

构建 claim catalog：收集每个 round 的每条 claim，并统计每条由多少个不同的 peer 提出。

一条务实的合并规则：若两条 claim 共享 ≥ 60% 的非停用词 token（即基于词的 Jaccard 阈值），就合并。第一版直接把每条 claim 连同其 peer 来源和 stance 全倒出来，按 peer 分组，让 synthesis prompt 去做合并——LLM 擅长此事，而基于字符串相似度的合并很脆。

```bash
# Build a catalog of claims, organized as { peer -> [claim, claim, ...] }, with stance and round.
jq -s '
  reduce .[] as $f ({};
    . + ($f.parsed.claims | map(. + {peer: $f.__peer, round: $f.__round}) as $c |
         {($f.__peer): ((.[$f.__peer] // []) + $c)}))
' $(... build a list of all peer.claims.json with peer and round metadata ...) > "$OUT_DIR/catalog.raw.json"
```

上面只是草图——在纯 jq 里构造带元数据标记的输入列表很折腾。用 `Write` 工具直接构造 `catalog.json`：读取每个 `round-R/peer-K.claims.json`，附上 `peer` 和 `round` 字段，归并为一个结构。伪代码：

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

然后构造 synthesis prompt：取 `prompts/synthesis.md`，替换 `{{QUESTION}}` 和 `{{CLAIM_CATALOG}}`（即 `catalog.json` 的 markdown 渲染——按 peer 分组的 bullet，带 stance 和 round 标记）。

使用 Phase 1 末尾已选定的 synthesis agent。带 schema 跑 synthesis：

```bash
$HS_LLM_BIN invoke \
  --config "$CONFIG" \
  --agent "$SYNTH_AGENT" \
  --prompt-file "$OUT_DIR/synthesis.prompt.txt" \
  --schema-file skills/debate/schemas/synthesis.schema.json \
  --out "$OUT_DIR/synthesis.json"
```

### Phase 4 — Output

由 `synthesis.json` 加 `meta.json` 渲染 `summary.md`。格式：

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

然后渲染一份 HTML report 供可视化查阅：

```bash
node skills/debate/render.mjs "$OUT_DIR"
```

这会产出 `$OUT_DIR/report.html`——一个自包含的文件（数据内联，无外部资源），涵盖 headline、synthesis、每个 round 带抽取出的 claim 的逐字记录、跨 peer 的 claim catalog，以及一个折叠的 details 小节，内含 peer→agent 映射。直接用 `open "$OUT_DIR/report.html"`（macOS）或任意浏览器打开。

把 `summary.md` 和 `report.html` 的路径连同 headline 打印到 stdout。完成。

## Output

一次成功运行之后：

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
├─ summary.md                 # human-readable result
└─ report.html                # self-contained visual report (rendered by skills/debate/render.mjs)
```

`meta.json` 是唯一存放 agent id（去匿名化映射）的地方。把它当作调试产物对待——绝不要把它的内容喂进任何 prompt。

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| 「三个 Sonnet 比混搭更快。」 | 大概是的，而且 round 2 之后的 convergence 检查很可能触发并把成本封顶——但你也丢掉了本技能存在的意义：方差缩减。本技能接受这个阵容；后果由你承担。 |
| 「跳过 claim 抽取，直接综合原始逐字记录。」 | 正是 claim 这一层让少数派立场得以在多数票式的 synthesis 中存活。没有它，少数派论点会被措辞更冗长的邻居稀释，而 convergence 检查也没有结构化的东西可供比对。 |
| 「跳过 convergence 检查，干脆每次都跑满所有 round。」 | 第一个 round 之后每个 round 多一次 `hs-llm invoke`，仍比去跑那些产不出新 claim 的 round 更便宜。该检查还会揭示审议实际尘埃落定于哪个 round，这对 summary 是有用的信息。 |
| 「跳过匿名化，这些 agent 够聪明。」 | 它们聪明到足以逢迎。地位效应在各种模型规模上都很稳健。 |
| 「所有参与者都用同一个 agent，只靠高 temperature 重采样。」 | 这会产出共享盲区的相关样本。convergence 检查会逮住这一点并在 round 2 之后终止辩论——那是正确的结果，却也是个误导性的结果（你花了一场辩论的成本，换来一个审议薄弱的单模型答案）。若想要没有真实跨视角的决策支持，用 `harness-stack:decide` 技能。 |

## Red Flags

- convergence 检查在 round 2 之后触发、且 `novelClaimCount` 接近零 → 阵容很可能过于同构。在 summary 里记下这一点，若问题高风险，建议用户换更多样的阵容重跑。
- 在整个 `--rounds` 预算内 convergence 检查从未触发 → 参与者到 round N 仍在变动。要么预算太小，要么问题太宽泛。summary 应将其标为 `terminationReason: "rounds-exhausted"`，而非掩盖它。
- synthesis confidence 为 `high`，但 claim catalog 显示出真实异见 → synthesis agent 把分歧抹平了。换一个 `--synthesis-agent` 重跑并比较。
- `summary.md` 读起来像某个参与者的陈述 → synthesis 退回到了它自己的先验。把 `--synthesis-agent` 设为另一个参与者重跑，或轮换。
- 某个 peer 在 round 2 之前掉队（round-1 陈述缺失或抽取失败）→ 查 `round-1/raw/_index.json` 找底层错误。辩论以存活的 peer 继续，但从 round 1 起就只剩 2 个 peer 的辩论很脆弱。

## Verification

在宣布运行完成之前，确认：

- [ ] `meta.json` 存在，且 `peers`、`agents`、`question`、`synthesisAgent`、`terminationReason` 均已填好。
- [ ] 每个活跃 peer 在它参与的每个 round 都有 `.txt` 和 `.claims.json` 文件。
- [ ] 对每个跑过的 round R ≥ 2，`round-R/convergence.json` 存在，且含有匹配 convergence schema 的 `parsed` 块。
- [ ] 若 `terminationReason` 为 `converged`，则最后一个已完成 round 的 convergence.json 中 `parsed.converged === true`。
- [ ] `catalog.json` 汇聚了至少两个不同 peer、跨至少两个不同 round 的 claim（若辩论在 round 2 后收敛且 round 2 贡献稀疏，则一个 round 亦可）。
- [ ] `synthesis.json` 能解析，且含有匹配 synthesis schema 的 `parsed` 字段。
- [ ] `summary.md` 渲染干净，且 headline 是一句话。
- [ ] `report.html` 已生成，并能在浏览器中打开且无 console 错误。
- [ ] 除 `meta.json`、各 round 的 `raw/` 子目录、以及 `report.html` 中折叠的「Run details」小节外，任何地方都不出现 agent id。
