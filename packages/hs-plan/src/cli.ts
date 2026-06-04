#!/usr/bin/env node
import { argv as processArgv, exit, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";
import { PlanError } from "./errors.js";
import { readJson } from "./io.js";
import {
  contractCoverage,
  gate,
  initState,
  isSealed,
  listFeatures,
  milestoneCounts,
  nextFeature,
  sealMilestone,
  setAssertion,
  setStatus
} from "./core.js";
import { readHandoff, writeHandoff } from "./handoff.js";
import {
  assertionStatuses,
  featureStatuses,
  KEBAB,
  type AssertionStatus,
  type FeatureStatus
} from "./schema.js";
import {
  contractPath,
  featuresPath,
  listPlanSlugs,
  planDir,
  readActiveSlug,
  resolvePlan,
  statePath,
  writeActiveSlug
} from "./store.js";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { writeTextIfMissing } from "./io.js";

interface MainStreams {
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

const HELP_TEXT = `Usage:
  hs-plan init <slug>                       Scaffold a plan dir + make it active
  hs-plan use <slug>                        Switch the active plan
  hs-plan active                            Print "<slug>\\t<dir>" of the active plan
  hs-plan list-plans                        List plan slugs ("* " marks active)

  hs-plan next-feature                      Print "<id>\\t<agent>\\t<milestone>" of first pending feature
  hs-plan set-status <id> <status>          Set a feature's status (terminal -> move to bottom)
  hs-plan list-features                     Print "<status>\\t<milestone>\\t<id>" per feature
  hs-plan milestone-status <milestone>      Print "<status>\\t<count>" per status in a milestone

  hs-plan init-state                        (Re)generate validation-state.json from the contract
  hs-plan contract-coverage                 Enforce: each assertion claimed by exactly one feature
  hs-plan set-assertion <VAL-id> <status> [evidence]
  hs-plan gate                              Succeed only if every assertion is "passed"

  hs-plan seal-milestone <milestone>        Mark a milestone validated
  hs-plan is-sealed <milestone>             Print "yes" / "no"

  hs-plan write-handoff <feature-id> <json-file>   Validate + store a worker handoff
  hs-plan handoff <feature-id>              Print the stored handoff JSON

Plan selection: --plan <slug> overrides the active plan (.active) for any command.
Feature status: ${featureStatuses.join(" | ")}
Assertion status: ${assertionStatuses.join(" | ")}

Exit codes:
  0  success
  1  data error (no active plan, missing/invalid file, unknown feature/assertion)
  2  invariant violation (contract-coverage or gate not satisfied)
  3  usage error
`;

class UsageError extends Error {}

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

function requirePositional(positional: string[], index: number, name: string): string {
  const v = positional[index];
  if (v === undefined || v.length === 0) throw new UsageError(`<${name}> is required`);
  return v;
}

function optionalString(flags: ParsedArgs["flags"], key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

function asFeatureStatus(v: string): FeatureStatus {
  if (!(featureStatuses as readonly string[]).includes(v)) {
    throw new UsageError(`status must be one of: ${featureStatuses.join(" | ")}; got '${v}'`);
  }
  return v as FeatureStatus;
}

function asAssertionStatus(v: string): AssertionStatus {
  if (!(assertionStatuses as readonly string[]).includes(v)) {
    throw new UsageError(`status must be one of: ${assertionStatuses.join(" | ")}; got '${v}'`);
  }
  return v as AssertionStatus;
}

async function dirFor(flags: ParsedArgs["flags"]): Promise<string> {
  const { dir } = await resolvePlan(optionalString(flags, "plan"));
  return dir;
}

export async function main(argv: string[], streams: MainStreams = {}): Promise<number> {
  const out = streams.stdout ?? stdout;
  const err = streams.stderr ?? stderr;
  const [subcommand, ...rest] = argv;
  try {
    switch (subcommand) {
      case "init":
        return await runInit(parseArgs(rest), out);
      case "use":
        return await runUse(parseArgs(rest), out);
      case "active":
        return await runActive(out);
      case "list-plans":
        return await runListPlans(out);
      case "next-feature":
        return await runNextFeature(parseArgs(rest), out);
      case "set-status":
        return await runSetStatus(parseArgs(rest), out);
      case "list-features":
        return await runListFeatures(parseArgs(rest), out);
      case "milestone-status":
        return await runMilestoneStatus(parseArgs(rest), out);
      case "init-state":
        return await runInitState(parseArgs(rest), out);
      case "contract-coverage":
        return await runContractCoverage(parseArgs(rest), out);
      case "set-assertion":
        return await runSetAssertion(parseArgs(rest), out);
      case "gate":
        return await runGate(parseArgs(rest), out);
      case "seal-milestone":
        return await runSealMilestone(parseArgs(rest), out);
      case "is-sealed":
        return await runIsSealed(parseArgs(rest), out);
      case "write-handoff":
        return await runWriteHandoff(parseArgs(rest), out);
      case "handoff":
        return await runHandoff(parseArgs(rest), out);
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
  } catch (e) {
    return reportError(e, err);
  }
}

// --- plan management -------------------------------------------------------

async function runInit(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const slug = requirePositional(parsed.positional, 0, "slug");
  if (!KEBAB.test(slug)) throw new UsageError(`slug must be kebab-case; got '${slug}'`);
  const dir = planDir(slug);
  await mkdir(dir, { recursive: true });
  await writeTextIfMissing(
    contractPath(dir),
    `# Validation Contract: ${slug}\n\n<!-- One H3 per assertion: "### VAL-<AREA>-NNN: <title>" -->\n`
  );
  await writeTextIfMissing(featuresPath(dir), `${JSON.stringify({ features: [] }, null, 2)}\n`);
  await writeTextIfMissing(statePath(dir), `${JSON.stringify({ assertions: {} }, null, 2)}\n`);
  await writeTextIfMissing(`${dir}/plan.md`, `# Plan: ${slug}\n`);
  await writeActiveSlug(slug);
  out.write(`initialized plan "${slug}" at ${dir}\n`);
  return 0;
}

async function runUse(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const slug = requirePositional(parsed.positional, 0, "slug");
  if (!existsSync(planDir(slug))) throw new PlanError("data", `plan "${slug}" not found at ${planDir(slug)}`);
  await writeActiveSlug(slug);
  out.write(`active plan -> ${slug}\n`);
  return 0;
}

async function runActive(out: NodeJS.WritableStream): Promise<number> {
  const slug = await readActiveSlug();
  if (slug === undefined) throw new PlanError("data", "no active plan; run `hs-plan use <slug>`");
  out.write(`${slug}\t${planDir(slug)}\n`);
  return 0;
}

async function runListPlans(out: NodeJS.WritableStream): Promise<number> {
  const active = await readActiveSlug();
  const slugs = await listPlanSlugs();
  for (const slug of slugs) out.write(`${slug === active ? "* " : "  "}${slug}\n`);
  return 0;
}

// --- features --------------------------------------------------------------

async function runNextFeature(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const f = await nextFeature(await dirFor(parsed.flags));
  if (f !== undefined) out.write(`${f.id}\t${f.agent}\t${f.milestone}\n`);
  return 0;
}

async function runSetStatus(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const id = requirePositional(parsed.positional, 0, "feature-id");
  const status = asFeatureStatus(requirePositional(parsed.positional, 1, "status"));
  await setStatus(await dirFor(parsed.flags), id, status);
  out.write(`feature ${id} -> ${status}\n`);
  return 0;
}

async function runListFeatures(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const features = await listFeatures(await dirFor(parsed.flags));
  for (const f of features) {
    out.write(`${f.status.padEnd(12)}\t${f.milestone.padEnd(16)}\t${f.id}\n`);
  }
  return 0;
}

async function runMilestoneStatus(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const milestone = requirePositional(parsed.positional, 0, "milestone");
  const counts = await milestoneCounts(await dirFor(parsed.flags), milestone);
  for (const status of featureStatuses) {
    const n = counts.get(status);
    if (n !== undefined && n > 0) out.write(`${status}\t${n}\n`);
  }
  return 0;
}

// --- contract / state ------------------------------------------------------

async function runInitState(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const n = await initState(await dirFor(parsed.flags));
  out.write(`validation-state.json regenerated (${n} assertions)\n`);
  return 0;
}

async function runContractCoverage(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const result = await contractCoverage(await dirFor(parsed.flags));
  if (result.ok) {
    out.write(`coverage OK (${result.total} assertions, each claimed exactly once)\n`);
    return 0;
  }
  for (const v of result.violations) out.write(`${v}\n`);
  return 2;
}

async function runSetAssertion(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const id = requirePositional(parsed.positional, 0, "VAL-id");
  const status = asAssertionStatus(requirePositional(parsed.positional, 1, "status"));
  const evidence = parsed.positional[2];
  await setAssertion(await dirFor(parsed.flags), id, status, evidence);
  out.write(`assertion ${id} -> ${status}\n`);
  return 0;
}

async function runGate(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const result = await gate(await dirFor(parsed.flags));
  if (result.passed) {
    out.write(`GATE PASSED: all ${result.total} assertions are "passed"\n`);
    return 0;
  }
  out.write(`GATE FAILED: ${result.failing.length}/${result.total} assertions not passed\n`);
  for (const f of result.failing) out.write(`${f.id}\t${f.status}\n`);
  return 2;
}

// --- milestones ------------------------------------------------------------

async function runSealMilestone(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const milestone = requirePositional(parsed.positional, 0, "milestone");
  await sealMilestone(await dirFor(parsed.flags), milestone);
  out.write(`milestone sealed: ${milestone}\n`);
  return 0;
}

async function runIsSealed(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const milestone = requirePositional(parsed.positional, 0, "milestone");
  out.write((await isSealed(await dirFor(parsed.flags), milestone)) ? "yes\n" : "no\n");
  return 0;
}

// --- handoff ---------------------------------------------------------------

async function runWriteHandoff(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const featureId = requirePositional(parsed.positional, 0, "feature-id");
  const jsonFile = requirePositional(parsed.positional, 1, "json-file");
  const source = await readJson(jsonFile);
  const path = await writeHandoff(await dirFor(parsed.flags), featureId, source);
  out.write(`handoff for ${featureId} -> ${path}\n`);
  return 0;
}

async function runHandoff(parsed: ParsedArgs, out: NodeJS.WritableStream): Promise<number> {
  const featureId = requirePositional(parsed.positional, 0, "feature-id");
  const handoff = await readHandoff(await dirFor(parsed.flags), featureId);
  out.write(`${JSON.stringify(handoff, null, 2)}\n`);
  return 0;
}

// --- error mapping ---------------------------------------------------------

function reportError(e: unknown, err: NodeJS.WritableStream): number {
  if (e instanceof UsageError) {
    err.write(`usage error: ${e.message}\n`);
    return 3;
  }
  if (e instanceof PlanError) {
    err.write(`error (${e.kind}): ${e.message}\n`);
    return e.kind === "usage" ? 3 : e.kind === "invariant" ? 2 : 1;
  }
  err.write(`error: ${e instanceof Error ? e.message : String(e)}\n`);
  return 2;
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
