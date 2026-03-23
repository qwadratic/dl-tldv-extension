import browser from "webextension-polyfill";
import type { DownloadMessage, ExtensionMessage } from "./types";

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

    const message: DownloadMessage = {
      type: "START_DOWNLOAD",
      meetingId,
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

function findCopyLinkButton(): HTMLElement | null {
  // Strategy 1: Look for button containing text "Copy link"
  const allButtons = document.querySelectorAll("button");
  for (const btn of allButtons) {
    if (btn.textContent?.trim().includes("Copy link")) {
      return btn as HTMLElement;
    }
  }
  // Strategy 2: Look for a share/copy button by common attributes
  const byTestId = document.querySelector('button[data-testid="copy-link"]');
  if (byTestId) return byTestId as HTMLElement;

  return null;
}

function injectButton(): void {
  // Don't inject if already present
  if (document.getElementById(BUTTON_ID)) return;

  // Only inject on meeting pages
  if (!isMeetingPage()) return;

  const copyLinkBtn = findCopyLinkButton();
  if (copyLinkBtn) {
    // Insert download button right after Copy link button
    const downloadBtn = createDownloadButton();
    copyLinkBtn.parentElement?.insertBefore(
      downloadBtn,
      copyLinkBtn.nextSibling,
    );
    console.log("[dl-tldv] Download button injected next to Copy link");
  } else {
    console.log(
      "[dl-tldv] Copy link button not found yet, will retry via observer",
    );
  }
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

  // Try immediate injection
  injectButton();

  // Watch for DOM changes (tldv is a SPA, elements load async)
  const observer = new MutationObserver(() => {
    if (isMeetingPage()) {
      if (!document.getElementById(BUTTON_ID)) {
        injectButton();
      }
    } else {
      removeButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also handle SPA navigation via URL changes
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

  if (message.type === "DOWNLOAD_PROGRESS") {
    if (message.total > 0) {
      const pct = Math.round((message.current / message.total) * 100);
      btn.querySelector("span")!.textContent =
        `${message.current}/${message.total} (${pct}%)`;
    }
  } else if (message.type === "DOWNLOAD_COMPLETE") {
    btn.disabled = false;
    btn.querySelector("span")!.textContent = "Done!";
    btn.title = `Downloaded ${message.segmentCount} segments for "${message.meetingName}"`;
    // Reset button text after 5 seconds
    setTimeout(() => {
      btn.querySelector("span")!.textContent = "Download";
      btn.title = "Download meeting recording as MP4";
    }, 5000);
  } else if (message.type === "DOWNLOAD_ERROR") {
    btn.disabled = false;
    btn.querySelector("span")!.textContent = "Error";
    btn.title = message.error;
  }
});

init();
