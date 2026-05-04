import { jsonSchemaToZod } from "json-schema-to-zod";
import { z, type ZodTypeAny } from "zod";
import { InvocationError } from "./errors.js";

export interface SchemaParseResult<T> {
  parsed: T;
  rawText: string;
}

export const DEFAULT_SCHEMA_REPAIR_ATTEMPTS = 2;

export function parseSchemaResponse<T>(text: string, schema: ZodTypeAny): SchemaParseResult<T> {
  const candidate = stripCodeFences(text);
  let json: unknown;
  try {
    json = JSON.parse(candidate);
  } catch (err) {
    throw new SchemaParseError(`response is not valid JSON: ${(err as Error).message}`, text);
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new SchemaParseError(`response failed schema validation: ${issues}`, text);
  }
  return { parsed: result.data as T, rawText: text };
}

export class SchemaParseError extends Error {
  readonly rawText: string;
  constructor(message: string, rawText: string) {
    super(message);
    this.name = "SchemaParseError";
    this.rawText = rawText;
  }
}

export function jsonSchemaFileContentsToZod(jsonSchema: unknown): ZodTypeAny {
  // jsonSchemaToZod produces a string of Zod source code; we materialize it
  // into a runtime ZodTypeAny via the Function constructor with `z` injected.
  // The schema input is operator-controlled (read from a local file path that
  // the caller supplied) — same trust level as the config file. Never call
  // this on a JSON Schema sourced from network input.
  // Default mode emits a bare expression (e.g. `z.object({...})`); module modes
  // would emit statements that cannot be passed to the Function constructor.
  const code = jsonSchemaToZod(jsonSchema as never);
  try {
    const factory = new Function("z", `return ${code};`) as (zRef: typeof z) => ZodTypeAny;
    return factory(z);
  } catch (err) {
    throw new InvocationError("config", `failed to materialize JSON Schema as Zod: ${(err as Error).message}`, {
      cause: err
    });
  }
}

const FENCE_RE = /^\s*```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i;

export function stripCodeFences(text: string): string {
  const match = FENCE_RE.exec(text.trim());
  return match ? match[1]!.trim() : text.trim();
}
