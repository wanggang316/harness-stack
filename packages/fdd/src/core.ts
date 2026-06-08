import { existsSync } from "node:fs";
import { PlanError } from "./errors.js";
import { readText } from "./io.js";
import {
  contractPath,
  loadFeatures,
  loadSealed,
  loadState,
  saveFeatures,
  saveSealed,
  saveState
} from "./store.js";
import {
  terminalFeatureStatuses,
  type Feature,
  type FeatureStatus,
  type ValidationStateFile
} from "./schema.js";

// ---------------------------------------------------------------------------
// Assertion-id parsing (pure)
// ---------------------------------------------------------------------------

const ASSERTION_HEADING = /^###\s+(VAL-[A-Z0-9]+-\d{3})\b/;

/** Extract ordered, de-duplicated assertion ids from a validation-contract.md body. */
export function parseAssertionIds(markdown: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const line of markdown.split("\n")) {
    const m = ASSERTION_HEADING.exec(line);
    const id = m?.[1];
    if (id !== undefined && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Feature ordering / status (pure)
// ---------------------------------------------------------------------------

export function findNextPending(features: readonly Feature[]): Feature | undefined {
  return features.find((f) => f.status === "pending");
}

/**
 * Return a new feature list with `id`'s status set. Terminal statuses
 * (completed/cancelled) move the feature to the end so active work stays near
 * the top; other statuses update in place.
 */
export function withStatus(features: readonly Feature[], id: string, status: FeatureStatus): Feature[] {
  const idx = features.findIndex((f) => f.id === id);
  if (idx === -1) throw new PlanError("data", `feature not found: ${id}`);
  const hit = features[idx]!;
  const updated: Feature = { ...hit, status };
  if (terminalFeatureStatuses.has(status)) {
    const rest = features.filter((_, i) => i !== idx);
    return [...rest, updated];
  }
  return features.map((f, i) => (i === idx ? updated : f));
}

// ---------------------------------------------------------------------------
// Dir-level operations (load -> transform -> save)
// ---------------------------------------------------------------------------

export async function nextFeature(dir: string): Promise<Feature | undefined> {
  const { features } = await loadFeatures(dir);
  return findNextPending(features);
}

export async function setStatus(dir: string, id: string, status: FeatureStatus): Promise<void> {
  const file = await loadFeatures(dir);
  await saveFeatures(dir, { features: withStatus(file.features, id, status) });
}

export async function listFeatures(dir: string): Promise<Feature[]> {
  return (await loadFeatures(dir)).features;
}

export async function milestoneCounts(dir: string, milestone: string): Promise<Map<FeatureStatus, number>> {
  const { features } = await loadFeatures(dir);
  const counts = new Map<FeatureStatus, number>();
  for (const f of features) {
    if (f.milestone !== milestone) continue;
    counts.set(f.status, (counts.get(f.status) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// validation-state: init + assertion writes + gate
// ---------------------------------------------------------------------------

async function readContractIds(dir: string): Promise<string[]> {
  const path = contractPath(dir);
  if (!existsSync(path)) throw new PlanError("data", `validation-contract.md not found at ${path}`);
  const ids = parseAssertionIds(await readText(path));
  if (ids.length === 0) {
    throw new PlanError("data", `no assertion ids (### VAL-AREA-NNN) found in ${path}`);
  }
  return ids;
}

/**
 * Regenerate validation-state.json from the contract's assertion ids, preserving
 * status/evidence for ids that already exist. Ids absent from the contract are
 * dropped. Idempotent. Returns the assertion count.
 */
export async function initState(dir: string): Promise<number> {
  const ids = await readContractIds(dir);
  const prev = await loadState(dir);
  const next: ValidationStateFile = { assertions: {} };
  for (const id of ids) {
    next.assertions[id] = prev.assertions[id] ?? { status: "pending" };
  }
  await saveState(dir, next);
  return ids.length;
}

export async function setAssertion(
  dir: string,
  id: string,
  status: ValidationStateFile["assertions"][string]["status"],
  evidence?: string
): Promise<void> {
  const state = await loadState(dir);
  state.assertions[id] = evidence !== undefined ? { status, evidence } : { status };
  await saveState(dir, state);
}

export interface GateResult {
  passed: boolean;
  failing: Array<{ id: string; status: string }>;
  total: number;
}

export async function gate(dir: string): Promise<GateResult> {
  const { assertions } = await loadState(dir);
  const entries = Object.entries(assertions);
  const failing = entries
    .filter(([, a]) => a.status !== "passed")
    .map(([id, a]) => ({ id, status: a.status }));
  return { passed: entries.length > 0 && failing.length === 0, failing, total: entries.length };
}

// ---------------------------------------------------------------------------
// contract-coverage invariant
// ---------------------------------------------------------------------------

export interface CoverageResult {
  ok: boolean;
  total: number;
  violations: string[]; // prefixed lines: ORPHAN / DUPLICATE / STATE-ONLY / CONTRACT-ONLY / UNKNOWN-CLAIM
}

export async function contractCoverage(dir: string): Promise<CoverageResult> {
  const contractIds = await readContractIds(dir);
  const contractSet = new Set(contractIds);
  const { features } = await loadFeatures(dir);
  const state = await loadState(dir);

  // assertion id -> feature ids claiming it
  const claims = new Map<string, string[]>();
  const unknownClaims: string[] = [];
  for (const f of features) {
    for (const a of f.fulfills) {
      if (!contractSet.has(a)) unknownClaims.push(`UNKNOWN-CLAIM ${a} by ${f.id}`);
      claims.set(a, [...(claims.get(a) ?? []), f.id]);
    }
  }

  const violations: string[] = [];
  for (const id of contractIds) {
    const claimedBy = claims.get(id) ?? [];
    if (claimedBy.length === 0) violations.push(`ORPHAN ${id}`);
    else if (claimedBy.length > 1) violations.push(`DUPLICATE ${id} claimed by: ${claimedBy.join(", ")}`);
  }
  for (const id of Object.keys(state.assertions)) {
    if (!contractSet.has(id)) violations.push(`STATE-ONLY ${id}`);
  }
  for (const id of contractIds) {
    if (state.assertions[id] === undefined) violations.push(`CONTRACT-ONLY ${id}`);
  }
  violations.push(...unknownClaims);

  return { ok: violations.length === 0, total: contractIds.length, violations };
}

// ---------------------------------------------------------------------------
// Milestone sealing
// ---------------------------------------------------------------------------

export async function sealMilestone(dir: string, milestone: string): Promise<void> {
  const file = await loadSealed(dir);
  if (!file.sealed.includes(milestone)) {
    await saveSealed(dir, { sealed: [...file.sealed, milestone].sort() });
  }
}

export async function isSealed(dir: string, milestone: string): Promise<boolean> {
  const file = await loadSealed(dir);
  return file.sealed.includes(milestone);
}
