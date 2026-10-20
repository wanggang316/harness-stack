---
name: screenshot
description: |
  在 macOS 上以脚本方式截图并做后处理：全屏 / 指定显示器、按 App 名 / 窗口 ID / 标题 / 前台窗口截单个窗口、按坐标截区域、滚动截长图（自动拼接，支持固定头尾）、网页整页截图（Playwright），以及格式转换（png/jpg/heic/tiff/bmp/gif/pdf/webp）、缩放、压缩和面向 LLM 的 `optimize`。只依赖系统自带的 `screencapture` / `sips` 和一个首次运行自动编译的 Swift 辅助程序，无需安装任何东西。当需要"看一眼屏幕 / 某个窗口 / 某个页面"、把截图喂给模型、或把图片转格式缩体积时，Agent 调用本 skill 的 `scripts/screenshot.sh`；用户也可显式输入 `/harness-stack:screenshot <子命令> ...` 触发。
---

# Screenshot Skill

macOS 下无人值守截图 + 图片后处理。核心是 `scripts/screenshot.sh`，所有子命令都是非交互的（不会弹出鼠标框选），输出一行路径或 `--json`。

## When to Use

- **看屏幕**：Agent 需要知道当前屏幕 / 某个窗口 / 某个区域长什么样，截完直接用 Read 工具打开 PNG。
- **截长图**：可滚动的窗口（文档、聊天记录、网页）一次截全，自动拼接成一张高图。
- **图片处理**：转格式、缩放到指定尺寸、压缩体积、把截图优化到适合喂给模型的大小。
- **显式触发**：用户输入 `/harness-stack:screenshot <子命令> ...`。

**不要用于**：录屏（用 `harness-stack:screen-record` skill）；需要点按钮、读 UI 元素树的自动化（用专门的 UI 自动化工具）。

## 权限（首次使用必读）

macOS 把「屏幕录制」授权挂在**发起命令的宿主 App** 上（Codans、Ghostty、Terminal……），而不是脚本本身。脚本跑在哪个 App 里，就给哪个 App 授权一次即可。

```bash
S="<本 skill 目录>/scripts/screenshot.sh"
"$S" doctor            # 看宿主 App、授权状态、可用工具
"$S" doctor --request  # 未授权时触发系统弹窗，然后去 系统设置 > 隐私与安全性 > 屏幕与系统录音 勾选宿主 App，并重启它
```

- 未授权时截图只有壁纸或直接失败，脚本会以 exit 2 退出并提示。
- `long` 需要额外的「辅助功能」授权（发滚动事件），同样挂在宿主 App 上。
- SSH / launchd 等没有图形会话的环境截不到图（`doctor` 的 `GUI session` 必须是 `Aqua`）。

## 用法

脚本路径：`<本 skill 目录>/scripts/screenshot.sh`（即本 SKILL.md 所在目录下的 `scripts/`）

```text
screenshot.sh doctor [--request]
screenshot.sh screen  [--display N|all] [common]
screenshot.sh window  (--app NAME | --id ID | --title TEXT | --front) [--shadow] [--activate] [common]
screenshot.sh region  <x,y,w,h> [common]
screenshot.sh long    (--app NAME | --id ID | --title TEXT | --front) [--step PT] [--max-pages N] [--at X,Y]
                      [--skip-top PT] [--skip-bottom PT] [--settle MS] [--activate] [--no-restore] [--keep-pages DIR] [common]
screenshot.sh long    --url URL [--width PX] [--wait MS] [common]
screenshot.sh windows [--app NAME] [--title TEXT] [--all] [--json]
screenshot.sh convert  <img> --to png|jpg|heic|tiff|bmp|gif|pdf|webp [--quality Q] [--max PX] [--scale F] [--out F]
screenshot.sh optimize <img> [--max PX] [--quality Q] [--to jpg|png|webp] [--out F]
screenshot.sh info     <img>

common: --out F  --format png|jpg|heic|tiff  --max PX  --scale F  --quality Q  --delay S  --cursor  --json
```

