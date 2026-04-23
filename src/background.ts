import browser from "webextension-polyfill";
import { fetchMeetingMetadata, fetchPlaylist } from "./pipeline/api";
import { resolveAuthToken } from "./pipeline/auth";
import { parsePlaylist } from "./pipeline/playlist";
import type {
  ExtensionMessage,
  ProgressMessage,
  ErrorMessage,
  RemuxProgressMessage,
  RemuxCompleteMessage,
} from "./types";

let hasOffscreen = false;

async function ensureOffscreen(): Promise<void> {
  if (hasOffscreen) return;
  try {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WORKERS"],
      justification: "ffmpeg.wasm requires Web Workers for remuxing video",
    });
    hasOffscreen = true;
  } catch {
    // Already exists
    hasOffscreen = true;
  }
}

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
  preferredToken: string | null,
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
    // Step 0: Resolve Firebase auth token (prefer token forwarded from
    // content script; fall back to scripting-injection in an open tldv tab).
    const token = await resolveAuthToken(preferredToken);

    // Step 1: Fetch meeting metadata
    console.log(`[dl-tldv] Fetching metadata for meeting: ${meetingId}`);
    const metadata = await fetchMeetingMetadata(meetingId, token);
    console.log(
      `[dl-tldv] Meeting: "${metadata.name}" (${metadata.createdAt})`,
    );

    // Step 2: Fetch obfuscated playlist
    console.log("[dl-tldv] Fetching playlist...");
    const rawPlaylist = await fetchPlaylist(meetingId, token);

    // Step 3: Parse and decode playlist
    console.log("[dl-tldv] Parsing playlist...");
    const parsed = parsePlaylist(rawPlaylist);
    console.log(
      `[dl-tldv] Found ${parsed.segmentUrls.length} segments (offset=${parsed.conf.offset})`,
    );

    // Step 4+5: Offscreen document handles download + remux
    // (segments too large for message passing, offscreen fetches them directly)
    console.log("[dl-tldv] Handing off to offscreen document...");
    await ensureOffscreen();

    const remuxResult = await chrome.runtime.sendMessage({
      type: "REMUX_REQUEST",
      segmentUrls: parsed.segmentUrls,
      metadata: { name: metadata.name, createdAt: metadata.createdAt },
    }) as { success: boolean; blobUrl?: string; filename?: string; error?: string };

    if (!remuxResult.success || !remuxResult.filename || !remuxResult.blobUrl) {
      throw new Error(remuxResult.error || "Remux failed");
    }

    const { filename, blobUrl } = remuxResult;
    console.log(`[dl-tldv] Remux complete: ${filename}`);

    // Step 6: Trigger browser download (blob URL from offscreen is same origin)
    await browser.downloads.download({
      url: blobUrl,
      filename,
      saveAs: false,
    });

    console.log(`[dl-tldv] Download triggered: ${filename}`);

    // Signal completion to content script
    sendRemuxComplete(filename);
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown download error";
    console.error("[dl-tldv] Download failed:", errorMsg);
    sendError(errorMsg);
  }
}

// Track which tab initiated the download for forwarding remux stages
let activeDownloadTabId: number | null = null;

browser.runtime.onMessage.addListener(
  (rawMessage: unknown, sender: browser.Runtime.MessageSender) => {
    const message = rawMessage as {
      type: string;
      meetingId?: string;
      authToken?: string | null;
      stage?: string;
      current?: number;
      total?: number;
    };

    if (message.type === "START_DOWNLOAD" && message.meetingId) {
      const tabId = sender.tab?.id;
      if (!tabId) {
        console.error("[dl-tldv] No tab ID in sender");
        return;
      }
      activeDownloadTabId = tabId;
      handleDownload(message.meetingId, tabId, message.authToken ?? null);
    }

    // Forward remux stage from offscreen document to the active tab
    if (message.type === "REMUX_STAGE" && message.stage && activeDownloadTabId) {
      const msg: RemuxProgressMessage = {
        type: "REMUX_PROGRESS",
        stage: message.stage,
      };
      browser.tabs.sendMessage(activeDownloadTabId, msg);
    }

    // Forward download progress from offscreen document to the active tab
    if (message.type === "DOWNLOAD_PROGRESS_RELAY" && message.current != null && message.total != null && activeDownloadTabId) {
      const msg: ProgressMessage = {
        type: "DOWNLOAD_PROGRESS",
        current: message.current,
        total: message.total,
      };
      browser.tabs.sendMessage(activeDownloadTabId, msg);
    }

    return undefined;
  },
);
