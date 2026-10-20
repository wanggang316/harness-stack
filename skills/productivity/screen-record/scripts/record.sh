#!/usr/bin/env bash
# record.sh — record the macOS screen from a script, then shrink, convert or
# distil the result.
#
# Capture is done by the system `screencapture -v` (ScreenCaptureKit, H.264,
# variable ~30-60 fps, no size control) or by `ffmpeg -f avfoundation` (fixed
# fps, cursor/click overlay, re-encoded on the fly). Everything after capture
# is ffmpeg. The `capturekit` Swift helper next to this file (compiled on first
# use) answers window / display / permission questions and draws contact sheets.
#
#   doctor    permissions, host app, tools, devices
#   run       record for a fixed duration (foreground)
#   start     begin a background recording; stop ends it; status shows it
#   wrap      record around a command: start, run it, stop; exits with its status
#   compress  re-encode smaller (max side, fps, crf, codec)
#   convert   mp4 / mov / webm / gif
#   trim      cut a time range
#   frames    change-aware keyframes + contact sheet + metadata.json
#   info      duration, size, fps, codec
#
# Permissions: the Screen Recording grant belongs to the HOST app the command
# runs from (Terminal, Ghostty, Codans, ...), not to this script.
# macOS bash 3.2 compatible.
set -euo pipefail

PROG=$(basename "$0")
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
KIT_SRC="$SCRIPT_DIR/capturekit.swift"
KIT_CACHE="${CAPTUREKIT_CACHE:-$HOME/.cache/capturekit}"
OUT_DIR="${RECORD_DIR:-$HOME/.screen-record}"
STATE_DIR="${RECORD_STATE_DIR:-$HOME/.cache/screen-record}"
STATE="$STATE_DIR/active"

die() { printf 'record: %s\n' "$1" >&2; exit "${2:-1}"; }
note() { printf 'record: %s\n' "$*" >&2; }

usage() {
  cat >&2 <<EOF
Usage:
  $PROG doctor [--request]
  $PROG run    [target] [capture] [post] --duration S [--out F] [--json]
  $PROG start  [target] [capture] [post] [--max-duration S] [--out F] [--json]
  $PROG stop   [--json]
  $PROG status [--json]
  $PROG wrap   [target] [capture] [post] [--pre-roll S] [--post-roll S] [--out F] [--json] -- <command...>
  $PROG compress <video> [--max PX] [--fps N] [--crf N] [--codec h264|hevc|h264_vt] [--out F]
  $PROG convert  <video> --to mp4|mov|webm|gif [--max PX] [--fps N] [--crf N] [--out F]
  $PROG trim     <video> --start S [--end S | --duration S] [--out F]
  $PROG frames   <video> [--threshold T] [--heartbeat S] [--sample-fps N] [--max-frames N]
                         [--max PX] [--cols N] [--out-dir D] [--no-contact] [--json]
  $PROG info     <video> [--json]

Target (default: main display):
  --screen N                 display number as 'screen list' prints it (1 = main)
  --window (--app NAME | --id ID | --title TEXT | --front)
  --region x,y,w,h           screen points, global coordinates
Capture:
  --engine screencapture|ffmpeg   default screencapture; ffmpeg gives fixed --fps and
                                  cursor/click overlays but can only crop, not isolate, a window
  --fps N                    ffmpeg engine only (default 15)
  --clicks                   show mouse clicks (screencapture) / cursor+clicks (ffmpeg)
  --audio                    record the default input device (off by default)
Post (applied after capture, via ffmpeg; without any the raw file is only remuxed):
  --max PX                   scale so the longer side is at most PX
  --out-fps N                drop to N fps
  --crf N                    H.264 quality, lower is better (default 28 when re-encoding)
  --keep-raw                 keep the raw capture next to the final file

Exit codes: 0 ok, 1 runtime, 2 permission missing, 3 target not found, 64 usage.
Set RECORD_DIR to change the default output directory (currently $OUT_DIR).
EOF
  exit 64
}

# ---------- helpers ----------

ensure_kit() {
  command -v swiftc >/dev/null 2>&1 || die "swiftc not found; install Xcode Command Line Tools: xcode-select --install"
  [ -f "$KIT_SRC" ] || die "missing helper source: $KIT_SRC"
  local hash dir
  hash=$(shasum -a 256 "$KIT_SRC" | cut -c1-16)
  dir="$KIT_CACHE/$hash"
  KIT="$dir/capturekit"
  if [ ! -x "$KIT" ]; then
    mkdir -p "$dir"
    note "compiling capturekit helper (first run, ~2s)..."
    if ! swiftc -O -o "$KIT.tmp" "$KIT_SRC" 2>"$dir/build.log"; then
      cat "$dir/build.log" >&2
      die "capturekit failed to compile (see $dir/build.log)"
    fi
    mv "$KIT.tmp" "$KIT"
  fi
}

