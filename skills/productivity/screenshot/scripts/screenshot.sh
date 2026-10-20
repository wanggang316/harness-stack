#!/usr/bin/env bash
# screenshot.sh — take and post-process macOS screenshots from a script.
#
# Wraps the system tools (`screencapture`, `sips`) plus the small `capturekit`
# Swift helper next to this file (compiled on first use) so an agent gets one
# stable, non-interactive interface:
#   doctor    permissions, host app, tools
#   screen    one display or all displays
#   window    one window by app / id / title / frontmost (no interactive picking)
#   region    a rectangle in screen points
#   long      scrolling capture of a window stitched into one tall image, or a
#             full-page web capture via Playwright
#   windows   list capturable windows
#   convert   change format / size / quality
#   optimize  shrink an image for an LLM (max 1568 px, jpg q80 by default)
#   info      dimensions and size
#
# Permissions: macOS attaches the Screen Recording grant to the HOST app the
# command runs from (Terminal, Ghostty, Codans, ...), not to this script.
# macOS bash 3.2 compatible.
set -euo pipefail

PROG=$(basename "$0")
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
KIT_SRC="$SCRIPT_DIR/capturekit.swift"
KIT_CACHE="${CAPTUREKIT_CACHE:-$HOME/.cache/capturekit}"
OUT_DIR="${SCREENSHOT_DIR:-$HOME/.screenshot}"

die() { printf 'screenshot: %s\n' "$1" >&2; exit "${2:-1}"; }
note() { printf 'screenshot: %s\n' "$*" >&2; }

usage() {
  cat >&2 <<EOF
Usage:
  $PROG doctor [--request]
  $PROG screen  [--display N|all] [common]
  $PROG window  (--app NAME | --id ID | --title TEXT | --front) [--shadow] [--activate] [common]
  $PROG region  <x,y,w,h> [common]
  $PROG long    (--app NAME | --id ID | --title TEXT | --front) [--step PT] [--max-pages N] [--at X,Y]
                [--skip-top PT] [--skip-bottom PT] [--settle MS] [--activate] [--no-restore] [--keep-pages DIR] [common]
  $PROG long    --url URL [--width PX] [--wait MS] [common]
  $PROG windows [--app NAME] [--title TEXT] [--all] [--json]
  $PROG convert  <img> --to png|jpg|heic|tiff|bmp|gif|pdf|webp [--quality Q] [--max PX] [--scale F] [--out F]
  $PROG optimize <img> [--max PX] [--quality Q] [--to jpg|png|webp] [--out F]
  $PROG info     <img>

Common options (screen / window / region / long):
  --out F        output path (default: $OUT_DIR/<kind>-<timestamp>.<fmt>)
  --format FMT   png (default) | jpg | heic | tiff
  --max PX       scale down so the longer side is at most PX (Retina captures are 2x)
  --scale F      scale by factor F (0.5 turns a 2x Retina capture into 1x)
  --quality Q    jpg/heic quality 1-100 (default 85)
  --delay S      wait S seconds before capturing
  --cursor       include the mouse cursor
  --json         print {"path","width","height","bytes"} instead of a line of text

Exit codes: 0 ok, 1 runtime, 2 permission missing, 3 target not found, 64 usage.
Set SCREENSHOT_DIR to change the default output directory.
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

timestamp() { date +%Y%m%d-%H%M%S; }

abspath() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$(pwd)" "$1" ;;
  esac
}

ext_for() {
  case "$1" in
    jpg|jpeg) echo jpg ;;
    png) echo png ;;
    heic) echo heic ;;
    tiff|tif) echo tiff ;;
    bmp) echo bmp ;;
    gif) echo gif ;;
    pdf) echo pdf ;;
    webp) echo webp ;;
    *) die "unsupported format: $1" 64 ;;
  esac
}

sips_format() {
  case "$1" in
    jpg) echo jpeg ;;
    *) echo "$1" ;;
  esac
}

img_dim() { # path -> "W H"
  sips -g pixelWidth -g pixelHeight "$1" 2>/dev/null | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print w, h}'
}

file_bytes() { stat -f %z "$1"; }

