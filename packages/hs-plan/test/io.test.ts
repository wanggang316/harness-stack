import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeJsonAtomic } from "../src/io.js";

describe("writeJsonAtomic", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hs-plan-io-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes pretty JSON with a trailing newline and leaves no temp file", async () => {
    const target = join(dir, "nested", "data.json");
    await writeJsonAtomic(target, { a: 1 });
    const raw = await readFile(target, "utf8");
    expect(raw).toBe(`${JSON.stringify({ a: 1 }, null, 2)}\n`);
    const entries = await readdir(join(dir, "nested"));
    expect(entries).toEqual(["data.json"]);
  });

  it("overwrites atomically on repeated writes (idempotent)", async () => {
    const target = join(dir, "data.json");
    await writeJsonAtomic(target, { v: 1 });
    await writeJsonAtomic(target, { v: 2 });
    expect(JSON.parse(await readFile(target, "utf8"))).toEqual({ v: 2 });
    expect((await readdir(dir)).filter((f) => f.endsWith(".tmp"))).toHaveLength(0);
  });
});
