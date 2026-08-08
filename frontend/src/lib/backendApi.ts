/* Backend API client — all external AI provider calls go through the backend.
 * Frontend never communicates directly with OpenAI, Anthropic, NVIDIA, etc.
 */

import type { Provider } from "./types";

const API_BASE = "/api";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res;
}

export async function listProviders(): Promise<{ providers: string[] }> {
  const res = await request("/ai/providers");
  return res.json();
}

export async function saveCredential(provider: Provider, apiKey: string): Promise<{ ok: true }> {
  const res = await request("/ai/credentials", {
    method: "POST",
    body: JSON.stringify({ provider, apiKey }),
  });
  return res.json();
}

export async function listCredentials(): Promise<{ providers: string[] }> {
  const res = await request("/ai/credentials");
  return res.json();
}

export async function deleteCredential(provider: Provider): Promise<{ ok: true }> {
  const res = await request(`/ai/credentials?provider=${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function testConnection(provider: Provider): Promise<{ ok: true; provider: string }> {
  const res = await request("/ai/test", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
  return res.json();
}

export async function listModels(provider: Provider): Promise<{ models: string[] }> {
  const res = await request(`/ai/models?provider=${encodeURIComponent(provider)}`);
  return res.json();
}

export interface ChatCompletionOptions {
  provider: Provider;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
  onToken?: (delta: string) => void;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
  const { provider, messages, model, temperature, maxTokens, stream, signal, onToken } = options;

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, messages, model, temperature, maxTokens, stream }),
    signal,
  });

  if (!res.ok) {
    let message = `Chat failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (!stream) {
    const data = await res.json();
    return data.content || data.choices?.[0]?.message?.content || "";
  }

  // Streaming response
  if (!res.body) throw new Error("Empty response stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onToken?.(delta);
        }
      } catch {
        // malformed SSE chunk; skip
      }
    }
  }
  return full;
}

export async function generateEmbeddings(provider: Provider, texts: string[], model?: string): Promise<{ embeddings: number[][] }> {
  const res = await request("/ai/embeddings", {
    method: "POST",
    body: JSON.stringify({ provider, texts, model }),
  });
  return res.json();
}

export async function transcribeAudio(audioBlob: Blob, provider: Provider, options?: {
  model?: string;
  language?: string;
  prompt?: string;
  response_format?: string;
  temperature?: number;
}): Promise<{ text: string; language: string; segments: any[] }> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const res = await request("/ai/transcribe", {
    method: "POST",
    body: JSON.stringify({ audioBase64: base64, provider, ...options }),
  });
  return res.json();
}

export async function synthesizeSpeech(text: string, provider: Provider, options?: {
  voice?: string;
  model?: string;
  response_format?: string;
  speed?: number;
}): Promise<Blob> {
  const res = await request("/ai/tts", {
    method: "POST",
    body: JSON.stringify({ text, provider, ...options }),
  });
  const data = await res.json();
  const binaryString = atob(data.audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes]);
}

export async function checkBackendHealth(): Promise<{ ok: true; service: string }> {
  const res = await request("/health");
  return res.json();
}