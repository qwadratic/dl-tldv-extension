import type { MeetingMetadata } from "./types";

const API_BASE = "https://gw.tldv.io/v1";
const PLAYLIST_BASE = "https://gaia.tldv.io/v1";

/**
 * Extract meeting ID from a tldv.io meeting URL.
 * URL format: https://tldv.io/app/meetings/{meeting_id}
 * The meeting_id is the last path segment.
 */
export function extractMeetingId(url: string): string | null {
  const match = url.match(/\/app\/meetings\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function buildAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch meeting metadata from tldv watch-page API.
 * GET https://gw.tldv.io/v1/meetings/{id}/watch-page?noTranscript=true
 *
 * Throws on HTTP error (401/403 = missing or invalid auth, 404 = unknown id).
 */
export async function fetchMeetingMetadata(
  meetingId: string,
  token: string | null,
): Promise<MeetingMetadata> {
  const url = `${API_BASE}/meetings/${meetingId}/watch-page?noTranscript=true`;

  const response = await fetch(url, {
    headers: {
      ...buildAuthHeaders(token),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Authentication required. Please log in to tldv.io first.",
      );
    }
    throw new Error(
      `Failed to fetch meeting metadata: HTTP ${response.status}`,
    );
  }

  const data = await response.json();

  return {
    id: meetingId,
    name: data.meeting?.name || "Untitled Meeting",
    createdAt: data.meeting?.createdAt || new Date().toISOString(),
    videoSourceUrl: data.video?.source || "",
  };
}

/**
 * Fetch the raw obfuscated m3u8 playlist for a meeting.
 * GET https://gaia.tldv.io/v1/meetings/{id}/playlist.m3u8
 *
 * Returns the raw m3u8 text content (including #TLDVCONF header).
 * Auth headers are included for private meetings.
 */
export async function fetchPlaylist(
  meetingId: string,
  token: string | null,
): Promise<string> {
  const url = `${PLAYLIST_BASE}/meetings/${meetingId}/playlist.m3u8`;

  const response = await fetch(url, {
    headers: { ...buildAuthHeaders(token) },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: HTTP ${response.status}`);
  }

  return response.text();
}
