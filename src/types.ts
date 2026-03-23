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

export interface CompleteMessage {
  type: "DOWNLOAD_COMPLETE";
  meetingName: string;
  meetingDate: string;
  segmentCount: number;
}

export interface ErrorMessage {
  type: "DOWNLOAD_ERROR";
  error: string;
}

export type ExtensionMessage =
  | DownloadMessage
  | ProgressMessage
  | CompleteMessage
  | ErrorMessage;
