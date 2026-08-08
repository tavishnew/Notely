/* The local server the desktop shell runs. Serves the built SPA (dist/) and the
 * native-helper endpoints the browser can't do itself:
 *   GET  /api/health               → liveness (the shell polls this)
 *   GET  /api/youtube-extract?url= → yt-dlp captions/audio
 *   GET  /api/local/status         → Ollama provisioning state
 *   GET  /api/local/setup          → SSE stream that installs/starts/pulls Ollama
 *
 * Pure Node built-ins, no framework, so the packaged app stays small and has
 * no extra supply chain. Exported as startServer() so both the Electron main
 * process and a plain `node backend/standalone.mjs` can run it.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { extractYoutube } from "./ytdlp.mjs";
import {
  testConnection,
  listModels,
  chatCompletion,
  generateEmbeddings,
  saveCredential,
  getCredential,
  deleteCredential,
  listCredentials,
  getSupportedProviders,
  transcribeAudio,
  synthesizeSpeech,
  transcribeWithOpenAI,
  synthesizeWithOpenAI,
  provisionOllama,
  isProvisioned,
  getOllamaStatus,
  ensureServingIfProvisioned,
  shutdownOllama,
} from "./aiProviders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

/* Serve a static file from dist/, defending against path traversal, with SPA
   fallback to index.html for client routes. */
