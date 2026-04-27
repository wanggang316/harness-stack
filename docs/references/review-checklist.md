# Review Checklist

经验型 review 模式池。五轴 (`skills/hs-review/SKILL.md`) 是框架，这里是项目无关、复用率最高的雷区清单。每条都附带：什么模式、为什么是问题、怎么修。

`hs-review` 在 Process 第 3 步 (walk the diff) 把这份清单当作模式匹配字典使用。安全/性能的细节请配合 `security-checklist.md` 与 `performance-checklist.md`。

## 使用方式

- **两遍走查**：先扫 Pass 1 (Critical 类)，再扫 Pass 2 (Informational 类)。Critical 没清干净之前不要在 Informational 上花时间。
- **必读 diff 外的代码**：标 ★ 的条目必须读 diff 之外的文件才能判定。reviewer 不能只看 hunk。
- **Confidence 标注**：可疑但未读到具体代码的 finding，标 `(confidence: 5/10)` 并放在附录而不是主报告。
- **抑制项**：`## Suppressions` 列出的模式不要 flag，避免噪音评审。

---

## Pass 1 — Critical

### SQL & Data Safety

- SQL 字符串拼接（即使值是 `.to_i` / `.toString()` / `Number()`）→ 必须参数化查询、prepared statement 或 ORM 安全 API。
- TOCTOU：先 `SELECT` 再 `UPDATE` 的 check-then-set 模式 → 改为原子的 `WHERE old_value = ? UPDATE ...`。
- 绕过 ORM 校验直接写库（`update_column` / `QuerySet.update()` / Prisma `$executeRaw`）→ 默认禁止，特殊场景需注释说明绕过原因。
- 缺索引但被高频查询的字段（migration 与 query 不同 PR 落地的情况尤其常见）。

### Race Conditions & Concurrency ★

- `find_or_create` / `upsert` 没有数据库唯一索引兜底 → 并发请求会产生重复行。
- 读—判断—写 (read-check-write) 没有唯一约束或乐观锁 → 必须捕获 duplicate key 重试，或用 `ON CONFLICT` / `INSERT ... WHERE NOT EXISTS`。
- 状态机迁移没有用 `WHERE status = old_status` 守卫 → 并发请求可能跳过或重复触发副作用。
- 共享可变状态（模块级变量、单例缓存）在多 worker / 多请求下被写入。

### LLM Output Trust Boundary ★

LLM 输出 = 不可信用户输入。我们整套 stack 跑 AI agent，这一类 finding 高发。

- LLM 生成的字段（emails、URLs、names、ids）写入数据库或传给 mailer 之前没做格式校验 → 加最小必要的 guard：正则、`URL.parse`、长度上限、字符白名单。
- 结构化 tool output（数组、对象）在写库前没做类型/形状校验 → 用 Zod / Pydantic / JSON Schema 在边界处校验。
- LLM 生成的 URL 直接 `fetch` / `requests.get` → SSRF 风险，必须先解析 hostname 与 allowlist 比对。
- LLM 输出存入 vector store / knowledge base 不做清洗 → 存储型 prompt injection，下次检索会污染上下文。
- LLM 输出的代码用 `eval` / `exec` / `vm.runInNewContext` 执行 → 必须沙箱（隔离进程、超时、资源限制）。

### Enum & Value Completeness ★

新增枚举值是 review 中最容易漏的一类（diff 看不到）：

1. 用 Grep 搜 sibling 值（如新增 `tier: "enterprise"`，搜 `"basic"`、`"pro"` 全部出现位置）。
2. 逐个 Read 相关文件，确认：
   - `switch` / `if-elsif` 分支是否覆盖新值，落到 default 是否正确？
   - 数组、白名单、`%w[]` 是否需要新增？
   - 前端下拉、过滤器、文案 i18n 是否同步？
   - 数据库 enum 类型 / migration 是否已 ALTER？
3. 漏一处就标 `Important` 起步，业务核心字段直接 `Critical`。

### Shell / Eval Injection

- `subprocess.run(..., shell=True)` + 字符串插值 → 改为参数数组形式。
- `os.system` / Node `child_process.exec` 拼接变量 → 改为 `execFile` / `spawn` + 参数数组。
- `eval` / `Function()` 跑用户或 LLM 来源的字符串 → 沙箱或拒绝。

---

## Pass 2 — Informational

### Conditional Side Effects

- 分支条件下应用副作用，但其中一支忘了执行 → 例：item 升级到 verified 但 URL 只在子条件成立时附加，另一支静默落库不一致数据。
- 日志声称做了某事，但实际被条件跳过了 → 日志要反映真实结果。

### Type Coercion at Boundaries

- 跨语言/跨序列化边界的类型变化（Ruby ↔ JSON ↔ JS、Python int ↔ JSON number ↔ TS）。
- 哈希/签名输入没在序列化前 normalize → `{ cores: 8 }` 与 `{ cores: "8" }` 算出不同 hash，幂等键失效。
- API 返回 number 但前端用作字符串拼 key → 大整数精度丢失（>2^53）。

