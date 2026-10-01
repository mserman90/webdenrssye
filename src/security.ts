/**
 * Security and SSRF Protection Module
 * Prevents server-side request forgery by blocking private IP ranges,
 * cloud metadata endpoints, internal services, and dangerous protocols.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  '169.254.169.254',
  'metadata.azure.internal',
  'internal',
  'local',
]);

export function isSafeUrl(rawUrl: string): { safe: boolean; reason?: string; url?: URL } {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { safe: false, reason: 'URL cannot be empty' };
    }

    let urlToParse = rawUrl.trim();
    if (!/^https?:\/\//i.test(urlToParse)) {
      urlToParse = `https://${urlToParse}`;
    }

    const parsed = new URL(urlToParse);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Invalid protocol '${parsed.protocol}'. Only http: and https: are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked exact hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { safe: false, reason: `Access to internal host '${hostname}' is restricted.` };
    }

    // Block private IPv4 ranges:
    // 10.0.0.0 - 10.255.255.255
    // 172.16.0.0 - 172.31.255.255
    // 192.168.0.0 - 192.168.255.255
    // 127.0.0.0 - 127.255.255.255 (loopback)
    // 169.254.0.0 - 169.254.255.255 (link-local)
    // 0.0.0.0 - 0.255.255.255
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const [, o1, o2] = ipMatch.map(Number);
      if (o1 === 10) return { safe: false, reason: 'Access to private 10.0.0.0/8 range is restricted.' };
      if (o1 === 127) return { safe: false, reason: 'Access to loopback range is restricted.' };
      if (o1 === 169 && o2 === 254) return { safe: false, reason: 'Access to link-local/cloud metadata is restricted.' };
      if (o1 === 192 && o2 === 168) return { safe: false, reason: 'Access to private 192.168.0.0/16 is restricted.' };
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return { safe: false, reason: 'Access to private 172.16.0.0/12 is restricted.' };
      if (o1 === 0) return { safe: false, reason: 'Access to 0.0.0.0/8 is restricted.' };
    }

    // Block internal suffixes
    if (
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.corp') ||
      hostname.endsWith('.lan')
    ) {
      return { safe: false, reason: `Internal domain '${hostname}' is restricted.` };
    }

    return { safe: true, url: parsed };
  } catch (err) {
    return { safe: false, reason: `Malformed URL: ${err instanceof Error ? err.message : String(err)}` };
  }
}
