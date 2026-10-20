// capturekit.swift — CoreGraphics helper shared by the screenshot and screen-record skills.
//
// bash can drive `screencapture`, `sips` and `ffmpeg`, but it cannot ask TCC for
// permission state, enumerate windows, post scroll events or compose images.
// This file covers exactly those gaps and nothing else. It is compiled on first
// use by the skill scripts (`swiftc -O`), cached by content hash.
//
// Commands (all print JSON unless --plain is given):
//   preflight                      screen-recording / accessibility grant state
//   request                        trigger the Screen Recording prompt
//   displays                       active displays with bounds and scale
//   windows [--app S] [--pid N] [--title S] [--id N] [--all] [--plain]
//   front                          frontmost app and its front window
//   activate --pid N               bring an app to the foreground
//   mouse                          current cursor position
//   mouse-move X Y                 warp the cursor
//   scroll --window ID --dy PX [--at X,Y]   scroll at a window-relative point (default centre; dy<0 = up)
//   stitch --out F [--skip-top PX] [--skip-bottom PX] [--min-overlap PX] [--inset PX] IMG...
//   contact --spec spec.json       grid of images with labels (see makeContact)
//
// The screenshot and screen-record skills each ship an identical copy of this
// file so that either skill works when installed alone.

import AppKit
import ApplicationServices
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

// MARK: - Plumbing

func fail(_ message: String, code: Int32 = 1) -> Never {
    FileHandle.standardError.write(("capturekit: " + message + "\n").data(using: .utf8)!)
    exit(code)
}

func emit(_ object: Any) {
    guard JSONSerialization.isValidJSONObject(object),
          let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]),
          let text = String(data: data, encoding: .utf8)
    else { fail("could not encode JSON output") }
    print(text)
}

struct Args {
    var positional: [String] = []
    var options: [String: String] = [:]
    var flags: Set<String> = []

    init(_ raw: [String]) {
        var i = 0
        while i < raw.count {
            let a = raw[i]
            if a.hasPrefix("--") {
                let key = String(a.dropFirst(2))
                if i + 1 < raw.count, !raw[i + 1].hasPrefix("--") {
                    options[key] = raw[i + 1]
                    i += 2
                } else {
                    flags.insert(key)
                    i += 1
                }
            } else {
                positional.append(a)
                i += 1
            }
        }
    }

    func int(_ key: String, default value: Int) -> Int {
        guard let s = options[key] else { return value }
        guard let v = Int(s) else { fail("--\(key) expects an integer, got '\(s)'", code: 64) }
        return v
    }
}

// MARK: - Displays

struct DisplayInfo {
    let id: CGDirectDisplayID
    let index: Int
    let bounds: CGRect
    let scale: CGFloat
    let isMain: Bool

    var json: [String: Any] {
        [
            "id": Int(id), "index": index, "main": isMain, "scale": Double(scale),
            "x": Int(bounds.origin.x), "y": Int(bounds.origin.y),
            "width": Int(bounds.width), "height": Int(bounds.height),
            "pixel_width": Int(bounds.width * scale), "pixel_height": Int(bounds.height * scale),
            // `screencapture -D` counts from 1 in this order; ffmpeg's avfoundation
            // "Capture screen N" counts from 0.
            "screencapture_display": index + 1, "avfoundation_index": index,
        ]
    }
}

func activeDisplays() -> [DisplayInfo] {
    var count: UInt32 = 0
    CGGetActiveDisplayList(0, nil, &count)
    var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
    CGGetActiveDisplayList(count, &ids, &count)
    return ids.prefix(Int(count)).enumerated().map { index, id in
        let bounds = CGDisplayBounds(id)
        // CGDisplayPixelsWide reports points on scaled (Retina) modes; the mode knows the backing size.
        let mode = CGDisplayCopyDisplayMode(id)
        let scale = mode.map { $0.width > 0 ? CGFloat($0.pixelWidth) / CGFloat($0.width) : 1 } ?? 1
        return DisplayInfo(id: id, index: index, bounds: bounds, scale: scale, isMain: CGDisplayIsMain(id) != 0)
    }
}

func displayScale(containing point: CGPoint) -> CGFloat {
    let displays = activeDisplays()
    return displays.first { $0.bounds.contains(point) }?.scale ?? displays.first { $0.isMain }?.scale ?? 1
}

// MARK: - Windows

struct WindowInfo {
    let id: CGWindowID
    let pid: pid_t
    let app: String
    let bundleID: String
    let title: String
    let bounds: CGRect
    let layer: Int
    let alpha: Double
    let onScreen: Bool