report() { # path
  local dims w h
  dims=$(img_dim "$1"); w=${dims% *}; h=${dims#* }
  if [ "$JSON" = 1 ]; then
    printf '{"path":"%s","width":%s,"height":%s,"bytes":%s}\n' "$1" "$w" "$h" "$(file_bytes "$1")"
  else
    printf '%s (%sx%s px, %s bytes)\n' "$1" "$w" "$h" "$(file_bytes "$1")"
  fi
}

check_permission() {
  ensure_kit
  if ! "$KIT" preflight >/dev/null 2>&1; then
    local host; host="${__CFBundleIdentifier:-${TERM_PROGRAM:-this terminal}}"
    die "Screen Recording is not granted to the host app ($host).
Run '$PROG doctor --request' to trigger the prompt, then enable the host app in
System Settings > Privacy & Security > Screen & System Audio Recording, and restart it." 2
  fi
}

# Resize / convert an already captured PNG according to the common options.
# Prints the final path.
postprocess() { # src dst fmt
  local src=$1 dst=$2 fmt=$3 dims w h
  local args=()
  if [ -n "$MAX" ]; then args+=(-Z "$MAX"); fi
  if [ -n "$SCALE" ]; then
    dims=$(img_dim "$src"); w=${dims% *}
    args+=(--resampleWidth "$(awk -v w="$w" -v s="$SCALE" 'BEGIN{printf "%d", w*s}')")
  fi
  if [ "$fmt" = webp ]; then
    need cwebp "install with: brew install webp"
    local tmp="$src.tmp.png"
    if [ ${#args[@]} -gt 0 ]; then sips "${args[@]}" "$src" --out "$tmp" >/dev/null; else cp "$src" "$tmp"; fi
    cwebp -quiet -q "$QUALITY" "$tmp" -o "$dst"
    rm -f "$tmp"
  else
    if [ "$fmt" != png ]; then
      args+=(-s format "$(sips_format "$fmt")")
      case "$fmt" in jpg|heic) args+=(-s formatOptions "$QUALITY") ;; esac
    fi
    if [ ${#args[@]} -gt 0 ]; then
      sips "${args[@]}" "$src" --out "$dst" >/dev/null
    elif [ "$src" != "$dst" ]; then
      mv "$src" "$dst"
    fi
  fi
  if [ "$src" != "$dst" ] && [ -f "$src" ]; then rm -f "$src"; fi
  printf '%s\n' "$dst"
}

# Capture to a temporary PNG with screencapture, then postprocess into place.
capture() { # kind screencapture-args...
  local kind=$1; shift
  local fmt=${FORMAT:-png} out tmp
  out=${OUT:-"$OUT_DIR/$kind-$(timestamp).$(ext_for "$fmt")"}
  out=$(abspath "$out")
  mkdir -p "$(dirname "$out")"
  tmp="${out%.*}.capture.png"
  local sc=(-x -t png)
  [ -n "$DELAY" ] && sc+=(-T "$DELAY")
  [ "$CURSOR" = 1 ] && sc+=(-C)
  if ! screencapture "${sc[@]}" "$@" "$tmp" 2>/dev/null || [ ! -s "$tmp" ]; then
    rm -f "$tmp"
    die "screencapture failed (target gone, or Screen Recording not granted to the host app?)"
  fi
  postprocess "$tmp" "$out" "$fmt" >/dev/null
  report "$out"
}

# Resolve the window target options into a plain window line (see capturekit windows --plain).
# Sets WIN_ID WIN_X WIN_Y WIN_W WIN_H WIN_SCALE WIN_PID WIN_APP WIN_TITLE.
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
    [ ${#q[@]} -gt 0 ] || die "window target required: --app NAME | --id ID | --title TEXT | --front" 64
    lines=$("$KIT" windows --plain "${q[@]}")
    [ -n "$lines" ] || die "no window matches${APP:+ app '$APP'}${TITLE:+ title '$TITLE'}${WID:+ id $WID}; try '$PROG windows'" 3
    line=$(printf '%s\n' "$lines" | awk -F'\t' '$3==1{print; exit}')
    if [ -z "$line" ]; then
      die "matching window(s) exist but none is on screen (minimized or on another Space): $(printf '%s\n' "$lines" | awk -F'\t' '{printf "#%s \"%s\" ", $1, $10}')" 3
    fi
  fi
  IFS=$'\t' read -r WIN_ID WIN_PID WIN_ON WIN_X WIN_Y WIN_W WIN_H WIN_SCALE WIN_APP WIN_TITLE <<<"$line"
  if [ "$ACTIVATE" = 1 ]; then "$KIT" activate --pid "$WIN_PID" >/dev/null; fi
}

# ---------- subcommands ----------

cmd_doctor() {
  ensure_kit
  local request=0; [ "${1:-}" = --request ] && request=1
  local pre ok=0
  if [ $request = 1 ]; then
    "$KIT" request >/dev/null 2>&1 || true
  fi
  pre=$("$KIT" preflight 2>/dev/null) || true
  echo "Host app:          ${__CFBundleIdentifier:-${TERM_PROGRAM:-unknown}} (grants belong to this app)"
  echo "GUI session:       $(launchctl managername 2>/dev/null || echo unknown) (needs Aqua)"
  case "$pre" in *'"screen_recording" : true'*) echo "Screen Recording:  granted"; ok=1 ;; *) echo "Screen Recording:  NOT granted  -> $PROG doctor --request, then enable the host app in System Settings" ;; esac
  case "$pre" in *'"accessibility" : true'*) echo "Accessibility:     granted (needed only by 'long' for scrolling)" ;; *) echo "Accessibility:     not granted ('long' scrolling needs it)" ;; esac
  echo "Displays:          $("$KIT" displays | grep -c '"id"')"
  printf 'Tools:             screencapture sips swiftc'
  for t in cwebp pngquant ffmpeg; do command -v $t >/dev/null 2>&1 && printf ' %s' "$t"; done
  if command -v npx >/dev/null 2>&1 && npx --no-install playwright --version >/dev/null 2>&1; then printf ' playwright'; fi
  echo
  echo "Output dir:        $OUT_DIR"
  [ $ok = 1 ] || exit 2
}

cmd_screen() {
  local display=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --display) display=$2; shift 2 ;;
      *) parse_common "$1" "${2:-}"; shift $SHIFT ;;
    esac
  done
  check_permission
  if [ "$display" = all ]; then
    local n i base=$OUT
    n=$("$KIT" displays | grep -c '"id"')
    i=1
    while [ $i -le "$n" ]; do
      [ -z "$base" ] || OUT="${base%.*}-$i.${base##*.}"
      capture "screen$i" -D "$i"
      i=$((i + 1))
    done
  elif [ -n "$display" ]; then
    capture "screen" -D "$display"
  else
    capture "screen" -D 1
  fi
}

