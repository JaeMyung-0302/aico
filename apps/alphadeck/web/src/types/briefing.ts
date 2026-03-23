export interface BriefingLog {
  id: number;
  content: BriefingContent;
  sentVia: string | null;
  createdAt: string;
}

export interface BriefingContent {
  userId: number;
  date: string;
  items: BriefingItem[];
}

export interface BriefingItem {
  symbol: string;
  score: number;
  interpretation: string;
  rsi14?: number;
  macdHistogram?: number;
}
