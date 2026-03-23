import browser from "webextension-polyfill";

// Service worker entry point
// Phase 2 will add download pipeline logic here
browser.runtime.onInstalled.addListener(() => {
  console.log("[dl-tldv] Extension installed");
});

browser.runtime.onMessage.addListener((message: unknown, sender: browser.Runtime.MessageSender) => {
  console.log("[dl-tldv] Message received:", message);
  // Phase 2: handle START_DOWNLOAD messages
  return undefined;
});