function serveStatic(distDir, urlPath, res) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.normalize(path.join(distDir, clean));
  if (!resolved.startsWith(distDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  let filePath = resolved;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA routes (e.g. /notes/:id/editor) have no file — serve the app shell.
    filePath = path.join(distDir, "index.html");
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404).end("Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": MIME[ext] ?? "application/octet-stream",
    "cache-control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, url, opts) {
  const p = url.pathname;

  if (p === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "notely" });
  }

  if (p === "/api/youtube-extract") {
    const target = url.searchParams.get("url");
    if (!target) return sendJson(res, 400, { error: "missing url parameter" });

    // Validate that the URL is actually a YouTube URL
    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return sendJson(res, 400, { error: "invalid url" });
    }
    const allowedHosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
    if (!allowedHosts.includes(targetUrl.hostname)) {
      return sendJson(res, 400, { error: "url must be a YouTube URL" });
    }

    // Origin check to prevent localhost CSRF
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    if (origin && !origin.startsWith(opts.appOrigin)) {
      return sendJson(res, 403, { error: "forbidden origin" });
    }
    if (referer && !referer.startsWith(opts.appOrigin)) {
      return sendJson(res, 403, { error: "forbidden referer" });
    }

    try {
      const result = await extractYoutube(target, opts.binDir);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 502, { error: err instanceof Error ? err.message : "extraction failed" });
    }
  }

  if (p === "/api/local/status") {
    try {
      return sendJson(res, 200, await getOllamaStatus(opts.binDir));
    } catch (err) {
      return sendJson(res, 500, { error: err instanceof Error ? err.message : "status failed" });
    }
  }

  if (p === "/api/local/setup") {
    // Server-Sent Events: provisions Ollama and streams progress. Called ONLY
    // when the user has chosen the local engine.
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    const emit = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    try {
      const result = await provisionOllama({
        binDir: opts.binDir,
        appOrigin: opts.appOrigin,
        emit,
      });
      emit({ phase: "done", ...result });
    } catch (err) {
      emit({ phase: "error", message: err instanceof Error ? err.message : "setup failed" });
    }
    return res.end();
  }

  // AI Provider endpoints
  if (p === "/api/ai/providers") {
    try {
      return sendJson(res, 200, { providers: getSupportedProviders() });
    } catch (err) {
      return sendJson(res, 500, { error: err instanceof Error ? err.message : "failed to list providers" });
    }
  }

  if (p === "/api/ai/credentials") {
    if (req.method === "GET") {
      try {
        const creds = await listCredentials();
        return sendJson(res, 200, creds);
      } catch (err) {
        return sendJson(res, 500, { error: err instanceof Error ? err.message : "failed to list credentials" });
      }
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { provider, apiKey } = JSON.parse(body);
          if (!provider || !apiKey) {
            return sendJson(res, 400, { error: "provider and apiKey required" });
          }
          await saveCredential(provider, apiKey);
          return sendJson(res, 200, { ok: true });
        } catch (err) {
          return sendJson(res, 500, { error: err instanceof Error ? err.message : "failed to save credential" });
        }
      });
      return;
    }
    if (req.method === "DELETE") {
      const provider = url.searchParams.get("provider");
      if (!provider) return sendJson(res, 400, { error: "provider required" });
      try {
        await deleteCredential(provider);
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        return sendJson(res, 500, { error: err instanceof Error ? err.message : "failed to delete credential" });
      }
    }
    return sendJson(res, 405, { error: "method not allowed" });
  }

  if (p === "/api/ai/test") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { provider } = JSON.parse(body);
        if (!provider) return sendJson(res, 400, { error: "provider required" });
        const result = await testConnection(provider);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err instanceof Error ? err.message : "connection test failed" });
      }
    });
    return;
  }

  if (p === "/api/ai/models") {
    if (req.method !== "GET") return sendJson(res, 405, { error: "method not allowed" });
    const provider = url.searchParams.get("provider");
    if (!provider) return sendJson(res, 400, { error: "provider required" });
    try {
      const result = await listModels(provider);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: err instanceof Error ? err.message : "failed to list models" });
    }
  }

  if (p === "/api/chat") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { provider, messages, model, temperature, maxTokens, stream } = JSON.parse(body);
        if (!provider || !messages) return sendJson(res, 400, { error: "provider and messages required" });
        const res2 = await chatCompletion(provider, { messages, model, temperature, maxTokens, stream });
        // Forward the response (including streaming)
        res.writeHead(res2.status, {
          "content-type": res2.headers.get("content-type") || "application/json",
          "cache-control": "no-store",
        });
        res2.body.pipe(res);
      } catch (err) {
        return sendJson(res, 500, { error: err instanceof Error ? err.message : "chat completion failed" });
      }
    });
    return;
  }

  if (p === "/api/ai/embeddings") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { provider, texts, model } = JSON.parse(body);
        if (!provider || !texts || !Array.isArray(texts)) {
          return sendJson(res, 400, { error: "provider and texts array required" });
        }
        const result = await generateEmbeddings(provider, texts, model);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 500, { error: err instanceof Error ? err.message : "embeddings failed" });
      }
    });
    return;
  }

  if (p === "/api/ai/transcribe") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
    // Handle multipart/form-data for audio upload
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return sendJson(res, 400, { error: "multipart/form-data required" });
    }
    // Simple multipart parsing for file upload
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        // For now, expect base64-encoded audio in JSON body
        // In production, use a proper multipart parser
        const { audioBase64, provider, model, language, prompt, response_format, temperature } = JSON.parse(body);
        if (!audioBase64 || !provider) {
          return sendJson(res, 400, { error: "audioBase64 and provider required" });
        }

        // Save base64 audio to temp file
        const audioBuffer = Buffer.from(audioBase64, "base64");
        const tempPath = path.join(os.tmpdir(), `notely_audio_${Date.now()}.webm`);
        fs.writeFileSync(tempPath, audioBuffer);

        let result;
        if (provider === "local" || provider === "whisper") {
          result = await transcribeAudio(tempPath, { model, language, signal: req.socket });
        } else {
          result = await transcribeWithOpenAI(tempPath, provider, { model, language, prompt, response_format, temperature });
        }

        // Cleanup
        fs.unlinkSync(tempPath);

        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 500, { error: err instanceof Error ? err.message : "transcription failed" });
      }
    });
    return;
  }

  if (p === "/api/ai/tts") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { text, provider, voice, model, response_format, speed } = JSON.parse(body);
        if (!text || !provider) {
          return sendJson(res, 400, { error: "text and provider required" });
        }

        let audioBuffer;
        if (provider === "local" || provider === "kokoro") {
          audioBuffer = await synthesizeSpeech(text, { voice, model, signal: req.socket });
        } else {
          audioBuffer = await synthesizeWithOpenAI(text, provider, { voice, model, response_format, speed });
        }

        // Return as base64
        return sendJson(res, 200, { audioBase64: audioBuffer.toString("base64") });
      } catch (err) {
        return sendJson(res, 500, { error: err instanceof Error ? err.message : "tts failed" });
      }
    });
    return;
  }

  return sendJson(res, 404, { error: "unknown endpoint" });
}

/* Start the server. Returns { server, port, url }. `distDir` defaults to the
   sibling dist/ (works in dev and when packaged with app.asar layout). */
export function startServer({ distDir, binDir, port = 0, host = "127.0.0.1" } = {}) {
  const resolvedDist = distDir ?? path.join(__dirname, "..", "dist");

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname.startsWith("/api/")) {
      const appOrigin = `http://${host}:${server.address()?.port ?? port}`;
      handleApi(req, res, url, { binDir, appOrigin }).catch((err) =>
        sendJson(res, 500, { error: err instanceof Error ? err.message : "internal error" }),
      );
      return;
    }
    serveStatic(resolvedDist, url.pathname, res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const actualPort = server.address().port;
      resolve({ server, port: actualPort, url: `http://${host}:${actualPort}` });
    });
  });
}
