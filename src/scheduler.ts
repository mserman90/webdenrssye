import { db } from './db.ts';
import { scrapeWithPagination } from './scraper.ts';
import type { FeedConfig } from './types.ts';

class ScraperScheduler {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(intervalMs = 60000) {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => this.tick(), intervalMs);
    // Initial scrape on startup for seed feeds after 3 seconds
    setTimeout(() => this.scrapeAllActiveFeeds(), 3000);
  }

  stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private async tick() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const feeds = db.getAllFeeds().filter((f) => f.isActive);
      const now = Date.now();

      for (const feed of feeds) {
        const lastScrapedTime = feed.lastScrapedAt ? new Date(feed.lastScrapedAt).getTime() : 0;
        const intervalMs = (feed.refreshIntervalMinutes || 60) * 60 * 1000;

        if (now - lastScrapedTime >= intervalMs) {
          await this.scrapeFeed(feed);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error during tick:', err);
    } finally {
      this.isRunning = false;
    }
  }

  async scrapeFeed(feed: FeedConfig): Promise<{ success: boolean; itemCount: number; error?: string }> {
    const startTime = Date.now();
    db.setFeedStatus(feed.id, 'scraping');

    try {
      const maxPages = feed.maxPages || 1;
      const maxItems = feed.maxItems || 40;
      const result = await scrapeWithPagination(
        feed.url,
        feed.selectors,
        maxPages,
        maxItems,
        feed.customHeaders
      );

      db.saveFeedItems(feed.id, result.items);
      const durationMs = Date.now() - startTime;

      db.addLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        feedId: feed.id,
        feedName: feed.name,
        timestamp: new Date().toISOString(),
        durationMs,
        itemsFound: result.items.length,
        status: 'success',
      });

      return { success: true, itemCount: result.items.length };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      db.setFeedError(feed.id, errorMessage);
      const durationMs = Date.now() - startTime;

      db.addLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        feedId: feed.id,
        feedName: feed.name,
        timestamp: new Date().toISOString(),
        durationMs,
        itemsFound: 0,
        status: 'error',
        errorMessage,
      });

      return { success: false, itemCount: 0, error: errorMessage };
    }
  }

  async scrapeFeedNow(feedId: string) {
    const feed = db.getFeedById(feedId);
    if (!feed) {
      throw new Error(`Feed not found with id: ${feedId}`);
    }
    return this.scrapeFeed(feed);
  }

  async scrapeAllActiveFeeds() {
    const feeds = db.getAllFeeds().filter((f) => f.isActive);
    for (const feed of feeds) {
      await this.scrapeFeed(feed);
    }
  }
}

export const scheduler = new ScraperScheduler();
