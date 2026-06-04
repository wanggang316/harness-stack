// Public library surface for skills/tests that prefer importing over shelling out.
export { PlanError, type PlanErrorKind } from "./errors.js";
export * from "./schema.js";
export {
  parseAssertionIds,
  findNextPending,
  withStatus,
  nextFeature,
  setStatus,
  listFeatures,
  milestoneCounts,
  initState,
  setAssertion,
  gate,
  contractCoverage,
  sealMilestone,
  isSealed,
  type GateResult,
  type CoverageResult
} from "./core.js";
export { writeHandoff, readHandoff } from "./handoff.js";
export {
  runtimeRoot,
  plansDir,
  planDir,
  resolvePlan,
  readActiveSlug,
  writeActiveSlug,
  listPlanSlugs,
  contractPath,
  planMdPath,
  featuresPath,
  statePath
} from "./store.js";
export { main } from "./cli.js";