need() { command -v "$1" >/dev/null 2>&1 || die "$1 not found${2:+; $2}"; }
need_ffmpeg() { need ffmpeg "install with: brew install ffmpeg"; need ffprobe "install with: brew install ffmpeg"; }

timestamp() { date +%Y%m%d-%H%M%S; }
abspath() { case "$1" in /*) printf '%s\n' "$1" ;; *) printf '%s/%s\n' "$(pwd)" "$1" ;; esac; }
file_bytes() { stat -f %z "$1"; }

check_permission() {
  ensure_kit
  if ! "$KIT" preflight >/dev/null 2>&1; then
    local host; host="${__CFBundleIdentifier:-${TERM_PROGRAM:-this terminal}}"
    die "Screen Recording is not granted to the host app ($host).
Run '$PROG doctor --request' to trigger the prompt, then enable the host app in
System Settings > Privacy & Security > Screen & System Audio Recording, and restart it." 2
  fi
}

# ffprobe summary: sets V_DURATION V_W V_H V_FPS V_CODEC
probe() {
  local line
  line=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,avg_frame_rate:format=duration \
    -of default=noprint_wrappers=1 "$1" 2>/dev/null) || die "not a readable video: $1"
  V_W=$(printf '%s\n' "$line" | awk -F= '/^width/{print $2}')
  V_H=$(printf '%s\n' "$line" | awk -F= '/^height/{print $2}')
  V_CODEC=$(printf '%s\n' "$line" | awk -F= '/^codec_name/{print $2}')
  V_FPS=$(printf '%s\n' "$line" | awk -F= '/^avg_frame_rate/{split($2,a,"/"); if (a[2]>0) printf "%.1f", a[1]/a[2]; else print 0}')
  V_DURATION=$(printf '%s\n' "$line" | awk -F= '/^duration/{printf "%.2f", $2}')
}

report() { # path
  probe "$1"
  if [ "$JSON" = 1 ]; then
    printf '{"path":"%s","duration":%s,"width":%s,"height":%s,"fps":%s,"codec":"%s","bytes":%s}\n' \
      "$1" "$V_DURATION" "$V_W" "$V_H" "$V_FPS" "$V_CODEC" "$(file_bytes "$1")"
  else
    printf '%s (%ss, %sx%s, %s fps, %s, %s bytes)\n' "$1" "$V_DURATION" "$V_W" "$V_H" "$V_FPS" "$V_CODEC" "$(file_bytes "$1")"
  fi
}

# Resolve --window target into WIN_* (plain line from capturekit).
resolve_window() {
  ensure_kit
  local line lines
  if [ "$FRONT" = 1 ]; then
    line=$("$KIT" front --plain 2>/dev/null) || die "no frontmost window on screen" 3
  else
    local q=()
    [ -n "$APP" ] && q+=(--app "$APP")
    [ -n "$WID" ] && q+=(--id "$WID")
    [ -n "$TITLE" ] && q+=(--title "$TITLE")
    [ ${#q[@]} -gt 0 ] || die "--window needs --app NAME | --id ID | --title TEXT | --front" 64
    lines=$("$KIT" windows --plain "${q[@]}")
    [ -n "$lines" ] || die "no window matches${APP:+ app '$APP'}${TITLE:+ title '$TITLE'}${WID:+ id $WID}" 3
    line=$(printf '%s\n' "$lines" | awk -F'\t' '$3==1{print; exit}')
    [ -n "$line" ] || die "matching window(s) exist but none is on screen (minimized or on another Space)" 3
  fi
  IFS=$'\t' read -r WIN_ID WIN_PID WIN_ON WIN_X WIN_Y WIN_W WIN_H WIN_SCALE WIN_APP WIN_TITLE <<<"$line"
}

# Builds the capture command into CAPTURE_CMD (array) for the chosen engine,
# writing to RAW. Sets RAW_EXT.
build_capture() { # max_duration_or_empty
  local limit=$1
  if [ "$ENGINE" = ffmpeg ]; then
    need_ffmpeg
    RAW_EXT=mp4
    local idx=0 vf=""
    if [ -n "$SCREEN" ]; then idx=$((SCREEN - 1)); fi
    # avfoundation lists cameras first; "Capture screen N" entries follow in display order.
    local dev
    # -list_devices always exits non-zero; only the listing matters.
    dev=$({ ffmpeg -hide_banner -f avfoundation -list_devices true -i "" 2>&1 || true; } | awk -v n="$idx" '/Capture screen/{if (c==n){match($0,/\[[0-9]+\] Capture/); s=substr($0,RSTART+1); sub(/\].*/,"",s); print s; exit} c++}')
    [ -n "$dev" ] || die "avfoundation has no 'Capture screen $idx' device" 3
    if [ -n "$REGION" ] || [ "$WINDOW" = 1 ]; then
      local rx ry rw rh scale
      if [ "$WINDOW" = 1 ]; then rx=$WIN_X; ry=$WIN_Y; rw=$WIN_W; rh=$WIN_H; scale=$WIN_SCALE
      else IFS=, read -r rx ry rw rh <<<"$REGION"; scale=$("$KIT" displays | awk -F': ' '/"main" : true/{m=1} /"scale"/{s=$2; gsub(/,/,"",s)} END{print s}'); fi
      # avfoundation delivers pixels; window/region are points.
      vf="crop=$(awk -v w="$rw" -v h="$rh" -v x="$rx" -v y="$ry" -v s="$scale" 'BEGIN{printf "%d:%d:%d:%d", int(w*s/2)*2, int(h*s/2)*2, x*s, y*s}')"
    fi
    CAPTURE_CMD=(ffmpeg -hide_banner -loglevel error -y -f avfoundation -framerate "$FPS" -pixel_format nv12
      -capture_cursor "$CLICKS" -capture_mouse_clicks "$CLICKS" -i "$dev:$([ "$AUDIO" = 1 ] && echo 0 || echo none)")
    [ -z "$vf" ] || CAPTURE_CMD+=(-vf "$vf")
    [ -z "$limit" ] || CAPTURE_CMD+=(-t "$limit")
    CAPTURE_CMD+=(-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -movflags +faststart)
    [ "$AUDIO" = 1 ] && CAPTURE_CMD+=(-c:a aac) || CAPTURE_CMD+=(-an)
    CAPTURE_CMD+=("$RAW")
  else
    RAW_EXT=mov
    CAPTURE_CMD=(screencapture -x -v)
    [ -z "$limit" ] || CAPTURE_CMD+=(-V "$limit")
    [ "$CLICKS" = 1 ] && CAPTURE_CMD+=(-k)
    [ "$AUDIO" = 1 ] && CAPTURE_CMD+=(-g)
    if [ "$WINDOW" = 1 ]; then CAPTURE_CMD+=(-l "$WIN_ID")
    elif [ -n "$REGION" ]; then CAPTURE_CMD+=(-R "$REGION")
    else CAPTURE_CMD+=(-D "${SCREEN:-1}"); fi
    CAPTURE_CMD+=("$RAW")
  fi
}

