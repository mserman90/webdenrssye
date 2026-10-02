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

export type ScheduleMode = 'interval' | 'daily' | 'weekly' | 'custom_cron';

export interface ScheduleConfig {
  mode: ScheduleMode;
  intervalMinutes?: number; // For mode === 'interval' (e.g. 15, 30, 60, 120, 360, 720, 1440)
  dailyTimes?: string[]; // For mode === 'daily' (e.g. ["09:00", "14:30", "20:00"])
  weeklyDays?: number[]; // For mode === 'weekly' (0 = Sun, 1 = Mon, ..., 6 = Sat)
  weeklyTime?: string; // For mode === 'weekly' (e.g. "09:00")
  cronExpression?: string; // For mode === 'custom_cron' (e.g. "0 9,18 * * 1-5")
  timezone?: string; // e.g. "Europe/Istanbul"
}

export interface FeedConfig {
  id: string;
  name: string;
  description?: string;
  url: string;
  selectors: SelectorConfig;
  refreshIntervalMinutes: number; // backward compatibility fallback (minutes)
  schedule?: ScheduleConfig; // advanced flexible schedule
  nextScheduledAt?: string; // estimated next execution timestamp
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
