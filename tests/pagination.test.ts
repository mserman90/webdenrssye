import assert from 'node:assert';
import * as cheerio from 'cheerio';
import { resolveUrl } from '../src/scraper.ts';

console.log('--- Running Pagination Tests ---');

const paginatedHtml = `
<html>
<body>
  <div class="posts">
    <div class="item">Post 1</div>
  </div>
  <a class="next-page" href="/page/2">Next Page &rarr;</a>
</body>
</html>
`;

const $ = cheerio.load(paginatedHtml);
const nextHref = $('.next-page').attr('href');
assert.strictEqual(nextHref, '/page/2');

const nextUrl = resolveUrl(nextHref!, 'https://blog.example/page/1');
assert.strictEqual(nextUrl, 'https://blog.example/page/2');

console.log('✓ Pagination test passed successfully!');
