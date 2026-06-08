export type PlanErrorKind = "data" | "invariant" | "usage";

/**
 * Domain error for fdd. `kind` maps to a CLI exit code in cli.ts:
 *   data       -> 1  (no active plan, file missing/unreadable/invalid)
 *   invariant  -> 2  (contract-coverage or gate not satisfied)
 *   usage      -> 3  (bad/missing args, bad enum value)
 */
export class PlanError extends Error {
  readonly kind: PlanErrorKind;
  constructor(kind: PlanErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PlanError";
    this.kind = kind;
  }
}
