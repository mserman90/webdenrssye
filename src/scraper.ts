import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { FeedItem, SelectorConfig, DetectionResult } from './types.ts';
import { fetchWebPage } from './fetcher.ts';

export function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    if (!relativeUrl) return baseUrl;
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
}

export function parseItemDate(rawDateStr: string): string {
  if (!rawDateStr) return new Date().toUTCString();

  const trimmed = rawDateStr.trim();
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    return new Date(parsed).toUTCString();
  }

  // Common relative formats like "3 hours ago", "5 days ago", "2 gün önce", "1 saat önce"
  const now = Date.now();
  const hoursMatch = trimmed.match(/(\d+)\s*(hour|saat|hr)/i);
  if (hoursMatch) {
    return new Date(now - parseInt(hoursMatch[1], 10) * 3600 * 1000).toUTCString();
  }
  const minsMatch = trimmed.match(/(\d+)\s*(minute|dakika|min|dk)/i);
  if (minsMatch) {
    return new Date(now - parseInt(minsMatch[1], 10) * 60 * 1000).toUTCString();
  }
  const daysMatch = trimmed.match(/(\d+)\s*(day|gün|d)/i);
  if (daysMatch) {
    return new Date(now - parseInt(daysMatch[1], 10) * 86400 * 1000).toUTCString();
  }

  return new Date().toUTCString();
}

export function extractItemsFromHtml(
  html: string,
  baseUrl: string,
  selectors: SelectorConfig,
  maxItems = 30
): FeedItem[] {
  const $ = cheerio.load(html);
  const items: FeedItem[] = [];

  const containerSelector = selectors.itemContainer.trim();
  if (!containerSelector) {
    return items;
  }

  const containerElements = $(containerSelector);

  containerElements.each((index, el) => {
    if (items.length >= maxItems) return false;

    const $item = $(el);

    // Title
    let title = '';
    if (selectors.title) {
      const $title = $item.find(selectors.title);
      title = ($title.attr('title') || $title.text()).trim();
    }
    if (!title && selectors.title === '') {
      title = $item.find('h1, h2, h3, h4, .title, a').first().text().trim();
    }

    // Link
    let rawLink = '';
    if (selectors.link) {
      const $link = $item.find(selectors.link);
      rawLink = $link.attr('href') || '';
    } else {
      rawLink = $item.find('a[href]').first().attr('href') || '';
    }
    const link = resolveUrl(rawLink, baseUrl);

    // Skip items without title or valid link
    if (!title && !rawLink) return;
    if (!title) title = `Item #${index + 1}`;

    // Description / Summary
    let description = '';
    if (selectors.description) {
      description = $item.find(selectors.description).text().trim();
    } else {
      description = $item.find('p, .summary, .description, .excerpt').first().text().trim();
    }

    // Date
    let pubDate = '';
    if (selectors.date) {
      const $date = $item.find(selectors.date);
      const dateVal = $date.attr('datetime') || $date.attr('data-date') || $date.text();
      pubDate = parseItemDate(dateVal);
    } else {
      const $time = $item.find('time, .date, [datetime]');
      const dateVal = $time.attr('datetime') || $time.text();
      pubDate = parseItemDate(dateVal);
    }

    // Author
    let author = '';
    if (selectors.author) {
      author = $item.find(selectors.author).text().trim();
    }

    // Category
    let category = '';
    if (selectors.category) {
      category = $item.find(selectors.category).text().trim();
    }

    // Image / Thumbnail
    let imageUrl = '';
    if (selectors.image) {
      const $img = $item.find(selectors.image);
      const rawImg = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset') || '';
      imageUrl = resolveUrl(rawImg.split(' ')[0], baseUrl);
    } else {
      const $img = $item.find('img').first();
      const rawImg = $img.attr('src') || $img.attr('data-src') || '';
      if (rawImg && !rawImg.startsWith('data:')) {
        imageUrl = resolveUrl(rawImg, baseUrl);
      }
    }

    const guid = link || `${baseUrl}#item-${index}-${Date.now()}`;
    const id = `item-${Math.abs(hashString(guid))}`;

    items.push({
      id,
      title,
      link,
      description,
      pubDate,
      author,
      category,
      imageUrl,
      guid,
    });
  });

  return items;
}

