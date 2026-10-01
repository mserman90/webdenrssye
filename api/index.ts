import express, { Request, Response } from 'express';
import { db } from '../src/db.ts';
import { scheduler } from '../src/scheduler.ts';
import { extractItemsFromHtml, autoDetectSelectors } from '../src/scraper.ts';
import { fetchWebPage } from '../src/fetcher.ts';
import { generateRss20Xml, generateOpmlXml } from '../src/rss.ts';
import { isSafeUrl } from '../src/security.ts';
import { authMiddleware } from '../src/auth.ts';
import type { FeedConfig } from '../src/types.ts';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    name: 'webdenrssye',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/stats', (_req: Request, res: Response) => {
  res.json(db.getStats());
});

app.get('/api/feeds', (_req: Request, res: Response) => {
  res.json(db.getAllFeeds());
});

app.get('/api/feeds/:id', (req: Request, res: Response) => {
  const feed = db.getFeedById(req.params.id);
  if (!feed) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }
  const items = db.getFeedItems(feed.id);
  res.json({ feed, items });
});

app.post('/api/feeds', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      url,
      selectors,
      refreshIntervalMinutes = 60,
      customHeaders,
      userAgent,
      maxItems = 30,
      maxPages = 1,
      isActive = true,
      scrapeNow = true,
    } = req.body;

    if (!name || !url || !selectors?.itemContainer) {
      res.status(400).json({ error: 'Name, target URL, and itemContainer selector are required.' });
      return;
    }

    const check = isSafeUrl(url);
    if (!check.safe) {
      res.status(400).json({ error: `Unsafe target URL: ${check.reason}` });
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || `feed-${Date.now()}`;

    const feedId = req.body.id || `${slug}-${Math.random().toString(36).substring(2, 6)}`;

    const feedConfig: FeedConfig = {
      id: feedId,
      name,
      description: description || '',
      url,
      selectors: {
        itemContainer: selectors.itemContainer,
        title: selectors.title || '',
        link: selectors.link || '',
        description: selectors.description || '',
        date: selectors.date || '',
        author: selectors.author || '',
        category: selectors.category || '',
        image: selectors.image || '',
        pagination: selectors.pagination || '',
      },
      refreshIntervalMinutes: Math.max(5, parseInt(String(refreshIntervalMinutes), 10) || 60),
      customHeaders,
      userAgent,
      maxItems,
      maxPages,
      isActive,
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.saveFeed(feedConfig);

    if (scrapeNow) {
      scheduler.scrapeFeed(saved).catch((e) => console.error('Initial scrape error:', e));
    }

    res.status(201).json(saved);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/feeds/:id', authMiddleware, (req: Request, res: Response) => {
  const existing = db.getFeedById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }

  const updated = db.saveFeed({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });

  res.json(updated);
});

app.delete('/api/feeds/:id', authMiddleware, (req: Request, res: Response) => {
  const deleted = db.deleteFeed(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }
  res.json({ success: true, id: req.params.id });
});

app.post('/api/feeds/:id/refresh', async (req: Request, res: Response) => {
  try {
    const result = await scheduler.scrapeFeedNow(req.params.id);
    const feed = db.getFeedById(req.params.id);
    const items = db.getFeedItems(req.params.id);
    res.json({ result, feed, items });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/preview', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { url, selectors, customHeaders } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: 'Target URL is required' });
      return;
    }

    const check = isSafeUrl(url);
    if (!check.safe) {
      res.status(400).json({ success: false, error: `Invalid URL: ${check.reason}` });
      return;
    }

    const fetchResult = await fetchWebPage(url, { headers: customHeaders });
    const items = extractItemsFromHtml(fetchResult.html, url, selectors || { itemContainer: 'article', title: 'h2 a', link: 'h2 a' }, 20);

    const mockFeed: FeedConfig = {
      id: 'preview',
      name: 'Preview Feed',
      url,
      selectors,
      refreshIntervalMinutes: 60,
      isActive: true,
      itemCount: items.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const rssXml = generateRss20Xml(mockFeed, items);
    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      url,
      status: fetchResult.status,
      items,
      itemCount: items.length,
      rssXml,
      durationMs,
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    });
  }
});

app.post('/api/detect', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const check = isSafeUrl(url);
    if (!check.safe) {
      res.status(400).json({ error: check.reason });
      return;
    }

    const fetchResult = await fetchWebPage(url);
    const detection = autoDetectSelectors(fetchResult.html, url);

    res.json(detection);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get(['/rss/:id.xml', '/rss/:id'], (req: Request, res: Response) => {
  const id = req.params.id.replace(/\.xml$/, '');
  const feed = db.getFeedById(id);

  if (!feed) {
    res.status(404).send('Feed not found');
    return;
  }

  const items = db.getFeedItems(feed.id);
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const selfUrl = `${protocol}://${host}/rss/${feed.id}.xml`;

  const xml = generateRss20Xml(feed, items, selfUrl);

  res.set('Content-Type', 'application/rss+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300');
  res.send(xml);
});

app.get('/opml.xml', (req: Request, res: Response) => {
  const feeds = db.getAllFeeds();
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const appUrl = `${protocol}://${host}`;

  const opml = generateOpmlXml(feeds, appUrl);

  res.set('Content-Type', 'text/x-opml; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="webdenrssye-feeds.opml"');
  res.send(opml);
});

app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

export default app;