# Turn RAW into OUT applying post options; removes RAW unless --keep-raw.
finalize() { # raw out
  local raw=$1 out=$2
  need_ffmpeg
  [ -s "$raw" ] || die "capture produced no file ($raw); target gone, or Screen Recording not granted to the host app?"
  mkdir -p "$(dirname "$out")"
  if [ -z "$MAX" ] && [ -z "$OUT_FPS" ] && [ -z "$CRF" ]; then
    case "${out##*.}" in
      mp4|mov|m4v) ffmpeg -hide_banner -loglevel error -y -i "$raw" -c copy -movflags +faststart "$out" ;;
      *) encode "$raw" "$out" ;;
    esac
  else
    encode "$raw" "$out"
  fi
  [ "$KEEP_RAW" = 1 ] || rm -f "$raw"
}

# ffmpeg re-encode honouring MAX / OUT_FPS / CRF / CODEC. Even dimensions for H.264.
encode() { # in out
  local in=$1 out=$2 vf="" codec=() ext="${2##*.}"
  [ -z "$MAX" ] || vf="scale='min($MAX,iw)':'min($MAX,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"
  [ -z "$OUT_FPS" ] || vf="${vf:+$vf,}fps=$OUT_FPS"
  [ -n "$vf" ] || vf="scale=trunc(iw/2)*2:trunc(ih/2)*2"
  case "$ext" in
    webm) codec=(-c:v libvpx-vp9 -crf "${CRF:-33}" -b:v 0 -row-mt 1) ;;
    gif) gif "$in" "$out" "$vf"; return ;;
    *)
      case "${CODEC:-h264}" in
        h264) codec=(-c:v libx264 -preset veryfast -crf "${CRF:-28}" -pix_fmt yuv420p) ;;
        hevc) codec=(-c:v libx265 -preset fast -crf "${CRF:-30}" -tag:v hvc1 -pix_fmt yuv420p) ;;
        h264_vt) codec=(-c:v h264_videotoolbox -q:v "${VT_QUALITY:-55}" -pix_fmt yuv420p) ;;
        *) die "unknown codec $CODEC (h264|hevc|h264_vt)" 64 ;;
      esac
      codec+=(-movflags +faststart) ;;
  esac
  ffmpeg -hide_banner -loglevel error -y -i "$in" -vf "$vf" "${codec[@]}" -an "$out"
}