cmd_window() {
  local shadow=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --shadow) shadow=1; shift ;;
      *) parse_target "$1" "${2:-}" || parse_common "$1" "${2:-}"; shift $SHIFT ;;
    esac
  done
  check_permission
  resolve_window
  local a=(-l "$WIN_ID")
  [ $shadow = 1 ] || a+=(-o)
  capture "window" "${a[@]}"
}

cmd_region() {
  local rect=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --*) parse_common "$1" "${2:-}"; shift $SHIFT ;;
      *) rect=$1; shift ;;
    esac
  done
  [ -n "$rect" ] || die "region needs x,y,w,h" 64
  printf '%s' "$rect" | grep -Eq '^-?[0-9]+,-?[0-9]+,[0-9]+,[0-9]+$' || die "bad rectangle '$rect' (want x,y,w,h in screen points)" 64
  check_permission
  capture "region" -R "$rect"
}

cmd_long() {
  local step="" max_pages=30 skip_top="" skip_bottom="" settle=350 restore=1 url="" width=1280 wait_ms=1000 at="" keep=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --step) step=$2; shift 2 ;;
      --max-pages) max_pages=$2; shift 2 ;;
      --skip-top) skip_top=$2; shift 2 ;;
      --skip-bottom) skip_bottom=$2; shift 2 ;;
      --at) at=$2; shift 2 ;;
      --keep-pages) keep=$2; shift 2 ;;
      --settle) settle=$2; shift 2 ;;
      --no-restore) restore=0; shift ;;
      --url) url=$2; shift 2 ;;
      --width) width=$2; shift 2 ;;
      --wait) wait_ms=$2; shift 2 ;;
      *) parse_target "$1" "${2:-}" || parse_common "$1" "${2:-}"; shift $SHIFT ;;
    esac
  done
  if [ -n "$url" ]; then long_url "$url" "$width" "$wait_ms"; return; fi

  check_permission
  resolve_window
  "$KIT" preflight 2>/dev/null | grep -q '"accessibility" : true' \
    || die "Accessibility is not granted to the host app; 'long' needs it to scroll the window" 2
  # A third of the window: scroll views rarely fill the whole window, and the
  # stitch needs real overlap between consecutive pages.
  [ -n "$step" ] || step=$(( WIN_H * 3 / 10 ))
  local stitch_opts=() scroll_opts=()
  [ -z "$skip_top" ] || stitch_opts+=(--skip-top "$(awk -v v="$skip_top" -v s="$WIN_SCALE" 'BEGIN{printf "%d", v*s}')")
  [ -z "$skip_bottom" ] || stitch_opts+=(--skip-bottom "$(awk -v v="$skip_bottom" -v s="$WIN_SCALE" 'BEGIN{printf "%d", v*s}')")
  [ -z "$at" ] || scroll_opts+=(--at "$at")

  local fmt=${FORMAT:-png} out work pages=() i=0 prev_hash="" hash page scrolled=0 cursor
  out=${OUT:-"$OUT_DIR/long-$(timestamp).$(ext_for "$fmt")"}
  out=$(abspath "$out")
  mkdir -p "$(dirname "$out")"
  work=$(mktemp -d "${TMPDIR:-/tmp}/screenshot-long.XXXXXX")
  trap "rm -rf '$work'" EXIT
  cursor=$("$KIT" mouse)

  while [ $i -lt "$max_pages" ]; do
    page="$work/page-$i.png"
    screencapture -x -o -t png -l "$WIN_ID" "$page" 2>/dev/null || die "screencapture failed on page $i"
    hash=$(shasum -a 256 "$page" | cut -c1-16)
    if [ "$hash" = "$prev_hash" ]; then rm -f "$page"; break; fi   # nothing moved: bottom reached
    pages+=("$page"); prev_hash=$hash
    i=$((i + 1))
    [ $i -lt "$max_pages" ] || break
    "$KIT" scroll --window "$WIN_ID" --dy "$step" ${scroll_opts[@]+"${scroll_opts[@]}"} >/dev/null
    scrolled=$((scrolled + step))
    sleep "$(awk -v ms="$settle" 'BEGIN{print ms/1000}')"
  done

  if [ $restore = 1 ] && [ $scrolled -gt 0 ]; then
    "$KIT" scroll --window "$WIN_ID" --dy "-$scrolled" ${scroll_opts[@]+"${scroll_opts[@]}"} >/dev/null
  fi
  # Put the cursor back where it was.
  local cx cy
  cx=$(printf '%s' "$cursor" | awk -F': ' '/"x"/{gsub(/,/,"",$2); print $2}')
  cy=$(printf '%s' "$cursor" | awk -F': ' '/"y"/{gsub(/,/,"",$2); print $2}')
  [ -z "$cx" ] || "$KIT" mouse-move "$cx" "$cy" >/dev/null || true

  local tmp="${out%.*}.capture.png" result
  result=$("$KIT" stitch --out "$tmp" ${stitch_opts[@]+"${stitch_opts[@]}"} "${pages[@]}")
  postprocess "$tmp" "$out" "$fmt" >/dev/null
  if [ -n "$keep" ]; then
    mkdir -p "$keep" && cp "$work"/page-*.png "$keep"/ && printf '%s\n' "$result" >"$keep/stitch.json"
    note "pages kept in $keep"
  fi
  local unmatched
  unmatched=$(printf '%s' "$result" | grep -c '"matched" : false' || true)
  [ "$unmatched" = 0 ] || note "warning: $unmatched page join(s) had no overlap match (try a smaller --step, --at X,Y on the scroll view, --skip-top/--skip-bottom; --keep-pages DIR to inspect)"
  note "pages: ${#pages[@]}, scrolled: $scrolled pt"
  report "$out"
}

