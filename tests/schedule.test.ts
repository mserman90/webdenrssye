import assert from 'node:assert';
import {
  calculateNextRun,
  isFeedDueForScrape,
  formatScheduleSummary,
  formatNextRunRelative
} from '../src/scheduleUtils.ts';
import type { FeedConfig } from '../src/types.ts';

console.log('--- Running Advanced Schedule Tests ---');

// Test 1: Interval Mode
const intervalFeed: FeedConfig = {
  id: 'test-interval',
  name: 'Test Interval Feed',
  url: 'https://example.com',
  selectors: { itemContainer: 'div', title: 'a', link: 'a' },
  refreshIntervalMinutes: 30,
  schedule: {
    mode: 'interval',
    intervalMinutes: 30,
  },
  isActive: true,
  itemCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const now = new Date('2026-10-01T12:00:00Z');
// Never scraped -> due immediately
assert.strictEqual(isFeedDueForScrape(intervalFeed, now), true, 'Never scraped feed should be due');

// Scraped 10 mins ago -> not due
intervalFeed.lastScrapedAt = new Date('2026-10-01T11:50:00Z').toISOString();
assert.strictEqual(isFeedDueForScrape(intervalFeed, now), false, 'Scraped 10m ago with 30m interval should not be due');

// Scraped 35 mins ago -> due
intervalFeed.lastScrapedAt = new Date('2026-10-01T11:25:00Z').toISOString();
assert.strictEqual(isFeedDueForScrape(intervalFeed, now), true, 'Scraped 35m ago with 30m interval should be due');

// Test 2: Daily Mode
const dailyFeed: FeedConfig = {
  id: 'test-daily',
  name: 'Test Daily Feed',
  url: 'https://example.com',
  selectors: { itemContainer: 'div', title: 'a', link: 'a' },
  refreshIntervalMinutes: 60,
  schedule: {
    mode: 'daily',
    dailyTimes: ['09:00', '18:00'],
  },
  isActive: true,
  itemCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const morning = new Date(2026, 9, 1, 9, 5, 0); // 09:05 local time
dailyFeed.lastScrapedAt = new Date(2026, 9, 1, 8, 30, 0).toISOString(); // scraped at 08:30 before 09:00 slot
assert.strictEqual(isFeedDueForScrape(dailyFeed, morning), true, 'Daily feed at 09:05 should be due for 09:00 slot if last scraped 08:30');

dailyFeed.lastScrapedAt = new Date(2026, 9, 1, 9, 2, 0).toISOString(); // already scraped for 09:00 slot
assert.strictEqual(isFeedDueForScrape(dailyFeed, morning), false, 'Daily feed should not be due if already scraped after 09:00 slot');

// Test 3: Weekly Mode
const weeklyFeed: FeedConfig = {
  id: 'test-weekly',
  name: 'Test Weekly Feed',
  url: 'https://example.com',
  selectors: { itemContainer: 'div', title: 'a', link: 'a' },
  refreshIntervalMinutes: 60,
  schedule: {
    mode: 'weekly',
    weeklyDays: [1, 5], // Monday and Friday
    weeklyTime: '10:00',
  },
  isActive: true,
  itemCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Check summary formatting
const summaryTr = formatScheduleSummary(weeklyFeed.schedule, 60, 'tr');
assert(summaryTr.includes('Pazartesi') && summaryTr.includes('Cuma'), 'Weekly summary should contain day names in TR');

const dailySummaryTr = formatScheduleSummary(dailyFeed.schedule, 60, 'tr');
assert(dailySummaryTr.includes('09:00, 18:00'), 'Daily summary should list times in TR');

// Test 4: Next run calculation
const nextRun = calculateNextRun(dailyFeed, new Date(2026, 9, 1, 10, 0, 0));
assert.strictEqual(nextRun.getHours(), 18, 'Next run after 10:00 should be the 18:00 slot');
assert.strictEqual(nextRun.getMinutes(), 0, 'Next run minutes should be 0');

console.log('✓ All Advanced Schedule Tests passed successfully!');
