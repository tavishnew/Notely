/* AI Provider abstraction for backend.
 * Handles all external AI provider calls so the frontend never talks to them directly.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Encryption for storing API keys
const ENCRYPTION_KEY = process.env.NOTELY_ENCRYPTION_KEY || "notely-dev-key-32-chars-long!!";
const IV_LENGTH = 16;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "credentials.json");

// Whisper.cpp binary path (relative to backend or in PATH)
const WHISPER_BIN = process.env.WHISPER_BIN || "whisper-cli";
// Kokoro TTS binary path
const KOKORO_BIN = process.env.KOKORO_BIN || "kokoro";

// Ollama provisioning (moved from ollama.mjs for unified backend management)
const HOST = "127.0.0.1";
const PORT = 11434;
export const OLLAMA_URL = `http://${HOST}:${PORT}`;
export const DEFAULT_CHAT_MODEL = "qwen2.5:3b";
export const DEFAULT_EMBED_MODEL = "nomic-embed-text";

let serveProc = null; // the `ollama serve` we spawned, if any

function encrypt(text) {
  const iv = randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encrypted) {
  const [ivHex, encryptedText] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function loadStore() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}

export async function saveCredential(provider, apiKey) {
  const encrypted = encrypt(apiKey);
  const store = loadStore();
  store[provider] = encrypted;
  saveStore(store);
  return { ok: true };
}

export async function getCredential(provider) {
  const store = loadStore();
  const encrypted = store[provider];
  if (!encrypted) return null;
  return decrypt(encrypted);
}

export async function deleteCredential(provider) {
  const store = loadStore();
  delete store[provider];
  saveStore(store);
  return { ok: true };
}

export async function listCredentials() {
  const store = loadStore();
  const providers = Object.keys(store);
  return { providers };
}

// Provider base URLs
const PROVIDER_CONFIG = {
  openai: { baseUrl: "https://api.openai.com/v1", authHeader: "Authorization", authPrefix: "Bearer " },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", authHeader: "x-api-key", authPrefix: "", apiVersion: "2023-06-01" },
  nvidia: { baseUrl: "https://integrate.api.nvidia.com/v1", authHeader: "Authorization", authPrefix: "Bearer " },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", authHeader: "Authorization", authPrefix: "Bearer " },
  ollama: { baseUrl: "http://localhost:11434", authHeader: null, authPrefix: "" },
};

async function makeRequest(provider, path, options = {}) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = await getCredential(provider);
  if (!apiKey && provider !== "ollama") {
    throw new Error(`No API key configured for ${provider}`);
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (config.authHeader && apiKey) {
    headers[config.authHeader] = config.authPrefix + apiKey;
  }
  if (config.apiVersion) {
    headers["anthropic-version"] = config.apiVersion;
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const url = `${config.baseUrl}${path}`;
  const res = await fetch(url, {
    method: options.method || "POST",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!res.ok) {
    let errorMessage = `${provider} request failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error?.message) errorMessage = body.error.message;
      else if (body?.message) errorMessage = body.message;
    } catch {
      // body wasn't JSON
    }
    throw new Error(errorMessage);
  }

  return res;
}

export async function testConnection(provider) {
  if (provider === "ollama") {
    try {
      const res = await fetch(`${PROVIDER_CONFIG.ollama.baseUrl}/api/tags`, { method: "GET" });
      if (!res.ok) throw new Error("Ollama not reachable");
      return { ok: true, provider };
    } catch (e) {
      throw new Error(`Ollama connection failed: ${e.message}`);
    }
  }

  const apiKey = await getCredential(provider);
  if (!apiKey) throw new Error(`No API key for ${provider}`);

  try {
    const res = await makeRequest(provider, "/models", { method: "GET" });
    await res.json();
    return { ok: true, provider };
  } catch (e) {
    throw new Error(`${provider} connection test failed: ${e.message}`);
  }
}

export async function listModels(provider) {
  if (provider === "ollama") {
    const res = await fetch(`${PROVIDER_CONFIG.ollama.baseUrl}/api/tags`);
    const data = await res.json();
    return { models: (data.models || []).map(m => m.name) };
  }

  const res = await makeRequest(provider, "/models", { method: "GET" });
  const data = await res.json();

  // Normalize model list across providers
  let models = [];
  if (data.data) {
    models = data.data.map(m => m.id).filter(Boolean);
  } else if (Array.isArray(data)) {
    models = data.map(m => m.id || m.name).filter(Boolean);
  } else if (data.models) {
    models = data.models.map(m => m.id || m.name).filter(Boolean);
  }

  return { models };
}

export async function chatCompletion(provider, request) {
  const { messages, model, temperature, maxTokens, stream } = request;

  if (provider === "ollama") {
    const res = await fetch(`${PROVIDER_CONFIG.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "qwen2.5:3b",
        messages,
        stream: stream ?? true,
        options: {
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { num_predict: maxTokens } : {}),
        },
      }),
    });
    return res;
  }

  if (provider === "anthropic") {
    const { system, messages: anthropicMessages } = buildAnthropicMessages(messages);
    const body = {
      model: model || "claude-3-5-haiku-latest",
      max_tokens: maxTokens || 4096,
      messages: anthropicMessages,
      stream: stream ?? true,
      ...(system ? { system } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
    };
    const res = await makeRequest(provider, "/messages", { body });
    return res;
  }

  // OpenAI-compatible (OpenAI, NVIDIA, OpenRouter)
  const body = {
    model: model || getDefaultModel(provider),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: stream ?? true,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
  };
  const res = await makeRequest(provider, "/chat/completions", { body });
  return res;
}

export async function generateEmbeddings(provider, texts, model) {
  if (provider === "ollama") {
    const results = [];
    for (const text of texts) {
      const res = await fetch(`${PROVIDER_CONFIG.ollama.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model || "nomic-embed-text", prompt: text }),
      });
      const data = await res.json();
      results.push(data.embedding);
    }
    return { embeddings: results };
  }

  if (provider === "anthropic") {
    throw new Error("Anthropic does not support embeddings");
  }

  // OpenAI-compatible
  const res = await makeRequest(provider, "/embeddings", {
    body: {
      model: model || "text-embedding-3-small",
      input: texts,
    },
  });
  const data = await res.json();
  return { embeddings: (data.data || []).map(d => d.embedding) };
}

function buildAnthropicMessages(messages) {
  const systemParts = [];
  const anthropicMessages = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else {
      anthropicMessages.push({ role: m.role, content: m.content });
    }
  }
  const system = systemParts.length > 0
    ? [{ type: "text", text: systemParts.join("\n\n"), cache_control: { type: "ephemeral" } }]
    : null;
  return { system, messages: anthropicMessages };
}

function getDefaultModel(provider) {
  switch (provider) {
    case "openai": return "gpt-4o-mini";
    case "nvidia": return "nvidia/nemotron-4-340b-instruct";
    case "openrouter": return "openai/gpt-4o-mini";
    default: return "gpt-4o-mini";
  }
}

export function getSupportedProviders() {
  return Object.keys(PROVIDER_CONFIG);
}

// Transcription using whisper.cpp (local)
export async function transcribeAudio(audioPath, options = {}) {
  const { model = "base", language, signal } = options;

  return new Promise((resolve, reject) => {
    const args = [
      "-m", `models/ggml-${model}.bin`,
      "-f", audioPath,
      "-oj", // output as JSON
      "--no-gpu",
    ];

    if (language) {
      args.push("-l", language);
    }

    const proc = spawn(WHISPER_BIN, args, { signal });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`whisper.cpp failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve({
          text: result.text || "",
          language: result.language || language || "auto",
          segments: result.segments || [],
        });
      } catch (e) {
        reject(new Error(`Failed to parse whisper output: ${e.message}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start whisper.cpp: ${err.message}`));
    });
  });
}

// TTS using Kokoro (local)
export async function synthesizeSpeech(text, options = {}) {
  const { voice = "af_alloy", model = "kokoro-v1.0", signal } = options;

  return new Promise((resolve, reject) => {
    const args = [
      "--text", text,
      "--voice", voice,
      "--model", model,
      "--output-format", "wav",
    ];

    const proc = spawn(KOKORO_BIN, args, { signal });

    const chunks = [];
    let stderr = "";

    proc.stdout.on("data", (data) => { chunks.push(data); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Kokoro failed: ${stderr}`));
        return;
      }

      const audioBuffer = Buffer.concat(chunks);
      resolve(audioBuffer);
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start Kokoro: ${err.message}`));
    });
  });
}

// OpenAI-compatible transcription (for OpenAI API)
export async function transcribeWithOpenAI(audioPath, provider, options = {}) {
  const apiKey = await getCredential(provider);
  if (!apiKey) throw new Error(`No API key for ${provider}`);

  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const formData = new FormData();
  formData.append("file", fs.createReadStream(audioPath));
  formData.append("model", options.model || "whisper-1");
  if (options.language) formData.append("language", options.language);
  if (options.prompt) formData.append("prompt", options.prompt);
  if (options.response_format) formData.append("response_format", options.response_format);
  if (options.temperature) formData.append("temperature", options.temperature);

  const res = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Authorization": config.authPrefix + apiKey,
    },
    body: formData,
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Transcription failed: ${res.status}`);
  }

  return res.json();
}

// OpenAI-compatible TTS (for OpenAI API)
export async function synthesizeWithOpenAI(text, provider, options = {}) {
  const apiKey = await getCredential(provider);
  if (!apiKey) throw new Error(`No API key for ${provider}`);

  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const res = await makeRequest(provider, "/audio/speech", {
    body: {
      model: options.model || "tts-1",
      input: text,
      voice: options.voice || "alloy",
      response_format: options.response_format || "mp3",
      speed: options.speed || 1.0,
    },
  });

  return res.arrayBuffer();
}

// Ollama provisioning functions
function assetUrl() {
  const base = "https://github.com/ollama/ollama/releases/latest/download";
  if (process.platform === "darwin") return `${base}/ollama-darwin`;
  if (process.platform === "win32") return `${base}/ollama-windows-amd64.zip`;
  return `${base}/ollama-linux-amd64`;
}

function markerPath(binDir) {
  return path.join(binDir, ".provisioned");
}

export function isProvisioned(binDir) {
  try {
    return fs.existsSync(markerPath(binDir));
  } catch {
    return false;
  }
}

async function findBinary(binDir) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileP = promisify(execFile);
  try {
    const { stdout } = await execFileP(process.platform === "win32" ? "where" : "which", ["ollama"]);
    const p = stdout.split("\n")[0].trim();
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* not on PATH */
  }
  const local = path.join(binDir, process.platform === "win32" ? "ollama.exe" : "ollama");
  return fs.existsSync(local) ? local : null;
}

