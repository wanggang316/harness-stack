从下面的陈述中抽取出原子化的 claim。

一个 claim 是一条自包含、可独立评估的断言。每个 claim 应当是一句话，足够具体（不是「X 很好」，而是「X 很好，因为 Y」），且无需依赖陈述的其余部分即可成立。

# Statement

{{STATEMENT}}

# Constraints

- 通常三到七个 claim。不要凑数。不要把一个想法拆散到多个 claim 里。
- 给每个 claim 标注一种 stance：
  - `assertion` — 提出一个立场、证据或建议。
  - `objection` — 直接反驳某个 peer 被认为持有的观点。仅在陈述明确针对某个 peer 的看法展开时使用。
  - `concession` — 承认某个 peer 的观点成立。
- `supportingReason` 是可选的。当 claim 背后的推理无法从 claim 本身看出时再使用。
- 跳过填充性内容：对问题的复述、元评论、模棱两可的措辞，以及「我先要……」这类铺垫。

Return JSON matching the supplied schema.
