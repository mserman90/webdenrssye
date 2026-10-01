/**
 * Browser Rendering and Emulation Helper
 * Extracts structured data, meta tags, and provides fallback emulation.
 */

import * as cheerio from 'cheerio';

export interface PageMetadata {
  title: string;
  description: string;
  ogImage?: string;
  canonicalUrl?: string;
  isClientRendered: boolean;
}

export function extractPageMetadata(html: string, pageUrl: string): PageMetadata {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text().trim() ||
    new URL(pageUrl).hostname;

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    '';

  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');

  const canonicalUrl =
    $('link[rel="canonical"]').attr('href') ||
    $('meta[property="og:url"]').attr('content');

  // Detect if the page likely relies on client-side JS (like empty root div)
  const bodyText = $('body').text().trim();
  const scriptTags = $('script').length;
  const hasAppRoot = $('#root, #app, #__next, [data-reactroot]').length > 0;
  const isClientRendered = hasAppRoot && bodyText.length < 200 && scriptTags > 0;

  return {
    title,
    description,
    ogImage,
    canonicalUrl,
    isClientRendered,
  };
}
