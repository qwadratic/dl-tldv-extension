import { FFmpeg } from "@ffmpeg/ffmpeg";
import { buildFilename } from "./filename";
import type { MeetingMetadata } from "./types";

export type RemuxStageCallback = (stage: string) => void;

/**
 * Remux an array of .ts segment ArrayBuffers into a single MP4 file.
 * Uses ffmpeg.wasm with stream copy (-c copy) — no re-encoding.
 *
 * Flow:
 * 1. Load ffmpeg.wasm core (single-threaded, no SharedArrayBuffer needed)
 * 2. Write each segment to ffmpeg virtual filesystem as seg_NNNN.ts
 * 3. Create a concat list file referencing all segments in order
 * 4. Run: ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
 * 5. Read output.mp4 from virtual filesystem
 * 6. Clean up virtual filesystem
 * 7. Return the MP4 data and generated filename
 *
 * Memory note: Segments are written to ffmpeg FS one at a time and the
 * source ArrayBuffer reference is released after writing. The ffmpeg FS
 * holds its own copy. For very large recordings, the JS heap holds the
 * output MP4 + ffmpeg's internal copy. This is acceptable for typical
 * recordings (< 2GB).
 *
 * @param segments - Ordered array of .ts segment ArrayBuffers
 * @param metadata - Meeting metadata for filename generation
 * @param onStage - Optional callback for UI progress reporting
 * @returns Object with mp4Data (Uint8Array) and filename (string)
 */
export async function remuxSegments(
  segments: ArrayBuffer[],
  metadata: MeetingMetadata,
  onStage?: RemuxStageCallback
): Promise<{ mp4Data: Uint8Array; filename: string }> {
  const ffmpeg = new FFmpeg();

  try {
    // Step 1: Load ffmpeg.wasm core
    onStage?.("loading");
    // Load from extension's bundled files
    const coreURL = chrome.runtime.getURL("ffmpeg-core.js");
    const wasmURL = chrome.runtime.getURL("ffmpeg-core.wasm");
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    // Step 2: Write segments to virtual filesystem progressively
    onStage?.("writing");
    const concatLines: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segName = `seg_${String(i).padStart(5, "0")}.ts`;
      await ffmpeg.writeFile(segName, new Uint8Array(segments[i]));
      concatLines.push(`file '${segName}'`);
    }

    // Step 3: Create concat list file
    const concatList = concatLines.join("\n");
    await ffmpeg.writeFile(
      "list.txt",
      new TextEncoder().encode(concatList)
    );

    // Step 4: Run remux — stream copy, no re-encoding
    onStage?.("remuxing");
    await ffmpeg.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "list.txt",
      "-c", "copy",
      "-movflags", "+faststart",
      "output.mp4",
    ]);

    // Step 5: Read output MP4
    onStage?.("reading");
    const mp4Data = await ffmpeg.readFile("output.mp4");

    // Ensure we got a Uint8Array (not a string)
    if (typeof mp4Data === "string") {
      throw new Error("Unexpected string output from ffmpeg readFile");
    }

    // Step 6: Generate filename
    const filename = buildFilename(metadata.name, metadata.createdAt);

    // Step 7: Clean up virtual filesystem
    for (let i = 0; i < segments.length; i++) {
      const segName = `seg_${String(i).padStart(5, "0")}.ts`;
      try {
        await ffmpeg.deleteFile(segName);
      } catch {
        // Ignore cleanup errors
      }
    }
    try {
      await ffmpeg.deleteFile("list.txt");
      await ffmpeg.deleteFile("output.mp4");
    } catch {
      // Ignore cleanup errors
    }

    return { mp4Data, filename };
  } finally {
    // Terminate ffmpeg instance to free WASM memory
    ffmpeg.terminate();
  }
}
