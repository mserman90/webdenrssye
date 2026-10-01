import React, { useState, useEffect } from 'react';
import {
  Rss,
  Plus,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Edit3,
  Eye,
  Code,
  Globe,
  Shield,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  Sparkles,
  Search,
  ArrowRight,
  X,
  Play,
  Settings,
  Layers,
  FileText,
  Calendar,
  User,
  Radio,
  Share2
} from 'lucide-react';
import type { FeedConfig, FeedItem, SelectorConfig, DetectionResult } from './types.ts';

// Pre-configured templates for common website types
const PRESETS = [
  {
    name: 'T.C. Tarım ve Orman Bakanlığı (SYGM Haber Arşivi)',
    url: 'https://www.tarimorman.gov.tr/SYGM/HaberArsivi',
    selectors: {
      itemContainer: '.arsivdt-container',
      title: 'h4.card-title a',
      link: 'h4.card-title a',
      description: '',
      date: '.post_details',
      author: 'Su Yönetimi Genel Müdürlüğü',
      image: 'img.card-img-top',
    },
    interval: 60,
  },
  {
    name: 'Hacker News (Y Combinator)',
    url: 'https://news.ycombinator.com',
    selectors: {
      itemContainer: 'table.itemlist tr.athing',
      title: '.titleline > a',
      link: '.titleline > a',
      description: '',
      date: '',
      author: '',
    },
    interval: 30,
  },
  {
    name: 'GitHub Blog & Changelog',
    url: 'https://github.blog',
    selectors: {
      itemContainer: 'article.post-item, .grid-cols-1 article, article',
      title: 'h3, h2',
      link: 'a[href*="/20"]',
      description: 'p',
      date: 'time',
      image: 'img',
    },
    interval: 60,
  },
  {
    name: 'Genel Blog & Haber (Generic Article)',
    url: 'https://example.com/blog',
    selectors: {
      itemContainer: 'article, .post-card, .entry, .news-item',
      title: 'h2 a, h3 a, h2, h3',
      link: 'h2 a, h3 a, a.read-more, a',
      description: 'p.excerpt, p.summary, p',
      date: 'time, .date, .published',
      image: 'img.featured, img',
    },
    interval: 60,
  },
  {
    name: 'E-Ticaret / İndirimler (Products/Deals)',
    url: 'https://example.com/deals',
    selectors: {
      itemContainer: '.product-card, .deal-item, .item-box',
      title: '.product-title, h3',
      link: 'a.product-link, a',
      description: '.price, .deal-desc',
      image: 'img.product-thumb, img',
    },
    interval: 120,
  },
];