### Magic Numbers & String Coupling

- 同一裸字面量在 ≥2 个文件出现 → 抽常量、放同一处。
- 错误信息字符串被另一个文件用作 filter / match 条件 → 一改全错；用错误码或常量。
- 时间窗、页大小、重试次数硬编码在多处。

### Dead Code & Consistency

- 变量赋值后从未读取。
- 注释、docstring 描述的是改动前的行为。
- CHANGELOG / VERSION / package.json 三处版本号不一致。
- 标 `// TODO` / `// FIXME` 但没有 owner / 时限 / 跟踪 issue。

### Test Gaps

- 负路径只断言了 status / type，没断言副作用（URL 是否附加、callback 是否触发、外部服务是否被调用）。
- 不应调用外部服务的路径缺 `expect(spy).not.toHaveBeenCalled()` 之类的反向断言。
- 安全/限流/权限拦截类功能只有单元测试，缺端到端验证拦截真实生效。
- Bug fix 没附回归测试（先用失败测试钉住 bug，再修；见 `skills/hs-tdd/SKILL.md`）。

### LLM Prompt Issues

- prompt 里写 0-indexed 列表（LLM 几乎一定返回 1-indexed）。
- prompt 列出的可用工具与代码里 `tools: [...]` 数组不一致。
- token / 字数上限在 prompt 里多处声明，会漂移。

### Time Window Safety

- 按日期 key 查询假设“今天”等于 24h → 早 8 点的报表只看到 0-8 点数据。
- 关联功能用了不同时间窗（一个 hourly、一个 daily），同源数据对不上。
- 时区：服务端 UTC 与用户本地时区切换处必须显式转换。

### Performance & Bundle Impact

- 新增已知重型依赖：`moment` (用 `date-fns` / `dayjs`)、整包 `lodash` (用 per-function 或 `lodash-es`)、`jquery`、整包 polyfill。
- lockfile 因单个新依赖膨胀显著（>10 个新传递依赖要质疑）。
- 图片无 `loading="lazy"` 与显式宽高 → 触发 CLS。
- 同步 `<script>` 没 `async` / `defer`。
- `useEffect` 串行 fetch 形成 waterfall（应并行或合并请求）。
- tree-shake 友好库被改成 default import → 失去 tree-shaking。

不要 flag：

- devDependencies 增加（不影响产物）。
- 动态 `import()`（这是 code splitting，是好事）。
- 服务端独占依赖。
- < 5KB gzip 的小工具。

### CI/CD & Distribution

- workflow 文件改动后构建工具版本与项目要求不匹配。
- secrets 直接写在 workflow 而不是 `${{ secrets.X }}`。
- 跨平台 build 矩阵漏了目标平台，或没标注哪些是未测试的。
- Release / publish 步骤不幂等（重跑会失败）。

---

## Suppressions — 不要 flag 这些

降低噪音评审。下列模式即使匹配，也不要在 finding 里报：

- “X 与 Y 冗余” 但冗余有助于可读性（如 `present?` 与 `length > 20` 同时存在）。
- “给阈值 / 调参常量加注释” → 这类常量会随 tuning 变化，注释会先于代码腐烂。
- “这个断言可以更紧” 当现有断言已经覆盖了该行为。
- 仅为一致性而修改（把一个值包进与另一处相同结构的 conditional）。
- “正则没处理边界情况 X” 当输入由上游约束、X 实际不会出现。
- “一个测试同时验证了多个 guard” → 测试不需要每个 guard 隔离。
- 已经在被评审的 diff 内修复的问题（评审前必须把 diff 完整读一遍）。
- ML/eval 类阈值的微调（top-K、min-score 等会反复调整）。
- 无副作用的 no-op（如 `.filter` 一个永远不在数组里的元素）。

---

## Confidence 校准

每条 finding 必须自评 confidence (1-10)：

| 分数 | 含义 | 处理 |
|------|------|------|
| 9-10 | 已读到具体代码，能演示出 bug 或攻击路径 | 主报告正常列出 |
| 7-8  | 高置信度模式匹配，几乎一定对 | 主报告正常列出 |
| 5-6  | 可能是假阳性，需要作者确认 | 列出但加 `verify this is actually an issue` 标注 |
| 3-4  | 模式可疑，未确认 | 不进主报告，附录列出 |
| 1-2  | 纯猜测 | 仅在严重度会是 P0 的情况下才提 |

格式：`[Severity] (confidence: N/10) file:line — description`。

如果作者后续确认了一个 confidence < 7 的 finding 是真问题，记一笔学到的模式 — 下次该模式应以更高 confidence 抓到。

---

## See Also

- `skills/hs-review/SKILL.md` — 五轴评审主流程。
- `docs/references/security-checklist.md` — OWASP-class 安全检查。
- `docs/references/performance-checklist.md` — 性能检查。
- `skills/hs-security/SKILL.md` — 深度安全审计与硬化。
- `skills/hs-tdd/SKILL.md` — Bug fix 的回归测试编写。