    var scale: CGFloat { displayScale(containing: CGPoint(x: bounds.midX, y: bounds.midY)) }

    var json: [String: Any] {
        [
            "id": Int(id), "pid": Int(pid), "app": app, "bundle_id": bundleID, "title": title,
            "x": Int(bounds.origin.x), "y": Int(bounds.origin.y),
            "width": Int(bounds.width), "height": Int(bounds.height),
            "layer": layer, "alpha": alpha, "onscreen": onScreen, "scale": Double(scale),
        ]
    }

    // One line, tab separated, for shell parsing: id pid onscreen x y w h scale app title
    var plain: String {
        [String(id), String(pid), onScreen ? "1" : "0",
         String(Int(bounds.origin.x)), String(Int(bounds.origin.y)),
         String(Int(bounds.width)), String(Int(bounds.height)),
         String(format: "%g", Double(scale)), app, title].joined(separator: "\t")
    }
}

func bundleIdentifier(for pid: pid_t) -> String {
    NSRunningApplication(processIdentifier: pid)?.bundleIdentifier ?? ""
}

/// Owner names are localized ("脚本编辑器"); the executable name is not.
func executableName(for pid: pid_t) -> String {
    NSRunningApplication(processIdentifier: pid)?.executableURL?.lastPathComponent ?? ""
}

