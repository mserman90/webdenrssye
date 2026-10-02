import type { FeedConfig, ScheduleConfig } from './types.ts';

const DAY_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parses "HH:mm" time string into hours and minutes
 */
export function parseTimeString(timeStr?: string): { hour: number; minute: number } {
  if (!timeStr || !timeStr.includes(':')) {
    return { hour: 9, minute: 0 };
  }
  const parts = timeStr.split(':');
  const hour = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
  return { hour, minute };
}

/**
 * Calculates the next upcoming Date when the feed should be scraped
 */
export function calculateNextRun(feed: FeedConfig, now = new Date()): Date {
  const schedule = feed.schedule;
  const lastScraped = feed.lastScrapedAt ? new Date(feed.lastScrapedAt) : null;

  // 1. Simple Interval Mode (or fallback)
  if (!schedule || schedule.mode === 'interval') {
    const minutes = schedule?.intervalMinutes || feed.refreshIntervalMinutes || 60;
    const baseTime = lastScraped && lastScraped.getTime() > 0 ? lastScraped.getTime() : now.getTime();
    const nextTime = baseTime + minutes * 60 * 1000;
    // If nextTime has already passed, next run is due immediately or now + 1 min
    return nextTime < now.getTime() ? new Date(now.getTime() + 60 * 1000) : new Date(nextTime);
  }

  // 2. Daily at Specific Times
  if (schedule.mode === 'daily') {
    const times = (schedule.dailyTimes && schedule.dailyTimes.length > 0)
      ? [...schedule.dailyTimes].sort()
      : ['09:00', '18:00'];

    const upcomingCandidates: Date[] = [];

    // Check today and tomorrow
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      for (const timeStr of times) {
        const { hour, minute } = parseTimeString(timeStr);
        const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);
        if (candidate.getTime() > now.getTime()) {
          upcomingCandidates.push(candidate);
        }
      }
    }

    upcomingCandidates.sort((a, b) => a.getTime() - b.getTime());
    return upcomingCandidates[0] || new Date(now.getTime() + 60 * 60 * 1000);
  }

  // 3. Weekly on Specific Days and Time
  if (schedule.mode === 'weekly') {
    const days = (schedule.weeklyDays && schedule.weeklyDays.length > 0)
      ? schedule.weeklyDays
      : [1]; // Default Monday
    const { hour, minute } = parseTimeString(schedule.weeklyTime || '09:00');

    const upcomingCandidates: Date[] = [];

    // Check up to 14 days in advance
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      const candidateDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);
      const dayOfWeek = candidateDate.getDay(); // 0 = Sun, 1 = Mon ...
      if (days.includes(dayOfWeek) && candidateDate.getTime() > now.getTime()) {
        upcomingCandidates.push(candidateDate);
      }
    }

    upcomingCandidates.sort((a, b) => a.getTime() - b.getTime());
    return upcomingCandidates[0] || new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  // 4. Custom Cron Mode
  if (schedule.mode === 'custom_cron') {
    // Default fallback to 1 hour
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  return new Date(now.getTime() + 60 * 60 * 1000);
}

/**
 * Checks whether a feed is due for scraping at the current moment
 */
export function isFeedDueForScrape(feed: FeedConfig, now = new Date()): boolean {
  if (!feed.isActive) return false;

  const lastScrapedTime = feed.lastScrapedAt ? new Date(feed.lastScrapedAt).getTime() : 0;
  // If never scraped, it is due immediately!
  if (lastScrapedTime === 0) return true;

  const schedule = feed.schedule;

  // 1. Interval Mode
  if (!schedule || schedule.mode === 'interval') {
    const minutes = schedule?.intervalMinutes || feed.refreshIntervalMinutes || 60;
    const intervalMs = minutes * 60 * 1000;
    return now.getTime() - lastScrapedTime >= intervalMs;
  }

  // 2. Daily Mode
  if (schedule.mode === 'daily') {
    const times = (schedule.dailyTimes && schedule.dailyTimes.length > 0)
      ? schedule.dailyTimes
      : ['09:00', '18:00'];

    // For each configured time, check if there was a scheduled trigger between lastScrapedTime and now
    for (const timeStr of times) {
      const { hour, minute } = parseTimeString(timeStr);
      // Today's target slot
      const todaySlot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0).getTime();
      if (todaySlot <= now.getTime() && todaySlot > lastScrapedTime) {
        return true;
      }
      // Yesterday's target slot (in case server was down or feed hasn't run in > 24 hours)
      const yesterdaySlot = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, hour, minute, 0, 0).getTime();
      if (yesterdaySlot <= now.getTime() && yesterdaySlot > lastScrapedTime) {
        return true;
      }
    }
    return false;
  }

  // 3. Weekly Mode
  if (schedule.mode === 'weekly') {
    const days = (schedule.weeklyDays && schedule.weeklyDays.length > 0) ? schedule.weeklyDays : [1];
    const { hour, minute } = parseTimeString(schedule.weeklyTime || '09:00');

    // Check last 7 days for any missed slot
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset, hour, minute, 0, 0);
      if (days.includes(slot.getDay())) {
        const slotTime = slot.getTime();
        if (slotTime <= now.getTime() && slotTime > lastScrapedTime) {
          return true;
        }
      }
    }
    return false;
  }

  // 4. Custom Cron Mode (Simple minute/hour checker)
  if (schedule.mode === 'custom_cron' && schedule.cronExpression) {
    // If not scraped in the last 60 minutes and matches simple interval fallback
    const intervalMs = (feed.refreshIntervalMinutes || 60) * 60 * 1000;
    return now.getTime() - lastScrapedTime >= intervalMs;
  }

  return false;
}

