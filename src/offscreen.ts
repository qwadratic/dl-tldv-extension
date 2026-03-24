import { FFmpeg } from "@ffmpeg/ffmpeg";
import { buildFilename } from "./pipeline/filename";

// Offscreen document: downloads segments, remuxes via ffmpeg.wasm, returns blob URL.
// Runs in a full DOM context with Web Worker + URL.createObjectURL support.

const CONCURRENCY = 6;

async function downloadSegments(
  urls: string[],
  onProgress: (current: number, total: number) => void,
): Promise<ArrayBuffer[]> {
  const total = urls.length;
  const results: (ArrayBuffer | null)[] = new Array(total).fill(null);
  let completed = 0;
  const queue = urls.map((url, i) => ({ url, i }));
  const workers: Promise<void>[] = [];

  for (let w = 0; w < Math.min(CONCURRENCY, queue.length); w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          const resp = await fetch(item.url);
          if (!resp.ok) throw new Error(`Segment ${item.i}: HTTP ${resp.status}`);
          results[item.i] = await resp.arrayBuffer();
          completed++;
          onProgress(completed, total);
        }
      })(),
    );
  }

  await Promise.all(workers);
  if (results.some((r) => r === null)) throw new Error("Missing segments");
  return results as ArrayBuffer[];
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
    const msg = message as {
      type: string;
      segmentUrls?: string[];
      metadata?: { name: string; createdAt: string };
    };

    if (msg.type !== "REMUX_REQUEST") return false;

    (async () => {
      try {
        const { segmentUrls, metadata } = msg;
        if (!segmentUrls || !metadata) throw new Error("Missing data");

        const sendStage = (stage: string) => {
          chrome.runtime.sendMessage({ type: "REMUX_STAGE", stage }).catch(() => {});
        };

        // Step 1: Download segments
        sendStage("downloading");
        const onProgress = (current: number, total: number) => {
          chrome.runtime.sendMessage({
            type: "DOWNLOAD_PROGRESS_RELAY",
            current,
            total,
          }).catch(() => {});
        };
        const segments = await downloadSegments(segmentUrls, onProgress);
        console.log(`[dl-tldv:offscreen] Downloaded ${segments.length} segments`);

        // Step 2: Remux
        const ffmpeg = new FFmpeg();
        try {
          sendStage("loading");
          await ffmpeg.load({
            coreURL: chrome.runtime.getURL("ffmpeg-core.js"),
            wasmURL: chrome.runtime.getURL("ffmpeg-core.wasm"),
            classWorkerURL: chrome.runtime.getURL("ffmpeg-worker.js"),
          });

          sendStage("writing");
          const lines: string[] = [];
          for (let i = 0; i < segments.length; i++) {
            const name = `seg_${String(i).padStart(5, "0")}.ts`;
            await ffmpeg.writeFile(name, new Uint8Array(segments[i]));
            lines.push(`file '${name}'`);
            // Free source buffer
            (segments as (ArrayBuffer | null)[])[i] = null;
          }
          await ffmpeg.writeFile("list.txt", new TextEncoder().encode(lines.join("\n")));

          sendStage("remuxing");
          await ffmpeg.exec([
            "-f", "concat", "-safe", "0", "-i", "list.txt",
            "-c", "copy", "-movflags", "+faststart", "output.mp4",
          ]);

          sendStage("reading");
          const mp4Data = await ffmpeg.readFile("output.mp4");
          if (typeof mp4Data === "string") throw new Error("Unexpected string output");

          const filename = buildFilename(metadata.name, metadata.createdAt);

          // Cleanup FS
          for (let i = 0; i < lines.length; i++) {
            try { await ffmpeg.deleteFile(`seg_${String(i).padStart(5, "0")}.ts`); } catch {}
          }
          try { await ffmpeg.deleteFile("list.txt"); await ffmpeg.deleteFile("output.mp4"); } catch {}

          // Create blob URL (offscreen has DOM access)
          const blob = new Blob([mp4Data.buffer as ArrayBuffer], { type: "video/mp4" });
          const blobUrl = URL.createObjectURL(blob);

          console.log(`[dl-tldv:offscreen] Remux done: ${filename} (${(mp4Data.byteLength / 1024 / 1024).toFixed(1)} MB)`);
          sendResponse({ success: true, filename, blobUrl });
        } finally {
          ffmpeg.terminate();
        }
      } catch (err) {
        console.error("[dl-tldv:offscreen] Error:", err);
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
      }
    })();

    return true;
  }
);
