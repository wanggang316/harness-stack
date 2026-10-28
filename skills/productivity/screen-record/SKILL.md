---
name: screen-record
description: |
  在 macOS 上以脚本方式录屏并处理视频：录整块显示器 / 单个窗口 / 指定区域，定时录（run）、后台录 start/stop、包住一条命令录（wrap，记录操作前后画面），录完按需缩放 / 降帧 / 压缩（h264 / hevc）、转 mp4 / mov / webm / gif、剪辑；以及"拼帧"：从视频里按画面变化抽关键帧，生成带时间标签的 contact sheet 和 metadata.json，方便喂给模型。依赖系统 `screencapture` 与 `ffmpeg`，外加一个首次运行自动编译的 Swift 辅助程序。当需要录下一段操作过程、把演示视频压小 / 转 gif、或让模型"看完一段录屏"时，Agent 调用本 skill 的 `scripts/record.sh`；用户也可显式输入 `/screen-record <子命令> ...` 触发。
---

# Screen Record Skill

macOS 下无人值守录屏 + 视频后处理 + 关键帧提取。核心是 `scripts/record.sh`，输出一行摘要或 `--json`。

## When to Use

- **录过程**：记录一段 UI 操作、演示、bug 复现；`wrap` 可以包住一条命令，自动在命令前后录。
- **缩体积 / 转格式**：把 4K 60fps 的原始录屏压成能发的 mp4、gif、webm；剪掉头尾。
- **给模型看**：`frames` 从视频中抽出有变化的关键帧 + 一张拼图，模型看一张图就能了解全过程，不用逐帧看。
- **显式触发**：用户输入 `/screen-record <子命令> ...`。

**不要用于**：静态截图（用 `screenshot` skill）；需要可信证据链 / 操作轨迹的 UI 自动化测试（用专门的自动化工具）。

## 权限与依赖

- 「屏幕录制」授权挂在**发起命令的宿主 App** 上（Codans、Ghostty、Terminal……）。`record.sh doctor` 查看状态；未授权用 `doctor --request` 触发弹窗，然后在 系统设置 > 隐私与安全性 > 屏幕与系统录音 勾选宿主 App 并重启它。
- `ffmpeg`：所有后处理和 `--engine ffmpeg` 都需要，`brew install ffmpeg`。
- 需要图形会话（`doctor` 的 `GUI session` 为 `Aqua`）；SSH / launchd 下录不到。
- 默认不录音频（`--audio` 才录默认输入设备），避免把机器正在播放的内容录进去。

## 用法

脚本路径：`<本 skill 目录>/scripts/record.sh`（即本 SKILL.md 所在目录下的 `scripts/`）

```text
record.sh doctor [--request]
record.sh run    [target] [capture] [post] --duration S [--out F] [--json]
record.sh start  [target] [capture] [post] [--max-duration S] [--out F] [--json]
record.sh stop   [--json]
record.sh status [--json]
record.sh wrap   [target] [capture] [post] [--pre-roll S] [--post-roll S] [--out F] [--json] -- <command...>
record.sh compress <video> [--max PX] [--fps N] [--crf N] [--codec h264|hevc|h264_vt] [--out F]
record.sh convert  <video> --to mp4|mov|webm|gif [--max PX] [--fps N] [--crf N] [--out F]
record.sh trim     <video> --start S [--end S | --duration S] [--out F]
record.sh frames   <video> [--threshold T] [--heartbeat S] [--sample-fps N] [--max-frames N]
                           [--max PX] [--cols N] [--out-dir D] [--no-contact] [--json]
record.sh info     <video> [--json]

target : --screen N | --window (--app NAME | --id ID | --title TEXT | --front) | --region x,y,w,h   （默认主屏）
capture: --engine screencapture|ffmpeg  --fps N  --clicks  --audio
post   : --max PX  --out-fps N  --crf N  --codec ...  --keep-raw                  （录完自动应用）
```

| 子命令 | 说明 |
|---|---|
| `run` | 前台录固定时长，结束后应用 post 选项输出 mp4 |
| `start` / `stop` / `status` | 后台录制；状态存 `~/.cache/screen-record/active`，同一时间只允许一个。`--max-duration` 到时自动停，之后仍需 `stop` 做收尾 |
| `wrap` | `start` → 等 `--pre-roll` → 执行命令 → 等 `--post-roll` → `stop`；退出码等于命令的退出码，`--json` 时输出 `{"exit_code", "video"}` |
| `compress` | 重新编码：`--max` 长边（默认 1280）、`--fps`、`--crf`（默认 28）、`--codec hevc` 更小、`h264_vt` 硬件编码更快 |
| `convert` | mp4/mov 在无需缩放时直接 remux（不重编码）；gif 走两遍调色板（默认 10fps、长边 800）；webm 用 VP9 |
| `trim` | 按时间剪，重编码保证精确到帧 |
| `frames` | 关键帧提取 + contact sheet，见下 |
| `info` | 时长、分辨率、帧率、编码、字节数 |

