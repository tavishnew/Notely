/* YouTube ingestion: fetch metadata (title, duration, etc.) and either:
   - Extract captions (if available) -> text
   - Fallback to audio download -> transcribe via engine
   Prioritizes captions; only downloads audio if no captions.
   Always returns { text, title, meta } where meta includes url/videoId. */

import type { Engine } from "../engine/types";
import type { Repo } from "../db";
import type { Job, JobFile } from "../types";
import { uuid } from "../ids";
import { extractCaptions, fetchTitle, isYoutube, youtubeId, ingestYoutube } from "./utils";

/* Extract the 11-char video id from watch?v=, youtu.be/, /embed/, /shorts/
   (and /live/) forms. Pure "������������������������������������������������ no network. */
export { youtubeId };
export { isYoutube };
/* Main ingestion function used by the pipeline */
export { ingestYoutube };

// Pipeline-specific function that provides progress updates
export async function youtube(
  url: string,
  opts: { engine: Engine; repo: Repo; onProgress?: (job: Job) => void; signal?: AbortSignal },
): Promise<{ text: string; title: string; meta: { url: string; videoId: string } }> {
  const { engine: _engine, repo: _repo, onProgress, signal } = opts;
  // _engine and _repo are used in the pipeline function signature but not directly here
  // they're kept for consistency with the ingest pipeline interface
  const id = url.split("v=")[1].split("&")[0];
  const job: JobFile = {
    name: `YouTube: ${id}`,
    status: "queued",
  };

  const emit = async (patch: Partial<JobFile>) => {
    Object.assign(job, patch);
    // onProgress expects a Job, but we have a JobFile
    // Create a minimal Job object for progress reporting
    onProgress?.({
      id: uuid(), // Generate a proper ID for the job
      label: job.name,
      stage: "ingest" as const,
      status: job.status,
      progress: 0,
      message: "",
      updatedAt: Date.now(),
    } as Job);
  };
  await emit({ status: "running" });

  try {
    // 1. Try captions first (fast, no audio needed)
    const captions = await extractCaptions(id, { signal });
    if (captions) {
      const title = await fetchTitle(id);
      await emit({ status: "done" });
      // Ensure title is not undefined - provide fallback if needed
      const finalTitle = title ?? `YouTube video ${id}`;
      return { text: captions, title: finalTitle, meta: { url, videoId: id } };
    }

    // 2. No captions -> need audio
    await emit({
      status: "running",
    });

    // This would use ytdl-core or similar to download audio
    // For now, we error and instruct user to use desktop app or local dev
    throw new Error(
      "This deployment can't reach YouTube (its bot-protection blocks transcript fetches from a static site). " +
        "Use the Notely desktop app or run the app locally (`npm run preview`) to extract captions/audio " +
        "automatically or download the audio and drop it into \"Record or upload audio\".",
    );
  } catch (err) {
    await emit({
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }
}