gif() { # in out vf
  local palette; palette=$(mktemp "${TMPDIR:-/tmp}/record-palette.XXXXXX.png")
  ffmpeg -hide_banner -loglevel error -y -i "$1" -vf "$3,palettegen=stats_mode=diff" "$palette"
  ffmpeg -hide_banner -loglevel error -y -i "$1" -i "$palette" -lavfi "$3 [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "$2"
  rm -f "$palette"
}

write_state() { # pid raw out engine started watchdog
  mkdir -p "$STATE_DIR"
  printf 'pid=%s\nraw=%s\nout=%s\nengine=%s\nstarted=%s\nwatchdog=%s\nmax=%s\nout_fps=%s\ncrf=%s\ncodec=%s\nkeep_raw=%s\n' \
    "$1" "$2" "$3" "$4" "$5" "$6" "$MAX" "$OUT_FPS" "$CRF" "$CODEC" "$KEEP_RAW" >"$STATE"
}

read_state() {
  [ -f "$STATE" ] || return 1
  S_PID=$(awk -F= '/^pid=/{print $2}' "$STATE")
  S_RAW=$(awk -F= '/^raw=/{print $2}' "$STATE")
  S_OUT=$(awk -F= '/^out=/{print $2}' "$STATE")
  S_ENGINE=$(awk -F= '/^engine=/{print $2}' "$STATE")
  S_STARTED=$(awk -F= '/^started=/{print $2}' "$STATE")
  S_WATCHDOG=$(awk -F= '/^watchdog=/{print $2}' "$STATE")
  MAX=${MAX:-$(awk -F= '/^max=/{print $2}' "$STATE")}
  OUT_FPS=${OUT_FPS:-$(awk -F= '/^out_fps=/{print $2}' "$STATE")}
  CRF=${CRF:-$(awk -F= '/^crf=/{print $2}' "$STATE")}
  CODEC=${CODEC:-$(awk -F= '/^codec=/{print $2}' "$STATE")}
  [ "$KEEP_RAW" = 1 ] || KEEP_RAW=$(awk -F= '/^keep_raw=/{print $2}' "$STATE")
}

running() { kill -0 "$1" 2>/dev/null; }

prepare_target() {
  check_permission
  [ "$WINDOW" = 1 ] && resolve_window
  if [ -n "$REGION" ]; then
    printf '%s' "$REGION" | grep -Eq '^-?[0-9]+,-?[0-9]+,[0-9]+,[0-9]+$' || die "bad --region '$REGION' (want x,y,w,h)" 64
  fi
  if [ -n "$SCREEN" ]; then
    printf '%s' "$SCREEN" | grep -Eq '^[0-9]+$' || die "--screen expects a number (1 = main)" 64
  fi
  return 0
}

default_out() { # kind
  local ext=mp4
  OUT=${OUT:-"$OUT_DIR/$1-$(timestamp).$ext"}
  OUT=$(abspath "$OUT")
}

# ---------- subcommands ----------

