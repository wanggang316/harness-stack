export interface PromptEnvelopeInput {
  role?: string;
  system?: string;
  prompt: string;
  context?: unknown;
  schemaJson?: string;
}

export function buildPromptEnvelope(input: PromptEnvelopeInput): string {
  const parts: string[] = [];
  if (input.role) parts.push(`# Role\n${input.role}`);
  if (input.system) parts.push(`# System\n${input.system}`);
  parts.push(`# Task\n${input.prompt}`);
  if (input.context !== undefined) {
    parts.push(`# Context\n${JSON.stringify(input.context, null, 2)}`);
  }
  if (input.schemaJson) {
    parts.push(`# Output schema (JSON Schema)\n${input.schemaJson}`);
  }
  return parts.join("\n\n");
}
