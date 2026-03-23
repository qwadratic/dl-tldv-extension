import { caesarDecipher } from "./caesar";
import type { TldvConf, ParsedPlaylist } from "./types";

/**
 * Parse the #TLDVCONF line from an m3u8 playlist.
 * Format: #TLDVCONF:{expiry},{offset},{baseUrl}
 */
export function parseTldvConf(line: string): TldvConf {
  const prefix = "#TLDVCONF:";
  if (!line.startsWith(prefix)) {
    throw new Error(`Invalid TLDVCONF line: ${line}`);
  }
  const rest = line.slice(prefix.length);
  // Split on first two commas only (baseUrl may contain commas, though unlikely)
  const firstComma = rest.indexOf(",");
  const secondComma = rest.indexOf(",", firstComma + 1);
  if (firstComma === -1 || secondComma === -1) {
    throw new Error(`Malformed TLDVCONF: ${line}`);
  }
  const expiry = rest.slice(0, firstComma);
  const offset = parseInt(rest.slice(firstComma + 1, secondComma), 10);
  const baseUrl = rest.slice(secondComma + 1);
  if (isNaN(offset)) {
    throw new Error(`Invalid offset in TLDVCONF: ${line}`);
  }
  return { expiry, offset, baseUrl };
}

/**
 * Parse an obfuscated m3u8 playlist from tldv.
 * - Finds #TLDVCONF header to get offset and baseUrl
 * - Deciphers each non-comment, non-empty line using Caesar cipher
 * - Prepends baseUrl to get full segment URLs
 */
export function parsePlaylist(m3u8Content: string): ParsedPlaylist {
  const lines = m3u8Content.split("\n");
  let conf: TldvConf | null = null;
  const segmentUrls: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Parse TLDVCONF header
    if (line.startsWith("#TLDVCONF:")) {
      conf = parseTldvConf(line);
      continue;
    }

    // Skip other comment/header lines
    if (line.startsWith("#")) continue;

    // This is an obfuscated segment path -- decipher and resolve
    if (!conf) {
      throw new Error("Segment line found before TLDVCONF header");
    }

    const deciphered = caesarDecipher(line, conf.offset);
    const fullUrl = conf.baseUrl + deciphered;
    segmentUrls.push(fullUrl);
  }

  if (!conf) {
    throw new Error("No TLDVCONF header found in playlist");
  }

  return { conf, segmentUrls };
}