| 子命令 | 说明 |
|---|---|
| `screen` | 主显示器（默认）、`--display N`（1 = 主屏）或 `--display all`（每块屏一张） |
| `window` | 按 App 名（匹配显示名 / bundle id / 可执行名，大小写不敏感）、窗口 ID、标题子串或 `--front` 前台窗口。默认不带阴影；窗口最小化或在别的 Space 时拒绝并列出候选（exit 3） |
| `region` | 全局坐标的矩形，单位 point（Retina 下输出像素是 2 倍） |
| `long` | 对窗口反复"截图 → 滚动 → 截图"，用行相似度找重叠并拼接；自动识别固定的工具栏 / 底栏（相邻两页中位置相同且内容相同的行），也可用 `--skip-top/--skip-bottom` 固定指定。滚到底（两页相同）自动停止，结束后滚回原位并把鼠标放回原处 |
| `long --url` | 网页整页截图，走 Playwright（需 `npm i -g playwright && npx playwright install chromium`） |
| `windows` | 列出可截的窗口（ID、是否在屏幕上、位置尺寸、App、标题） |
| `convert` | 用 `sips` 转格式 / 缩放；`--max` 限制长边，`--scale 0.5` 把 2x 截图变 1x；webp 需要 `brew install webp` |
| `optimize` | 给模型看的默认优化：长边 ≤ 1568、jpg 质量 80（通常 2MB → 200KB） |
| `info` | 尺寸、格式、字节数 |

默认输出到 `~/.screenshot/<kind>-<时间戳>.<fmt>`，可用 `SCREENSHOT_DIR` 或 `--out` 改。

退出码：`0` 成功 · `1` 运行错误 · `2` 缺权限 · `3` 目标不存在 / 不可见 · `64` 用法错误。

## 示例

```bash
S="<本 skill 目录>/scripts/screenshot.sh"

# Agent 看一眼屏幕：直接出 1568px 的 jpg，省 token
"$S" screen --max 1568 --format jpg --json

# 截某个 App 的窗口（先激活它再截）
"$S" window --app Safari --activate --max 1600

# 截前台窗口，保留 Retina 原始像素
"$S" window --front

# 区域
"$S" region 0,30,1341,1050

# 聊天记录 / 文档长图；滚动区不在窗口正中时用 --at 指定滚动点（窗口内坐标）
"$S" long --app "Script Editor" --activate --max-pages 40
"$S" long --front --at 400,300 --step 200

# 网页整页
"$S" long --url https://example.com --width 1280

# 后处理
"$S" convert shot.png --to heic --max 1200
"$S" optimize shot.png                 # -> shot-opt.jpg
"$S" convert shot.png --to webp --quality 75
```

## 工作机制与限制

- 截图本体是系统 `screencapture`（ScreenCaptureKit），窗口截图不受遮挡影响，但最小化 / 别的 Space 的窗口截不到。
- `capturekit.swift` 是一个小的 CoreGraphics 辅助程序（权限预检、窗口枚举、滚动事件、拼接、拼图），首次运行用 `swiftc` 编译并按内容哈希缓存在 `~/.cache/capturekit/`，之后零开销。需要 Xcode Command Line Tools。
- `long` 的拼接按行比较（忽略左右各 24px 以排除滚动条，亮度容差 ±4），对内容完全重复的页面（例如大段相同的列表项）可能会多删或少删几行；拼接失败会在 stderr 警告，并建议改 `--step`、`--at` 或 `--skip-*`。`--keep-pages DIR` 保留分页截图便于排查。
- `long` 会真的滚动目标窗口，并把鼠标移到窗口上；结束后恢复滚动位置和鼠标，但正在编辑的内容状态（光标、选区）可能变化。不要对正在被人使用的窗口做。
- 截图会把屏幕上的一切都带进去，包括终端里显示的密钥。给别人或模型看之前先确认画面内容。
- 同一份 `capturekit.swift` 也随 `screen-record` skill 分发，两处内容相同。
