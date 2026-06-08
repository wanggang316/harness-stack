import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared id shapes
// ---------------------------------------------------------------------------

/** kebab-case, used for feature ids and plan slugs. */
export const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Assertion id, e.g. VAL-AUTH-001. AREA is uppercase alnum; NNN is 3 digits. */
export const VAL_ID = /^VAL-[A-Z0-9]+-\d{3}$/;

// ---------------------------------------------------------------------------
// features.json
// ---------------------------------------------------------------------------

export const featureStatuses = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "failure",
  "partial"
] as const;
export const FeatureStatusSchema = z.enum(featureStatuses);
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

/** Status values that terminate a feature and move it to the bottom of the list. */
export const terminalFeatureStatuses: ReadonlySet<FeatureStatus> = new Set(["completed", "cancelled"]);

export const FeatureSchema = z
  .object({
    id: z.string().regex(KEBAB, "feature id must be kebab-case"),
    description: z.string().min(1),
    agent: z.string().min(1), // the subagent/skill that implements this feature
    milestone: z.string().min(1),
    preconditions: z.array(z.string()).default([]),
    expectedBehavior: z.array(z.string()).default([]),
    verificationSteps: z.array(z.string()).default([]),
    fulfills: z.array(z.string().regex(VAL_ID, "fulfills entries must be VAL-<AREA>-NNN ids")).default([]),
    status: FeatureStatusSchema.default("pending")
  })
  .strict();
export type Feature = z.infer<typeof FeatureSchema>;

export const FeaturesFileSchema = z
  .object({
    features: z.array(FeatureSchema).default([])
  })
  .strict();
export type FeaturesFile = z.infer<typeof FeaturesFileSchema>;

// ---------------------------------------------------------------------------
// validation-state.json
// ---------------------------------------------------------------------------

export const assertionStatuses = ["pending", "passed", "failed", "blocked"] as const;
export const AssertionStatusSchema = z.enum(assertionStatuses);
export type AssertionStatus = z.infer<typeof AssertionStatusSchema>;

export const AssertionSchema = z
  .object({
    status: AssertionStatusSchema,
    evidence: z.string().min(1).optional() // free-form pointer: path / url / note
  })
  .strict();
export type Assertion = z.infer<typeof AssertionSchema>;

export const ValidationStateFileSchema = z
  .object({
    assertions: z.record(z.string(), AssertionSchema).default({})
  })
  .strict();
export type ValidationStateFile = z.infer<typeof ValidationStateFileSchema>;

// ---------------------------------------------------------------------------
// handoff JSON (worker -> controller)
// ---------------------------------------------------------------------------

export const SuccessStateSchema = z.enum(["success", "partial", "failure"]);
export type SuccessState = z.infer<typeof SuccessStateSchema>;

export const DiscoveredIssueSchema = z
  .object({
    summary: z.string(),
    severity: z.enum(["blocker", "bug", "tech-debt", "nit"]).optional(),
    detail: z.string().optional()
  })
  .strict();

export const HandoffSchema = z
  .object({
    feature: z.string(),
    successState: SuccessStateSchema,
    summary: z.string(),
    commits: z.array(z.string()).default([]),
    filesChanged: z.array(z.string()).default([]),
    verificationEvidence: z.array(z.string()).default([]),
    discoveredIssues: z.array(DiscoveredIssueSchema).default([]),
    whatWasLeftUndone: z.array(z.string()).default([]),
    criticalContext: z.array(z.string()).default([]),
    returnToController: z.boolean().default(false)
  })
  .strict();
export type Handoff = z.infer<typeof HandoffSchema>;

// ---------------------------------------------------------------------------
// sealed-milestones.json (auxiliary bookkeeping)
// ---------------------------------------------------------------------------

export const SealedMilestonesSchema = z
  .object({
    sealed: z.array(z.string()).default([])
  })
  .strict();
export type SealedMilestones = z.infer<typeof SealedMilestonesSchema>;