async function downloadBinary(binDir, onLog) {
  fs.mkdirSync(binDir, { recursive: true });
  if (process.platform === "win32") {
    throw new Error(
      "Automatic Ollama download isn't supported on Windows yet. Install Ollama from https://ollama.com/download, then reopen Notely.",
    );
  }
  const dest = path.join(binDir, "ollama");
  onLog?.("Downloading the local AI runtime (Ollama)…");
  const res = await fetch(assetUrl(), { headers: { "user-agent": "Notely" } });
  if (!res.ok) throw new Error(`Couldn't download Ollama (${res.status})`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  fs.chmodSync(dest, 0o755);
  return dest;
}

export async function isServing() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitUntilServing(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServing()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureServing(bin, appOrigin, onLog) {
  if (await isServing()) return;
  onLog?.("Starting the local AI runtime…");
  serveProc = spawn(bin, ["serve"], {
    env: {
      ...process.env,
      OLLAMA_HOST: `${HOST}:${PORT}`,
      OLLAMA_ORIGINS: appOrigin ? `${appOrigin},app://*,tauri://*` : "*",
    },
    stdio: "ignore",
    detached: false,
  });
  serveProc.on("exit", () => {
    serveProc = null;
  });
  if (!(await waitUntilServing())) {
    throw new Error("Ollama started but isn't responding. Try reopening Notely.");
  }
}

async function hasModel(name) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const body = await res.json();
    return (body.models ?? []).some((m) => m.name === name || m.name === `${name}:latest`);
  } catch {
    return false;
  }
}

