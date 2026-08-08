/* Engine factory. This is the single entry point generation/UI code should
   use to get an Engine — never `new` a provider class directly, so switching
   providers/modes stays a one-line change at the call site. */

import type { EngineMode, Provider } from "../types";
import type { Engine } from "./types";
import { EngineError } from "./types";
import { LocalEngine } from "./local";
import { BackendEngine, validateBackendCredentials } from "./backend";

export * from "./types";
export { detectProvider, providerLabel } from "./keys";
export { NVIDIA_MODELS } from "./nvidia";

export interface CreateEngineOptions {
  mode: EngineMode;
  provider?: Provider;
  apiKey?: string;
  model?: string;
  localBaseUrl?: string;
}

export function createEngine(opts: CreateEngineOptions): Engine {
  if (opts.mode === "local") {
    return new LocalEngine(opts.localBaseUrl, opts.model);
  }

  if (!opts.provider) {
    throw new EngineError(
      "A provider (openai, anthropic, nvidia, openrouter) is required for cloud mode.",
      "unknown",
    );
  }

  // All cloud providers now go through the backend
  return new BackendEngine(opts.provider);
}

/* Cheap liveness/credentials check without the caller needing to hold onto
   the Engine instance. Throws EngineError on failure. */
export async function validateCredentials(opts: CreateEngineOptions): Promise<void> {
  if (opts.mode === "local") {
    // For local, just create and validate the engine
    const engine = createEngine(opts);
    await engine.validate();
    return;
  }

  if (!opts.provider) {
    throw new EngineError("A provider is required for cloud mode.", "unknown");
  }

  // Validate via backend
  await validateBackendCredentials(opts.provider);
}