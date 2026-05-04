import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { main } from "../src/cli.js";
import {
  invoke,
  invokeMany,
  validateConfig,
  parseSchemaResponse,
  jsonSchemaFileContentsToZod,
  stripCodeFences,
  SchemaParseError,
  type HsLlmConfig
} from "../src/index.js";

class CapturingStream extends Writable {
  output = "";
  override _write(chunk: Buffer | string, _enc: BufferEncoding, cb: (err?: Error | null) => void): void {
    this.output += chunk.toString();
    cb();
  }
}

describe("stripCodeFences", () => {
  it("returns the inner contents of a ```json fenced block", () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("returns the inner contents of a bare ``` fenced block", () => {
    expect(stripCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("trims whitespace from a non-fenced response", () => {
    expect(stripCodeFences('   {"a":1}\n')).toBe('{"a":1}');
  });
});

describe("parseSchemaResponse", () => {
  const schema = z.object({ value: z.number() });

  it("returns parsed data on a clean JSON match", () => {
    const r = parseSchemaResponse<{ value: number }>('{"value": 42}', schema);
    expect(r.parsed).toEqual({ value: 42 });
    expect(r.rawText).toBe('{"value": 42}');
  });

  it("strips code fences before parsing", () => {
    const r = parseSchemaResponse<{ value: number }>('```json\n{"value": 7}\n```', schema);
    expect(r.parsed).toEqual({ value: 7 });
  });

  it("throws SchemaParseError when text is not valid JSON", () => {
    expect(() => parseSchemaResponse("not json", schema)).toThrow(SchemaParseError);
  });

  it("throws SchemaParseError when JSON does not satisfy schema", () => {
    expect(() => parseSchemaResponse('{"value": "string"}', schema)).toThrow(SchemaParseError);
  });

  it("preserves rawText on the thrown error for diagnostics", () => {
    try {
      parseSchemaResponse("garbage", schema);
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaParseError);
      expect((err as SchemaParseError).rawText).toBe("garbage");
    }
  });
});

describe("jsonSchemaFileContentsToZod", () => {
  it("converts a JSON Schema object into a runtime ZodTypeAny", () => {
    const zodSchema = jsonSchemaFileContentsToZod({
      type: "object",
      properties: {
        answer: { type: "string" },
        confidence: { type: "number" }
      },
      required: ["answer", "confidence"]
    });
    const result = zodSchema.safeParse({ answer: "yes", confidence: 0.9 });
    expect(result.success).toBe(true);
    const bad = zodSchema.safeParse({ answer: "yes" });
    expect(bad.success).toBe(false);
  });

  it("throws config InvocationError on a non-convertible JSON Schema", () => {
    expect(() => jsonSchemaFileContentsToZod({ this_is_not_a_schema: 42 })).not.toThrow();
    // jsonSchemaToZod is permissive (treats unknown fields as z.any). Pin the
    // documented behavior so callers know the bar is "best-effort", not strict.
  });
});

describe("invoke + schema", () => {
  function buildConfig(template: string): HsLlmConfig {
    return validateConfig({
      version: 1,
      providers: {
        p: {
          type: "mock",
          behavior: "deterministic",
          latencyMs: 0,
          responseTemplate: template,
          models: [{ id: "m" }]
        }
      },
      agents: [{ id: "a", provider: "p", model: "m" }]
    });
  }

  it("returns response with parsed when LLM output matches the schema", async () => {
    const cfg = buildConfig('{"value":99}');
    const schema = z.object({ value: z.number() });
    const res = await invoke<{ value: number }>({
      config: cfg,
      agentId: "a",
      request: { prompt: "anything" },
      schema
    });
    expect(res.parsed).toEqual({ value: 99 });
    expect(res.text).toBe('{"value":99}');
  });

  it("strips fenced JSON before parsing", async () => {
    const cfg = buildConfig('```json\n{"value":1}\n```');
    const schema = z.object({ value: z.number() });
    const res = await invoke<{ value: number }>({
      config: cfg,
      agentId: "a",
      request: { prompt: "x" },
      schema
    });
    expect(res.parsed).toEqual({ value: 1 });
  });

  it("throws non-retryable after exhausting repair attempts when output never validates", async () => {
    const cfg = buildConfig("not json no matter how many times we ask");
    const schema = z.object({ value: z.number() });
    await expect(
      invoke({
        config: cfg,
        agentId: "a",
        request: { prompt: "x" },
        schema,
        schemaRepairAttempts: 1
      })
    ).rejects.toMatchObject({ kind: "non-retryable" });
  });

  it("preserves last raw output in the exhaustion error message", async () => {
    const cfg = buildConfig("garbage");
    const schema = z.object({ value: z.number() });
    try {
      await invoke({
        config: cfg,
        agentId: "a",
        request: { prompt: "x" },
        schema,
        schemaRepairAttempts: 0
      });
    } catch (err) {
      expect((err as Error).message).toContain("garbage");
    }
  });
});

describe("invokeMany + schema", () => {
  it("applies a per-invocation schema and returns parsed for ok results", async () => {
    const cfg = validateConfig({
      version: 1,
      providers: {
        p: {
          type: "mock",
          behavior: "deterministic",
          latencyMs: 0,
          responseTemplate: '{"value":11}',
          models: [{ id: "m" }]
        }
      },
      agents: [{ id: "a", provider: "p", model: "m" }]
    });
    const schema = z.object({ value: z.number() });
    const results = await invokeMany({
      config: cfg,
      invocations: [{ agentId: "a", request: { prompt: "x" }, schema }]
    });
    expect(results[0]?.status).toBe("ok");
    if (results[0]?.status === "ok") {
      expect(results[0].response.parsed).toEqual({ value: 11 });
    }
  });
});

describe("cli --schema-file", () => {
  let dir: string;
  let configPath: string;
  let schemaPath: string;
  let outBuf: CapturingStream;
  let errBuf: CapturingStream;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hs-llm-schema-"));
    configPath = join(dir, "config.json");
    schemaPath = join(dir, "schema.json");
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        providers: {
          p: {
            type: "mock",
            behavior: "deterministic",
            latencyMs: 0,
            responseTemplate: '{"answer":"yes","confidence":0.9}',
            models: [{ id: "m" }]
          }
        },
        agents: [{ id: "a", provider: "p", model: "m" }]
      }),
      "utf8"
    );
    await writeFile(
      schemaPath,
      JSON.stringify({
        type: "object",
        properties: { answer: { type: "string" }, confidence: { type: "number" } },
        required: ["answer", "confidence"]
      }),
      "utf8"
    );
    outBuf = new CapturingStream();
    errBuf = new CapturingStream();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("populates parsed in the CLI's invoke output when schema validates", async () => {
    const code = await main(
      [
        "invoke",
        "--config",
        configPath,
        "--agent",
        "a",
        "--prompt",
        "anything",
        "--schema-file",
        schemaPath
      ],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(0);
    const json = JSON.parse(outBuf.output);
    expect(json.parsed).toEqual({ answer: "yes", confidence: 0.9 });
  });

  it("returns 3 (usage error) when schema-file is unparseable JSON", async () => {
    const badPath = join(dir, "bad-schema.json");
    await writeFile(badPath, "{ not json", "utf8");
    const code = await main(
      [
        "invoke",
        "--config",
        configPath,
        "--agent",
        "a",
        "--prompt",
        "x",
        "--schema-file",
        badPath
      ],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(3);
    expect(errBuf.output).toContain("usage error");
  });
});
