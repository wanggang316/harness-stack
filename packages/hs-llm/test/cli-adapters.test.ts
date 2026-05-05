import { describe, expect, it } from "vitest";
import { buildBaseArgs } from "../src/runtime/cli.js";
import type { CliType } from "../src/index.js";

describe("buildBaseArgs — every cliType", () => {
  const cases: Array<{
    cliType: CliType;
    expectedFlags: string[];
    reasoningFlag?: { args: string[]; reasoningApplied: boolean };
    traceabilityFlag?: { args: string[] };
  }> = [
    {
      cliType: "claude",
      expectedFlags: ["--print", "--model", "M"],
      reasoningFlag: { args: ["--effort", "high"], reasoningApplied: true },
      traceabilityFlag: { args: ["--session-id", "T"] }
    },
    {
      cliType: "pi",
      expectedFlags: ["-p", "--model", "M"],
      reasoningFlag: { args: [], reasoningApplied: false },
      traceabilityFlag: { args: ["--session"] }
    },
    {
      cliType: "codex",
      expectedFlags: ["exec", "--model", "M"],
      reasoningFlag: { args: ["--effort", "high"], reasoningApplied: true },
      traceabilityFlag: { args: ["--session-id", "T"] }
    },
    {
      cliType: "gemini",
      expectedFlags: ["--prompt-stdin", "--model", "M"],
      reasoningFlag: { args: [], reasoningApplied: false },
      traceabilityFlag: { args: ["--session", "T"] }
    },
    {
      cliType: "copilot",
      expectedFlags: ["suggest", "--model", "M"],
      reasoningFlag: { args: [], reasoningApplied: false },
      traceabilityFlag: { args: ["--session-id", "T"] }
    },
    {
      cliType: "opencode",
      expectedFlags: ["run", "--model", "M"],
      reasoningFlag: { args: ["--effort", "high"], reasoningApplied: true },
      traceabilityFlag: { args: ["--session", "T"] }
    },
    {
      cliType: "droid",
      expectedFlags: ["run", "--model", "M"],
      reasoningFlag: { args: [], reasoningApplied: false },
      traceabilityFlag: { args: ["--session", "T"] }
    },
    {
      cliType: "amp",
      expectedFlags: ["--model", "M"],
      reasoningFlag: { args: [], reasoningApplied: false },
      traceabilityFlag: { args: ["--thread-id", "T"] }
    },
    {
      cliType: "generic",
      expectedFlags: ["--model", "M"],
      reasoningFlag: { args: [], reasoningApplied: false }
    }
  ];

  for (const c of cases) {
    it(`${c.cliType}: emits the expected base args`, () => {
      const out = buildBaseArgs({ cliType: c.cliType, modelId: "M" });
      expect(out.args).toEqual(c.expectedFlags);
      expect(out.reasoningApplied).toBe(false);
    });

    if (c.reasoningFlag) {
      it(`${c.cliType}: handles reasoning per its capability`, () => {
        const out = buildBaseArgs({ cliType: c.cliType, modelId: "M", reasoning: "high" });
        if (c.reasoningFlag.reasoningApplied) {
          expect(out.args.slice(c.expectedFlags.length)).toEqual(c.reasoningFlag.args);
        } else {
          expect(out.args).toEqual(c.expectedFlags);
        }
        expect(out.reasoningApplied).toBe(c.reasoningFlag.reasoningApplied);
      });
    }

    if (c.traceabilityFlag) {
      it(`${c.cliType}: forwards traceabilityId`, () => {
        const out = buildBaseArgs({ cliType: c.cliType, modelId: "M", traceabilityId: "T" });
        // pi places --session under tmpdir; assert presence of the flag and ids only.
        if (c.cliType === "pi") {
          expect(out.args).toContain("--session");
          expect(out.args.find((a) => a.includes("hs-llm-pi-T"))).toBeTruthy();
        } else {
          for (const expected of c.traceabilityFlag.args) expect(out.args).toContain(expected);
        }
      });
    }
  }
});