cmd_doctor() {
  ensure_kit
  [ "${1:-}" = --request ] && { "$KIT" request >/dev/null 2>&1 || true; }
  local pre ok=0
  pre=$("$KIT" preflight 2>/dev/null) || true
  echo "Host app:          ${__CFBundleIdentifier:-${TERM_PROGRAM:-unknown}} (grants belong to this app)"
  echo "GUI session:       $(launchctl managername 2>/dev/null || echo unknown) (needs Aqua)"
  case "$pre" in *'"screen_recording" : true'*) echo "Screen Recording:  granted"; ok=1 ;; *) echo "Screen Recording:  NOT granted  -> $PROG doctor --request, then enable the host app in System Settings" ;; esac
  echo "Displays:          $("$KIT" displays | grep -c '"id"') (screencapture -D 1 = main)"
  printf 'Tools:             screencapture swiftc'
  for t in ffmpeg ffprobe gifski; do command -v $t >/dev/null 2>&1 && printf ' %s' "$t"; done
  echo
  if command -v ffmpeg >/dev/null 2>&1; then
    echo "ffmpeg encoders:   $(ffmpeg -hide_banner -encoders 2>/dev/null | awk '/libx264|libx265|h264_videotoolbox|libvpx-vp9/{printf "%s ", $2}')"
    echo "avfoundation:      $(ffmpeg -hide_banner -f avfoundation -list_devices true -i "" 2>&1 | grep -c 'Capture screen') screen device(s)"
  else
    echo "ffmpeg:            missing (brew install ffmpeg) - needed by every post-processing command"
  fi
  if read_state 2>/dev/null && running "$S_PID"; then echo "Active recording:  pid $S_PID -> $S_OUT"; fi
  echo "Output dir:        $OUT_DIR"
  [ $ok = 1 ] || exit 2
}

cmd_run() {
  local duration=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --duration) duration=$2; shift 2 ;;
      *) parse_opt "$1" "${2:-}"; shift $SHIFT ;;
    esac
  done
  [ -n "$duration" ] || die "run needs --duration S" 64
  prepare_target; default_out record
  RAW="${OUT%.*}.raw.$([ "$ENGINE" = ffmpeg ] && echo mp4 || echo mov)"
  mkdir -p "$(dirname "$OUT")"
  build_capture "$duration"
  # ffmpeg's avfoundation input logs harmless objc class warnings; drop them.
  "${CAPTURE_CMD[@]}" </dev/null 2> >(grep -v 'not linked into application' >&2 || true)
  finalize "$RAW" "$OUT"
  report "$OUT"
}

cmd_start() {
  local max=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --max-duration) max=$2; shift 2 ;;
      *) parse_opt "$1" "${2:-}"; shift $SHIFT ;;
    esac
  done
  if read_state 2>/dev/null && running "$S_PID"; then die "a recording is already running (pid $S_PID -> $S_OUT); run '$PROG stop' first"; fi
  prepare_target; default_out record
  RAW="${OUT%.*}.raw.$([ "$ENGINE" = ffmpeg ] && echo mp4 || echo mov)"
  mkdir -p "$(dirname "$OUT")" "$STATE_DIR"
  # screencapture discards the movie when SIGINT arrives while -V is set, so the
  # limit is enforced by a watchdog instead; ffmpeg's -t and SIGINT coexist fine.
  if [ "$ENGINE" = ffmpeg ]; then build_capture "$max"; else build_capture ""; fi
  # A non-interactive bash starts background jobs with SIGINT ignored; the
  # recorder must see SIGINT to finalize its file, so reset it before exec.
  perl -e '$SIG{INT} = "DEFAULT"; exec @ARGV or die "exec: $!"' -- "${CAPTURE_CMD[@]}" </dev/null >"$STATE_DIR.log" 2>&1 &
  local pid=$! watchdog=""
  if [ -n "$max" ] && [ "$ENGINE" != ffmpeg ]; then
    ( sleep "$max"; kill -INT "$pid" 2>/dev/null ) >/dev/null 2>&1 &
    watchdog=$!
  fi
  write_state "$pid" "$RAW" "$OUT" "$ENGINE" "$(date +%s)" "$watchdog"
  sleep 1
  running "$pid" || { cat "$STATE_DIR.log" >&2 2>/dev/null; rm -f "$STATE"; die "recorder exited immediately"; }
  if [ "$JSON" = 1 ]; then printf '{"pid":%s,"out":"%s","raw":"%s"}\n' "$pid" "$OUT" "$RAW"
  else echo "recording (pid $pid) -> $OUT${max:+, stops after ${max}s}"; fi
}

