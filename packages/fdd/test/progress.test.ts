import { execFile } from "node:child_process";
import { closeSync, writeSync } from "node:fs";
import { Writable } from "node:stream";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";
import {
  eventsPath,
  logEvent,
  progressReport,
  readEvents,
} from "../src/progress.js";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    writeSync: vi.fn(actual.writeSync),
    closeSync: vi.fn(actual.closeSync),
  };
});

const exec = promisify(execFile);
describe("progress bookkeeping", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fdd-progress-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("preserves multiline messages and supplies a current timestamp", async () => {
    const before = Date.now();
    const event = logEvent(
      dir,
      "dispatch",
      "feature-a",
      "worker=123\nphase=build",
    );
    expect(Date.parse(event.timestamp)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(event.timestamp)).toBeLessThanOrEqual(Date.now());
    expect(await readEvents(dir)).toEqual([event]);
    expect((await readFile(eventsPath(dir), "utf8")).split("\n")).toHaveLength(
      2,
    );
  });

  it("rejects invalid inputs without creating a log", async () => {
    for (const args of [
      ["Bad Kind", "a", "ok"],
      ["progress", "a\nb", "ok"],
      ["progress", "a", " "],
      ["progress", "a", "字".repeat(6000)],
    ]) {
      expect(() => logEvent(dir, args[0]!, args[1]!, args[2]!)).toThrow();
    }
    expect(await readEvents(dir)).toEqual([]);
  });

  it("does not retry short writes and preserves their diagnostic over close failures", () => {
    const actualClose = vi.mocked(closeSync).getMockImplementation()!;
    vi.mocked(writeSync).mockClear().mockReturnValueOnce(1);
    vi.mocked(closeSync).mockImplementationOnce((fd) => {
      actualClose(fd);
      throw new Error("injected close failure");
    });
    expect(() => logEvent(dir, "progress", "a", "working")).toThrow(
      /cannot append .*short event write; inspect events.jsonl/,
    );
    expect(writeSync).toHaveBeenCalledTimes(1);
  });

  it("maps a close failure to CLI data exit 1 even after the event was written", async () => {
    const plan = join(dir, "plans", "demo");
    await mkdir(plan, { recursive: true });
    const previousRoot = process.env.HS_PLAN_RUNTIME_DIR;
    const actualClose = vi.mocked(closeSync).getMockImplementation()!;
    vi.mocked(closeSync).mockImplementationOnce((fd) => {
      actualClose(fd);
      throw new Error("injected close failure");
    });
    let stderr = "";
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        stderr += chunk.toString();
        callback();
      },
    });
    try {
      process.env.HS_PLAN_RUNTIME_DIR = dir;
      const code = await main(
        ["log", "progress", "a", "working", "--plan", "demo"],
        { stderr: stream },
      );
      expect(code).toBe(1);
      expect(stderr).toContain("error (data): cannot close");
      expect(await readEvents(plan)).toHaveLength(1);
    } finally {
      if (previousRoot === undefined) delete process.env.HS_PLAN_RUNTIME_DIR;
      else process.env.HS_PLAN_RUNTIME_DIR = previousRoot;
    }
  });

  it("reports malformed and interrupted records instead of hiding them", async () => {
    await writeFile(eventsPath(dir), '{"timestamp":');
    await expect(readEvents(dir)).rejects.toThrow("incomplete");
    await writeFile(eventsPath(dir), "{}\n");
    await expect(readEvents(dir)).rejects.toThrow("line 1");
  });

  it("renders current work and a bounded event history without modifying the plan", async () => {
    await writeFile(
      join(dir, "features.json"),
      JSON.stringify({
        features: [
          {
            id: "a",
            description: "A",
            agent: "implementer",
            milestone: "m1",
            status: "in_progress",
          },
          {
            id: "b",
            description: "B",
            agent: "implementer",
            milestone: "m1",
            status: "pending",
          },
          {
            id: "c",
            description: "C",
            agent: "implementer",
            milestone: "m2",
            status: "in_progress",
          },
        ],
      }),
    );
    await writeFile(join(dir, "plan.md"), "Keep decision log\n");
    for (let i = 0; i < 12; i++)
      logEvent(dir, "progress", `event-${i}`, "working");
    const report = await progressReport(dir);
    expect(report).toContain("in_progress: 2");
    expect(report).toContain("Current: a (m1), c (m2)");
    expect(report).toContain("Next pending: b");
    expect(report).not.toContain("event-1:");
    expect(report).toContain("event-2:");
    expect(await readFile(join(dir, "plan.md"), "utf8")).toBe(
      "Keep decision log\n",
    );
  });

  it("retains every complete record from concurrent processes", async () => {
    const moduleUrl = new URL("../src/progress.ts", import.meta.url).href;
    await Promise.all(
      Array.from({ length: 6 }, (_, worker) =>
        exec(
          process.execPath,
          [
            "--import",
            "tsx",
            "--input-type=module",
            "-e",
            `import { logEvent } from ${JSON.stringify(moduleUrl)}; for (let i = 0; i < 25; i++) logEvent(${JSON.stringify(dir)}, "progress", "worker-${worker}", String(i));`,
          ],
          { cwd: resolve(import.meta.dirname, "../../..") },
        ),
      ),
    );
    const events = await readEvents(dir);
    expect(events).toHaveLength(150);
    expect(
      new Set(events.map((event) => `${event.subject}:${event.message}`)).size,
    ).toBe(150);
  });
});
