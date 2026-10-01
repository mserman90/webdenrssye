import assert from 'node:assert';
import { isSafeUrl } from '../src/security.ts';

console.log('--- Running Security / SSRF Tests ---');

// Safe URLs
const safe1 = isSafeUrl('https://example.com/blog');
assert.strictEqual(safe1.safe, true, 'https://example.com should be safe');

const safe2 = isSafeUrl('https://news.ycombinator.com');
assert.strictEqual(safe2.safe, true, 'Hacker News should be safe');

// Unsafe URLs (SSRF Protection)
const unsafeLocal = isSafeUrl('http://localhost:8080/admin');
assert.strictEqual(unsafeLocal.safe, false, 'localhost should be blocked');

const unsafe127 = isSafeUrl('http://127.0.0.1:3000');
assert.strictEqual(unsafe127.safe, false, '127.0.0.1 should be blocked');

const unsafe10 = isSafeUrl('http://10.0.0.15/secret');
assert.strictEqual(unsafe10.safe, false, '10.x.x.x private network should be blocked');

const unsafe192 = isSafeUrl('http://192.168.1.1');
assert.strictEqual(unsafe192.safe, false, '192.168.x.x private network should be blocked');

const unsafeMetadata = isSafeUrl('http://169.254.169.254/computeMetadata/v1/');
assert.strictEqual(unsafeMetadata.safe, false, 'Cloud metadata IP should be blocked');

const unsafeProtocol = isSafeUrl('file:///etc/passwd');
assert.strictEqual(unsafeProtocol.safe, false, 'file: protocol must be blocked');

console.log('✓ All 8 Security / SSRF tests passed successfully!');
