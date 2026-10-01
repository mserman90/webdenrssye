import { isSafeUrl } from './security.ts';
import { getDefaultHeaders } from './proxy.ts';

export interface FetchOptions {
  headers?: Record<string, string>;
  userAgent?: string;
  timeoutMs?: number;
  maxRedirects?: number;
}

export interface FetchResult {
  url: string;
  status: number;
  statusText: string;
  html: string;
  contentType: string;
  durationMs: number;
}

export async function fetchWebPage(targetUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
  const check = isSafeUrl(targetUrl);
  if (!check.safe || !check.url) {
    throw new Error(`Security validation blocked URL: ${check.reason || 'Invalid URL'}`);
  }

  const timeoutMs = options.timeoutMs ?? 15000;
  const headers = getDefaultHeaders(options.headers, options.userAgent);
  const startTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(check.url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timer);

    const finalUrl = response.url || targetUrl;
    const finalCheck = isSafeUrl(finalUrl);
    if (!finalCheck.safe) {
      throw new Error(`Redirected to unsafe location: ${finalCheck.reason}`);
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    
    // Read response buffer to handle character encodings (e.g., ISO-8859-9 / Windows-1254 common in Turkish sites)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let html = '';
    // Check if charset is specified in content-type
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    const charset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : '';

    if (charset === 'iso-8859-9' || charset === 'windows-1254') {
      try {
        const decoder = new TextDecoder('windows-1254');
        html = decoder.decode(buffer);
      } catch {
        html = buffer.toString('utf-8');
      }
    } else {
      html = buffer.toString('utf-8');
      // If HTML specifies <meta charset="windows-1254"> or similar in the first 1KB
      const headChunk = html.slice(0, 1500);
      const metaCharset = headChunk.match(/<meta[^>]+charset=["']?([^"'>/]+)/i);
      if (metaCharset && (metaCharset[1].toLowerCase().includes('1254') || metaCharset[1].toLowerCase().includes('8859-9'))) {
        try {
          const decoder = new TextDecoder('windows-1254');
          html = decoder.decode(buffer);
        } catch {
          // keep utf-8
        }
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      url: finalUrl,
      status: response.status,
      statusText: response.statusText,
      html,
      contentType,
      durationMs,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${targetUrl}`);
    }
    throw err;
  }
}
