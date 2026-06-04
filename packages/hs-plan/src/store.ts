import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ZodIssue } from "zod";
import { PlanError } from "./errors.js";
import { readJson, readText, writeJsonAtomic } from "./io.js";
import {
  FeaturesFileSchema,
  SealedMilestonesSchema,
  ValidationStateFileSchema,
  type FeaturesFile,
  type SealedMilestones,
  type ValidationStateFile
} from "./schema.js";

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/** `<repo>/.harness-runtime`, or $HS_PLAN_RUNTIME_DIR when set (used by tests). */
export function runtimeRoot(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.HS_PLAN_RUNTIME_DIR;
  if (override !== undefined && override.length > 0) return resolve(override);
  let top: string;
  try {
    top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    top = process.cwd();
  }
  return join(top, ".harness-runtime");
}

export function plansDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(runtimeRoot(env), "plans");
}

export function activeFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(plansDir(env), ".active");
}

export function planDir(slug: string, env: NodeJS.ProcessEnv = process.env): string {
  return join(plansDir(env), slug);
}

export const featuresPath = (dir: string): string => join(dir, "features.json");
export const statePath = (dir: string): string => join(dir, "validation-state.json");
export const contractPath = (dir: string): string => join(dir, "validation-contract.md");
export const planMdPath = (dir: string): string => join(dir, "plan.md");
export const sealedPath = (dir: string): string => join(dir, "sealed-milestones.json");
export const handoffPath = (dir: string, featureId: string): string =>
  join(dir, "handoffs", `${featureId}.json`);

// ---------------------------------------------------------------------------
// Active-plan resolution
// ---------------------------------------------------------------------------

export async function readActiveSlug(env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  const f = activeFilePath(env);
  if (!existsSync(f)) return undefined;
  const slug = (await readText(f)).trim();
  return slug.length > 0 ? slug : undefined;
}

export async function writeActiveSlug(slug: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(plansDir(env), { recursive: true });
  await writeFile(activeFilePath(env), `${slug}\n`, "utf8");
}

/**
 * Resolve the target plan dir. `explicitSlug` wins (the --plan flag); otherwise
 * the `.active` file. Throws a data error when neither is set or the dir is
 * missing (unless `mustExist` is false, as for `init`).
 */
export async function resolvePlan(
  explicitSlug: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  mustExist = true
): Promise<{ slug: string; dir: string }> {
  const slug = explicitSlug ?? (await readActiveSlug(env));
  if (slug === undefined) {
    throw new PlanError(
      "data",
      "no active plan; run `hs-plan use <slug>` or pass --plan <slug>"
    );
  }
  const dir = planDir(slug, env);
  if (mustExist && !existsSync(dir)) {
    throw new PlanError("data", `plan "${slug}" not found at ${dir}`);
  }
  return { slug, dir };
}

export async function listPlanSlugs(env: NodeJS.ProcessEnv = process.env): Promise<string[]> {
  const dir = plansDir(env);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// ---------------------------------------------------------------------------
// Typed load / save
// ---------------------------------------------------------------------------

function formatIssues(issues: ZodIssue[]): string {
  return issues.map((i) => `  - ${i.path.join(".") || "<root>"}: ${i.message}`).join("\n");
}

export async function loadFeatures(dir: string): Promise<FeaturesFile> {
  const path = featuresPath(dir);
  if (!existsSync(path)) throw new PlanError("data", `features.json not found at ${path}`);
  const result = FeaturesFileSchema.safeParse(await readJson(path));
  if (!result.success) {
    throw new PlanError("data", `invalid features.json:\n${formatIssues(result.error.issues)}`);
  }
  const seen = new Set<string>();
  for (const f of result.data.features) {
    if (seen.has(f.id)) throw new PlanError("data", `duplicate feature id: ${f.id}`);
    seen.add(f.id);
  }
  return result.data;
}

export async function saveFeatures(dir: string, file: FeaturesFile): Promise<void> {
  await writeJsonAtomic(featuresPath(dir), file);
}

export async function loadState(dir: string): Promise<ValidationStateFile> {
  const path = statePath(dir);
  if (!existsSync(path)) return { assertions: {} };
  const result = ValidationStateFileSchema.safeParse(await readJson(path));
  if (!result.success) {
    throw new PlanError("data", `invalid validation-state.json:\n${formatIssues(result.error.issues)}`);
  }
  return result.data;
}

export async function saveState(dir: string, file: ValidationStateFile): Promise<void> {
  await writeJsonAtomic(statePath(dir), file);
}

export async function loadSealed(dir: string): Promise<SealedMilestones> {
  const path = sealedPath(dir);
  if (!existsSync(path)) return { sealed: [] };
  const result = SealedMilestonesSchema.safeParse(await readJson(path));
  if (!result.success) {
    throw new PlanError("data", `invalid sealed-milestones.json:\n${formatIssues(result.error.issues)}`);
  }
  return result.data;
}

export async function saveSealed(dir: string, file: SealedMilestones): Promise<void> {
  await writeJsonAtomic(sealedPath(dir), file);
}
