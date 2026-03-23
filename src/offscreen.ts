import { FFmpeg } from "@ffmpeg/ffmpeg";
import { buildFilename } from "./pipeline/filename";

// Offscreen document: runs ffmpeg.wasm remux in a context that supports Web Workers.
// The service worker sends REMUX_REQUEST messages here, we process and reply.

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
    const msg = message as {
      type: string;
      segments?: ArrayBuffer[];
      metadata?: { name: string; createdAt: string };
    };

    if (msg.type !== "REMUX_REQUEST") return false;

    // Must return true to indicate async response
    (async () => {
      try {
        const { segments, metadata } = msg;
        if (!segments || !metadata) throw new Error("Missing segments or metadata");

        // Notify progress via separate messages (fire-and-forget)
        const sendStage = (stage: string) => {
          chrome.runtime.sendMessage({ type: "REMUX_STAGE", stage }).catch(() => {});
        };

        const ffmpeg = new FFmpeg();

        try {
          sendStage("loading");
          const coreURL = chrome.runtime.getURL("ffmpeg-core.js");
          const wasmURL = chrome.runtime.getURL("ffmpeg-core.wasm");
          const classWorkerURL = chrome.runtime.getURL("ffmpeg-worker.js");
          await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });

          sendStage("writing");
          const concatLines: string[] = [];
          for (let i = 0; i < segments.length; i++) {
            const segName = `seg_${String(i).padStart(5, "0")}.ts`;
            // Segments arrive as number[] arrays (serialized from ArrayBuffer)
            const bytes = new Uint8Array(segments[i] as unknown as number[]);
            await ffmpeg.writeFile(segName, bytes);
            concatLines.push(`file '${segName}'`);
          }

          await ffmpeg.writeFile("list.txt", new TextEncoder().encode(concatLines.join("\n")));

          sendStage("remuxing");
          await ffmpeg.exec([
            "-f", "concat", "-safe", "0", "-i", "list.txt",
            "-c", "copy", "-movflags", "+faststart", "output.mp4",
          ]);

          sendStage("reading");
          const mp4Data = await ffmpeg.readFile("output.mp4");
          if (typeof mp4Data === "string") throw new Error("Unexpected string output");

          const filename = buildFilename(metadata.name, metadata.createdAt);

          // Cleanup ffmpeg FS
          for (let i = 0; i < segments.length; i++) {
            try { await ffmpeg.deleteFile(`seg_${String(i).padStart(5, "0")}.ts`); } catch {}
          }
          try { await ffmpeg.deleteFile("list.txt"); await ffmpeg.deleteFile("output.mp4"); } catch {}

          // Convert MP4 to base64 data URL (service worker will trigger download)
          // Can't use URL.createObjectURL cross-context, and offscreen has no downloads API
          const base64 = btoa(
            mp4Data.reduce((s: string, b: number) => s + String.fromCharCode(b), "")
          );
          const dataUrl = `data:video/mp4;base64,${base64}`;

          sendResponse({ success: true, filename, dataUrl });
        } finally {
          ffmpeg.terminate();
        }
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
      }
    })();

    return true; // async response
  }
);
