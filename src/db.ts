import type { FeedConfig, FeedItem, ScrapeLog } from './types.ts';

// In-memory persistent database store
class MemoryDatabase {
  private feeds: Map<string, FeedConfig> = new Map();
  private items: Map<string, FeedItem[]> = new Map(); // feedId -> items
  private logs: ScrapeLog[] = [];

  constructor() {
    this.seedDefaultFeeds();
  }

  private seedDefaultFeeds() {
    const seedFeeds: FeedConfig[] = [
      {
        id: 'tarim-orman-sygm',
        name: 'T.C. Tarım ve Orman Bakanlığı (SYGM Haber Arşivi)',
        description: 'Su Yönetimi Genel Müdürlüğü güncel haber ve duyuruları',
        url: 'https://www.tarimorman.gov.tr/SYGM/HaberArsivi',
        selectors: {
          itemContainer: '.arsivdt-container',
          title: 'h4.card-title a',
          link: 'h4.card-title a',
          date: '.post_details',
          image: 'img.card-img-top',
          author: '',
          description: '',
        },
        refreshIntervalMinutes: 60,
        isActive: true,
        itemCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const feed of seedFeeds) {
      this.feeds.set(feed.id, feed);
      this.items.set(feed.id, []);
    }
  }

  getAllFeeds(): FeedConfig[] {
    return Array.from(this.feeds.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getFeedById(id: string): FeedConfig | undefined {
    return this.feeds.get(id);
  }

  saveFeed(feed: FeedConfig): FeedConfig {
    const existing = this.feeds.get(feed.id);
    const updated: FeedConfig = {
      ...feed,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.feeds.set(feed.id, updated);
    if (!this.items.has(feed.id)) {
      this.items.set(feed.id, []);
    }
    return updated;
  }

  deleteFeed(id: string): boolean {
    const deleted = this.feeds.delete(id);
    this.items.delete(id);
    this.logs = this.logs.filter((l) => l.feedId !== id);
    return deleted;
  }

  getFeedItems(feedId: string): FeedItem[] {
    return this.items.get(feedId) || [];
  }

  saveFeedItems(feedId: string, newItems: FeedItem[]) {
    const existing = this.items.get(feedId) || [];
    // Merge by guid or link to prevent duplicate entries
    const seen = new Set<string>();
    const merged: FeedItem[] = [];

    // Add new items first
    for (const item of newItems) {
      const key = item.guid || item.link || item.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    // Keep older unique items up to 100
    for (const item of existing) {
      const key = item.guid || item.link || item.id;
      if (!seen.has(key) && merged.length < 100) {
        seen.add(key);
        merged.push(item);
      }
    }

    this.items.set(feedId, merged);

    // Update feed stats
    const feed = this.feeds.get(feedId);
    if (feed) {
      feed.itemCount = merged.length;
      feed.lastScrapedAt = new Date().toISOString();
      feed.lastScrapedStatus = 'success';
      delete feed.lastErrorMessage;
      this.feeds.set(feedId, feed);
    }
  }

  setFeedError(feedId: string, errorMessage: string) {
    const feed = this.feeds.get(feedId);
    if (feed) {
      feed.lastScrapedAt = new Date().toISOString();
      feed.lastScrapedStatus = 'error';
      feed.lastErrorMessage = errorMessage;
      this.feeds.set(feedId, feed);
    }
  }

  setFeedStatus(feedId: string, status: 'success' | 'error' | 'scraping') {
    const feed = this.feeds.get(feedId);
    if (feed) {
      feed.lastScrapedStatus = status;
      this.feeds.set(feedId, feed);
    }
  }

  addLog(log: ScrapeLog) {
    this.logs.unshift(log);
    if (this.logs.length > 200) {
      this.logs.pop();
    }
  }

  getLogs(limit = 50): ScrapeLog[] {
    return this.logs.slice(0, limit);
  }

  getStats() {
    let totalItems = 0;
    for (const items of this.items.values()) {
      totalItems += items.length;
    }
    return {
      totalFeeds: this.feeds.size,
      activeFeeds: Array.from(this.feeds.values()).filter((f) => f.isActive).length,
      totalItems,
      totalLogs: this.logs.length,
      uptimeSeconds: process.uptime(),
    };
  }
}

export const db = new MemoryDatabase();