两种采集引擎：

| | `screencapture`（默认） | `ffmpeg`（`--engine ffmpeg`） |
|---|---|---|
| 实现 | 系统 ScreenCaptureKit，H.264 .mov | avfoundation 输入，实时 libx264 |
| 帧率 | 可变 30–60fps，不可设 | `--fps` 固定（默认 15） |
| 窗口 | 真正只录该窗口（`-l`），不受遮挡影响 | 只能按窗口位置裁剪整屏，遮挡会录进去 |
| 光标 / 点击 | `--clicks` 显示点击 | `--clicks` 显示光标和点击 |
| 开销 | 低 | 编码占 CPU |

默认输出 `~/.screen-record/record-<时间戳>.mp4`（`RECORD_DIR` 或 `--out` 可改）。不带 post 选项时只做 remux，保留原始画质；要缩小用 `--max 1280 --out-fps 15`。

退出码：`0` 成功 · `1` 运行错误 · `2` 缺权限 · `3` 目标不存在 · `64` 用法错误；`wrap` 返回被包命令的退出码。

## 拼帧：`frames`

在录完的视频上离线做，思路是"只保留有变化的帧"：

1. 按 `--sample-fps`（默认 2）采样，长边缩到 `--max`（默认 1440）。
2. 用 ffmpeg 的场景变化分数（0–1）和上一帧比，超过 `--threshold`（默认 0.02）判定为 `motion` 保留。
3. 距离上一次保留超过 `--heartbeat` 秒（默认 5，`0` 关闭）兜底保留一帧 `heartbeat`，保证小改动最晚 5 秒内也被记录。
4. 最多 `--max-frames`（默认 60）帧，产物：`frame-NNNN.png`、`contact.png`（`--cols` 列网格，每格标注 `#序号 t=时间 原因`）、`metadata.json`。

UI 操作的变化分数通常在 0.01–0.1 之间，阈值可按需调：录屏里有持续动画时调高，想抓细微改动时调低。

## 示例

```bash
R="<本 skill 目录>/scripts/record.sh"

# 录主屏 10 秒，输出 1280 宽 15fps 的 mp4
"$R" run --duration 10 --max 1280 --out-fps 15

# 只录某个窗口
"$R" run --app Safari --duration 8 --clicks

# 后台录区域，做完事再停
"$R" start --region 0,30,1341,1050 --max-duration 300
...
"$R" stop --json

# 包住一条命令，记录它前后屏幕发生了什么
"$R" wrap --front --post-roll 2 --json -- ./run-ui-test.sh

# 固定 10fps、带光标，用 ffmpeg 引擎
"$R" run --engine ffmpeg --fps 10 --clicks --duration 20

# 后处理
"$R" compress demo.mp4 --max 1280 --fps 15            # -> demo-small.mp4
"$R" compress demo.mp4 --codec hevc --crf 30
"$R" convert demo.mp4 --to gif --max 640 --fps 8
"$R" convert demo.mov --to mp4                        # remux only
"$R" trim demo.mp4 --start 3 --duration 10

# 给模型看：关键帧 + 拼图
"$R" frames demo.mp4 --threshold 0.02 --heartbeat 5 --cols 4
# 然后 Read demo-frames/contact.png，再按需 Read 单帧
```

## 工作机制与限制

- 后台录制通过 SIGINT 停止，`screencapture` 和 `ffmpeg` 都会在 SIGINT 后把文件写完整；不要 `kill -9`。`screencapture -V` 时收到 SIGINT 会丢弃文件，所以 `start --max-duration` 用脚本内的 watchdog 实现而不是 `-V`。
- 窗口录制会随窗口移动 / 缩放，窗口关闭则录制结束；最小化或在别的 Space 的窗口无法开始录（exit 3）。
- `capturekit.swift` 与 `screenshot` skill 的是同一份（权限预检、窗口枚举、拼图绘制），首次运行用 `swiftc` 编译，缓存在 `~/.cache/capturekit/`。
- 录屏会把屏幕上的一切都带进去，包括其他窗口里显示的密钥。尽量用 `--window` / `--region` 缩小范围，分享前检查内容。