/// Front-to-back list of windows. Without --all only ordinary (layer 0) windows
/// with a visible size are returned, which is what "a window" means to a user.
func listWindows(all: Bool) -> [WindowInfo] {
    let onScreenIDs: Set<CGWindowID> = {
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]]
        else { return [] }
        return Set(list.compactMap { ($0[kCGWindowNumber as String] as? NSNumber).map { CGWindowID($0.uint32Value) } })
    }()
    guard let list = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]]
    else { fail("window list unavailable (no window server session?)") }

    var out: [WindowInfo] = []
    for w in list {
        guard let number = w[kCGWindowNumber as String] as? NSNumber,
              let pid = w[kCGWindowOwnerPID as String] as? NSNumber,
              let boundsDict = w[kCGWindowBounds as String] as? NSDictionary,
              let bounds = CGRect(dictionaryRepresentation: boundsDict)
        else { continue }
        let layer = (w[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0
        let alpha = (w[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1
        if !all {
            if layer != 0 || bounds.width < 50 || bounds.height < 50 || alpha == 0 { continue }
        }
        let id = CGWindowID(number.uint32Value)
        out.append(WindowInfo(
            id: id, pid: pid_t(pid.int32Value),
            app: w[kCGWindowOwnerName as String] as? String ?? "",
            bundleID: bundleIdentifier(for: pid_t(pid.int32Value)),
            title: w[kCGWindowName as String] as? String ?? "",
            bounds: bounds, layer: layer, alpha: alpha, onScreen: onScreenIDs.contains(id)))
    }
    return out
}

func filterWindows(_ windows: [WindowInfo], args: Args) -> [WindowInfo] {
    var result = windows
    if let app = args.options["app"]?.lowercased() {
        result = result.filter {
            $0.app.lowercased().contains(app) || $0.bundleID.lowercased().contains(app)
                || executableName(for: $0.pid).lowercased().contains(app)
        }
    }
    if let pid = args.options["pid"] {
        guard let p = Int32(pid) else { fail("--pid expects an integer", code: 64) }
        result = result.filter { $0.pid == p }
    }
    if let title = args.options["title"]?.lowercased() {
        result = result.filter { $0.title.lowercased().contains(title) }
    }
    if let id = args.options["id"] {
        guard let n = UInt32(id) else { fail("--id expects an integer", code: 64) }
        result = result.filter { $0.id == n }
    }
    return result
}

func windowByID(_ id: CGWindowID) -> WindowInfo {
    guard let w = listWindows(all: true).first(where: { $0.id == id }) else { fail("window \(id) not found", code: 3) }
    return w
}

// MARK: - Input

func scroll(window: WindowInfo, dy: Int, at: CGPoint?) -> [String: Any] {
    // Default to the window centre; a window-relative --at lands the wheel on the scroll view.
    let centre = at.map { CGPoint(x: window.bounds.minX + $0.x, y: window.bounds.minY + $0.y) }
        ?? CGPoint(x: window.bounds.midX, y: window.bounds.midY)
    CGWarpMouseCursorPosition(centre)
    usleep(60_000)
    // Positive wheel1 scrolls content up (towards the top of the document); a
    // positive --dy means "scroll down", so negate.
    guard let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1,
                              wheel1: Int32(-dy), wheel2: 0, wheel3: 0)
    else { fail("could not create scroll event") }
    event.location = centre
    event.post(tap: .cghidEventTap)
    return ["window": Int(window.id), "dy": dy, "cursor": ["x": Double(centre.x), "y": Double(centre.y)]]
}

// MARK: - Images

func loadImage(_ path: String) -> CGImage {
    let url = URL(fileURLWithPath: path)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else { fail("cannot read image: \(path)") }
    return image
}

func writePNG(_ image: CGImage, to path: String) {
    let url = URL(fileURLWithPath: path)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { fail("cannot create \(path)") }
    CGImageDestinationAddImage(dest, image, nil)
    guard CGImageDestinationFinalize(dest) else { fail("cannot write \(path)") }
}

func rgbaContext(width: Int, height: Int) -> CGContext {
    guard let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { fail("cannot allocate \(width)x\(height) canvas") }
    return ctx
}

/// Draw `image` so that its top-left lands at (x, y) in a top-left coordinate space.
func draw(_ image: CGImage, in ctx: CGContext, x: Int, y: Int, width: Int, height: Int) {
    let flippedY = ctx.height - y - height
    ctx.draw(image, in: CGRect(x: x, y: flippedY, width: width, height: height))
}

/// Per-row signatures: luma sampled every 4th column, `inset` columns on each
/// side ignored so a moving scrollbar thumb cannot break a match. Rows are
/// compared with a small tolerance because two captures of the same content can
/// differ by a luma step or two (window activation, compositing).
typealias RowSignature = [UInt8]

func rowSignatures(_ image: CGImage, inset: Int) -> [RowSignature] {
    let w = image.width, h = image.height
    let inset = min(inset, w / 4)
    var pixels = [UInt8](repeating: 0, count: w * h)
    pixels.withUnsafeMutableBytes { buf in
        guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                                  space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)
        else { fail("cannot build luma buffer") }
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    }
    // Bitmap memory is top-down (row 0 is the top scanline) even though CG coordinates are bottom-up.
    return (0..<h).map { row in
        let base = row * w
        return stride(from: inset, to: w - inset, by: 4).map { pixels[base + $0] }
    }
}

let rowTolerance: UInt8 = 4

func rowsEqual(_ a: RowSignature, _ b: RowSignature) -> Bool {
    guard a.count == b.count else { return false }
    for i in 0..<a.count where (a[i] > b[i] ? a[i] - b[i] : b[i] - a[i]) > rowTolerance {
        return false
    }
    return true
}

struct StitchPiece {
    let image: CGImage
    let fromRow: Int
    var dropBottom: Int = 0
    var rows: Int { image.height - fromRow - dropBottom }
}

/// Rows that are identical at the same position in two consecutive pages did not
/// scroll: a toolbar, a sticky header, a footer pane. Each side is capped so that
/// at least a tenth of the page stays searchable.
func stickyRegions(_ a: [RowSignature], _ b: [RowSignature]) -> (top: Int, bottom: Int) {
    let n = min(a.count, b.count)
    let cap = Int(Double(n) * 0.45)
    var top = 0
    while top < cap, rowsEqual(a[top], b[top]) { top += 1 }
    var bottom = 0
    while bottom < cap, rowsEqual(a[a.count - 1 - bottom], b[b.count - 1 - bottom]) { bottom += 1 }
    return (top, bottom)
}

/// Largest k such that the k rows of `prev` ending at `prevEnd` equal the k rows
/// of `cur` starting at `curStart`. When the overlap region is uniform the true
/// overlap is ambiguous; the largest match only drops extra blank rows.
func largestOverlap(prev: [RowSignature], prevEnd: Int, cur: [RowSignature], curStart: Int, minOverlap: Int) -> Int {
    var k = min(prevEnd, cur.count - curStart)
    while k >= minOverlap {
        let start = prevEnd - k
        // Cheap rejects first: the first and the middle row of the candidate block.
        if rowsEqual(prev[start], cur[curStart]), rowsEqual(prev[start + k / 2], cur[curStart + k / 2]) {
            var match = true
            for j in 0..<k where !rowsEqual(prev[start + j], cur[curStart + j]) {
                match = false
                break
            }
            if match { return k }
        }
        k -= 1
    }
    return -1
}

/// Vertical stitch. Sticky regions are detected per pair unless --skip-top /
/// --skip-bottom pin them; a pair that finds no overlap with its own detection
/// retries with the largest sticky regions seen across all pairs (one page
/// captured while the window was still activating must not break the join).
func stitch(paths: [String], skipTop: Int?, skipBottom: Int?, minOverlap: Int, inset: Int, out: String) -> [String: Any] {
    guard paths.count >= 1 else { fail("stitch needs at least one image", code: 64) }
    let images = paths.map(loadImage)
    let width = images.map(\.width).min()!
    let rows = images.map { rowSignatures($0, inset: inset) }
    let sticky = (1..<images.count).map { stickyRegions(rows[$0 - 1], rows[$0]) }
    let global = (top: skipTop ?? sticky.map(\.top).max() ?? 0, bottom: skipBottom ?? sticky.map(\.bottom).max() ?? 0)

    var pieces = [StitchPiece(image: images[0], fromRow: 0)]
    var report: [[String: Any]] = []
    for i in 1..<images.count {
        let cur = images[i]
        if rows[i].count == rows[i - 1].count, zip(rows[i], rows[i - 1]).allSatisfy({ rowsEqual($0, $1) }) {
            // Nothing scrolled: the page is a duplicate, not a continuation.
            report.append(["index": i, "overlap": cur.height, "appended": 0, "matched": true,
                           "sticky_top": 0, "sticky_bottom": 0])
            continue
        }
        var candidates = [(top: skipTop ?? sticky[i - 1].top, bottom: skipBottom ?? sticky[i - 1].bottom)]
        if candidates[0] != global { candidates.append(global) }
        var top = candidates[0].top, bottom = candidates[0].bottom, overlap = -1
        for c in candidates {
            overlap = largestOverlap(prev: rows[i - 1], prevEnd: images[i - 1].height - c.bottom,
                                     cur: rows[i], curStart: c.top, minOverlap: minOverlap)
            if overlap >= 0 { top = c.top; bottom = c.bottom; break }
        }
        let fromRow = overlap >= 0 ? top + overlap : top
        let appended = cur.height - fromRow
        report.append(["index": i, "overlap": overlap, "appended": appended, "matched": overlap >= 0,
                       "sticky_top": top, "sticky_bottom": bottom])
        if appended > 0 {
            // The previous piece keeps its sticky bottom only when it is the last piece.
            let last = pieces[pieces.count - 1]
            pieces[pieces.count - 1] = StitchPiece(image: last.image, fromRow: last.fromRow, dropBottom: bottom)
            pieces.append(StitchPiece(image: cur, fromRow: fromRow))
        }
    }

    let totalHeight = pieces.reduce(0) { $0 + $1.rows }
    let ctx = rgbaContext(width: width, height: totalHeight)
    var y = 0
    for piece in pieces {
        guard let cropped = piece.image.cropping(to: CGRect(x: 0, y: piece.fromRow, width: width, height: piece.rows))
        else { fail("crop failed") }
        draw(cropped, in: ctx, x: 0, y: y, width: width, height: piece.rows)
        y += piece.rows
    }
    guard let result = ctx.makeImage() else { fail("compose failed") }
    writePNG(result, to: out)
    return ["path": out, "width": width, "height": totalHeight, "pieces": report]
}

/// spec.json: {"out": "...", "cols": 4, "cell_width": 480, "items": [{"path": "...", "label": "..."}]}
func makeContact(specPath: String) -> [String: Any] {
    guard let data = FileManager.default.contents(atPath: specPath),
          let spec = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let out = spec["out"] as? String,
          let items = spec["items"] as? [[String: Any]], !items.isEmpty
    else { fail("invalid contact spec: \(specPath)", code: 64) }
    let cols = max(1, spec["cols"] as? Int ?? 4)
    let cellWidth = max(64, spec["cell_width"] as? Int ?? 480)
    let gap = 8, labelHeight = 22
    let images = items.map { loadImage($0["path"] as? String ?? "") }
    let cellHeight = images.map { Int(Double($0.height) * Double(cellWidth) / Double($0.width)) }.max()! + labelHeight
    let rows = (images.count + cols - 1) / cols
    let canvasW = cols * cellWidth + (cols + 1) * gap
    let canvasH = rows * cellHeight + (rows + 1) * gap

    let ctx = rgbaContext(width: canvasW, height: canvasH)
    ctx.setFillColor(CGColor(gray: 0.12, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: canvasW, height: canvasH))
    NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
    let font = NSFont.monospacedSystemFont(ofSize: 13, weight: .medium)
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]

    for (i, image) in images.enumerated() {
        let col = i % cols, row = i / cols
        let x = gap + col * (cellWidth + gap)
        let y = gap + row * (cellHeight + gap)
        let h = Int(Double(image.height) * Double(cellWidth) / Double(image.width))
        draw(image, in: ctx, x: x, y: y + labelHeight, width: cellWidth, height: h)
        let label = items[i]["label"] as? String ?? "#\(i + 1)"
        let flippedBaseline = CGFloat(canvasH - y - labelHeight + 5)
        NSString(string: label).draw(at: NSPoint(x: CGFloat(x + 4), y: flippedBaseline), withAttributes: attrs)
    }
    NSGraphicsContext.current = nil
    guard let result = ctx.makeImage() else { fail("compose failed") }
    writePNG(result, to: out)
    return ["path": out, "width": canvasW, "height": canvasH, "count": images.count, "cols": cols, "rows": rows]
}

