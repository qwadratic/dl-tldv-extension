import browser from "webextension-polyfill";

const COOKIE_NAME = "tldvtoken";

/**
 * Parse `tldvtoken` from a `document.cookie`-style string.
 * Returns null if not present.
 */
function parseTldvCookie(cookieString: string): string | null {
  const pairs = cookieString.split(/;\s*/);
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq) === COOKIE_NAME) {
      const value = pair.slice(eq + 1);
      return value.length > 0 ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

/**
 * Read the tldv auth token from the current document's cookies.
 * Intended to run in a content/page context (NOT the service worker).
 */
export function readTokenFromPageCookie(): string | null {
  try {
    return parseTldvCookie(document.cookie);
  } catch {
    return null;
  }
}

/**
 * Fallback: ask any open tldv.io tab for its document.cookie via
 * chrome.scripting.executeScript injected into MAIN world.
 */
async function readTokenViaScriptingInjection(): Promise<string | null> {
  try {
    const tabs = await browser.tabs.query({ url: "https://*.tldv.io/*" });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: (name: string) => {
            const pairs = document.cookie.split(/;\s*/);
            for (const p of pairs) {
              const eq = p.indexOf("=");
              if (eq === -1) continue;
              if (p.slice(0, eq) === name) {
                const v = p.slice(eq + 1);
                return v.length > 0 ? decodeURIComponent(v) : null;
              }
            }
            return null;
          },
          args: [COOKIE_NAME],
        });
        const token = results[0]?.result;
        if (typeof token === "string" && token.length > 0) {
          return token;
        }
      } catch (err) {
        console.warn("[dl-tldv] executeScript on tab failed:", err);
      }
    }
  } catch (err) {
    console.warn("[dl-tldv] Could not query tldv tabs for token:", err);
  }
  return null;
}

/**
 * Resolve the tldv auth token in the service worker.
 *
 * Resolution order:
 *   1. `preferred` — token forwarded from the content script (page cookie).
 *   2. chrome.scripting injection into an open tldv.io tab to read its cookies.
 */
export async function resolveAuthToken(
  preferred?: string | null,
): Promise<string | null> {
  if (typeof preferred === "string" && preferred.length > 0) {
    console.log("[dl-tldv] Using token from content script");
    return preferred;
  }

  const fromScripting = await readTokenViaScriptingInjection();
  if (fromScripting) {
    console.log("[dl-tldv] Using token from scripting fallback");
    return fromScripting;
  }

  console.warn("[dl-tldv] No tldv auth token available");
  return null;
}
