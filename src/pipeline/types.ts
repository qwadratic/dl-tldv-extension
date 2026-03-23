export interface MeetingMetadata {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  videoSourceUrl: string; // m3u8 URL from video.source
}

export interface TldvConf {
  expiry: string;
  offset: number;
  baseUrl: string;
}

export interface ParsedPlaylist {
  conf: TldvConf;
  segmentUrls: string[]; // Fully resolved, deciphered segment URLs
}