/**
 * Returns a human-friendly description of the schedule
 */
export function formatScheduleSummary(
  schedule?: ScheduleConfig,
  fallbackInterval = 60,
  lang: 'tr' | 'en' = 'tr'
): string {
  if (!schedule || schedule.mode === 'interval') {
    const mins = schedule?.intervalMinutes || fallbackInterval;
    if (mins < 60) {
      return lang === 'tr' ? `Her ${mins} dakikada bir` : `Every ${mins} minutes`;
    }
    const hours = Math.round(mins / 60);
    if (hours === 1) {
      return lang === 'tr' ? 'Her saat başı' : 'Every hour';
    }
    if (hours === 24) {
      return lang === 'tr' ? 'Günde bir kez (24 saatte bir)' : 'Once a day (every 24h)';
    }
    return lang === 'tr' ? `Her ${hours} saatte bir` : `Every ${hours} hours`;
  }

  if (schedule.mode === 'daily') {
    const times = (schedule.dailyTimes && schedule.dailyTimes.length > 0)
      ? schedule.dailyTimes.join(', ')
      : '09:00, 18:00';
    return lang === 'tr'
      ? `Her gün saat ${times}'da`
      : `Daily at ${times}`;
  }

  if (schedule.mode === 'weekly') {
    const days = (schedule.weeklyDays && schedule.weeklyDays.length > 0) ? schedule.weeklyDays : [1];
    const time = schedule.weeklyTime || '09:00';
    const dayNames = days.map((d) => (lang === 'tr' ? DAY_NAMES_TR[d] : DAY_NAMES_EN[d])).join(', ');
    return lang === 'tr'
      ? `Haftalık (${dayNames}) saat ${time}'da`
      : `Weekly on (${dayNames}) at ${time}`;
  }

  if (schedule.mode === 'custom_cron') {
    return lang === 'tr'
      ? `Özel Cron: ${schedule.cronExpression || '0 9 * * *'}`
      : `Custom Cron: ${schedule.cronExpression || '0 9 * * *'}`;
  }

  return lang === 'tr' ? 'Varsayılan zamanlama' : 'Default schedule';
}

/**
 * Formats a Date or timestamp into a natural relative countdown / timestamp
 */
export function formatNextRunRelative(dateInput?: string | Date, lang: 'tr' | 'en' = 'tr'): string {
  if (!dateInput) return lang === 'tr' ? 'Belirlenmedi' : 'Not set';
  const target = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return lang === 'tr' ? 'Hemen (Sırada)' : 'Due now';
  }

  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMins / 60);

  const hoursStr = String(target.getHours()).padStart(2, '0');
  const minsStr = String(target.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hoursStr}:${minsStr}`;

  const isToday =
    target.getDate() === now.getDate() &&
    target.getMonth() === now.getMonth() &&
    target.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    target.getDate() === tomorrow.getDate() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getFullYear() === tomorrow.getFullYear();

  if (diffMins < 60) {
    return lang === 'tr'
      ? `${diffMins} dk sonra (${timeFormatted})`
      : `in ${diffMins} mins (${timeFormatted})`;
  }

  if (isToday) {
    return lang === 'tr'
      ? `Bugün ${timeFormatted} (${diffHours} sa sonra)`
      : `Today at ${timeFormatted} (in ${diffHours}h)`;
  }

  if (isTomorrow) {
    return lang === 'tr'
      ? `Yarın ${timeFormatted}`
      : `Tomorrow at ${timeFormatted}`;
  }

  const dayName = lang === 'tr' ? DAY_SHORT_TR[target.getDay()] : DAY_SHORT_EN[target.getDay()];
  return `${dayName} ${timeFormatted}`;
}

export { DAY_NAMES_TR, DAY_NAMES_EN, DAY_SHORT_TR, DAY_SHORT_EN };
