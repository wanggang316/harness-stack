#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { argv as processArgv, exit, stderr, stdout } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ZodTypeAny } from "zod";
import { InvocationError } from "./runtime/errors.js";
import { invoke, invokeMany, type InvokeManyResult } from "./runtime/runner.js";
import { jsonSchemaFileContentsToZod } from "./runtime/schema.js";
import type { InvocationRequest } from "./runtime/types.js";
import { loadConfig } from "./config/load.js";

interface MainStreams {
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

const HELP_TEXT = `Usage:
  hs-llm init           [--config <path>] [--force]
  hs-llm invoke         --agent <id> [flags]
  hs-llm invoke-many    --agents <a,b,c> [flags]
  hs-llm validate-config [<path>]

Config resolution (when --config / positional path is omitted):
  1. $HS_LLM_CONFIG
  2. ./hs-llm.config.json
  3. \$XDG_CONFIG_HOME/hs-llm/config.json
     (default: ~/.config/hs-llm/config.json)

Common flags:
  --config <path>         Path to the hs-llm config file. Optional;
                          falls back to the resolution order above.
  --prompt <str>          Prompt text. Mutually exclusive with --prompt-file.
  --prompt-file <path>    Read prompt from file.
  --system <str>          System message.
  --temperature <num>
  --max-output-tokens <n>
  --reasoning <minimal|medium|high>
  --timeout-ms <n>
  --traceability-id <s>

invoke flags:
  --out <path>            Write response JSON to this file. Default: stdout.
  --schema-file <path>    Validate the LLM output against this JSON Schema file
                          (response gains a 'parsed' field on success).

invoke-many flags:
  --concurrency <n>       Default: 8.
  --serial                Equivalent to --concurrency 1.
  --out-dir <path>        Write per-agent JSON files plus _index.json.
  --schema-file <path>    Apply the same JSON Schema to every invocation.

init flags:
  --config <path>         Where to write the starter config. Default:
                          ~/.config/hs-llm/config.json (or \$HS_LLM_CONFIG if set).
  --force                 Overwrite an existing file at the target path.

Exit codes:
  0  success (invoke-many returns 0 even on partial failure; inspect per-result status)
  1  config error (no config found, validation failure, missing api key)
  2  invocation error (bad agent / unimplemented provider / runtime error from invoke)
  3  usage error
`;

export async function main(argv: string[], streams: MainStreams = {}): Promise<number> {
  const out = streams.stdout ?? stdout;
  const err = streams.stderr ?? stderr;
  const [subcommand, ...rest] = argv;
  switch (subcommand) {
    case "init":
      return runInit(rest, out, err);
    case "invoke":
      return runInvoke(rest, out, err);
    case "invoke-many":
      return runInvokeMany(rest, out, err);
    case "validate-config":
      return runValidateConfig(rest, out, err);
    case "--help":
    case "-h":
      out.write(HELP_TEXT);
      return 0;
    case undefined:
      err.write(HELP_TEXT);
      return 3;
    default:
      err.write(`unknown subcommand: ${subcommand}\n${HELP_TEXT}`);
      return 3;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

function defaultUserConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.HS_LLM_CONFIG !== undefined && env.HS_LLM_CONFIG.length > 0) return env.HS_LLM_CONFIG;
  const xdg = env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.length > 0
    ? env.XDG_CONFIG_HOME
    : join(homedir(), ".config");
  return join(xdg, "hs-llm", "config.json");
}

async function resolveConfigPath(
  flags: ParsedArgs["flags"],
  positional?: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const explicit = optionalString(flags, "config") ?? positional;
  if (explicit !== undefined) return resolve(explicit);

  const tried: string[] = [];

  if (env.HS_LLM_CONFIG !== undefined && env.HS_LLM_CONFIG.length > 0) {
    tried.push(`$HS_LLM_CONFIG (${env.HS_LLM_CONFIG})`);
    if (await fileExists(env.HS_LLM_CONFIG)) return resolve(env.HS_LLM_CONFIG);
  }

  const projectLocal = resolve(process.cwd(), "hs-llm.config.json");
  tried.push(projectLocal);
  if (await fileExists(projectLocal)) return projectLocal;

  const userGlobal = defaultUserConfigPath(env);
  tried.push(userGlobal);
  if (await fileExists(userGlobal)) return userGlobal;

  throw new UsageError(
    `no config file found. Tried:\n  - ${tried.join("\n  - ")}\n` +
      "Run `hs-llm init` to scaffold one at the user-global location, " +
      "or pass --config <path> explicitly."
  );
}

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | true>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function requireString(flags: ParsedArgs["flags"], key: string): string {
  const v = flags[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new UsageError(`--${key} is required`);
  }
  return v;
}

function optionalString(flags: ParsedArgs["flags"], key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

function optionalNumber(flags: ParsedArgs["flags"], key: string): number | undefined {
  const v = flags[key];
  if (typeof v !== "string") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new UsageError(`--${key} must be a number; got '${v}'`);
  return n;
}

function optionalReasoning(flags: ParsedArgs["flags"]): "minimal" | "medium" | "high" | undefined {
  const v = optionalString(flags, "reasoning");
  if (v === undefined) return undefined;
  if (v !== "minimal" && v !== "medium" && v !== "high") {
    throw new UsageError(`--reasoning must be minimal|medium|high; got '${v}'`);
  }
  return v;
}

class UsageError extends Error {}

async function buildRequest(flags: ParsedArgs["flags"]): Promise<InvocationRequest> {
  const promptInline = optionalString(flags, "prompt");
  const promptFile = optionalString(flags, "prompt-file");
  if (promptInline && promptFile) {
    throw new UsageError("--prompt and --prompt-file are mutually exclusive");
  }
  if (!promptInline && !promptFile) {
    throw new UsageError("--prompt or --prompt-file is required");
  }
  const prompt = promptInline ?? (await readFile(resolve(promptFile!), "utf8"));
  const request: InvocationRequest = { prompt };
  const system = optionalString(flags, "system");
  if (system !== undefined) request.system = system;
  const temperature = optionalNumber(flags, "temperature");
  if (temperature !== undefined) request.temperature = temperature;
  const maxOutputTokens = optionalNumber(flags, "max-output-tokens");
  if (maxOutputTokens !== undefined) request.maxOutputTokens = maxOutputTokens;
  const timeoutMs = optionalNumber(flags, "timeout-ms");
  if (timeoutMs !== undefined) request.timeoutMs = timeoutMs;
  const traceabilityId = optionalString(flags, "traceability-id");
  if (traceabilityId !== undefined) request.traceabilityId = traceabilityId;
  const reasoning = optionalReasoning(flags);
  if (reasoning !== undefined) request.reasoning = reasoning;
  return request;
}

async function loadSchemaFromFile(path: string): Promise<ZodTypeAny> {
  const raw = await readFile(resolve(path), "utf8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new UsageError(`--schema-file is not valid JSON: ${(err as Error).message}`);
  }
  return jsonSchemaFileContentsToZod(json);
}

async function runInvoke(
  argv: string[],
  out: NodeJS.WritableStream,
  err: NodeJS.WritableStream
): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
    const configPath = await resolveConfigPath(parsed.flags);
    const agentId = requireString(parsed.flags, "agent");
    const request = await buildRequest(parsed.flags);
    const config = await loadConfig(configPath);
    const schemaPath = optionalString(parsed.flags, "schema-file");
    const schema = schemaPath !== undefined ? await loadSchemaFromFile(schemaPath) : undefined;
    const response = await invoke({
      config,
      agentId,
      request,
      ...(schema !== undefined ? { schema } : {})
    });
    const json = `${JSON.stringify(response, null, 2)}\n`;
    const outPath = optionalString(parsed.flags, "out");
    if (outPath !== undefined) {
      await mkdir(dirname(resolve(outPath)), { recursive: true });
      await writeFile(resolve(outPath), json, "utf8");
    } else {
      out.write(json);
    }
    return 0;
  } catch (e) {
    return reportError(e, err);
  }
}