export default function App() {
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [activeTab, setActiveTab] = useState<'feeds' | 'wizard' | 'discover' | 'docs'>('feeds');
  
  // Feeds state
  const [feeds, setFeeds] = useState<FeedConfig[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [refreshingFeedId, setRefreshingFeedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reader Modal
  const [viewingFeed, setViewingFeed] = useState<FeedConfig | null>(null);
  const [viewingItems, setViewingItems] = useState<FeedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Edit / Create Wizard State
  const [isEditing, setIsEditing] = useState(false);
  const [feedForm, setFeedForm] = useState({
    id: '',
    name: '',
    url: '',
    description: '',
    refreshIntervalMinutes: 60,
    selectors: {
      itemContainer: 'article',
      title: 'h2 a',
      link: 'h2 a',
      description: 'p',
      date: 'time',
      author: '',
      category: '',
      image: 'img',
      pagination: '',
    } as SelectorConfig,
    customHeaders: '',
    userAgent: '',
    maxItems: 30,
    maxPages: 1,
  });

  // Preview & Live Test State
  const [testingPreview, setTestingPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    items: FeedItem[];
    rssXml?: string;
    durationMs: number;
    error?: string;
  } | null>(null);
  const [previewTab, setPreviewTab] = useState<'cards' | 'xml'>('cards');

  // Auto-Discover State
  const [discoverUrl, setDiscoverUrl] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DetectionResult | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Health / Stats State
  const [stats, setStats] = useState<{
    totalFeeds: number;
    activeFeeds: number;
    totalItems: number;
    uptimeSeconds: number;
  } | null>(null);

  // Notification Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Safe JSON fetcher that will never throw "Unexpected token < or T ... is not valid JSON"
  const safeJsonFetch = async <T,>(
    url: string,
    options?: RequestInit
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            error: json.error || json.message || `Server error (${res.status})`,
          };
        }
        return { ok: true, status: res.status, data: json as T };
      } else {
        const text = await res.text();
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        const msg = cleanText.slice(0, 150) || `Request failed (${res.status} ${res.statusText})`;
        return { ok: false, status: res.status, error: msg };
      }
    } catch (err: unknown) {
      return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const t = {
    appName: lang === 'tr' ? "Web'den RSS'ye" : "Web-to-RSS",
    appTagline: lang === 'tr' ? "Herhangi bir web sitesini canlı RSS 2.0 akışına dönüştürün" : "Turn any website into a clean, live RSS 2.0 feed",
    tabFeeds: lang === 'tr' ? "Akışlarım" : "My Feeds",
    tabWizard: lang === 'tr' ? "Akış Oluşturucu" : "Feed Builder",
    tabDiscover: lang === 'tr' ? "Otomatik Keşif" : "Auto-Discovery",
    tabDocs: lang === 'tr' ? "Rehber & API" : "Docs & API",
    newFeed: lang === 'tr' ? "Yeni Akış Ekle" : "Create New Feed",
    exportOpml: lang === 'tr' ? "OPML İndir" : "Export OPML",
    statusHealthy: lang === 'tr' ? "Sistem Aktif" : "System Healthy",
    activeFeeds: lang === 'tr' ? "Aktif Akış" : "Active Feeds",
    totalItemsScraped: lang === 'tr' ? "İçerik Öğesi" : "Total Articles",
    uptime: lang === 'tr' ? "Çalışma Süresi" : "Uptime",
    refreshNow: lang === 'tr' ? "Şimdi Yenile" : "Refresh Now",
    copyRssUrl: lang === 'tr' ? "RSS Bağlantısını Kopyala" : "Copy RSS Link",
    copied: lang === 'tr' ? "Kopyalandı!" : "Copied!",
    viewArticles: lang === 'tr' ? "Öğeleri Görüntüle" : "View Items",
    deleteFeed: lang === 'tr' ? "Sil" : "Delete",
    editFeed: lang === 'tr' ? "Düzenle" : "Edit",
    emptyFeeds: lang === 'tr' ? "Henüz kayıtlı akış yok. Yeni bir akış oluşturarak başlayın." : "No feeds configured yet. Create a new feed to get started.",
  };

  // Fetch Feeds on Load
  useEffect(() => {
    fetchFeeds();
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchFeeds = async () => {
    setLoadingFeeds(true);
    try {
      const res = await safeJsonFetch<FeedConfig[]>('/api/feeds');
      if (res.ok && Array.isArray(res.data)) {
        setFeeds(res.data);
      } else {
        setFeeds([]);
      }
    } catch {
      showBanner('error', lang === 'tr' ? 'Akışlar yüklenemedi' : 'Failed to load feeds');
    } finally {
      setLoadingFeeds(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await safeJsonFetch<{
        totalFeeds: number;
        activeFeeds: number;
        totalItems: number;
        uptimeSeconds: number;
      }>('/api/stats');
      if (res.ok && res.data) {
        setStats(res.data);
      }
    } catch {
      // ignore
    }
  };

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  const handleCopyRss = (feedId: string) => {
    const url = `${window.location.origin}/rss/${feedId}.xml`;
    navigator.clipboard.writeText(url);
    setCopiedId(feedId);
    showBanner('success', lang === 'tr' ? 'RSS URL panoya kopyalandı!' : 'RSS URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRefreshFeed = async (feedId: string) => {
    setRefreshingFeedId(feedId);
    try {
      const res = await safeJsonFetch<{ result?: { itemCount: number }; error?: string }>(
        `/api/feeds/${feedId}/refresh`,
        { method: 'POST' }
      );
      if (res.ok) {
        showBanner(
          'success',
          lang === 'tr'
            ? `Akış güncellendi (${res.data?.result?.itemCount || 0} öğe)`
            : `Feed refreshed (${res.data?.result?.itemCount || 0} items)`
        );
        fetchFeeds();
        fetchStats();
      } else {
        showBanner('error', res.error || 'Refresh failed');
      }
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Error refreshing feed');
    } finally {
      setRefreshingFeedId(null);
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm(lang === 'tr' ? 'Bu akışı silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this feed?')) {
      return;
    }
    try {
      const res = await safeJsonFetch(`/api/feeds/${feedId}`, { method: 'DELETE' });
      if (res.ok) {
        showBanner('success', lang === 'tr' ? 'Akış başarıyla silindi' : 'Feed deleted successfully');
        fetchFeeds();
        fetchStats();
      } else {
        showBanner('error', res.error || 'Delete failed');
      }
    } catch {
      showBanner('error', 'Delete failed');
    }
  };

  const handleOpenReader = async (feed: FeedConfig) => {
    setViewingFeed(feed);
    setLoadingItems(true);
    try {
      const res = await safeJsonFetch<{ feed: FeedConfig; items: FeedItem[] }>(`/api/feeds/${feed.id}`);
      if (res.ok && res.data) {
        setViewingItems(res.data.items || []);
      } else {
        setViewingItems([]);
      }
    } catch {
      setViewingItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setFeedForm((prev) => ({
      ...prev,
      name: preset.name,
      url: preset.url,
      refreshIntervalMinutes: preset.interval,
      selectors: {
        ...prev.selectors,
        ...preset.selectors,
      },
    }));
    showBanner('success', lang === 'tr' ? `"${preset.name}" şablonu uygulandı!` : `Preset "${preset.name}" applied!`);
  };

  const handleTestPreview = async () => {
    if (!feedForm.url || !feedForm.selectors.itemContainer) {
      showBanner('error', lang === 'tr' ? 'Lütfen hedef URL ve Öğe Kapsayıcı seçicisini doldurun' : 'Please provide Target URL and Item Container selector');
      return;
    }

    setTestingPreview(true);
    setPreviewResult(null);

    let headersObj: Record<string, string> | undefined;
    if (feedForm.customHeaders.trim()) {
      try {
        headersObj = JSON.parse(feedForm.customHeaders);
      } catch {
        showBanner('error', lang === 'tr' ? 'Özel başlıklar (headers) geçerli bir JSON olmalı' : 'Custom headers must be valid JSON');
        setTestingPreview(false);
        return;
      }
    }

    try {
      let targetUrl = feedForm.url.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }

      const res = await safeJsonFetch<{
        success: boolean;
        items: FeedItem[];
        rssXml?: string;
        durationMs: number;
        error?: string;
      }>('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          selectors: feedForm.selectors,
          customHeaders: headersObj,
        }),
      });

      if (res.ok && res.data && res.data.success) {
        setPreviewResult({
          items: res.data.items,
          rssXml: res.data.rssXml,
          durationMs: res.data.durationMs,
        });
        showBanner(
          'success',
          lang === 'tr'
            ? `${res.data.items.length} öğe başarıyla ayrıştırıldı (${res.data.durationMs}ms)`
            : `Extracted ${res.data.items.length} items (${res.data.durationMs}ms)`
        );
      } else {
        const errorMsg = res.data?.error || res.error || 'Scraping error';
        setPreviewResult({
          items: [],
          durationMs: res.data?.durationMs || 0,
          error: errorMsg,
        });
        showBanner('error', errorMsg);
      }
    } catch (err: unknown) {
      setPreviewResult({
        items: [],
        durationMs: 0,
        error: err instanceof Error ? err.message : 'Network error',
      });
      showBanner('error', 'Preview test failed');
    } finally {
      setTestingPreview(false);
    }
  };

  const handleSaveFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedForm.name || !feedForm.url || !feedForm.selectors.itemContainer) {
      showBanner('error', lang === 'tr' ? 'Zorunlu alanları doldurunuz' : 'Please fill required fields');
      return;
    }

    let headersObj: Record<string, string> | undefined;
    if (feedForm.customHeaders.trim()) {
      try {
        headersObj = JSON.parse(feedForm.customHeaders);
      } catch {
        showBanner('error', 'Headers must be valid JSON');
        return;
      }
    }

    let targetUrl = feedForm.url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    const payload = {
      ...feedForm,
      url: targetUrl,
      customHeaders: headersObj,
    };

    try {
      const endpoint = isEditing ? `/api/feeds/${feedForm.id}` : '/api/feeds';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await safeJsonFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showBanner('success', lang === 'tr' ? 'Akış başarıyla kaydedildi!' : 'Feed saved successfully!');
        fetchFeeds();
        fetchStats();
        setActiveTab('feeds');
        setIsEditing(false);
      } else {
        showBanner('error', res.error || 'Failed to save feed');
      }
    } catch {
      showBanner('error', 'Error saving feed');
    }
  };

  const handleEditClick = (feed: FeedConfig) => {
    setIsEditing(true);
    setFeedForm({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      description: feed.description || '',
      refreshIntervalMinutes: feed.refreshIntervalMinutes || 60,
      selectors: { ...feed.selectors },
      customHeaders: feed.customHeaders ? JSON.stringify(feed.customHeaders, null, 2) : '',
      userAgent: feed.userAgent || '',
      maxItems: feed.maxItems || 30,
      maxPages: feed.maxPages || 1,
    });
    setActiveTab('wizard');
  };

  const handleAutoDiscover = async () => {
    if (!discoverUrl.trim()) return;
    setDiscovering(true);
    setDiscoveryResult(null);
    setDiscoveryError(null);

    let targetUrl = discoverUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const res = await safeJsonFetch<DetectionResult>('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (res.ok && res.data) {
        setDiscoveryResult(res.data);
        showBanner(
          'success',
          lang === 'tr'
            ? `Sayfa analiz edildi! %${res.data.confidence} doğruluk ile ${res.data.itemCount} öğe tespit edildi.`
            : `Page analyzed! Found ${res.data.itemCount} items with ${res.data.confidence}% confidence.`
        );
      } else {
        setDiscoveryError(res.error || 'Discovery failed');
      }
    } catch (err: unknown) {
      setDiscoveryError(err instanceof Error ? err.message : 'Discovery network error');
    } finally {
      setDiscovering(false);
    }
  };

  const handleImportDiscovery = () => {
    if (!discoveryResult) return;
    setFeedForm({
      id: '',
      name: discoveryResult.pageTitle || 'Discovered Feed',
      url: discoveryResult.url,
      description: `Auto-generated feed for ${discoveryResult.url}`,
      refreshIntervalMinutes: 60,
      selectors: {
        ...discoveryResult.detectedSelectors,
      },
      customHeaders: '',
      userAgent: '',
      maxItems: 30,
      maxPages: 1,
    });
    setIsEditing(false);
    setActiveTab('wizard');
    showBanner('success', lang === 'tr' ? 'Keşfedilen seçiciler Akış Oluşturucuya aktarıldı!' : 'Discovered selectors loaded into Feed Builder!');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-neutral-950">
      {/* Toast Notification */}
      {banner && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-3 border transition-all ${
            banner.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60 shadow-emerald-950/40'
              : 'bg-rose-950/90 text-rose-200 border-rose-700/60 shadow-rose-950/40'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-neutral-950 shadow-md shadow-amber-500/20">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white">{t.appName}</h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  RSS 2.0
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">{t.appTagline}</p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800/60 border border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.statusHealthy}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800/60 border border-neutral-800">
              <span className="text-neutral-500">{t.activeFeeds}:</span>
              <strong className="text-neutral-200">{stats?.activeFeeds ?? feeds.length}</strong>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800/60 border border-neutral-800">
              <span className="text-neutral-500">{t.totalItemsScraped}:</span>
              <strong className="text-neutral-200">{stats?.totalItems ?? 0}</strong>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <a
              href="/opml.xml"
              download="webdenrssye-feeds.opml"
              title={t.exportOpml}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportOpml}</span>
            </a>

            <button
              onClick={() => {
                setIsEditing(false);
                setFeedForm({
                  id: '',
                  name: '',
                  url: '',
                  description: '',
                  refreshIntervalMinutes: 60,
                  selectors: {
                    itemContainer: 'article',
                    title: 'h2 a',
                    link: 'h2 a',
                    description: 'p',
                    date: 'time',
                    author: '',
                    category: '',
                    image: 'img',
                    pagination: '',
                  },
                  customHeaders: '',
                  userAgent: '',
                  maxItems: 30,
                  maxPages: 1,
                });
                setActiveTab('wizard');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newFeed}</span>
            </button>

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 transition"
            >
              {lang === 'tr' ? 'EN' : 'TR'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 text-sm font-medium border-t border-neutral-800/80">
          <button
            onClick={() => setActiveTab('feeds')}
            className={`py-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'feeds'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{t.tabFeeds}</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400">
              {feeds.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wizard')}
            className={`py-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'wizard'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>{isEditing ? (lang === 'tr' ? 'Akışı Düzenle' : 'Edit Feed') : t.tabWizard}</span>
          </button>

          <button
            onClick={() => setActiveTab('discover')}
            className={`py-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'discover'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.tabDiscover}</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`py-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'docs'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{t.tabDocs}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* TAB 1: FEEDS LIST */}
        {activeTab === 'feeds' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {lang === 'tr' ? 'Yapılandırılmış Canlı Akışlar' : 'Configured Live Feeds'}
                </h2>
                <p className="text-sm text-neutral-400">
                  {lang === 'tr'
                    ? 'RSS okuyucunuza (Feedly, Inoreader, Apple Shortcuts) eklemek için akış URL’lerini kopyalayın.'
                    : 'Copy live XML endpoints to subscribe in any RSS client (Feedly, Inoreader, Apple Podcasts, etc.)'}
                </p>
              </div>
              <button
                onClick={fetchFeeds}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 transition self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFeeds ? 'animate-spin' : ''}`} />
                <span>{lang === 'tr' ? 'Listeyi Yenile' : 'Refresh List'}</span>
              </button>
            </div>

            {loadingFeeds && feeds.length === 0 ? (
              <div className="py-20 text-center text-neutral-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
                <p>{lang === 'tr' ? 'Akışlar taranıyor...' : 'Loading feeds...'}</p>
              </div>
            ) : feeds.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-neutral-800 bg-neutral-900/40">
                <Rss className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-base font-semibold text-neutral-200">{t.emptyFeeds}</h3>
                <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
                  {lang === 'tr'
                    ? 'İstediğiniz bir web sitesi adresini girerek birkaç tıkla ilk RSS akışınızı yaratın.'
                    : 'Enter any website URL to extract articles and create your first live RSS feed.'}
                </p>
                <button
                  onClick={() => setActiveTab('wizard')}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.newFeed}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {feeds.map((feed) => {
                  const rssUrl = `${window.location.origin}/rss/${feed.id}.xml`;
                  const isRefreshing = refreshingFeedId === feed.id;

                  return (
                    <div
                      key={feed.id}
                      className="group flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 transition p-5 shadow-sm"
                    >
                      <div>
                        {/* Status Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              feed.lastScrapedStatus === 'error'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : feed.lastScrapedStatus === 'scraping' || isRefreshing
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                feed.lastScrapedStatus === 'error'
                                  ? 'bg-rose-400'
                                  : isRefreshing
                                  ? 'bg-amber-400 animate-ping'
                                  : 'bg-emerald-400'
                              }`}
                            />
                            {isRefreshing
                              ? (lang === 'tr' ? 'Taranıyor...' : 'Scraping...')
                              : feed.lastScrapedStatus === 'error'
                              ? (lang === 'tr' ? 'Hata' : 'Error')
                              : (lang === 'tr' ? 'Hazır' : 'Ready')}
                          </span>

                          <span className="text-[11px] font-mono text-neutral-400">
                            {feed.itemCount} {lang === 'tr' ? 'öğe' : 'items'}
                          </span>
                        </div>

                        {/* Title & Desc */}
                        <h3 className="font-semibold text-base text-neutral-100 group-hover:text-amber-400 transition line-clamp-1">
                          {feed.name}
                        </h3>
                        {feed.description && (
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{feed.description}</p>
                        )}

                        {/* Target Website Link */}
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 font-mono truncate">
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <a href={feed.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                            {feed.url}
                          </a>
                        </div>

                        {/* Selectors Badge */}
                        <div className="mt-3 bg-neutral-950/60 rounded-lg p-2 border border-neutral-800/80 font-mono text-[11px] text-neutral-400 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Container:</span>
                            <span className="text-neutral-300 truncate ml-2">{feed.selectors.itemContainer}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Interval:</span>
                            <span className="text-neutral-300">{feed.refreshIntervalMinutes}m</span>
                          </div>
                        </div>

                        {feed.lastErrorMessage && (
                          <div className="mt-2 text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900/50">
                            {feed.lastErrorMessage}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-5 pt-4 border-t border-neutral-800 flex flex-col gap-2">
                        {/* Copy RSS Link Button */}
                        <div className="flex items-center gap-1.5 bg-neutral-950 rounded-lg p-1 border border-neutral-800">
                          <input
                            type="text"
                            readOnly
                            value={rssUrl}
                            className="bg-transparent text-[11px] font-mono text-neutral-400 px-2 flex-1 outline-none truncate"
                          />
                          <button
                            onClick={() => handleCopyRss(feed.id)}
                            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition"
                            title={t.copyRssUrl}
                          >
                            {copiedId === feed.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 text-[10px]">{t.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="text-[10px]">XML</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`/rss/${feed.id}.xml`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
                            title="Open raw XML"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Bottom Row Actions */}
                        <div className="flex items-center justify-between gap-1 pt-1 text-xs">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenReader(feed)}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1 transition font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>{t.viewArticles}</span>
                            </button>
                            <button
                              onClick={() => handleRefreshFeed(feed.id)}
                              disabled={isRefreshing}
                              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition disabled:opacity-50"
                              title={t.refreshNow}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditClick(feed)}
                              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
                              title={t.editFeed}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFeed(feed.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 transition"
                              title={t.deleteFeed}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FEED BUILDER / WIZARD */}
        {activeTab === 'wizard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Form: 7 cols */}
            <div className="lg:col-span-7 space-y-6">
              <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {isEditing
                        ? (lang === 'tr' ? 'Akışı Düzenle' : 'Edit Feed')
                        : (lang === 'tr' ? 'Yeni RSS Akışı Oluştur' : 'Create New RSS Feed')}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {lang === 'tr'
                        ? 'Hedef sitenin URL’sini girin ve HTML öğelerini seçin.'
                        : 'Specify target website and CSS selectors to extract articles.'}
                    </p>
                  </div>

                  {/* Preset Selector */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 flex items-center gap-1.5 transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{lang === 'tr' ? 'Hazır Şablonlar' : 'Presets'}</span>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-2 hidden group-hover:block group-focus-within:block z-30">
                      <div className="text-[10px] font-semibold text-neutral-500 px-2 py-1 uppercase">
                        {lang === 'tr' ? 'Popüler Siteler' : 'Popular Sites'}
                      </div>
                      {PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-amber-400 transition"
                        >
                          <div className="font-medium">{p.name}</div>
                          <div className="text-[10px] font-mono text-neutral-500 truncate">{p.url}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveFeed} className="space-y-4">
                  {/* Feed Name & Target URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        {lang === 'tr' ? 'Akış Adı *' : 'Feed Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={feedForm.name}
                        onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })}
                        placeholder="e.g. Hacker News Top"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        {lang === 'tr' ? 'Hedef Web Sitesi URL *' : 'Target Website URL *'}
                      </label>
                      <input
                        type="url"
                        required
                        value={feedForm.url}
                        onChange={(e) => setFeedForm({ ...feedForm, url: e.target.value })}
                        placeholder="https://news.ycombinator.com"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      {lang === 'tr' ? 'Açıklama (Opsiyonel)' : 'Description (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={feedForm.description}
                      onChange={(e) => setFeedForm({ ...feedForm, description: e.target.value })}
                      placeholder="e.g. Top articles from frontpage"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Selectors Card */}
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5" />
                        <span>{lang === 'tr' ? 'CSS Seçicileri (Selectors)' : 'CSS Selectors'}</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        {lang === 'tr' ? 'Cheerio / jQuery sözdizimi' : 'Cheerio / jQuery syntax'}
                      </span>
                    </div>

                    {/* Item Container */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-200 mb-1">
                        {lang === 'tr' ? 'Öğe Kapsayıcı (Item Container) *' : 'Item Container Selector *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={feedForm.selectors.itemContainer}
                        onChange={(e) =>
                          setFeedForm({
                            ...feedForm,
                            selectors: { ...feedForm.selectors, itemContainer: e.target.value },
                          })
                        }
                        placeholder="article, .post-card, table tr.athing"
                        className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {lang === 'tr'
                          ? 'Her bir haber/makale kutusunu seçen CSS seçicisi (örn: article, .news-item)'
                          : 'CSS selector that matches each article card wrapper'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          {lang === 'tr' ? 'Başlık (Title)' : 'Title Selector'}
                        </label>
                        <input
                          type="text"
                          value={feedForm.selectors.title}
                          onChange={(e) =>
                            setFeedForm({
                              ...feedForm,
                              selectors: { ...feedForm.selectors, title: e.target.value },
                            })
                          }
                          placeholder="h2 a, .title"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          {lang === 'tr' ? 'Bağlantı (Link)' : 'Link Selector'}
                        </label>
                        <input
                          type="text"
                          value={feedForm.selectors.link}
                          onChange={(e) =>
                            setFeedForm({
                              ...feedForm,
                              selectors: { ...feedForm.selectors, link: e.target.value },
                            })
                          }
                          placeholder="a[href], h2 a"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          {lang === 'tr' ? 'Açıklama / Özet (Summary)' : 'Description Selector'}
                        </label>
                        <input
                          type="text"
                          value={feedForm.selectors.description}
                          onChange={(e) =>
                            setFeedForm({
                              ...feedForm,
                              selectors: { ...feedForm.selectors, description: e.target.value },
                            })
                          }
                          placeholder="p, .excerpt, .summary"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          {lang === 'tr' ? 'Tarih (Date/Time)' : 'Date Selector'}
                        </label>
                        <input
                          type="text"
                          value={feedForm.selectors.date}
                          onChange={(e) =>
                            setFeedForm({
                              ...feedForm,
                              selectors: { ...feedForm.selectors, date: e.target.value },
                            })
                          }
                          placeholder="time, .date, [datetime]"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          {lang === 'tr' ? 'Görsel / Resim (Thumbnail)' : 'Image / Thumbnail'}
                        </label>
                        <input
                          type="text"
                          value={feedForm.selectors.image}
                          onChange={(e) =>
                            setFeedForm({
                              ...feedForm,
                              selectors: { ...feedForm.selectors, image: e.target.value },
                            })
                          }
                          placeholder="img, .thumb img"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          {lang === 'tr' ? 'Yazar (Author)' : 'Author Selector'}
                        </label>
                        <input
                          type="text"
                          value={feedForm.selectors.author}
                          onChange={(e) =>
                            setFeedForm({
                              ...feedForm,
                              selectors: { ...feedForm.selectors, author: e.target.value },
                            })
                          }
                          placeholder=".author, .byline"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Crawl Settings: Refresh Interval, Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        {lang === 'tr' ? 'Yenileme Aralığı (Dakika)' : 'Refresh Interval (Minutes)'}
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        value={feedForm.refreshIntervalMinutes}
                        onChange={(e) =>
                          setFeedForm({
                            ...feedForm,
                            refreshIntervalMinutes: parseInt(e.target.value, 10) || 60,
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        {lang === 'tr' ? 'Maks Öğe Sayısı' : 'Max Items'}
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={feedForm.maxItems}
                        onChange={(e) =>
                          setFeedForm({
                            ...feedForm,
                            maxItems: parseInt(e.target.value, 10) || 30,
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        {lang === 'tr' ? 'Sayfa Sayısı' : 'Pages to crawl'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={feedForm.maxPages}
                        onChange={(e) =>
                          setFeedForm({
                            ...feedForm,
                            maxPages: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Actions: Test Preview & Save */}
                  <div className="pt-3 flex items-center justify-between gap-3 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={handleTestPreview}
                      disabled={testingPreview}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 flex items-center gap-2 transition disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 ${testingPreview ? 'animate-spin' : ''}`} />
                      <span>
                        {testingPreview
                          ? (lang === 'tr' ? 'Test Ediliyor...' : 'Testing...')
                          : (lang === 'tr' ? 'Canlı Test & Önizle' : 'Test & Preview')}
                      </span>
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isEditing ? (lang === 'tr' ? 'Değişiklikleri Kaydet' : 'Update Feed') : (lang === 'tr' ? 'Akışı Oluştur ve Başlat' : 'Create & Activate')}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Preview Panel: 5 cols */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-5 sticky top-24">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">
                      {lang === 'tr' ? 'Canlı Ayrıştırma Sonucu' : 'Live Parse Result'}
                    </h3>
                  </div>

                  {previewResult && (
                    <div className="flex gap-1 text-xs">
                      <button
                        onClick={() => setPreviewTab('cards')}
                        className={`px-2 py-1 rounded ${
                          previewTab === 'cards'
                            ? 'bg-neutral-800 text-amber-400 font-semibold'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {lang === 'tr' ? 'Kartlar' : 'Cards'}
                      </button>
                      <button
                        onClick={() => setPreviewTab('xml')}
                        className={`px-2 py-1 rounded ${
                          previewTab === 'xml'
                            ? 'bg-neutral-800 text-amber-400 font-semibold'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        RSS XML
                      </button>
                    </div>
                  )}
                </div>

                {!previewResult ? (
                  <div className="py-16 text-center text-neutral-500">
                    <Code className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
                    <p className="text-xs">
                      {lang === 'tr'
                        ? 'Seçicileri denemek için "Canlı Test & Önizle" butonuna tıklayın.'
                        : 'Click "Test & Preview" to run the scraper and inspect extracted items.'}
                    </p>
                  </div>
                ) : previewResult.error ? (
                  <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                    <div className="font-semibold mb-1 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>{lang === 'tr' ? 'Ayrıştırma Hatası' : 'Parsing Error'}</span>
                    </div>
                    {previewResult.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-400 bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800">
                      <span>
                        {lang === 'tr' ? 'Bulunan:' : 'Extracted:'}{' '}
                        <strong className="text-amber-400">{previewResult.items.length}</strong>{' '}
                        {lang === 'tr' ? 'öğe' : 'items'}
                      </span>
                      <span>{previewResult.durationMs}ms</span>
                    </div>

                    {previewTab === 'cards' ? (
                      <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
                        {previewResult.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-neutral-950/90 border border-neutral-800/80 text-xs space-y-1.5"
                          >
                            <div className="flex gap-2.5">
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="w-14 h-14 object-cover rounded-lg shrink-0 bg-neutral-900 border border-neutral-800"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-neutral-100 hover:text-amber-400 transition line-clamp-2"
                                >
                                  {item.title}
                                </a>
                                {item.description && (
                                  <p className="text-neutral-400 text-[11px] line-clamp-2 mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-900">
                              <span>{item.author || item.pubDate}</span>
                              <span className="truncate max-w-[150px]">{new URL(item.link || feedForm.url).hostname}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        <pre className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[10px] font-mono text-neutral-300 max-h-[480px] overflow-auto select-all whitespace-pre-wrap">
                          {previewResult.rssXml}
                        </pre>
                        <button
                          onClick={() => {
                            if (previewResult.rssXml) {
                              navigator.clipboard.writeText(previewResult.rssXml);
                              showBanner('success', 'XML copied');
                            }
                          }}
                          className="absolute top-2 right-2 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[10px] font-medium border border-neutral-700"
                        >
                          {lang === 'tr' ? 'Kopyala' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUTO-DISCOVERY */}
        {activeTab === 'discover' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-6 sm:p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {lang === 'tr' ? 'Akıllı Otomatik Keşif Motoru' : 'Smart Auto-Discovery Engine'}
              </h2>
              <p className="text-sm text-neutral-400 max-w-lg mx-auto mt-2">
                {lang === 'tr'
                  ? 'Herhangi bir blog veya haber sitesi linki yapıştırın. Motorumuz sayfayı tarar, haber öğelerini ve CSS seçicilerini sizin için otomatik çıkarır.'
                  : 'Paste any web page link. Our engine scans the DOM, detects recurring article cards, and suggests optimal CSS selectors.'}
              </p>

              {/* URL Input Form */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="url"
                    value={discoverUrl}
                    onChange={(e) => setDiscoverUrl(e.target.value)}
                    placeholder="https://news.ycombinator.com veya https://blog.example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAutoDiscover}
                  disabled={discovering || !discoverUrl}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                  <Sparkles className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
                  <span>
                    {discovering
                      ? (lang === 'tr' ? 'Taranıyor...' : 'Analyzing...')
                      : (lang === 'tr' ? 'Sayfayı Analiz Et' : 'Analyze Website')}
                  </span>
                </button>
              </div>

              {discoveryError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 max-w-xl mx-auto">
                  {discoveryError}
                </div>
              )}
            </div>

            {/* Discovery Results */}
            {discoveryResult && (
              <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">{discoveryResult.pageTitle}</h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        %{discoveryResult.confidence} {lang === 'tr' ? 'Güven' : 'Confidence'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 font-mono mt-1">{discoveryResult.url}</p>
                  </div>

                  <button
                    onClick={handleImportDiscovery}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition shadow-sm self-start sm:self-auto"
                  >
                    <span>{lang === 'tr' ? 'Bu Seçicilerle Akış Oluştur' : 'Use in Feed Builder'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Detected Selectors Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                    {lang === 'tr' ? 'Tespit Edilen CSS Seçicileri' : 'Detected Selectors'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                      <span className="text-neutral-500 text-[10px] block">Container:</span>
                      <strong className="text-amber-400">{discoveryResult.detectedSelectors.itemContainer}</strong>
                    </div>
                    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                      <span className="text-neutral-500 text-[10px] block">Title:</span>
                      <strong className="text-neutral-200">{discoveryResult.detectedSelectors.title}</strong>
                    </div>
                    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                      <span className="text-neutral-500 text-[10px] block">Link:</span>
                      <strong className="text-neutral-200">{discoveryResult.detectedSelectors.link}</strong>
                    </div>
                  </div>
                </div>

                {/* Sample Extracted Items */}
                <div>
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                    {lang === 'tr' ? 'Çıkarılan Örnek Öğeler' : 'Sample Extracted Articles'} ({discoveryResult.sampleItems.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {discoveryResult.sampleItems.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs flex gap-3"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-12 h-12 object-cover rounded-lg shrink-0 bg-neutral-900 border border-neutral-800"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-neutral-200 hover:text-amber-400 transition line-clamp-1"
                          >
                            {item.title}
                          </a>
                          {item.description && (
                            <p className="text-neutral-500 text-[11px] line-clamp-2 mt-0.5">{item.description}</p>
                          )}
                          <span className="text-[10px] font-mono text-neutral-600 mt-1 block">{item.pubDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DOCUMENTATION & API GUIDE */}
        {activeTab === 'docs' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {lang === 'tr' ? 'Rehber ve API Dokümantasyonu' : 'Guide and API Reference'}
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                {lang === 'tr'
                  ? 'Web’den RSS’ye nasıl çalışır? RSS okuyucuları, botlar ve otomasyon araçları ile entegrasyon rehberi.'
                  : 'How Web-to-RSS works, subscribing with popular readers, and REST API endpoints.'}
              </p>
            </div>

            {/* Architecture Card */}
            <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>{lang === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-400">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="font-semibold text-neutral-200 mb-1">1. Güvenli HTTP & SSRF Koruması</div>
                  <p>
                    {lang === 'tr'
                      ? 'Hedef web siteleri güvenli proxy ve SSRF kalkanı arkasından taranır. Özel IP ve metadata engellenir.'
                      : 'Target pages are fetched with SSRF defenses blocking internal and cloud metadata IPs.'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="font-semibold text-neutral-200 mb-1">2. Cheerio CSS Seçici Motoru</div>
                  <p>
                    {lang === 'tr'
                      ? 'Sayfadaki liste elemanları başlık, bağlantı, özet, tarih ve görsel bilgileriyle parse edilir.'
                      : 'Articles are extracted using ultra-fast CSS selectors, resolving relative links automatically.'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="font-semibold text-neutral-200 mb-1">3. W3C Standart RSS 2.0 XML</div>
                  <p>
                    {lang === 'tr'
                      ? 'Çıkarılan içerikler RFC-822 tarihleri ve GUID değerleriyle W3C standartlarında RSS 2.0 olarak sunulur.'
                      : 'Parsed items are formatted with RFC-822 timestamps and unique GUIDs in valid RSS 2.0 format.'}
                  </p>
                </div>
              </div>
            </div>

            {/* RSS Reader Integration Guide */}
            <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Rss className="w-5 h-5 text-orange-400" />
                <span>{lang === 'tr' ? 'RSS Okuyucularına Ekleme' : 'Subscribing in RSS Readers'}</span>
              </h3>
              <p className="text-xs text-neutral-400">
                {lang === 'tr'
                  ? 'Oluşturduğunuz akışın XML bağlantısını kopyalayın ve favori RSS uygulamanıza yapıştırın:'
                  : 'Copy the generated XML feed URL and paste it into your favorite RSS app:'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-300">
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-medium text-center">
                  Feedly
                </div>
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-medium text-center">
                  Inoreader
                </div>
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-medium text-center">
                  NetNewsWire
                </div>
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-medium text-center">
                  Apple Shortcuts
                </div>
              </div>
            </div>

            {/* REST API Reference */}
            <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                <span>{lang === 'tr' ? 'Uç Noktalar (Endpoints)' : 'REST API Reference'}</span>
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">GET</span>
                    <span className="text-neutral-200">/rss/:feedId.xml</span>
                  </div>
                  <span className="text-neutral-500 text-[11px] font-sans">
                    {lang === 'tr' ? 'W3C Standart RSS 2.0 XML akışı' : 'Delivers RSS 2.0 XML feed'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">GET</span>
                    <span className="text-neutral-200">/opml.xml</span>
                  </div>
                  <span className="text-neutral-500 text-[11px] font-sans">
                    {lang === 'tr' ? 'Tüm akışların OPML export dosyası' : 'OPML export of all configured feeds'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">GET</span>
                    <span className="text-neutral-200">/api/feeds</span>
                  </div>
                  <span className="text-neutral-500 text-[11px] font-sans">
                    {lang === 'tr' ? 'Kayıtlı akışları listele' : 'List all configured feeds'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">POST</span>
                    <span className="text-neutral-200">/api/preview</span>
                  </div>
                  <span className="text-neutral-500 text-[11px] font-sans">
                    {lang === 'tr' ? 'Hedef URL ve seçicileri test et' : 'Live test scrape without saving'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold">POST</span>
                    <span className="text-neutral-200">/api/detect</span>
                  </div>
                  <span className="text-neutral-500 text-[11px] font-sans">
                    {lang === 'tr' ? 'Sayfayı otomatik analiz et ve seçicileri keşfet' : 'Heuristically discover selectors'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">GET</span>
                    <span className="text-neutral-200">/api/health</span>
                  </div>
                  <span className="text-neutral-500 text-[11px] font-sans">
                    {lang === 'tr' ? 'Sunucu sağlık kontrolü' : 'Health check status'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Article Reader Modal */}
      {viewingFeed && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-white">{viewingFeed.name}</h3>
                  <span className="text-[11px] font-mono text-neutral-400">
                    ({viewingItems.length} {lang === 'tr' ? 'öğe' : 'items'})
                  </span>
                </div>
                <a
                  href={viewingFeed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-500 hover:text-neutral-300 font-mono flex items-center gap-1 mt-0.5 truncate"
                >
                  <Globe className="w-3 h-3" />
                  <span className="truncate">{viewingFeed.url}</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyRss(viewingFeed.id)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 border border-neutral-700/80 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'tr' ? 'RSS URL Kopyala' : 'Copy RSS URL'}</span>
                </button>
                <button
                  onClick={() => setViewingFeed(null)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingItems ? (
                <div className="py-20 text-center text-neutral-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
                  <p className="text-xs">{lang === 'tr' ? 'Öğeler yükleniyor...' : 'Loading items...'}</p>
                </div>
              ) : viewingItems.length === 0 ? (
                <div className="py-16 text-center text-neutral-500">
                  <Rss className="w-10 h-10 mx-auto mb-2 text-neutral-700" />
                  <p className="text-xs">
                    {lang === 'tr'
                      ? 'Bu akış için henüz taranmış öğe bulunmuyor. "Şimdi Yenile" butonuna basarak tarayabilirsiniz.'
                      : 'No items cached for this feed yet. Click refresh to trigger a scrape.'}
                  </p>
                </div>
              ) : (
                viewingItems.map((item, idx) => (
                  <article
                    key={idx}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2 hover:border-neutral-700 transition"
                  >
                    <div className="flex gap-4">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-20 h-20 object-cover rounded-xl shrink-0 bg-neutral-900 border border-neutral-800"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sm text-neutral-100 hover:text-amber-400 transition flex items-center gap-1.5 group"
                        >
                          <span className="line-clamp-2">{item.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition shrink-0" />
                        </a>
                        {item.description && (
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-3">{item.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-900">
                      <div className="flex items-center gap-2">
                        {item.author && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-600" />
                            <span>{item.author}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-600" />
                          <span>{item.pubDate}</span>
                        </span>
                      </div>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400/80 hover:text-amber-400 font-sans text-xs flex items-center gap-1"
                      >
                        <span>{lang === 'tr' ? 'Habere Git' : 'Read original'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-6 text-xs text-neutral-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-amber-500" />
            <span className="text-neutral-400 font-medium">Web&apos;den RSS&apos;ye (Web-to-RSS Engine)</span>
          </div>
          <div>
            <span>W3C Standard RSS 2.0 &bull; Open-Source &bull; Built with Express &amp; React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