// MARK: - Main

let args = Args(Array(CommandLine.arguments.dropFirst()))
guard let command = args.positional.first else {
    fail("usage: capturekit <preflight|request|displays|windows|front|activate|mouse|mouse-move|scroll|stitch|contact> ...", code: 64)
}
let rest = Array(args.positional.dropFirst())

switch command {
case "preflight":
    let screen = CGPreflightScreenCaptureAccess()
    let ax = AXIsProcessTrusted()
    emit([
        "screen_recording": screen, "accessibility": ax,
        "host_bundle_id": ProcessInfo.processInfo.environment["__CFBundleIdentifier"] ?? "",
    ])
    exit(screen ? 0 : 2)

case "request":
    let granted = CGRequestScreenCaptureAccess()
    emit(["screen_recording": granted, "prompted": !granted])
    exit(granted ? 0 : 2)

case "displays":
    emit(activeDisplays().map(\.json))

case "windows":
    let windows = filterWindows(listWindows(all: args.flags.contains("all")), args: args)
    if args.flags.contains("plain") {
        windows.forEach { print($0.plain) }
    } else {
        emit(windows.map(\.json))
    }

case "front":
    guard let app = NSWorkspace.shared.frontmostApplication else { fail("no frontmost application") }
    let windows = listWindows(all: false).filter { $0.pid == app.processIdentifier && $0.onScreen }
    var info: [String: Any] = [
        "pid": Int(app.processIdentifier), "app": app.localizedName ?? "", "bundle_id": app.bundleIdentifier ?? "",
    ]
    if let w = windows.first { info["window"] = w.json }
    if args.flags.contains("plain") {
        if let w = windows.first { print(w.plain) } else { fail("frontmost app has no on-screen window", code: 3) }
    } else {
        emit(info)
    }

case "activate":
    let pid = args.int("pid", default: -1)
    guard pid > 0, let app = NSRunningApplication(processIdentifier: pid_t(pid)) else { fail("--pid required", code: 64) }
    app.activate()
    usleep(150_000)
    emit(["pid": pid, "active": app.isActive])

case "mouse":
    // NSEvent reports bottom-left coordinates of the primary screen; CG (and mouse-move) use top-left.
    let p = NSEvent.mouseLocation
    let primaryHeight = NSScreen.screens.first?.frame.height ?? 0
    emit(["x": Double(p.x), "y": Double(primaryHeight - p.y), "origin": "top-left"])

case "mouse-move":
    guard rest.count == 2, let x = Double(rest[0]), let y = Double(rest[1]) else { fail("mouse-move X Y (top-left origin)", code: 64) }
    CGWarpMouseCursorPosition(CGPoint(x: x, y: y))
    emit(["x": x, "y": y])

case "scroll":
    let id = args.int("window", default: 0)
    guard id > 0 else { fail("--window ID required", code: 64) }
    let dy = args.int("dy", default: 0)
    let window = windowByID(CGWindowID(id))
    guard window.onScreen else { fail("window \(id) is not on screen (minimized or on another Space)", code: 3) }
    var at: CGPoint?
    if let spec = args.options["at"] {
        let parts = spec.split(separator: ",").compactMap { Double($0) }
        guard parts.count == 2 else { fail("--at expects X,Y (window-relative points)", code: 64) }
        at = CGPoint(x: parts[0], y: parts[1])
    }
    emit(scroll(window: window, dy: dy, at: at))

case "stitch":
    guard let out = args.options["out"] else { fail("--out required", code: 64) }
    let skipTop = args.options["skip-top"] == nil ? nil : args.int("skip-top", default: 0)
    let skipBottom = args.options["skip-bottom"] == nil ? nil : args.int("skip-bottom", default: 0)
    emit(stitch(paths: rest, skipTop: skipTop, skipBottom: skipBottom,
                minOverlap: args.int("min-overlap", default: 40), inset: args.int("inset", default: 24), out: out))

case "contact":
    guard let spec = args.options["spec"] else { fail("--spec spec.json required", code: 64) }
    emit(makeContact(specPath: spec))

default:
    fail("unknown command '\(command)'", code: 64)
}
