export type InvocationErrorKind = "config" | "timeout" | "retryable" | "non-retryable" | "abort";

export class InvocationError extends Error {
  readonly kind: InvocationErrorKind;
  constructor(kind: InvocationErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InvocationError";
    this.kind = kind;
  }
}
