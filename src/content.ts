import browser from "webextension-polyfill";
import type { DownloadMessage, ExtensionMessage } from "./types";
import { readTokenFromPageCookie } from "./pipeline/auth";

const MEETING_URL_PATTERN =
  /^https:\/\/(app\.)?tldv\.io\/app\/meetings\/([a-zA-Z0-9]+)/;
const BUTTON_ID = "dl-tldv-download-btn";

// SVG download icon (arrow-down-to-tray)
const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

function isMeetingPage(): boolean {
  return MEETING_URL_PATTERN.test(window.location.href);
}

function getMeetingId(): string | null {
  const match = window.location.href.match(MEETING_URL_PATTERN);
  return match ? match[2] : null;
}

function createDownloadButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.className = "dl-tldv-btn";
  btn.innerHTML = `${DOWNLOAD_ICON} <span>Download</span>`;
  btn.title = "Download meeting recording as MP4";

  btn.addEventListener("click", async () => {
    const meetingId = getMeetingId();
    if (!meetingId) return;

    btn.disabled = true;
    btn.querySelector("span")!.textContent = "Starting...";

    const authToken = readTokenFromPageCookie();
    const message: DownloadMessage = {
      type: "START_DOWNLOAD",
      meetingId,
      authToken,
    };

    try {
      await browser.runtime.sendMessage(message);
    } catch (err) {
      console.error("[dl-tldv] Failed to send download message:", err);
      btn.disabled = false;
      btn.querySelector("span")!.textContent = "Download";
    }
  });

  return btn;
}

function injectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;
  if (!isMeetingPage()) return;

  const downloadBtn = createDownloadButton();
  downloadBtn.classList.add("dl-tldv-btn--fixed");
  document.body.appendChild(downloadBtn);
  console.log("[dl-tldv] Download button injected (fixed position)");
}

function removeButton(): void {
  const existing = document.getElementById(BUTTON_ID);
  if (existing) {
    existing.remove();
    console.log("[dl-tldv] Download button removed (not a meeting page)");
  }
}

// Main: observe DOM for Copy link button appearance (SPA navigation)
function init(): void {
  console.log("[dl-tldv] Content script loaded on:", window.location.href);

  if (!isMeetingPage()) {
    console.log("[dl-tldv] Not a meeting page, skipping injection");
    return;
  }

  injectButton();

  // Handle SPA navigation via URL changes
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (isMeetingPage()) {
        // Small delay to let SPA render
        setTimeout(() => injectButton(), 500);
      } else {
        removeButton();
      }
    }
  });

  urlObserver.observe(document, {
    childList: true,
    subtree: true,
  });
}

// Listen for progress/error messages from background
browser.runtime.onMessage.addListener((rawMessage: unknown) => {
  const message = rawMessage as ExtensionMessage;
  const btn = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (!btn) return;
  const span = btn.querySelector("span");
  if (!span) return;

  switch (message.type) {
    case "DOWNLOAD_PROGRESS":
      if (message.total > 0) {
        const pct = Math.round((message.current / message.total) * 100);
        span.textContent = `${pct}%`;
      }
      break;

    case "REMUX_PROGRESS": {
      // Map internal stage names to user-friendly labels
      const stageLabels: Record<string, string> = {
        loading: "Loading ffmpeg...",
        writing: "Writing segments...",
        remuxing: "Remuxing to MP4...",
        reading: "Finalizing...",
      };
      span.textContent = stageLabels[message.stage] || `Remuxing (${message.stage})...`;
      break;
    }

    case "REMUX_COMPLETE":
      btn.disabled = false;
      span.textContent = "Downloaded!";
      btn.title = `Saved as ${message.filename}`;
      // Reset button after 8 seconds
      setTimeout(() => {
        span.textContent = "Download";
        btn.title = "Download meeting recording as MP4";
      }, 8000);
      break;

    case "DOWNLOAD_ERROR":
      btn.disabled = false;
      span.textContent = "Error";
      btn.title = message.error;
      // Allow retry after 5 seconds
      setTimeout(() => {
        span.textContent = "Retry";
        btn.title = "Click to retry download";
      }, 5000);
      break;
  }
});

init();
