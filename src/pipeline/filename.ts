/**
 * Sanitize a meeting name for use in a filename.
 * - Replace any character that is not alphanumeric, dash, underscore, or space with empty string
 * - Replace spaces with underscores
 * - Collapse multiple underscores into one
 * - Trim leading/trailing underscores
 * - Truncate to 100 characters
 * - Default to "Untitled" if empty
 */
export function sanitizeName(name: string): string {
  if (!name || !name.trim()) return "Untitled";
  let sanitized = name
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!sanitized) return "Untitled";
  if (sanitized.length > 100) sanitized = sanitized.slice(0, 100);
  return sanitized;
}

/**
 * Build the output filename for a downloaded meeting recording.
 * Format: {YYYY-MM-DD}_{sanitized-meeting-name}.mp4
 *
 * @param meetingName - Raw meeting name from tldv metadata
 * @param createdAt - ISO date string from tldv metadata
 * @returns Filename string like "2025-06-15_Team_Standup.mp4"
 */
export function buildFilename(meetingName: string, createdAt: string): string {
  let datePrefix: string;
  try {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) throw new Error("Invalid date");
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    datePrefix = `${year}-${month}-${day}`;
  } catch {
    datePrefix = "unknown-date";
  }
  const name = sanitizeName(meetingName);
  return `${datePrefix}_${name}.mp4`;
}