long_url() { # url width wait_ms
  need npx "install Node.js"
  npx --no-install playwright --version >/dev/null 2>&1 \
    || die "Playwright not installed. Run: npm i -g playwright && npx playwright install chromium"
  local fmt=${FORMAT:-png} out tmp
  out=${OUT:-"$OUT_DIR/long-$(timestamp).$(ext_for "$fmt")"}
  out=$(abspath "$out"); mkdir -p "$(dirname "$out")"
  tmp="${out%.*}.capture.png"
  npx --no-install playwright screenshot --full-page --viewport-size="$2,900" --wait-for-timeout="$3" "$1" "$tmp" >/dev/null 2>&1 \
    || die "playwright screenshot failed for $1"
  postprocess "$tmp" "$out" "$fmt" >/dev/null
  report "$out"
}

cmd_windows() {
  ensure_kit
  local q=() json=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --app|--title|--pid) q+=("$1" "$2"); shift 2 ;;
      --all) q+=(--all); shift ;;
      --json) json=1; shift ;;
      *) die "unknown option $1" 64 ;;
    esac
  done
  if [ $json = 1 ]; then
    "$KIT" windows ${q[@]+"${q[@]}"}
  else
    printf 'ID\tON\tX\tY\tW\tH\tAPP\tTITLE\n'
    "$KIT" windows --plain ${q[@]+"${q[@]}"} | awk -F'\t' 'BEGIN{OFS="\t"}{print $1, ($3==1?"yes":"no"), $4, $5, $6, $7, $9, $10}'
  fi
}

