import assert from 'node:assert';
import { extractItemsFromHtml, resolveUrl } from '../src/scraper.ts';
import { generateRss20Xml } from '../src/rss.ts';
import type { FeedConfig } from '../src/types.ts';

console.log('--- Running Scraper & RSS Tests ---');

const sampleHtml = `
<!DOCTYPE html>
<html>
<head><title>Test News Portal</title></head>
<body>
  <div class="articles-list">
    <article class="news-card">
      <h2 class="card-title"><a href="/news/tech-breakthrough">Tech Breakthrough in 2026</a></h2>
      <p class="summary">Exciting advancements in robotics and AI hardware.</p>
      <time datetime="2026-09-30T12:00:00Z">Sep 30, 2026</time>
      <span class="author">Alice Smith</span>
      <img src="/images/tech.jpg" alt="tech" />
    </article>
    <article class="news-card">
      <h2 class="card-title"><a href="/news/green-energy">Green Energy Milestones</a></h2>
      <p class="summary">Solar and wind reach new efficiency records worldwide.</p>
      <time datetime="2026-09-29T10:00:00Z">Sep 29, 2026</time>
      <span class="author">Bob Jones</span>
      <img src="/images/energy.jpg" alt="energy" />
    </article>
  </div>
</body>
</html>
`;

// Test selector extraction
const items = extractItemsFromHtml(
  sampleHtml,
  'https://newsportal.example',
  {
    itemContainer: 'article.news-card',
    title: '.card-title a',
    link: '.card-title a',
    description: '.summary',
    date: 'time',
    author: '.author',
    image: 'img',
  }
);

assert.strictEqual(items.length, 2, 'Should extract 2 items');
assert.strictEqual(items[0].title, 'Tech Breakthrough in 2026');
assert.strictEqual(items[0].link, 'https://newsportal.example/news/tech-breakthrough');
assert.strictEqual(items[0].description, 'Exciting advancements in robotics and AI hardware.');
assert.strictEqual(items[0].author, 'Alice Smith');
assert.strictEqual(items[0].imageUrl, 'https://newsportal.example/images/tech.jpg');

assert.strictEqual(items[1].title, 'Green Energy Milestones');
assert.strictEqual(items[1].link, 'https://newsportal.example/news/green-energy');

// Test URL resolution
const resolved = resolveUrl('/test/path', 'https://example.com/base/');
assert.strictEqual(resolved, 'https://example.com/test/path');

// Test RSS generation
const testFeed: FeedConfig = {
  id: 'test-feed',
  name: 'Test Feed',
  description: 'Test Description',
  url: 'https://newsportal.example',
  selectors: { itemContainer: 'article', title: 'h2 a', link: 'h2 a' },
  refreshIntervalMinutes: 60,
  isActive: true,
  itemCount: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const xml = generateRss20Xml(testFeed, items);
assert.ok(xml.includes('<rss version="2.0"'), 'XML must include RSS version 2.0 tag');
assert.ok(xml.includes('<title>Tech Breakthrough in 2026</title>'), 'XML must include item title');
assert.ok(xml.includes('https://newsportal.example/news/tech-breakthrough'), 'XML must include item link');

console.log('✓ Scraper and RSS tests passed successfully!');
