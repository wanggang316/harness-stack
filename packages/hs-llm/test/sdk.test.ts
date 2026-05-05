import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createSdkRunner, isLocalAdapterPath } from "../src/runtime/sdk.js";
import { invoke, validateConfig, type HsLlmConfig } from "../src/index.js";

const GOOD_ADAPTER = fileURLToPath(new URL("./fixtures/sdk-adapter-good.mjs", import.meta.url));
const BAD_ADAPTER = fileURLToPath(new URL("./fixtures/sdk-adapter-bad-no-export.mjs", import.meta.url));

describe("isLocalAdapterPath", () => {
  it("accepts absolute paths", () => {
    expect(isLocalAdapterPath("/abs/path/to/adapter.mjs")).toBe(true);
  });
  it("accepts relative paths", () => {
    expect(isLocalAdapterPath("./adapter.mjs")).toBe(true);
    expect(isLocalAdapterPath("../shared/adapter.mjs")).toBe(true);
  });
  it("rejects bare module specifiers", () => {
    expect(isLocalAdapterPath("some-package")).toBe(false);
    expect(isLocalAdapterPath("@scope/pkg")).toBe(false);
  });
});

describe("createSdkRunner (direct)", () => {
  it("loads a local adapter and returns a runner that invokes the factory", async () => {
    const runner = await createSdkRunner(
      "p",
      {
        type: "sdk",
        adapter: GOOD_ADAPTER,
        models: [{ id: "m" }]
      },
      process.cwd(),
      { SDK_TEST_MARKER: "from-env" }
    );
    expect(typeof runner.runTask).toBe("function");
  });

  it("rejects bare module specifiers with a config error", async () => {
    await expect(
      createSdkRunner("p", { type: "sdk", adapter: "lodash", models: [{ id: "m" }] })
    ).rejects.toMatchObject({ kind: "config" });
  });

  it("rejects an adapter that does not export the expected factory name", async () => {
    await expect(
      createSdkRunner("p", { type: "sdk", adapter: BAD_ADAPTER, models: [{ id: "m" }] })
    ).rejects.toMatchObject({
      kind: "config",
      message: expect.stringContaining("createHsLlmAdapter")
    });
  });

  it("rejects when the adapter file does not exist", async () => {
    await expect(
      createSdkRunner("p", {
        type: "sdk",
        adapter: "/no/such/file.mjs",
        models: [{ id: "m" }]
      })
    ).rejects.toMatchObject({ kind: "config" });
  });
});

describe("invoke through sdk provider", () => {
  it("runs end-to-end against the fixture adapter and merges provider env", async () => {
    const cfg: HsLlmConfig = validateConfig({
      version: 1,
      providers: {
        p_sdk: {
          type: "sdk",
          adapter: GOOD_ADAPTER,
          env: { SDK_TEST_MARKER: "from-config" },
          models: [{ id: "m" }]
        }
      },
      agents: [{ id: "a", provider: "p_sdk", model: "m" }]
    });
    const res = await invoke({ config: cfg, agentId: "a", request: { prompt: "ping" } });
    expect(res.text).toBe("SDK[p_sdk|from-config]: ping");
    expect(res.providerModel).toBe("m");
    expect(res.reasoningApplied).toBe(false);
  });
});
