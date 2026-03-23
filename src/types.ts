// Shared types for dl-tldv extension
export interface DownloadMessage {
  type: "START_DOWNLOAD";
  meetingId: string;
}

export interface ProgressMessage {
  type: "DOWNLOAD_PROGRESS";
  current: number;
  total: number;
}

export interface ErrorMessage {
  type: "DOWNLOAD_ERROR";
  error: string;
}

export type ExtensionMessage = DownloadMessage | ProgressMessage | ErrorMessage;
