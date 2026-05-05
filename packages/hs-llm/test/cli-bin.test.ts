import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "../src/cli.js";

class CapturingStream extends Writable {
  output = "";
  override _write(chunk: Buffer | string, _enc: BufferEncoding, cb: (err?: Error | null) => void): void {
    this.output += chunk.toString();
    cb();
  }
}

const MOCK_CONFIG = {
  version: 1,
  providers: {
    ok: {
      type: "mock",
      behavior: "deterministic",
      latencyMs: 0,
      responseTemplate: "MOCK[{agentId}]: {prompt}",
      models: [{ id: "m" }]
    },
    bad: {
      type: "mock",
      behavior: "error",
      latencyMs: 0,
      responseTemplate: "{prompt}",
      models: [{ id: "m" }]
    }
  },
  agents: [
    { id: "a_ok", provider: "ok", model: "m" },
    { id: "a_bad", provider: "bad", model: "m" }
  ]
};

describe("cli main()", () => {
  let dir: string;
  let configPath: string;
  let outBuf: CapturingStream;
  let errBuf: CapturingStream;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hs-llm-cli-"));
    configPath = join(dir, "config.json");
    await writeFile(configPath, JSON.stringify(MOCK_CONFIG), "utf8");
    outBuf = new CapturingStream();
    errBuf = new CapturingStream();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("prints help and returns 0 for --help", async () => {
    const code = await main(["--help"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    expect(outBuf.output).toContain("Usage:");
  });

  it("returns 3 with help on stderr when no subcommand is given", async () => {
    const code = await main([], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(3);
    expect(errBuf.output).toContain("Usage:");
  });

  it("validate-config returns 0 for a valid config", async () => {
    const code = await main(["validate-config", configPath], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    expect(outBuf.output).toContain("OK:");
  });

  it("validate-config returns 1 for an invalid config", async () => {
    const badPath = join(dir, "bad.json");
    await writeFile(badPath, '{ "version": 999 }', "utf8");
    const code = await main(["validate-config", badPath], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(1);
    expect(errBuf.output).toMatch(/version|invalid/i);
  });

  it("invoke prints JSON response on stdout for a successful mock invocation", async () => {
    const code = await main(
      ["invoke", "--config", configPath, "--agent", "a_ok", "--prompt", "ping"],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(0);
    const json = JSON.parse(outBuf.output);
    expect(json.text).toBe("MOCK[a_ok]: ping");
    expect(json.agentId).toBe("a_ok");
    expect(json.reasoningApplied).toBe(false);
  });

  it("invoke writes to --out file when provided and stdout stays clean", async () => {
    const outFile = join(dir, "result.json");
    const code = await main(
      ["invoke", "--config", configPath, "--agent", "a_ok", "--prompt", "ping", "--out", outFile],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(0);
    expect(outBuf.output).toBe("");
    const written = JSON.parse(await readFile(outFile, "utf8"));
    expect(written.text).toBe("MOCK[a_ok]: ping");
  });

  it("invoke returns 2 when the agent invocation errors", async () => {
    const code = await main(
      ["invoke", "--config", configPath, "--agent", "a_bad", "--prompt", "x"],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(2);
    expect(errBuf.output).toContain("non-retryable");
  });

  it("invoke returns 1 when the config has a missing agent", async () => {
    const code = await main(
      ["invoke", "--config", configPath, "--agent", "ghost", "--prompt", "x"],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(1);
    expect(errBuf.output).toContain("config");
  });

  it("invoke returns 3 for usage errors (no prompt)", async () => {
    const code = await main(
      ["invoke", "--config", configPath, "--agent", "a_ok"],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(3);
    expect(errBuf.output).toContain("usage error");
  });

  it("invoke supports --prompt-file", async () => {
    const promptFile = join(dir, "prompt.txt");
    await writeFile(promptFile, "from-file", "utf8");
    const code = await main(
      ["invoke", "--config", configPath, "--agent", "a_ok", "--prompt-file", promptFile],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(0);
    const json = JSON.parse(outBuf.output);
    expect(json.text).toBe("MOCK[a_ok]: from-file");
  });

  it("invoke-many returns 0 even with partial failure and emits per-agent results", async () => {
    const code = await main(
      [
        "invoke-many",
        "--config",
        configPath,
        "--agents",
        "a_ok,a_bad,a_ok",
        "--prompt",
        "x"
      ],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(0);
    const arr = JSON.parse(outBuf.output) as Array<{ status: string; agentId: string }>;
    expect(arr).toHaveLength(3);
    expect(arr[0]?.status).toBe("ok");
    expect(arr[1]?.status).toBe("error");
    expect(arr[2]?.status).toBe("ok");
  });

  it("invoke-many --out-dir writes one file per ok agent and an _index.json summary", async () => {
    const outDir = join(dir, "results");
    const code = await main(
      [
        "invoke-many",
        "--config",
        configPath,
        "--agents",
        "a_ok,a_bad",
        "--prompt",
        "x",
        "--out-dir",
        outDir
      ],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(0);
    const okJson = JSON.parse(await readFile(join(outDir, "a_ok.json"), "utf8"));
    expect(okJson.text).toBe("MOCK[a_ok]: x");
    const index = JSON.parse(await readFile(join(outDir, "_index.json"), "utf8"));
    expect(index.results).toHaveLength(2);
    expect(index.results[0].status).toBe("ok");
    expect(index.results[1].status).toBe("error");
    expect(index.results[1].errorKind).toBe("non-retryable");
  });

  it("invoke-many --serial caps concurrency to 1", async () => {
    // Behavior, not timing — assertion that the flag is accepted and produces results.
    const code = await main(
      [
        "invoke-many",
        "--config",
        configPath,
        "--agents",
        "a_ok,a_ok,a_ok",
        "--prompt",
        "x",
        "--serial"
      ],
      { stdout: outBuf, stderr: errBuf }
    );
    expect(code).toBe(0);
    const arr = JSON.parse(outBuf.output);
    expect(arr).toHaveLength(3);
  });

  it("returns 3 for unknown subcommand", async () => {
    const code = await main(["bogus"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(3);
    expect(errBuf.output).toContain("unknown subcommand");
  });
});

describe("cli example config validates", () => {
  it("packages/hs-llm/examples/config.example.json passes validation", async () => {
    const examplePath = new URL("../examples/config.example.json", import.meta.url);
    const out = new CapturingStream();
    const err = new CapturingStream();
    const code = await main(["validate-config", examplePath.pathname], { stdout: out, stderr: err });
    expect(code).toBe(0);
  });
});
