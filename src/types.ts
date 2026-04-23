// Shared types for dl-tldv extension
export interface DownloadMessage {
  type: "START_DOWNLOAD";
  meetingId: string;
  authToken?: string | null;
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

export interface RemuxProgressMessage {
  type: "REMUX_PROGRESS";
  stage: string; // "loading" | "writing" | "remuxing" | "reading"
}

export interface RemuxCompleteMessage {
  type: "REMUX_COMPLETE";
  filename: string;
}

export type ExtensionMessage =
  | DownloadMessage
  | ProgressMessage
  | CompleteMessage
  | ErrorMessage
  | RemuxProgressMessage
  | RemuxCompleteMessage;