cmd_stop() {
  while [ $# -gt 0 ]; do parse_opt "$1" "${2:-}"; shift $SHIFT; done
  read_state || die "no active recording"
  [ -z "$S_WATCHDOG" ] || kill "$S_WATCHDOG" 2>/dev/null || true
  if running "$S_PID"; then
    # SIGINT lets both screencapture and ffmpeg write a complete file.
    kill -INT "$S_PID" 2>/dev/null || true
    local i=0
    while running "$S_PID" && [ $i -lt 100 ]; do sleep 0.1; i=$((i + 1)); done
    running "$S_PID" && die "recorder (pid $S_PID) did not exit after SIGINT; not touching it"
  fi
  rm -f "$STATE"
  local i=0
  while [ ! -s "$S_RAW" ] && [ $i -lt 30 ]; do sleep 0.1; i=$((i + 1)); done
  [ -s "$S_RAW" ] || die "recorder left no file at $S_RAW (see $STATE_DIR.log)"
  finalize "$S_RAW" "$S_OUT"
  report "$S_OUT"
}

cmd_status() {
  while [ $# -gt 0 ]; do parse_opt "$1" "${2:-}"; shift $SHIFT; done
  if ! read_state; then [ "$JSON" = 1 ] && echo '{"active":false}' || echo "no active recording"; return; fi
  local alive=false elapsed
  running "$S_PID" && alive=true
  elapsed=$(( $(date +%s) - S_STARTED ))
  if [ "$JSON" = 1 ]; then printf '{"active":%s,"pid":%s,"out":"%s","elapsed":%s,"engine":"%s"}\n' "$alive" "$S_PID" "$S_OUT" "$elapsed" "$S_ENGINE"
  else echo "pid $S_PID alive=$alive elapsed=${elapsed}s engine=$S_ENGINE -> $S_OUT"; fi
}

cmd_wrap() {
  local pre=0.5 post=1 cmd=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --pre-roll) pre=$2; shift 2 ;;
      --post-roll) post=$2; shift 2 ;;
      --) shift; cmd=("$@"); break ;;
      *) parse_opt "$1" "${2:-}"; shift $SHIFT ;;
    esac
  done
  [ ${#cmd[@]} -gt 0 ] || die "wrap needs '-- <command...>'" 64
  local saved_json=$JSON
  JSON=0 cmd_start >/dev/null
  sleep "$pre"
  local status=0
  "${cmd[@]}" || status=$?
  sleep "$post"
  JSON=$saved_json
  if [ "$JSON" = 1 ]; then
    local video; video=$(cmd_stop)
    printf '{"exit_code":%s,"video":%s}\n' "$status" "$video"
  else
    cmd_stop
    echo "command exit code: $status"
  fi
  return $status
}

cmd_compress() {
  local src="" out=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --max) MAX=$2; shift 2 ;;
      --fps) OUT_FPS=$2; shift 2 ;;
      --crf) CRF=$2; shift 2 ;;
      --codec) CODEC=$2; shift 2 ;;
      --out) out=$2; shift 2 ;;
      --json) JSON=1; shift ;;
      --*) die "unknown option $1" 64 ;;
      *) src=$1; shift ;;
    esac
  done
  [ -n "$src" ] && [ -f "$src" ] || die "compress needs an existing video" 64
  need_ffmpeg
  src=$(abspath "$src")
  [ -n "$out" ] || out="${src%.*}-small.mp4"
  [ "$out" != "$src" ] || die "refusing to overwrite the source; pass --out"
  [ -n "$MAX$OUT_FPS" ] || MAX=1280
  local before; before=$(file_bytes "$src")
  encode "$src" "$(abspath "$out")"
  [ "$JSON" = 1 ] || note "size: $before -> $(file_bytes "$out") bytes"
  report "$(abspath "$out")"
}

cmd_convert() {
  local src="" out="" to=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --to) to=$2; shift 2 ;;
      --max) MAX=$2; shift 2 ;;
      --fps) OUT_FPS=$2; shift 2 ;;
      --crf) CRF=$2; shift 2 ;;
      --out) out=$2; shift 2 ;;
      --json) JSON=1; shift ;;
      --*) die "unknown option $1" 64 ;;
      *) src=$1; shift ;;
    esac
  done
  [ -n "$src" ] && [ -f "$src" ] || die "convert needs an existing video" 64
  [ -n "$to" ] || die "convert needs --to mp4|mov|webm|gif" 64
  need_ffmpeg
  src=$(abspath "$src")
  [ -n "$out" ] || out="${src%.*}.$to"
  [ "$out" != "$src" ] || out="${src%.*}-converted.$to"
  out=$(abspath "$out")
  case "$to" in
    gif) [ -n "$OUT_FPS" ] || OUT_FPS=10; [ -n "$MAX" ] || MAX=800; encode "$src" "$out" ;;
    webm) encode "$src" "$out" ;;
    mp4|mov)
      probe "$src"
      if [ -z "$MAX$OUT_FPS$CRF" ] && [ "$V_CODEC" = h264 ]; then
        ffmpeg -hide_banner -loglevel error -y -i "$src" -c copy -movflags +faststart "$out"
      else encode "$src" "$out"; fi ;;
    *) die "unsupported target format $to (mp4|mov|webm|gif)" 64 ;;
  esac
  if [ "$to" = gif ]; then
    [ "$JSON" = 1 ] && printf '{"path":"%s","bytes":%s}\n' "$out" "$(file_bytes "$out")" || echo "$out ($(file_bytes "$out") bytes)"
  else report "$out"; fi
}

