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
    p: {
      type: "mock",
      behavior: "deterministic",
      latencyMs: 0,
      responseTemplate: "MOCK[{agentId}]: {prompt}",
      models: [{ id: "m" }]
    }
  },
  agents: [{ id: "a", provider: "p", model: "m" }]
};

describe("cli config resolution", () => {
  let dir: string;
  let outBuf: CapturingStream;
  let errBuf: CapturingStream;
  const savedEnv: Record<string, string | undefined> = {};
  const savedCwd = process.cwd();

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hs-llm-resolve-"));
    outBuf = new CapturingStream();
    errBuf = new CapturingStream();
    savedEnv.HS_LLM_CONFIG = process.env.HS_LLM_CONFIG;
    savedEnv.XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;
    delete process.env.HS_LLM_CONFIG;
    process.env.XDG_CONFIG_HOME = join(dir, "xdg-empty");
    process.chdir(dir);
  });

  afterEach(async () => {
    process.chdir(savedCwd);
    if (savedEnv.HS_LLM_CONFIG === undefined) delete process.env.HS_LLM_CONFIG;
    else process.env.HS_LLM_CONFIG = savedEnv.HS_LLM_CONFIG;
    if (savedEnv.XDG_CONFIG_HOME === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = savedEnv.XDG_CONFIG_HOME;
    await rm(dir, { recursive: true, force: true });
  });

  it("resolves --config explicit path first", async () => {
    const explicit = join(dir, "explicit.json");
    await writeFile(explicit, JSON.stringify(MOCK_CONFIG), "utf8");
    const code = await main(["validate-config", "--config", explicit], {
      stdout: outBuf,
      stderr: errBuf
    });
    expect(code).toBe(0);
    expect(outBuf.output).toContain("OK:");
    expect(outBuf.output).toContain(explicit);
  });

  it("resolves positional path on validate-config first", async () => {
    const explicit = join(dir, "positional.json");
    await writeFile(explicit, JSON.stringify(MOCK_CONFIG), "utf8");
    const code = await main(["validate-config", explicit], {
      stdout: outBuf,
      stderr: errBuf
    });
    expect(code).toBe(0);
    expect(outBuf.output).toContain(explicit);
  });

  it("falls back to $HS_LLM_CONFIG when no explicit path is given", async () => {
    const envPath = join(dir, "env.json");
    await writeFile(envPath, JSON.stringify(MOCK_CONFIG), "utf8");
    process.env.HS_LLM_CONFIG = envPath;
    const code = await main(["validate-config"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    expect(outBuf.output).toContain(envPath);
  });

  it("falls back to ./hs-llm.config.json when nothing else is set", async () => {
    const projectPath = join(dir, "hs-llm.config.json");
    await writeFile(projectPath, JSON.stringify(MOCK_CONFIG), "utf8");
    const code = await main(["validate-config"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    expect(outBuf.output).toContain(projectPath);
  });

  it("falls back to $XDG_CONFIG_HOME/hs-llm/config.json as last resort", async () => {
    const xdg = join(dir, "xdg");
    process.env.XDG_CONFIG_HOME = xdg;
    const xdgConfig = join(xdg, "hs-llm", "config.json");
    await main(["init", "--force"], { stdout: outBuf, stderr: errBuf });
    expect(await readFile(xdgConfig, "utf8")).toContain('"version"');
    outBuf.output = "";
    const code = await main(["validate-config"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    expect(outBuf.output).toContain(xdgConfig);
  });

  it("returns 3 with a clear error listing every tried path when no config is found", async () => {
    const code = await main(["validate-config"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(3);
    expect(errBuf.output).toContain("no config file found");
    expect(errBuf.output).toContain("hs-llm.config.json");
    expect(errBuf.output).toContain("hs-llm init");
  });

  it("invoke uses the resolution chain when --config is omitted", async () => {
    const projectPath = join(dir, "hs-llm.config.json");
    await writeFile(projectPath, JSON.stringify(MOCK_CONFIG), "utf8");
    const code = await main(["invoke", "--agent", "a", "--prompt", "x"], {
      stdout: outBuf,
      stderr: errBuf
    });
    expect(code).toBe(0);
    const json = JSON.parse(outBuf.output);
    expect(json.text).toBe("MOCK[a]: x");
  });
});

describe("hs-llm init", () => {
  let dir: string;
  let outBuf: CapturingStream;
  let errBuf: CapturingStream;
  const savedEnv: Record<string, string | undefined> = {};
  const savedCwd = process.cwd();

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hs-llm-init-"));
    outBuf = new CapturingStream();
    errBuf = new CapturingStream();
    savedEnv.HS_LLM_CONFIG = process.env.HS_LLM_CONFIG;
    savedEnv.XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;
    delete process.env.HS_LLM_CONFIG;
    process.env.XDG_CONFIG_HOME = join(dir, "xdg");
    process.chdir(dir);
  });

  afterEach(async () => {
    process.chdir(savedCwd);
    if (savedEnv.HS_LLM_CONFIG === undefined) delete process.env.HS_LLM_CONFIG;
    else process.env.HS_LLM_CONFIG = savedEnv.HS_LLM_CONFIG;
    if (savedEnv.XDG_CONFIG_HOME === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = savedEnv.XDG_CONFIG_HOME;
    await rm(dir, { recursive: true, force: true });
  });

  it("writes the example config to the user-global default and prints next-step hints", async () => {
    const code = await main(["init"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    const target = join(process.env.XDG_CONFIG_HOME!, "hs-llm", "config.json");
    expect(outBuf.output).toContain(target);
    expect(outBuf.output).toContain("Next steps");
    expect(outBuf.output).toContain("ANTHROPIC_API_KEY");
    const written = JSON.parse(await readFile(target, "utf8"));
    expect(written.version).toBe(1);
    expect(written.agents.length).toBeGreaterThanOrEqual(1);
  });

  it("writes to --config <path> when provided", async () => {
    const target = join(dir, "elsewhere", "my.json");
    const code = await main(["init", "--config", target], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    const written = JSON.parse(await readFile(target, "utf8"));
    expect(written.version).toBe(1);
  });

  it("refuses to overwrite an existing file without --force", async () => {
    const target = join(dir, "existing.json");
    await writeFile(target, '{"existing": true}', "utf8");
    const code = await main(["init", "--config", target], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(3);
    expect(errBuf.output).toContain("already exists");
    expect(errBuf.output).toContain("--force");
  });

  it("overwrites with --force", async () => {
    const target = join(dir, "existing.json");
    await writeFile(target, '{"existing": true}', "utf8");
    const code = await main(["init", "--config", target, "--force"], {
      stdout: outBuf,
      stderr: errBuf
    });
    expect(code).toBe(0);
    const written = JSON.parse(await readFile(target, "utf8"));
    expect(written.version).toBe(1);
  });

  it("init then validate-config round-trips against the resolution chain", async () => {
    let code = await main(["init"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    outBuf.output = "";
    code = await main(["validate-config"], { stdout: outBuf, stderr: errBuf });
    expect(code).toBe(0);
    expect(outBuf.output).toContain("OK:");
  });
});