cmd_convert() {
  local src="" to="" out=""
  MAX=""; SCALE=""; QUALITY=85
  while [ $# -gt 0 ]; do
    case "$1" in
      --to) to=$2; shift 2 ;;
      --quality) QUALITY=$2; shift 2 ;;
      --max) MAX=$2; shift 2 ;;
      --scale) SCALE=$2; shift 2 ;;
      --out) out=$2; shift 2 ;;
      --json) JSON=1; shift ;;
      --*) die "unknown option $1" 64 ;;
      *) src=$1; shift ;;
    esac
  done
  [ -n "$src" ] && [ -f "$src" ] || die "convert needs an existing image" 64
  src=$(abspath "$src")
  local fmt; fmt=$(ext_for "${to:-${src##*.}}")
  if [ -z "$out" ]; then
    out="${src%.*}.$fmt"
    [ "$out" != "$src" ] || out="${src%.*}-converted.$fmt"
  fi
  out=$(abspath "$out"); mkdir -p "$(dirname "$out")"
  local tmp="${out%.*}.convert-src.png"
  # Normalise through PNG so webp sources and Retina scaling share one path.
  sips -s format png "$src" --out "$tmp" >/dev/null 2>&1 || die "cannot read $src"
  postprocess "$tmp" "$out" "$fmt" >/dev/null
  report "$out"
}

cmd_optimize() {
  local src="" out="" to=jpg
  MAX=1568; QUALITY=80
  while [ $# -gt 0 ]; do
    case "$1" in
      --max) MAX=$2; shift 2 ;;
      --quality) QUALITY=$2; shift 2 ;;
      --to) to=$2; shift 2 ;;
      --out) out=$2; shift 2 ;;
      --json) JSON=1; shift ;;
      --*) die "unknown option $1" 64 ;;
      *) src=$1; shift ;;
    esac
  done
  [ -n "$src" ] && [ -f "$src" ] || die "optimize needs an existing image" 64
  local before; before=$(file_bytes "$src")
  [ -n "$out" ] || out="${src%.*}-opt.$(ext_for "$to")"
  cmd_convert "$src" --to "$to" --quality "$QUALITY" --max "$MAX" --out "$out"
  if [ "$to" = png ] && command -v pngquant >/dev/null 2>&1; then
    pngquant --force --skip-if-larger --quality 60-90 --output "$out" "$out" 2>/dev/null || true
  fi
  [ "$JSON" = 1 ] || note "size: $before -> $(file_bytes "$out") bytes"
}

cmd_info() {
  [ $# -ge 1 ] && [ -f "$1" ] || die "info needs an existing image" 64
  sips -g pixelWidth -g pixelHeight -g format -g dpiWidth -g hasAlpha "$1" | tail -n +2 | sed 's/^ *//'
  echo "bytes: $(file_bytes "$1")"
}

# ---------- option parsing shared by capture commands ----------

OUT=""; FORMAT=""; MAX=""; SCALE=""; QUALITY=85; DELAY=""; CURSOR=0; JSON=0
APP=""; WID=""; TITLE=""; FRONT=0; ACTIVATE=0
SHIFT=1

parse_common() { # opt value -> sets SHIFT
  case "$1" in
    --out) OUT=$2; SHIFT=2 ;;
    --format) FORMAT=$2; SHIFT=2 ;;
    --max) MAX=$2; SHIFT=2 ;;
    --scale) SCALE=$2; SHIFT=2 ;;
    --quality) QUALITY=$2; SHIFT=2 ;;
    --delay) DELAY=$2; SHIFT=2 ;;
    --cursor) CURSOR=1; SHIFT=1 ;;
    --json) JSON=1; SHIFT=1 ;;
    --help|-h) usage ;;
    *) die "unknown option $1" 64 ;;
  esac
}

parse_target() { # returns 1 when the option is not a window target
  case "$1" in
    --app) APP=$2; SHIFT=2 ;;
    --id) WID=$2; SHIFT=2 ;;
    --title) TITLE=$2; SHIFT=2 ;;
    --front) FRONT=1; SHIFT=1 ;;
    --activate) ACTIVATE=1; SHIFT=1 ;;
    *) return 1 ;;
  esac
}

# ---------- main ----------

[ $# -ge 1 ] || usage
cmd=$1; shift
case "$cmd" in
  doctor) cmd_doctor "$@" ;;
  screen) cmd_screen "$@" ;;
  window) cmd_window "$@" ;;
  region) cmd_region "$@" ;;
  long) cmd_long "$@" ;;
  windows) cmd_windows "$@" ;;
  convert) cmd_convert "$@" ;;
  optimize) cmd_optimize "$@" ;;
  info) cmd_info "$@" ;;
  -h|--help|help) usage ;;
  *) die "unknown command '$cmd'" 64 ;;
esac
