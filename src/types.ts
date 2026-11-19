export interface Work {
  id?: string;
  slug: string;
  title: string;
  text: string;
  date: string;
  tags: string[];
  youtube: string;
  tiktok: string;
}

export interface SavedPlayerState {
  src: string;
  title?: string;
  time: number;
  paused: boolean;
}