async function runInvokeMany(
  argv: string[],
  out: NodeJS.WritableStream,
  err: NodeJS.WritableStream
): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
    const configPath = await resolveConfigPath(parsed.flags);
    const agentsCsv = requireString(parsed.flags, "agents");
    const agentIds = agentsCsv
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (agentIds.length === 0) throw new UsageError("--agents must list at least one agent id");
    const request = await buildRequest(parsed.flags);
    const config = await loadConfig(configPath);

    const concurrencyArg = optionalNumber(parsed.flags, "concurrency");
    const serial = parsed.flags.serial === true;
    const concurrency = serial ? 1 : concurrencyArg;
    const schemaPath = optionalString(parsed.flags, "schema-file");
    const schema = schemaPath !== undefined ? await loadSchemaFromFile(schemaPath) : undefined;

    const results: InvokeManyResult = await invokeMany({
      config,
      invocations: agentIds.map((agentId) => ({
        agentId,
        request,
        ...(schema !== undefined ? { schema } : {})
      })),
      ...(concurrency !== undefined ? { concurrency } : {})
    });

    const outDir = optionalString(parsed.flags, "out-dir");
    if (outDir !== undefined) {
      await mkdir(resolve(outDir), { recursive: true });
      const index: Array<Record<string, unknown>> = [];
      for (const r of results) {
        if (r.status === "ok") {
          const file = join(resolve(outDir), `${safeFilename(r.agentId)}.json`);
          await writeFile(file, `${JSON.stringify(r.response, null, 2)}\n`, "utf8");
          index.push({ agentId: r.agentId, status: "ok", file });
        } else {
          index.push({
            agentId: r.agentId,
            status: "error",
            errorKind: r.error.kind,
            message: r.error.message
          });
        }
      }
      await writeFile(
        join(resolve(outDir), "_index.json"),
        `${JSON.stringify({ config: configPath, results: index }, null, 2)}\n`,
        "utf8"
      );
    } else {
      const flat = results.map((r) =>
        r.status === "ok"
          ? r
          : { agentId: r.agentId, status: "error", errorKind: r.error.kind, message: r.error.message }
      );
      out.write(`${JSON.stringify(flat, null, 2)}\n`);
    }
    return 0;
  } catch (e) {
    return reportError(e, err);
  }
}

