import assert from 'node:assert';
import { db } from '../src/db.ts';

console.log('--- Running Health & DB Tests ---');

const stats = db.getStats();
assert.ok(stats.totalFeeds >= 1, 'Default seed feeds should be loaded');
assert.strictEqual(typeof stats.uptimeSeconds, 'number');

const feeds = db.getAllFeeds();
assert.ok(feeds.some((f) => f.id === 'tarim-orman-sygm'), 'Tarım ve Orman feed should exist');

console.log('✓ Health and DB tests passed successfully!');