export async function scrapeWithPagination(
  startUrl: string,
  selectors: SelectorConfig,
  maxPages = 1,
  maxItems = 50,
  headers?: Record<string, string>
): Promise<{ items: FeedItem[]; pagesVisited: number }> {
  let currentUrl = startUrl;
  let pagesVisited = 0;
  const allItems: FeedItem[] = [];
  const visitedUrls = new Set<string>();

  while (currentUrl && pagesVisited < maxPages && allItems.length < maxItems) {
    if (visitedUrls.has(currentUrl)) break;
    visitedUrls.add(currentUrl);

    const result = await fetchWebPage(currentUrl, { headers });
    pagesVisited++;

    const pageItems = extractItemsFromHtml(result.html, currentUrl, selectors, maxItems - allItems.length);
    allItems.push(...pageItems);

    if (selectors.pagination && pagesVisited < maxPages) {
      const $ = cheerio.load(result.html);
      const nextLink = $(selectors.pagination).attr('href');
      if (nextLink) {
        currentUrl = resolveUrl(nextLink, currentUrl);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return { items: allItems, pagesVisited };
}

/**
 * Auto-detect repeating article/list containers and extract best candidate selectors
 */
export function autoDetectSelectors(html: string, baseUrl: string): DetectionResult {
  const $ = cheerio.load(html);
  const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || 'Feed';

  const candidateContainers = [
    'tr.athing',
    'table.itemlist tr.athing',
    'article',
    '.post',
    '.article',
    '.entry',
    '.news-item',
    '.item',
    '.card',
    '.feed-item',
    '.blog-post',
    'li.post',
    'div[class*="post"]',
    'div[class*="article"]',
    'div[class*="item"]',
    'div[class*="card"]',
    'main li',
    'ul.posts > li',
  ];

  let bestContainer = '';
  let bestCount = 0;

  for (const selector of candidateContainers) {
    try {
      const count = $(selector).length;
      if (count >= 3 && count <= 100) {
        // Evaluate if containers have links and headings
        let hasTitles = 0;
        let hasLinks = 0;
        $(selector).each((_, el) => {
          if ($(el).find('h1, h2, h3, h4, .title, a').length > 0) hasTitles++;
          if ($(el).find('a[href]').length > 0) hasLinks++;
        });

        if (hasTitles >= 2 && hasLinks >= 2) {
          bestContainer = selector;
          bestCount = count;
          break;
        }
      }
    } catch {
      // ignore invalid selector in test list
    }
  }

  // Fallback: search for elements with high repetition containing <a> and <h3> or <h2>
  if (!bestContainer) {
    const parentMap = new Map<string, number>();
    $('h2, h3, h4').each((_, el) => {
      const parent = $(el).closest('div, li, article, section');
      const className = parent.attr('class');
      const tag = parent.prop('tagName')?.toLowerCase() || 'div';
      const key = className ? `${tag}.${className.trim().split(/\s+/)[0]}` : tag;
      parentMap.set(key, (parentMap.get(key) || 0) + 1);
    });

    for (const [key, count] of parentMap.entries()) {
      if (count >= 3 && key !== 'div') {
        bestContainer = key;
        bestCount = count;
        break;
      }
    }
  }

  if (!bestContainer) {
    bestContainer = 'article, .post, .item';
  }

  // Discover child selectors within best container
  const $sampleContainer = $(bestContainer).first();
  let titleSelector = 'h2, h3, h1, .title, a';
  let linkSelector = 'a[href]';
  let descSelector = 'p, .description, .excerpt, .summary';
  let dateSelector = 'time, .date, [datetime]';
  let imageSelector = 'img';

  if ($sampleContainer.length) {
    if ($sampleContainer.find('.titleline a').length) {
      titleSelector = '.titleline a';
      linkSelector = '.titleline a';
    } else if ($sampleContainer.find('h2 a').length) {
      titleSelector = 'h2 a';
      linkSelector = 'h2 a';
    } else if ($sampleContainer.find('h3 a').length) {
      titleSelector = 'h3 a';
      linkSelector = 'h3 a';
    } else if ($sampleContainer.find('h2').length) {
      titleSelector = 'h2';
    } else if ($sampleContainer.find('h3').length) {
      titleSelector = 'h3';
    }

    if ($sampleContainer.find('.date, .time, time').length) {
      dateSelector = $sampleContainer.find('time').length ? 'time' : '.date';
    }
    if ($sampleContainer.find('p').length) {
      descSelector = 'p';
    }
  }

  const detectedSelectors: SelectorConfig = {
    itemContainer: bestContainer,
    title: titleSelector,
    link: linkSelector,
    description: descSelector,
    date: dateSelector,
    image: imageSelector,
  };

  const sampleItems = extractItemsFromHtml(html, baseUrl, detectedSelectors, 10);

  return {
    url: baseUrl,
    pageTitle,
    detectedSelectors,
    itemCount: sampleItems.length,
    sampleItems,
    confidence: sampleItems.length > 0 ? (sampleItems.length >= 3 ? 92 : 65) : 20,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
