import browser from "webextension-polyfill";
import { fetchMeetingMetadata, fetchPlaylist } from "./pipeline/api";
import { parsePlaylist } from "./pipeline/playlist";
import { downloadSegments } from "./pipeline/downloader";
import type {
  ExtensionMessage,
  ProgressMessage,
  CompleteMessage,
  ErrorMessage,
} from "./types";
import type { MeetingMetadata } from "./pipeline/types";

// Store downloaded segments in memory for Phase 3 remuxing
let lastDownloadResult: {
  segments: ArrayBuffer[];
  metadata: MeetingMetadata;
} | null = null;

browser.runtime.onInstalled.addListener(() => {
  console.log("[dl-tldv] Extension installed");
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

  const sendComplete = (metadata: MeetingMetadata, segmentCount: number) => {
    const msg: CompleteMessage = {
      type: "DOWNLOAD_COMPLETE",
      meetingName: metadata.name,
      meetingDate: metadata.createdAt,
      segmentCount,
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

    // Store for Phase 3 remuxing
    lastDownloadResult = {
      segments: result.segments,
      metadata,
    };

    // Step 5: Signal completion
    sendComplete(metadata, result.segments.length);
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
