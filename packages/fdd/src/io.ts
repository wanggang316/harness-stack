import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { PlanError } from "./errors.js";

export async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    throw new PlanError("data", `cannot read ${path}`, { cause: err });
  }
}

export async function readJson(path: string): Promise<unknown> {
  const raw = await readText(path);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new PlanError("data", `${path} is not valid JSON`, { cause: err });
  }
}

/**
 * Write JSON atomically: serialize to a sibling temp file, then rename over the
 * target. `rename` is atomic within a filesystem on POSIX, so a reader never
 * observes a half-written file and a crash mid-write leaves the prior version
 * intact. Trailing newline + 2-space indent matches @hs/llm output style.
 */
export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

export async function writeTextIfMissing(path: string, contents: string): Promise<boolean> {
  const { existsSync } = await import("node:fs");
  if (existsSync(path)) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return true;
}