async function runValidateConfig(
  argv: string[],
  out: NodeJS.WritableStream,
  err: NodeJS.WritableStream
): Promise<number> {
  const parsed = parseArgs(argv);
  try {
    const path = await resolveConfigPath(parsed.flags, parsed.positional[0]);
    await loadConfig(path);
    out.write(`OK: ${path}\n`);
    return 0;
  } catch (e) {
    return reportError(e, err);
  }
}

async function runInit(
  argv: string[],
  out: NodeJS.WritableStream,
  err: NodeJS.WritableStream
): Promise<number> {
  const parsed = parseArgs(argv);
  try {
    const target = resolve(optionalString(parsed.flags, "config") ?? defaultUserConfigPath());
    const force = parsed.flags.force === true;

    if (!force && (await fileExists(target))) {
      throw new UsageError(
        `config already exists at ${target}; use --force to overwrite, ` +
          "or pass --config <path> to write somewhere else."
      );
    }

    const exampleUrl = new URL("../examples/config.example.json", import.meta.url);
    const examplePath = fileURLToPath(exampleUrl);
    const exampleContent = await readFile(examplePath, "utf8");

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, exampleContent, "utf8");

    out.write(`wrote starter config to ${target}\n\n`);
    out.write("Next steps:\n");
    out.write(`  1. Edit ${target} — remove agents you don't need.\n`);
    out.write("  2. Set the api key env vars for any api providers you keep:\n");
    out.write("       export ANTHROPIC_API_KEY=...\n");
    out.write("       export OPENAI_API_KEY=...\n");
    out.write("  3. Run: hs-llm validate-config\n");
    out.write("  4. Smoke test: hs-llm invoke --agent mock_a --prompt 'hi'\n");
    return 0;
  } catch (e) {
    return reportError(e, err);
  }
}

function reportError(e: unknown, err: NodeJS.WritableStream): number {
  if (e instanceof UsageError) {
    err.write(`usage error: ${e.message}\n`);
    return 3;
  }
  if (e instanceof InvocationError) {
    err.write(`error (${e.kind}): ${e.message}\n`);
    return e.kind === "config" ? 1 : 2;
  }
  err.write(`error: ${e instanceof Error ? e.message : String(e)}\n`);
  return 2;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

const isCliEntrypoint =
  processArgv[1] !== undefined && import.meta.url === pathToFileURL(processArgv[1]).href;
if (isCliEntrypoint) {
  void main(processArgv.slice(2)).then(
    (code) => exit(code),
    (e) => {
      stderr.write(`fatal: ${e instanceof Error ? e.message : String(e)}\n`);
      exit(1);
    }
  );
}

// Re-export for tooling that wants to spawn the CLI programmatically.
export const __HS_LLM_CLI_PATH = fileURLToPath(import.meta.url);