cmd_trim() {
  local src="" out="" start="" end="" duration=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --start) start=$2; shift 2 ;;
      --end) end=$2; shift 2 ;;
      --duration) duration=$2; shift 2 ;;
      --out) out=$2; shift 2 ;;
      --json) JSON=1; shift ;;
      --*) die "unknown option $1" 64 ;;
      *) src=$1; shift ;;
    esac
  done
  [ -n "$src" ] && [ -f "$src" ] || die "trim needs an existing video" 64
  [ -n "$start" ] || die "trim needs --start S" 64
  need_ffmpeg
  src=$(abspath "$src")
  [ -n "$out" ] || out="${src%.*}-trim.${src##*.}"
  out=$(abspath "$out")
  local range=(-ss "$start")
  [ -z "$end" ] || range+=(-to "$end")
  [ -z "$duration" ] || range+=(-t "$duration")
  # Re-encode so the cut lands on the exact frame, not the previous keyframe.
  ffmpeg -hide_banner -loglevel error -y "${range[@]}" -i "$src" -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -movflags +faststart -an "$out"
  report "$out"
}

# Change-aware keyframes: sample at --sample-fps, keep a frame when ffmpeg's
# scene score against the previous sample exceeds --threshold or when
# --heartbeat seconds passed since the last kept frame. Then a contact sheet.
cmd_frames() {
  local src="" out_dir="" threshold=0.02 heartbeat=5 sample_fps=2 max_frames=60 max_px=1440 cols=4 contact=1
  while [ $# -gt 0 ]; do
    case "$1" in
      --threshold) threshold=$2; shift 2 ;;
      --heartbeat) heartbeat=$2; shift 2 ;;
      --sample-fps) sample_fps=$2; shift 2 ;;
      --max-frames) max_frames=$2; shift 2 ;;
      --max) max_px=$2; shift 2 ;;
      --cols) cols=$2; shift 2 ;;
      --out-dir) out_dir=$2; shift 2 ;;
      --no-contact) contact=0; shift ;;
      --json) JSON=1; shift ;;
      --*) die "unknown option $1" 64 ;;
      *) src=$1; shift ;;
    esac
  done
  [ -n "$src" ] && [ -f "$src" ] || die "frames needs an existing video" 64
  need_ffmpeg; ensure_kit
  src=$(abspath "$src")
  [ -n "$out_dir" ] || out_dir="${src%.*}-frames"
  out_dir=$(abspath "$out_dir")
  mkdir -p "$out_dir"
  rm -f "$out_dir"/frame-*.png "$out_dir"/contact.png "$out_dir"/metadata.json
  local hb_expr="gte(t-prev_selected_t,$heartbeat)"
  [ "$heartbeat" != 0 ] || hb_expr=0
  local meta="$out_dir/.scene.txt"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -vf "fps=$sample_fps,scale='min($max_px,iw)':'min($max_px,ih)':force_original_aspect_ratio=decrease,select='gt(scene,$threshold)+isnan(prev_selected_t)+$hb_expr',metadata=print:key=lavfi.scene_score:file=$meta" \
    -fps_mode vfr -frames:v "$max_frames" "$out_dir/frame-%04d.png" \
    || die "ffmpeg frame extraction failed"
  local count; count=$(ls "$out_dir"/frame-*.png 2>/dev/null | wc -l | tr -d ' ')
  [ "$count" -gt 0 ] || die "no frames extracted"
  # .scene.txt pairs "frame:N pts_time:T" lines with "lavfi.scene_score=S" lines.
  local rows
  rows=$(awk -v thr="$threshold" '
    /^frame:/ { n++; t=0; for (i=1;i<=NF;i++) if ($i ~ /^pts_time:/) t=substr($i,10) }
    /scene_score=/ { s=substr($0, index($0,"=")+1) + 0
      print n, t, s, (n==1) ? "first" : (s > thr ? "motion" : "heartbeat") }' "$meta")
  rm -f "$meta"
  local items
  items=$(printf '%s\n' "$rows" | awk -v dir="$out_dir" '{
    printf "%s{\"index\":%d,\"file\":\"%s/frame-%04d.png\",\"t\":%.2f,\"scene_score\":%.4f,\"reason\":\"%s\"}", (NR>1?",":""), $1, dir, $1, $2, $3, $4 }')
  printf '{"source":"%s","threshold":%s,"heartbeat":%s,"sample_fps":%s,"count":%s,"frames":[%s]}\n' \
    "$src" "$threshold" "$heartbeat" "$sample_fps" "$count" "$items" >"$out_dir/metadata.json"
  if [ $contact = 1 ]; then
    local spec="$out_dir/.contact.json"
    {
      printf '{"out":"%s/contact.png","cols":%s,"cell_width":480,"items":[' "$out_dir" "$cols"
      printf '%s\n' "$rows" | awk -v dir="$out_dir" '{
        printf "%s{\"path\":\"%s/frame-%04d.png\",\"label\":\"#%d  t=%.1fs  %s\"}", (NR>1?",":""), dir, $1, $1, $2, $4 }'
      printf ']}\n'
    } >"$spec"
    "$KIT" contact --spec "$spec" >/dev/null
    rm -f "$spec"
  fi
  if [ "$JSON" = 1 ]; then cat "$out_dir/metadata.json"
  else
    echo "$count frame(s) -> $out_dir"
    printf '%s\n' "$rows" | awk '{ printf "  #%d  t=%.1fs  score=%.4f  %s\n", $1, $2, $3, $4 }'
    [ $contact = 0 ] || echo "contact sheet: $out_dir/contact.png"
  fi
}

