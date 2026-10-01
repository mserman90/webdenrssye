import type { FeedConfig, FeedItem } from './types.ts';

export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatRfc822Date(dateInput?: string | Date): string {
  if (!dateInput) return new Date().toUTCString();
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export function generateRss20Xml(feed: FeedConfig, items: FeedItem[], selfUrl?: string): string {
  const channelTitle = escapeXml(feed.name);
  const channelLink = escapeXml(feed.url);
  const channelDescription = escapeXml(feed.description || `Generated RSS feed for ${feed.url} via Web'den RSS'ye`);
  const lastBuildDate = formatRfc822Date(feed.lastScrapedAt || new Date().toISOString());

  const itemsXml = items
    .map((item) => {
      const itemTitle = escapeXml(item.title);
      const itemLink = escapeXml(item.link);
      const itemDesc = item.description ? `<description><![CDATA[${item.description}]]></description>` : '';
      const itemPubDate = formatRfc822Date(item.pubDate);
      const itemGuid = escapeXml(item.guid || item.link);
      const itemAuthor = item.author ? `<author>${escapeXml(item.author)}</author>` : '';
      const itemCategory = item.category ? `<category>${escapeXml(item.category)}</category>` : '';
      
      let enclosureTag = '';
      if (item.imageUrl) {
        enclosureTag = `<enclosure url="${escapeXml(item.imageUrl)}" length="0" type="image/jpeg" />`;
      }

      return `    <item>
      <title>${itemTitle}</title>
      <link>${itemLink}</link>
      <guid isPermaLink="true">${itemGuid}</guid>
      <pubDate>${itemPubDate}</pubDate>
      ${itemAuthor}
      ${itemCategory}
      ${itemDesc}
      ${enclosureTag}
    </item>`;
    })
    .join('\n');

  const atomSelf = selfUrl
    ? `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${channelTitle}</title>
    <link>${channelLink}</link>
    <description>${channelDescription}</description>
    <language>tr</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Web'den RSS'ye (Web-to-RSS Engine)</generator>
${atomSelf}
${itemsXml}
  </channel>
</rss>`;
}

export function generateOpmlXml(feeds: FeedConfig[], appUrl: string): string {
  const outlines = feeds
    .map((feed) => {
      const title = escapeXml(feed.name);
      const xmlUrl = escapeXml(`${appUrl}/rss/${feed.id}.xml`);
      const htmlUrl = escapeXml(feed.url);
      return `    <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" />`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Web'den RSS'ye Feeds Export</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
}