async function pullModel(bin, name, onProgress) {
  if (await hasModel(name)) {
    onProgress?.({ model: name, status: "already installed", percent: 100 });
    return;
  }
  const res = await fetch(`${OLLAMA_URL}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Couldn't pull ${name} (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let j;
      try {
        j = JSON.parse(line);
      } catch {
        continue;
      }
      if (j.error) throw new Error(j.error);
      const percent = j.total ? Math.round(((j.completed ?? 0) / j.total) * 100) : undefined;
      onProgress?.({ model: name, status: j.status ?? "pulling", percent });
    }
  }
  onProgress?.({ model: name, status: "ready", percent: 100 });
}

export async function provisionOllama({ binDir, appOrigin, models, emit } = {}) {
  const chat = models?.chat ?? DEFAULT_CHAT_MODEL;
  const embed = models?.embed ?? DEFAULT_EMBED_MODEL;
  const log = (message) => emit?.({ phase: "log", message });

  let bin = await findBinary(binDir);
  if (!bin) {
    emit?.({ phase: "installing", message: "Setting up the local AI runtime…" });
    bin = await downloadBinary(binDir, log);
  }
  emit?.({ phase: "starting", message: "Starting the local AI runtime…" });
  await ensureServing(bin, appOrigin, log);

  for (const model of [chat, embed]) {
    emit?.({ phase: "pulling", model, message: `Downloading model ${model}…` });
    await pullModel(bin, model, (p) =>
      emit?.({ phase: "pulling", model: p.model, percent: p.percent, message: p.status }),
    );
  }
  if (binDir) {
    try {
      fs.writeFileSync(markerPath(binDir), new Date().toISOString());
    } catch {
      /* non-fatal — worst case setup re-runs (fast) next launch */
    }
  }
  emit?.({ phase: "ready", message: "Local AI is ready." });
  return { chat, embed, url: OLLAMA_URL };
}

export async function ensureServingIfProvisioned(binDir, appOrigin) {
  if (!isProvisioned(binDir)) return false;
  if (await isServing()) return true;
  const bin = await findBinary(binDir);
  if (!bin) return false;
  try {
    await ensureServing(bin, appOrigin);
    return true;
  } catch {
    return false;
  }
}

export async function getOllamaStatus(binDir) {
  const bin = await findBinary(binDir);
  const serving = await isServing();
  return {
    installed: !!bin,
    serving,
    hasChatModel: serving ? await hasModel(DEFAULT_CHAT_MODEL) : false,
    hasEmbedModel: serving ? await hasModel(DEFAULT_EMBED_MODEL) : false,
  };
}

export function shutdownOllama() {
  if (serveProc) {
    try {
      serveProc.kill();
    } catch {
      /* already gone */
    }
    serveProc = null;
  }
}