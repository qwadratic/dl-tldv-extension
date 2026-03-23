/**
 * Download all .ts segments from decoded URLs.
 * Uses a concurrency limit to avoid overwhelming the browser/server.
 * Calls onProgress after each segment completes.
 */

export interface DownloadResult {
  segments: ArrayBuffer[];
  totalBytes: number;
}

export type ProgressCallback = (current: number, total: number) => void;

const CONCURRENCY_LIMIT = 6; // Match browser's per-host connection limit

export async function downloadSegments(
  segmentUrls: string[],
  onProgress: ProgressCallback,
): Promise<DownloadResult> {
  const total = segmentUrls.length;
  const segments: (ArrayBuffer | null)[] = new Array(total).fill(null);
  let completed = 0;
  let totalBytes = 0;

  // Process segments in batches for controlled concurrency
  const queue = segmentUrls.map((url, index) => ({ url, index }));
  const workers: Promise<void>[] = [];

  for (let w = 0; w < Math.min(CONCURRENCY_LIMIT, queue.length); w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;

          const response = await fetch(item.url);
          if (!response.ok) {
            throw new Error(
              `Failed to download segment ${item.index}: HTTP ${response.status}`,
            );
          }

          const buffer = await response.arrayBuffer();
          segments[item.index] = buffer;
          totalBytes += buffer.byteLength;
          completed++;
          onProgress(completed, total);
        }
      })(),
    );
  }

  await Promise.all(workers);

  // Verify all segments downloaded
  const missing = segments.findIndex((s) => s === null);
  if (missing !== -1) {
    throw new Error(`Segment ${missing} failed to download`);
  }

  return {
    segments: segments as ArrayBuffer[],
    totalBytes,
  };
}
