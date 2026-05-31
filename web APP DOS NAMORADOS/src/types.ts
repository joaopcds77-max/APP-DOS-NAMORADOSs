export interface SurpresaData {
  id?: string;
  partner1: string;
  partner2: string;
  startDate: string; // ISO datetime-local string
  musicTitle: string;
  musicArtist: string;
  musicPreviewUrl?: string; // Real audio preview URL / video ID from YouTube
  musicCoverUrl?: string; // Album cover URL from YouTube
  history: string;
  photos: string[]; // URLs or base64 data URLs
  declaracao_ia?: string;
  createdAt: string;
}
