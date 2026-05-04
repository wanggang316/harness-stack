import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SdkProviderConfig } from "../config/schema.js";
import { InvocationError } from "./errors.js";
import type { ProviderTaskRunner } from "./types.js";

export interface SdkAdapterFactoryArgs {
  providerName: string;
  provider: SdkProviderConfig;
  resolvePath: (relativeOrAbsolute: string) => string;
  environment: NodeJS.ProcessEnv;
}

export type SdkAdapterFactory = (
  args: SdkAdapterFactoryArgs
) => Promise<ProviderTaskRunner> | ProviderTaskRunner;

const DEFAULT_EXPORT_NAME = "createHsLlmAdapter";

export async function createSdkRunner(
  providerName: string,
  provider: SdkProviderConfig,
  cwd: string = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env
): Promise<ProviderTaskRunner> {
  if (!isLocalAdapterPath(provider.adapter)) {
    throw new InvocationError(
      "config",
      `sdk provider '${providerName}' adapter must be an absolute path or a relative path starting with './' or '../'; got '${provider.adapter}'. Bare module specifiers (resolved from node_modules) are not allowed.`
    );
  }

  const adapterPath = isAbsolute(provider.adapter)
    ? provider.adapter
    : resolve(cwd, provider.adapter);
  const moduleUrl = pathToFileURL(adapterPath).href;

  let module: Record<string, unknown>;
  try {
    module = (await import(moduleUrl)) as Record<string, unknown>;
  } catch (err) {
    throw new InvocationError(
      "config",
      `failed to load sdk adapter at ${adapterPath}: ${(err as Error).message}`,
      { cause: err }
    );
  }

  const exportName = provider.exportName ?? DEFAULT_EXPORT_NAME;
  const factory = module[exportName];
  if (typeof factory !== "function") {
    throw new InvocationError(
      "config",
      `sdk adapter at ${adapterPath} is missing function export '${exportName}'`
    );
  }

  const merged: NodeJS.ProcessEnv = { ...environment, ...(provider.env ?? {}) };
  const runner = await (factory as SdkAdapterFactory)({
    providerName,
    provider,
    resolvePath: (path) => (isAbsolute(path) ? path : resolve(cwd, path)),
    environment: merged
  });

  if (!runner || typeof runner.runTask !== "function") {
    throw new InvocationError(
      "config",
      `sdk adapter at ${adapterPath} returned an object that does not implement runTask`
    );
  }
  return runner;
}

export function isLocalAdapterPath(specifier: string): boolean {
  return isAbsolute(specifier) || specifier.startsWith("./") || specifier.startsWith("../");
}
