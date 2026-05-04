import { readFile } from "node:fs/promises";
import type { ZodIssue } from "zod";
import { InvocationError } from "../runtime/errors.js";
import { HsLlmConfigSchema, type HsLlmConfig } from "./schema.js";

export async function loadConfig(path: string): Promise<HsLlmConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    throw new InvocationError("config", `Failed to read config file: ${path}`, { cause: err });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new InvocationError("config", `Config file is not valid JSON: ${path}`, { cause: err });
  }

  return validateConfig(parsed);
}

export function validateConfig(input: unknown): HsLlmConfig {
  const result = HsLlmConfigSchema.safeParse(input);
  if (!result.success) {
    throw new InvocationError("config", `Config validation failed:\n${formatIssues(result.error.issues)}`, {
      cause: result.error
    });
  }
  validateReferences(result.data);
  return result.data;
}

function formatIssues(issues: ZodIssue[]): string {
  return issues.map((issue) => `  - ${issue.path.join(".") || "<root>"}: ${issue.message}`).join("\n");
}

function validateReferences(config: HsLlmConfig): void {
  const errors: string[] = [];
  for (const agent of config.agents) {
    const provider = config.providers[agent.provider];
    if (!provider) {
      errors.push(`agent '${agent.id}' references unknown provider '${agent.provider}'`);
      continue;
    }
    const model = provider.models.find((m) => m.id === agent.model);
    if (!model) {
      const available = provider.models.map((m) => m.id).join(", ");
      errors.push(
        `agent '${agent.id}' references unknown model '${agent.model}' on provider '${agent.provider}' (available: ${available})`
      );
    }
  }
  if (errors.length > 0) {
    throw new InvocationError(
      "config",
      `Config references invalid:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }
}
