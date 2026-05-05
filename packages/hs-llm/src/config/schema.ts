import { z } from "zod";

const reasoningLevels = ["minimal", "medium", "high"] as const;

export const ProviderModelSchema = z.object({
  id: z.string().min(1),
  defaults: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxOutputTokens: z.number().int().positive().optional(),
      reasoning: z.enum(reasoningLevels).optional()
    })
    .optional()
});

export const ApiProviderSchema = z.object({
  type: z.literal("api"),
  family: z.enum(["openai-compatible", "anthropic"]),
  baseURL: z.string().url(),
  apiKeyEnv: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  models: z.array(ProviderModelSchema).min(1)
});

export const cliTypes = [
  "claude",
  "codex",
  "gemini",
  "copilot",
  "pi",
  "opencode",
  "droid",
  "amp",
  "generic"
] as const;

export const CliProviderSchema = z.object({
  type: z.literal("cli"),
  cliType: z.enum(cliTypes),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  defaultTimeoutMs: z.number().int().positive().optional(),
  models: z.array(ProviderModelSchema).min(1)
});

export const SdkProviderSchema = z.object({
  type: z.literal("sdk"),
  adapter: z.string().min(1),
  exportName: z.string().min(1).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  models: z.array(ProviderModelSchema).min(1)
});

export const MockProviderSchema = z.object({
  type: z.literal("mock"),
  behavior: z.enum(["deterministic", "timeout", "error", "malformed"]).default("deterministic"),
  latencyMs: z.number().int().nonnegative().default(0),
  responseTemplate: z.string().default("MOCK[{agentId}]: {prompt}"),
  models: z.array(ProviderModelSchema).min(1)
});

export const ProviderSchema = z.discriminatedUnion("type", [
  ApiProviderSchema,
  CliProviderSchema,
  SdkProviderSchema,
  MockProviderSchema
]);

export const AgentSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  reasoning: z.enum(reasoningLevels).optional(),
  timeoutMs: z.number().int().positive().optional(),
  role: z.string().optional()
});

export const HsLlmConfigSchema = z.object({
  version: z.literal(1),
  providers: z.record(z.string(), ProviderSchema),
  agents: z.array(AgentSchema).min(1)
});

export type ProviderModel = z.infer<typeof ProviderModelSchema>;
export type ApiProviderConfig = z.infer<typeof ApiProviderSchema>;
export type CliProviderConfig = z.infer<typeof CliProviderSchema>;
export type SdkProviderConfig = z.infer<typeof SdkProviderSchema>;
export type MockProviderConfig = z.infer<typeof MockProviderSchema>;
export type ProviderConfig = z.infer<typeof ProviderSchema>;
export type AgentConfig = z.infer<typeof AgentSchema>;
export type HsLlmConfig = z.infer<typeof HsLlmConfigSchema>;
export type CliType = (typeof cliTypes)[number];
export type ReasoningLevel = (typeof reasoningLevels)[number];
