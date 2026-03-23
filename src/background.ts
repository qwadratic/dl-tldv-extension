import browser from "webextension-polyfill";
import { fetchMeetingMetadata, fetchPlaylist } from "./pipeline/api";
import { parsePlaylist } from "./pipeline/playlist";
import { downloadSegments } from "./pipeline/downloader";
import { remuxSegments } from "./pipeline/remux";
import type {
  ExtensionMessage,
  ProgressMessage,
  ErrorMessage,
  RemuxProgressMessage,
  RemuxCompleteMessage,
} from "./types";
import type { MeetingMetadata } from "./pipeline/types";

browser.runtime.onInstalled.addListener(async () => {
  console.log("[dl-tldv] Extension installed");

  // Inject content script into already-open tldv tabs
  try {
    const tabs = await browser.tabs.query({ url: "https://*.tldv.io/*" });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
        await browser.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["styles.css"],
        });
        console.log(`[dl-tldv] Injected into existing tab ${tab.id}: ${tab.url}`);
      } catch (err) {
        console.warn(`[dl-tldv] Could not inject into tab ${tab.id}:`, err);
      }
    }
  } catch (err) {
    console.warn("[dl-tldv] Could not query tabs:", err);
  }
});

async function handleDownload(
  meetingId: string,
  senderTabId: number,
): Promise<void> {
  const sendProgress = (current: number, total: number) => {
    const msg: ProgressMessage = {
      type: "DOWNLOAD_PROGRESS",
      current,
      total,
    };
    browser.tabs.sendMessage(senderTabId, msg);
  };

  const sendError = (error: string) => {
    const msg: ErrorMessage = {
      type: "DOWNLOAD_ERROR",
      error,
    };
    browser.tabs.sendMessage(senderTabId, msg);
  };

  const sendRemuxProgress = (stage: string) => {
    const msg: RemuxProgressMessage = {
      type: "REMUX_PROGRESS",
      stage,
    };
    browser.tabs.sendMessage(senderTabId, msg);
  };

  const sendRemuxComplete = (filename: string) => {
    const msg: RemuxCompleteMessage = {
      type: "REMUX_COMPLETE",
      filename,
    };
    browser.tabs.sendMessage(senderTabId, msg);
  };

  try {
    // Step 1: Fetch meeting metadata
    console.log(`[dl-tldv] Fetching metadata for meeting: ${meetingId}`);
    const metadata = await fetchMeetingMetadata(meetingId);
    console.log(
      `[dl-tldv] Meeting: "${metadata.name}" (${metadata.createdAt})`,
    );

    // Step 2: Fetch obfuscated playlist
    console.log("[dl-tldv] Fetching playlist...");
    const rawPlaylist = await fetchPlaylist(meetingId);

    // Step 3: Parse and decode playlist
    console.log("[dl-tldv] Parsing playlist...");
    const parsed = parsePlaylist(rawPlaylist);
    console.log(
      `[dl-tldv] Found ${parsed.segmentUrls.length} segments (offset=${parsed.conf.offset})`,
    );

    // Send initial progress (0 of N)
    sendProgress(0, parsed.segmentUrls.length);

    // Step 4: Download all segments
    console.log("[dl-tldv] Downloading segments...");
    const result = await downloadSegments(parsed.segmentUrls, sendProgress);
    console.log(
      `[dl-tldv] Download complete: ${result.segments.length} segments, ${(result.totalBytes / 1024 / 1024).toFixed(1)} MB`,
    );

    // Step 5: Remux segments into MP4
    console.log("[dl-tldv] Starting remux...");
    const { mp4Data, filename } = await remuxSegments(
      result.segments,
      metadata,
      sendRemuxProgress,
    );
    console.log(
      `[dl-tldv] Remux complete: ${filename} (${(mp4Data.byteLength / 1024 / 1024).toFixed(1)} MB)`,
    );

    // Free segment memory now that remux is done
    result.segments.length = 0;

    // Step 6: Trigger browser download
    const blob = new Blob([mp4Data.buffer as ArrayBuffer], { type: "video/mp4" });
    const blobUrl = URL.createObjectURL(blob);

    await browser.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: false,
    });

    console.log(`[dl-tldv] Download triggered: ${filename}`);

    // Clean up blob URL after a delay (browser needs time to start the download)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

    // Step 7: Signal completion to content script
    sendRemuxComplete(filename);
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown download error";
    console.error("[dl-tldv] Download failed:", errorMsg);
    sendError(errorMsg);
  }
}

browser.runtime.onMessage.addListener(
  (rawMessage: unknown, sender: browser.Runtime.MessageSender) => {
    const message = rawMessage as ExtensionMessage;
    if (message.type === "START_DOWNLOAD") {
      const tabId = sender.tab?.id;
      if (!tabId) {
        console.error("[dl-tldv] No tab ID in sender");
        return;
      }
      // Fire and forget — progress sent via tabs.sendMessage
      handleDownload(message.meetingId, tabId);
    }
    return undefined;
  },
);
