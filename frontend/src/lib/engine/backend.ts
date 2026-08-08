/* Backend Engine — implements Engine interface by calling backend API endpoints.
 * This replaces all direct provider calls from the frontend.
 */

import type {
  ChatMessage,
  CompletionOptions,
  Engine,
  EngineCapabilities,
  StructuredOptions,
  TokenHandler,
  TranscriptResult,
  TtsOptions,
} from "./types";
import { EngineError } from "./types";
import type { Provider } from "../types";
import {
  chatCompletion,
  generateEmbeddings,
  testConnection as backendTestConnection,
  listModels as backendListModels,
  transcribeAudio as backendTranscribe,
  synthesizeSpeech as backendSynthesize,
} from "../backendApi";

export class BackendEngine implements Engine {
  readonly mode = "cloud" as const;
  readonly provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  capabilities(): EngineCapabilities {
    // Backend supports all capabilities; actual support depends on the provider
    return { chat: true, transcription: true, tts: true, embeddings: true };
  }

  async complete(opts: CompletionOptions, onToken?: TokenHandler): Promise<string> {
    const messages = buildMessages(opts);
    return chatCompletion({
      provider: this.provider,
      messages,
      model: this.resolveModel(opts.tier),
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      stream: true,
      signal: opts.signal,
      onToken,
    });
  }

  async structured<T>(opts: StructuredOptions<T>): Promise<T> {
    const messages = buildMessages(opts);
    const schemaInstruction = `Respond ONLY with a single JSON object that satisfies this JSON Schema (no prose, no markdown fences, no explanation):\n${JSON.stringify(opts.schema)}`;
    const systemContent = opts.system ? `${opts.system}\n\n${schemaInstruction}` : schemaInstruction;

    const result = await chatCompletion({
      provider: this.provider,
      messages: [
        { role: "system", content: systemContent },
        ...messages.filter(m => m.role !== "system"),
      ],
      model: this.resolveModel(opts.tier),
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      stream: false,
      signal: opts.signal,
      onToken: undefined,
    });

    try {
      return JSON.parse(result) as T;
    } catch {
      throw new EngineError("Failed to parse structured output", "unknown");
    }
  }

  async transcribe(audio: Blob, _signal?: AbortSignal): Promise<TranscriptResult> {
    const result = await backendTranscribe(audio, this.provider);
    return { text: result.text, language: result.language, segments: result.segments };
  }

  async tts(text: string, opts: TtsOptions): Promise<Blob> {
    return backendSynthesize(text, this.provider, {
      voice: opts.voice,
      response_format: opts.format,
    });
  }

  async embed(texts: string[], _signal?: AbortSignal): Promise<number[][]> {
    const result = await generateEmbeddings(this.provider, texts, undefined);
    return result.embeddings;
  }

  async validate(): Promise<void> {
    await backendTestConnection(this.provider);
  }

  private resolveModel(tier?: "fast" | "strong"): string {
    // Model resolution can be enhanced with backend model list
    switch (this.provider) {
      case "openai": return tier === "strong" ? "gpt-4o" : "gpt-4o-mini";
      case "anthropic": return tier === "strong" ? "claude-3-5-sonnet-latest" : "claude-3-5-haiku-latest";
      case "nvidia": return tier === "strong" ? "meta/llama-3.1-405b-instruct" : "nvidia/nemotron-4-340b-instruct";
      case "openrouter": return tier === "strong" ? "openai/gpt-4o" : "openai/gpt-4o-mini";
      default: return "gpt-4o-mini";
    }
  }
}

function buildMessages(opts: CompletionOptions): ChatMessage[] {
  const out: ChatMessage[] = [];
  if (opts.system) out.push({ role: "system", content: opts.system });
  for (const m of opts.messages) {
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

// Backend engine factory
export async function createBackendEngine(provider: Provider): Promise<BackendEngine> {
  // Verify the provider is configured
  await backendTestConnection(provider);
  return new BackendEngine(provider);
}

export async function validateBackendCredentials(provider: Provider): Promise<void> {
  await backendTestConnection(provider);
}

export async function getBackendModels(provider: Provider): Promise<string[]> {
  const result = await backendListModels(provider);
  return result.models || [];
}