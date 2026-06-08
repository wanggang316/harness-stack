import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "../src/cli.js";

class CapturingStream extends Writable {
  output = "";
  override _write(chunk: Buffer | string, _enc: BufferEncoding, cb: (err?: Error | null) => void): void {
    this.output += chunk.toString();
    cb();
  }
}

const CONTRACT = `# Validation Contract: demo

## Area: Demo

### VAL-DEMO-001: first behavior
A user does the first thing.

### VAL-DEMO-002: second behavior
A user does the second thing.
`;

function featuresFixture() {
  return {
    features: [
      {
        id: "demo-a",
        description: "build A",
        agent: "implementer",
        milestone: "m1",
        fulfills: ["VAL-DEMO-001"],
        status: "pending"
      },
      {
        id: "demo-b",
        description: "build B",
        agent: "implementer",
        milestone: "m1",
        fulfills: ["VAL-DEMO-002"],
        status: "pending"
      }
    ]
  };
}

describe("fdd cli", () => {
  let root: string;
  let planDir: string;
  let prevEnv: string | undefined;

  async function run(...args: string[]): Promise<{ code: number; out: string; err: string }> {
    const out = new CapturingStream();
    const err = new CapturingStream();
    const code = await main(args, { stdout: out, stderr: err });
    return { code, out: out.output, err: err.output };
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "fdd-cli-"));
    prevEnv = process.env.HS_PLAN_RUNTIME_DIR;
    process.env.HS_PLAN_RUNTIME_DIR = root;
    planDir = join(root, "plans", "demo");
  });

  afterEach(async () => {
    if (prevEnv === undefined) delete process.env.HS_PLAN_RUNTIME_DIR;
    else process.env.HS_PLAN_RUNTIME_DIR = prevEnv;
    await rm(root, { recursive: true, force: true });
  });

  async function seed(): Promise<void> {
    expect((await run("init", "demo")).code).toBe(0);
    await writeFile(join(planDir, "validation-contract.md"), CONTRACT, "utf8");
    await writeFile(join(planDir, "features.json"), JSON.stringify(featuresFixture(), null, 2), "utf8");
    expect((await run("init-state")).code).toBe(0);
  }

  it("--help returns 0 with usage", async () => {
    const r = await run("--help");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Usage:");
  });

  it("no subcommand returns 3 with usage on stderr", async () => {
    const r = await run();
    expect(r.code).toBe(3);
    expect(r.err).toContain("Usage:");
  });

  it("unknown subcommand returns 3", async () => {
    expect((await run("bogus")).code).toBe(3);
  });

  it("commands fail with exit 1 when there is no active plan", async () => {
    const r = await run("next-feature");
    expect(r.code).toBe(1);
    expect(r.err).toContain("no active plan");
  });

  it("init scaffolds a plan and sets it active", async () => {
    expect((await run("init", "demo")).code).toBe(0);
    const active = await run("active");
    expect(active.code).toBe(0);
    expect(active.out.split("\t")[0]).toBe("demo");
    expect((await run("list-plans")).out).toContain("* demo");
  });

  it("rejects a non-kebab slug", async () => {
    const r = await run("init", "Demo_Plan");
    expect(r.code).toBe(3);
  });

  it("init-state derives assertions, preserving prior status on re-run", async () => {
    await seed();
    const first = await run("init-state");
    expect(first.out).toContain("2 assertions");
    expect((await run("set-assertion", "VAL-DEMO-001", "passed")).code).toBe(0);
    // re-run init-state; the passed status must survive
    await run("init-state");
    const gateAfter = await run("gate");
    expect(gateAfter.out).toContain("VAL-DEMO-002"); // still failing, but 001 stays passed
    expect(gateAfter.out).not.toContain("VAL-DEMO-001");
  });

  it("next-feature returns first pending; empty when none pending", async () => {
    await seed();
    expect((await run("next-feature")).out).toBe("demo-a\timplementer\tm1\n");
    await run("set-status", "demo-a", "completed");
    await run("set-status", "demo-b", "completed");
    expect((await run("next-feature")).out).toBe("");
  });

  it("set-status completed moves the feature to the bottom", async () => {
    await seed();
    expect((await run("set-status", "demo-a", "completed")).code).toBe(0);
    const list = await run("list-features");
    const ids = list.out.trim().split("\n").map((l) => l.split("\t")[2]);
    expect(ids).toEqual(["demo-b", "demo-a"]);
  });

  it("set-status rejects a bad enum (exit 3) and unknown id (exit 1)", async () => {
    await seed();
    expect((await run("set-status", "demo-a", "done")).code).toBe(3);
    expect((await run("set-status", "ghost", "completed")).code).toBe(1);
  });

  it("contract-coverage passes when each assertion is claimed once", async () => {
    await seed();
    const r = await run("contract-coverage");
    expect(r.code).toBe(0);
    expect(r.out).toContain("coverage OK");
  });

  it("contract-coverage reports ORPHAN and DUPLICATE with exit 2", async () => {
    await seed();
    // demo-b now also claims 001 -> 001 duplicated, 002 orphaned
    const dup = featuresFixture();
    dup.features[1]!.fulfills = ["VAL-DEMO-001"];
    await writeFile(join(planDir, "features.json"), JSON.stringify(dup, null, 2), "utf8");
    const r = await run("contract-coverage");
    expect(r.code).toBe(2);
    expect(r.out).toContain("DUPLICATE VAL-DEMO-001");
    expect(r.out).toContain("ORPHAN VAL-DEMO-002");
  });

  it("gate fails (exit 2) until all assertions pass, then succeeds (exit 0)", async () => {
    await seed();
    expect((await run("gate")).code).toBe(2);
    await run("set-assertion", "VAL-DEMO-001", "passed", "screenshots/a.png");
    await run("set-assertion", "VAL-DEMO-002", "passed");
    const r = await run("gate");
    expect(r.code).toBe(0);
    expect(r.out).toContain("GATE PASSED");
  });

  it("seal-milestone and is-sealed roundtrip", async () => {
    await seed();
    expect((await run("is-sealed", "m1")).out).toBe("no\n");
    expect((await run("seal-milestone", "m1")).code).toBe(0);
    expect((await run("is-sealed", "m1")).out).toBe("yes\n");
  });

  it("write-handoff validates and handoff reads it back", async () => {
    await seed();
    const hoFile = join(root, "ho.json");
    await writeFile(
      hoFile,
      JSON.stringify({
        feature: "demo-a",
        successState: "success",
        summary: "did the thing",
        commits: ["abc1234"]
      }),
      "utf8"
    );
    expect((await run("write-handoff", "demo-a", hoFile)).code).toBe(0);
    const read = await run("handoff", "demo-a");
    expect(read.code).toBe(0);
    expect(JSON.parse(read.out).successState).toBe("success");
  });

  it("write-handoff rejects a malformed handoff with exit 3", async () => {
    await seed();
    const bad = join(root, "bad.json");
    await writeFile(bad, JSON.stringify({ feature: "demo-a", successState: "wat" }), "utf8");
    expect((await run("write-handoff", "demo-a", bad)).code).toBe(3);
  });

  it("--plan overrides the active plan", async () => {
    await seed();
    await run("init", "other");
    // active is now "other"; --plan demo targets the seeded plan
    expect((await run("next-feature", "--plan", "demo")).out).toBe("demo-a\timplementer\tm1\n");
  });
});
