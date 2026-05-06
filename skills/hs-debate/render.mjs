#!/usr/bin/env node
// Render a debate-runs/<timestamp>/ directory into a self-contained report.html.
// Usage: node skills/hs-debate/render.mjs <run-dir> [--out <path>]

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";

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
  const summary = readTextOrNull(join(runDir, "summary.md"));

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

  return { meta, synthesis: synthesis?.parsed || null, catalog, summary, rounds };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const HTML_SHELL = (title, dataJson) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --bg-0: #0f1612;
    --bg-1: #f6f1e7;
    --bg-2: #1b2521;
    --paper: #fbf8f1;
    --ink: #1c2624;
    --ink-soft: #4a5552;
    --rule: #d8d2c2;
    --accent: #b67232;
    --accent-soft: #e8d5b6;
    --teal: #2d6a6a;
    --ok: #4a7c59;
    --warn: #b67232;
    --bad: #a64545;
    --shadow: 0 1px 2px rgba(20, 30, 28, 0.06), 0 12px 32px rgba(20, 30, 28, 0.08);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background:
      radial-gradient(1200px 600px at 50% -200px, rgba(182, 114, 50, 0.08), transparent 60%),
      linear-gradient(180deg, #efe9dc 0%, #e6dfce 100%);
    color: var(--ink);
    line-height: 1.55;
    min-height: 100vh;
  }
  main {
    max-width: 920px;
    margin: 0 auto;
    padding: 48px 24px 96px;
  }
  .paper {
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 36px 40px;
    margin-bottom: 24px;
  }
  h1, h2, h3, h4 {
    font-family: "Iowan Old Style", "Apple Garamond", Georgia, "Times New Roman", serif;
    font-weight: 600;
    color: var(--ink);
    margin: 0 0 12px;
  }
  h1 { font-size: 28px; line-height: 1.25; letter-spacing: -0.01em; }
  h2 { font-size: 20px; margin-top: 0; padding-bottom: 8px; border-bottom: 1px solid var(--rule); }
  h3 { font-size: 16px; }
  h4 { font-size: 14px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.06em; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 6px; }
  code, .mono {
    font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.92em;
  }
  .muted { color: var(--ink-soft); }
  .small { font-size: 13px; }
  .row { display: flex; gap: 16px; flex-wrap: wrap; align-items: baseline; }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px 18px;
    font-size: 13px;
    color: var(--ink-soft);
    margin-top: 16px;
  }
  .meta-grid b { color: var(--ink); font-weight: 600; }
  .chip {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid currentColor;
    background: rgba(255, 255, 255, 0.5);
  }
  .chip.ok { color: var(--ok); }
  .chip.warn { color: var(--warn); }
  .chip.bad { color: var(--bad); }
  .chip.neutral { color: var(--ink-soft); }
  .chip.teal { color: var(--teal); }
  .headline {
    font-family: "Iowan Old Style", "Apple Garamond", Georgia, serif;
    font-size: 22px;
    line-height: 1.4;
    margin: 16px 0 8px;
    color: var(--ink);
  }
  .question {
    font-size: 14px;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  details {
    border: 1px solid var(--rule);
    border-radius: 4px;
    padding: 12px 16px;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.4);
  }
  details[open] { background: var(--paper); }
  summary {
    cursor: pointer;
    font-weight: 600;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before {
    content: "▸";
    color: var(--ink-soft);
    font-size: 12px;
    transition: transform 0.15s ease;
  }
  details[open] > summary::before { transform: rotate(90deg); }
  summary > * { flex: 0 0 auto; }
  summary > .summary-title { flex: 1 1 auto; }
  .peer-block {
    border-left: 3px solid var(--accent-soft);
    padding: 4px 0 4px 16px;
    margin: 16px 0;
  }
  .peer-block.peer-1 { border-left-color: #b67232; }
  .peer-block.peer-2 { border-left-color: #2d6a6a; }
  .peer-block.peer-3 { border-left-color: #6b4a8a; }
  .peer-block.peer-4 { border-left-color: #4a7c59; }
  .peer-block.peer-5 { border-left-color: #a64545; }
  .peer-label {
    display: inline-block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-soft);
    font-weight: 700;
    margin-bottom: 6px;
  }
  .statement {
    white-space: pre-wrap;
    font-size: 14.5px;
    line-height: 1.65;
    margin: 4px 0 12px;
  }
  .claims {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: grid;
    gap: 6px;
  }
  .claim {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(216, 210, 194, 0.18);
    border-radius: 4px;
    border-left: 2px solid var(--rule);
    font-size: 13.5px;
  }
  .claim .stance {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    align-self: start;
    margin-top: 3px;
    white-space: nowrap;
  }
  .claim.assertion { border-left-color: var(--ok); }
  .claim.assertion .stance { color: var(--ok); }
  .claim.objection { border-left-color: var(--bad); }
  .claim.objection .stance { color: var(--bad); }
  .claim.concession { border-left-color: var(--warn); }
  .claim.concession .stance { color: var(--warn); }
  .claim.refinement { border-left-color: var(--teal); }
  .claim.refinement .stance { color: var(--teal); }
  .claim .reason {
    display: block;
    margin-top: 4px;
    color: var(--ink-soft);
    font-style: italic;
    font-size: 12.5px;
  }
  .convergence {
    margin-top: 16px;
    padding: 12px 16px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px dashed var(--rule);
    font-size: 13px;
  }
  .convergence .verdict { font-weight: 600; margin-right: 8px; }
  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  .catalog-card {
    border: 1px solid var(--rule);
    border-radius: 4px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.5);
  }
  .catalog-card h4 { margin-bottom: 8px; }
  .catalog-card .claim { background: transparent; padding: 6px 0; border-radius: 0; }
  .catalog-card .round-tag {
    display: inline-block;
    font-size: 10.5px;
    color: var(--ink-soft);
    font-weight: 700;
    margin-right: 6px;
    background: var(--accent-soft);
    padding: 1px 6px;
    border-radius: 999px;
  }
  footer {
    color: var(--ink-soft);
    font-size: 12px;
    text-align: center;
    margin-top: 24px;
  }
  @media (max-width: 600px) {
    main { padding: 24px 12px 64px; }
    .paper { padding: 20px; }
    h1 { font-size: 22px; }
    .headline { font-size: 18px; }
  }
</style>
</head>
<body>
<main id="app"></main>
<script type="application/json" id="data">${dataJson}</script>
<script>
(() => {
  const data = JSON.parse(document.getElementById("data").textContent);
  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

  const confChip = (c) => {
    const cls = c === "high" ? "ok" : c === "low" ? "bad" : "warn";
    return \`<span class="chip \${cls}">confidence: \${esc(c || "n/a")}</span>\`;
  };

  const termChip = (t) => {
    if (t === "converged") return '<span class="chip ok">converged</span>';
    if (t === "rounds-exhausted") return '<span class="chip warn">rounds-exhausted</span>';
    return \`<span class="chip neutral">\${esc(t || "unknown")}</span>\`;
  };

  const renderHeader = ({ meta, synthesis }) => {
    const headline = synthesis?.headline || "(synthesis missing)";
    const peerCount = Object.keys(meta.peers || {}).length;
    const lastRound = meta.lastCompletedRound || "?";
    return \`
      <section class="paper">
        <div class="question">Question</div>
        <h1>\${esc(meta.question)}</h1>
        <p class="headline">\${esc(headline)}</p>
        <div class="row">
          \${confChip(synthesis?.confidence)}
          \${termChip(meta.terminationReason)}
          <span class="chip neutral">\${peerCount} peers</span>
          <span class="chip neutral">\${lastRound} / \${esc(meta.rounds)} rounds</span>
        </div>
        <div class="meta-grid">
          <div><b>Run started</b><br>\${esc(meta.createdAt || "—")}</div>
          <div><b>Synthesis agent</b><br><code>\${esc(meta.synthesisAgent || "—")}</code></div>
          <div><b>Config</b><br><code>\${esc(meta.config || "—")}</code></div>
        </div>
      </section>\`;
  };

  const renderSynthesis = (synthesis) => {
    if (!synthesis) {
      return '<section class="paper"><h2>Synthesis</h2><p class="muted">synthesis.json missing or unparsed.</p></section>';
    }
    const list = (xs) => xs && xs.length
      ? \`<ul>\${xs.map((x) => \`<li>\${esc(x)}</li>\`).join("")}</ul>\`
      : '<p class="muted small">(none)</p>';
    return \`
      <section class="paper">
        <h2>Synthesis</h2>
        <h4>Rationale</h4>
        <p>\${esc(synthesis.rationale)}</p>
        <h4>Majority claims</h4>
        \${list(synthesis.majorityClaims)}
        <h4>Minority claims</h4>
        \${list(synthesis.minorityClaims)}
        <h4>Open questions</h4>
        \${list(synthesis.openQuestions)}
      </section>\`;
  };

  const renderClaim = (c) => {
    const stance = (c.stance || "assertion").toLowerCase();
    const reason = c.supportingReason
      ? \`<span class="reason">— \${esc(c.supportingReason)}</span>\`
      : "";
    return \`
      <li class="claim \${esc(stance)}">
        <span class="stance">\${esc(stance)}</span>
        <span>\${esc(c.text)}\${reason}</span>
      </li>\`;
  };

  const renderRound = (round) => {
    const peerBlocks = round.peers
      .filter((p) => p.statement || (p.claims && p.claims.length))
      .map((p) => {
        const claimsHtml = p.claims && p.claims.length
          ? \`<ul class="claims">\${p.claims.map(renderClaim).join("")}</ul>\`
          : '<p class="muted small">(no claims extracted)</p>';
        const statementHtml = p.statement
          ? \`<div class="statement">\${esc(p.statement.trim())}</div>\`
          : '<p class="muted small">(no statement)</p>';
        return \`
          <div class="peer-block \${esc(p.peer)}">
            <div class="peer-label">\${esc(p.peer)}</div>
            \${statementHtml}
            \${claimsHtml}
          </div>\`;
      })
      .join("");

    let convergence = "";
    if (round.convergence) {
      const cv = round.convergence;
      const verdict = cv.converged
        ? '<span class="chip ok">converged</span>'
        : '<span class="chip warn">not converged</span>';
      const stats = cv.totalClaimCount != null
        ? \` <span class="muted">novel \${cv.novelClaimCount}/\${cv.totalClaimCount}</span>\`
        : "";
      convergence = \`
        <div class="convergence">
          <span class="verdict">Convergence:</span>\${verdict}\${stats}
          \${cv.rationale ? \`<div class="muted small" style="margin-top:6px">\${esc(cv.rationale)}</div>\` : ""}
        </div>\`;
    }

    const peerCount = round.peers.filter((p) => p.statement).length;
    const claimCount = round.peers.reduce((s, p) => s + (p.claims?.length || 0), 0);

    return \`
      <details \${round.round === 1 ? "open" : ""}>
        <summary>
          <span class="summary-title"><b>Round \${round.round}</b> <span class="muted small">— \${peerCount} peers, \${claimCount} claims</span></span>
          \${round.convergence ? (round.convergence.converged ? '<span class="chip ok">converged</span>' : '<span class="chip warn">moving</span>') : ""}
        </summary>
        \${peerBlocks}
        \${convergence}
      </details>\`;
  };

  const renderRounds = (rounds) => {
    if (!rounds.length) return "";
    return \`
      <section class="paper">
        <h2>Rounds</h2>
        \${rounds.map(renderRound).join("")}
      </section>\`;
  };

  const renderCatalog = (catalog) => {
    if (!catalog || !Object.keys(catalog).length) return "";
    const peers = Object.keys(catalog).sort();
    const cards = peers.map((peer) => {
      const items = catalog[peer]
        .map((c) => {
          const stance = (c.stance || "assertion").toLowerCase();
          const reason = c.supportingReason
            ? \`<span class="reason">— \${esc(c.supportingReason)}</span>\`
            : "";
          return \`
            <li class="claim \${esc(stance)}">
              <span class="stance">\${esc(stance)}</span>
              <span><span class="round-tag">R\${esc(c.round)}</span>\${esc(c.text)}\${reason}</span>
            </li>\`;
        })
        .join("");
      return \`
        <div class="catalog-card">
          <h4>\${esc(peer)} <span class="muted small">(\${catalog[peer].length})</span></h4>
          <ul class="claims">\${items}</ul>
        </div>\`;
    }).join("");
    return \`
      <section class="paper">
        <h2>Claim catalog</h2>
        <p class="muted small">All claims across all rounds, grouped by peer.</p>
        <div class="catalog-grid">\${cards}</div>
      </section>\`;
  };

  const renderFooter = ({ meta }) => {
    const peerRows = Object.entries(meta.peers || {})
      .map(([peer, agent]) => \`<tr><td><code>\${esc(peer)}</code></td><td><code>\${esc(agent)}</code></td></tr>\`)
      .join("");
    const notes = meta.notes
      ? Object.entries(meta.notes)
          .map(([k, v]) => \`<li><b>\${esc(k)}:</b> \${esc(v)}</li>\`)
          .join("")
      : "";
    return \`
      <section class="paper">
        <details>
          <summary><span class="summary-title">Run details · participant mapping &amp; notes</span></summary>
          <h4>Peer → agent mapping</h4>
          <table class="mono small" style="border-collapse:collapse;margin-bottom:12px">
            <thead><tr><th style="text-align:left;padding-right:18px">peer</th><th style="text-align:left">agent id</th></tr></thead>
            <tbody>\${peerRows}</tbody>
          </table>
          \${notes ? \`<h4>Operational notes</h4><ul class="small">\${notes}</ul>\` : ""}
        </details>
      </section>
      <footer>Generated from <code>\${esc(meta.runDir)}</code></footer>\`;
  };

  app.innerHTML = [
    renderHeader(data),
    renderSynthesis(data.synthesis),
    renderRounds(data.rounds),
    renderCatalog(data.catalog),
    renderFooter(data),
  ].join("");
})();
</script>
</body>
</html>
`;

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

  const data = collectRun(runDir);
  data.meta.runDir = basename(runDir);

  const outPath = args.out ? resolve(args.out) : join(runDir, "report.html");
  const dataJson = JSON.stringify(data).replace(/</g, "\u003c");

  writeFileSync(outPath, HTML_SHELL(`Debate · ${data.meta.question}`, dataJson), "utf8");
  console.log(outPath);
}

main();
