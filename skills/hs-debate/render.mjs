#!/usr/bin/env node
// Render a debate-runs/<timestamp>/ directory into a self-contained report.html.
// Usage: node skills/hs-debate/render.mjs <run-dir> [--out <path>]
//
// Reads `report-template.html` (next to this script), substitutes the data
// inline, and writes report.html into the run directory (or --out path).

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(HERE, "report-template.html");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readTextOrNull(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function readJsonOrNull(path) {
  return existsSync(path) ? readJson(path) : null;
}

function parseArgs(argv) {
  const args = { dir: null, out: null };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--out") args.out = rest[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else if (!args.dir) args.dir = a;
  }
  return args;
}

function collectRun(runDir) {
  const meta = readJson(join(runDir, "meta.json"));
  const synthesis = readJsonOrNull(join(runDir, "synthesis.json"));
  const catalog = readJsonOrNull(join(runDir, "catalog.json"));

  const peers = Object.keys(meta.peers || {}).sort();
  const lastRound =
    meta.lastCompletedRound ||
    Math.max(
      0,
      ...readdirSync(runDir)
        .filter((n) => /^round-\d+$/.test(n))
        .map((n) => Number(n.slice("round-".length))),
    );

  const rounds = [];
  for (let r = 1; r <= lastRound; r++) {
    const dir = join(runDir, `round-${r}`);
    if (!existsSync(dir)) continue;
    const peerEntries = peers.map((peer) => {
      const statement = readTextOrNull(join(dir, `${peer}.txt`));
      const claimsFile = readJsonOrNull(join(dir, `${peer}.claims.json`));
      const claims = claimsFile?.parsed?.claims || [];
      return { peer, statement, claims };
    });
    const convergence = readJsonOrNull(join(dir, "convergence.json"));
    rounds.push({
      round: r,
      peers: peerEntries,
      convergence: convergence?.parsed || null,
    });
  }

  return { meta, synthesis: synthesis?.parsed || null, catalog, rounds };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.dir) {
    console.log("Usage: render.mjs <run-dir> [--out <path>]");
    console.log("  Renders a debate-runs/<timestamp>/ directory into a self-contained report.html.");
    process.exit(args.help ? 0 : 1);
  }

  const runDir = resolve(args.dir);
  if (!existsSync(join(runDir, "meta.json"))) {
    console.error(`Not a debate run directory (no meta.json): ${runDir}`);
    process.exit(1);
  }
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`Missing template: ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  const data = collectRun(runDir);
  data.meta.runDir = basename(runDir);

  // Escape `<` so a literal `</script` inside any string can't close the host
  // <script type="application/json"> tag. JSON.parse turns it back into "<".
  const dataJson = JSON.stringify(data).replace(/</g, "\\u003c");
  const title = `Debate · ${data.meta.question}`;

  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const html = template
    .replace("__TITLE__", escapeHtml(title))
    .replace("__DATA_JSON__", dataJson);

  const outPath = args.out ? resolve(args.out) : join(runDir, "report.html");
  writeFileSync(outPath, html, "utf8");
  console.log(outPath);
}

main();
