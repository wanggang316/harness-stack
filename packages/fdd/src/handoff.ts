import { existsSync } from "node:fs";
import type { ZodIssue } from "zod";
import { PlanError } from "./errors.js";
import { readJson, writeJsonAtomic } from "./io.js";
import { HandoffSchema, type Handoff } from "./schema.js";
import { handoffPath } from "./store.js";

function formatIssues(issues: ZodIssue[]): string {
  return issues.map((i) => `  - ${i.path.join(".") || "<root>"}: ${i.message}`).join("\n");
}

export async function writeHandoff(dir: string, featureId: string, source: unknown): Promise<string> {
  const result = HandoffSchema.safeParse(source);
  if (!result.success) {
    throw new PlanError("usage", `invalid handoff JSON:\n${formatIssues(result.error.issues)}`);
  }
  const path = handoffPath(dir, featureId);
  await writeJsonAtomic(path, result.data);
  return path;
}

export async function readHandoff(dir: string, featureId: string): Promise<Handoff> {
  const path = handoffPath(dir, featureId);
  if (!existsSync(path)) throw new PlanError("data", `no handoff recorded for ${featureId} at ${path}`);
  const result = HandoffSchema.safeParse(await readJson(path));
  if (!result.success) {
    throw new PlanError("data", `invalid handoff at ${path}:\n${formatIssues(result.error.issues)}`);
  }
  return result.data;
}