cmd_info() {
  local src=""
  while [ $# -gt 0 ]; do case "$1" in --json) JSON=1; shift ;; *) src=$1; shift ;; esac; done
  [ -n "$src" ] && [ -f "$src" ] || die "info needs an existing video" 64
  need_ffmpeg
  report "$(abspath "$src")"
}

# ---------- option parsing shared by the capture commands ----------

OUT=""; JSON=0
SCREEN=""; WINDOW=0; REGION=""; APP=""; WID=""; TITLE=""; FRONT=0
ENGINE=screencapture; FPS=15; CLICKS=0; AUDIO=0
MAX=""; OUT_FPS=""; CRF=""; CODEC=""; KEEP_RAW=0
SHIFT=1

parse_opt() {
  case "$1" in
    --screen) SCREEN=$2; SHIFT=2 ;;
    --window) WINDOW=1; SHIFT=1 ;;
    --app) WINDOW=1; APP=$2; SHIFT=2 ;;
    --id) WINDOW=1; WID=$2; SHIFT=2 ;;
    --title) WINDOW=1; TITLE=$2; SHIFT=2 ;;
    --front) WINDOW=1; FRONT=1; SHIFT=1 ;;
    --region) REGION=$2; SHIFT=2 ;;
    --engine) ENGINE=$2; SHIFT=2 ;;
    --fps) FPS=$2; SHIFT=2 ;;
    --clicks) CLICKS=1; SHIFT=1 ;;
    --audio) AUDIO=1; SHIFT=1 ;;
    --max) MAX=$2; SHIFT=2 ;;
    --out-fps) OUT_FPS=$2; SHIFT=2 ;;
    --crf) CRF=$2; SHIFT=2 ;;
    --codec) CODEC=$2; SHIFT=2 ;;
    --keep-raw) KEEP_RAW=1; SHIFT=1 ;;
    --out) OUT=$2; SHIFT=2 ;;
    --json) JSON=1; SHIFT=1 ;;
    --help|-h) usage ;;
    *) die "unknown option $1" 64 ;;
  esac
  case "$ENGINE" in screencapture|ffmpeg) ;; *) die "--engine must be screencapture or ffmpeg" 64 ;; esac
}

# ---------- main ----------

[ $# -ge 1 ] || usage
cmd=$1; shift
case "$cmd" in
  doctor) cmd_doctor "$@" ;;
  run) cmd_run "$@" ;;
  start) cmd_start "$@" ;;
  stop) cmd_stop "$@" ;;
  status) cmd_status "$@" ;;
  wrap) cmd_wrap "$@" ;;
  compress) cmd_compress "$@" ;;
  convert) cmd_convert "$@" ;;
  trim) cmd_trim "$@" ;;
  frames) cmd_frames "$@" ;;
  info) cmd_info "$@" ;;
  -h|--help|help) usage ;;
  *) die "unknown command '$cmd'" 64 ;;
esac
