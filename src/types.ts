export interface FeedItem {
  id: string;
  title: string;
  link: string;
  description?: string;
  pubDate: string; // ISO or RFC 822 string
  author?: string;
  category?: string;
  imageUrl?: string;
  guid?: string;
}

export interface SelectorConfig {
  itemContainer: string;
  title: string;
  link: string;
  description?: string;
  date?: string;
  author?: string;
  category?: string;
  image?: string;
  pagination?: string;
}

export interface FeedConfig {
  id: string;
  name: string;
  description?: string;
  url: string;
  selectors: SelectorConfig;
  refreshIntervalMinutes: number; // e.g. 30, 60, 120
  customHeaders?: Record<string, string>;
  userAgent?: string;
  maxItems?: number;
  maxPages?: number;
  useProxy?: boolean;
  isActive: boolean;
  lastScrapedAt?: string;
  lastScrapedStatus?: 'success' | 'error' | 'scraping';
  lastErrorMessage?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeLog {
  id: string;
  feedId: string;
  feedName: string;
  timestamp: string;
  durationMs: number;
  itemsFound: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface PreviewRequest {
  url: string;
  selectors: SelectorConfig;
  maxPages?: number;
  customHeaders?: Record<string, string>;
}

export interface PreviewResponse {
  success: boolean;
  url: string;
  pageTitle?: string;
  items: FeedItem[];
  rssXml?: string;
  durationMs: number;
  error?: string;
}

export interface DetectionResult {
  url: string;
  pageTitle: string;
  detectedSelectors: SelectorConfig;
  itemCount: number;
  sampleItems: FeedItem[];
  confidence: number;
}
