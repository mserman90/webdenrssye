import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Repeat, Sparkles, Plus, X, AlertCircle } from 'lucide-react';
import type { ScheduleConfig, ScheduleMode } from './types.ts';
import {
  formatScheduleSummary,
  calculateNextRun,
  formatNextRunRelative,
  DAY_SHORT_TR,
  DAY_SHORT_EN,
  DAY_NAMES_TR,
  DAY_NAMES_EN
} from './scheduleUtils.ts';

interface ScheduleEditorProps {
  schedule: ScheduleConfig;
  onChange: (schedule: ScheduleConfig) => void;
  lang: 'tr' | 'en';
}

const INTERVAL_PRESETS = [
  { label: '15 dk', value: 15 },
  { label: '30 dk', value: 30 },
  { label: '1 saat', value: 60 },
  { label: '2 saat', value: 120 },
  { label: '4 saat', value: 240 },
  { label: '6 saat', value: 360 },
  { label: '12 saat', value: 720 },
  { label: '24 saat', value: 1440 },
];

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ schedule, onChange, lang }) => {
  const [newTimeInput, setNewTimeInput] = useState('12:00');

  // Ensure default structure
  const currentMode: ScheduleMode = schedule.mode || 'interval';
  const intervalMinutes = schedule.intervalMinutes || 60;
  const dailyTimes = schedule.dailyTimes && schedule.dailyTimes.length > 0 ? schedule.dailyTimes : ['09:00', '18:00'];
  const weeklyDays = schedule.weeklyDays && schedule.weeklyDays.length > 0 ? schedule.weeklyDays : [1]; // Mon
  const weeklyTime = schedule.weeklyTime || '09:00';
  const cronExpression = schedule.cronExpression || '0 9,18 * * 1-5';

  const dayShort = lang === 'tr' ? DAY_SHORT_TR : DAY_SHORT_EN;
  const dayNames = lang === 'tr' ? DAY_NAMES_TR : DAY_NAMES_EN;

  // Compute next estimated run for current form state
  const mockFeed = {
    id: 'mock',
    name: 'mock',
    url: 'mock',
    selectors: { itemContainer: '', title: '', link: '' },
    refreshIntervalMinutes: intervalMinutes,
    schedule: {
      mode: currentMode,
      intervalMinutes,
      dailyTimes,
      weeklyDays,
      weeklyTime,
      cronExpression,
    },
    isActive: true,
    itemCount: 0,
    createdAt: '',
    updatedAt: '',
  };

  const nextRunDate = calculateNextRun(mockFeed);
  const nextRunText = formatNextRunRelative(nextRunDate, lang);
  const summaryText = formatScheduleSummary(mockFeed.schedule, intervalMinutes, lang);

  const handleModeChange = (mode: ScheduleMode) => {
    onChange({
      ...schedule,
      mode,
      intervalMinutes,
      dailyTimes,
      weeklyDays,
      weeklyTime,
      cronExpression,
    });
  };

  const handleIntervalPreset = (mins: number) => {
    onChange({
      ...schedule,
      mode: 'interval',
      intervalMinutes: mins,
    });
  };

  const handleAddDailyTime = () => {
    if (!newTimeInput || dailyTimes.includes(newTimeInput)) return;
    const updated = [...dailyTimes, newTimeInput].sort();
    onChange({
      ...schedule,
      mode: 'daily',
      dailyTimes: updated,
    });
  };

  const handleRemoveDailyTime = (timeToRemove: string) => {
    if (dailyTimes.length <= 1) return; // Keep at least one
    const updated = dailyTimes.filter((t) => t !== timeToRemove);
    onChange({
      ...schedule,
      mode: 'daily',
      dailyTimes: updated,
    });
  };

  const handleDailyPreset = (times: string[]) => {
    onChange({
      ...schedule,
      mode: 'daily',
      dailyTimes: times,
    });
  };

  const handleToggleWeeklyDay = (dayIndex: number) => {
    let updated: number[];
    if (weeklyDays.includes(dayIndex)) {
      if (weeklyDays.length === 1) return; // Keep at least 1 day
      updated = weeklyDays.filter((d) => d !== dayIndex);
    } else {
      updated = [...weeklyDays, dayIndex].sort();
    }
    onChange({
      ...schedule,
      mode: 'weekly',
      weeklyDays: updated,
    });
  };

  const handleWeeklyPreset = (days: number[]) => {
    onChange({
      ...schedule,
      mode: 'weekly',
      weeklyDays: days,
    });
  };

  return (
    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {lang === 'tr' ? 'Akış Yenileme Zamanlaması' : 'Feed Refresh Schedule'}
          </h4>
        </div>
        <span className="text-[11px] text-neutral-500">
          {lang === 'tr' ? 'Otomatik arka plan tarama sıklığı' : 'Background scraping cadence'}
        </span>
      </div>

      {/* Mode Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
        <button
          type="button"
          onClick={() => handleModeChange('interval')}
          className={`py-2 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
            currentMode === 'interval'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>{lang === 'tr' ? 'Periyodik' : 'Interval'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('daily')}
          className={`py-2 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
            currentMode === 'daily'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{lang === 'tr' ? 'Günlük Saatler' : 'Daily Times'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('weekly')}
          className={`py-2 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
            currentMode === 'weekly'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{lang === 'tr' ? 'Haftalık' : 'Weekly'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('custom_cron')}
          className={`py-2 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
            currentMode === 'custom_cron'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'tr' ? 'Özel Cron' : 'Custom Cron'}</span>
        </button>
      </div>

      {/* MODE 1: INTERVAL (PERİYODİK) */}
      {currentMode === 'interval' && (
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-medium text-neutral-300">
            {lang === 'tr' ? 'Yenileme Aralığı Seçin' : 'Select Refresh Interval'}
          </label>
          {/* Quick presets */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {INTERVAL_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleIntervalPreset(preset.value)}
                className={`py-1.5 rounded-lg text-xs font-medium border transition ${
                  intervalMinutes === preset.value
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-neutral-400">{lang === 'tr' ? 'Veya özel dakika:' : 'Or custom minutes:'}</span>
            <input
              type="number"
              min="5"
              max="10080"
              value={intervalMinutes}
              onChange={(e) =>
                onChange({
                  ...schedule,
                  mode: 'interval',
                  intervalMinutes: Math.max(5, parseInt(e.target.value, 10) || 60),
                })
              }
              className="w-24 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
            />
            <span className="text-xs text-neutral-500">{lang === 'tr' ? 'dakika' : 'minutes'}</span>
          </div>
        </div>
      )}

      {/* MODE 2: DAILY (GÜNLÜK BELİRLİ SAATLER) */}
      {currentMode === 'daily' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-medium text-neutral-300">
              {lang === 'tr' ? 'Her Gün Taranacak Saatler' : 'Specific Daily Times'}
            </label>
            {/* Daily Presets */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleDailyPreset(['09:00', '18:00'])}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition"
              >
                {lang === 'tr' ? 'Sabah & Akşam (09, 18)' : 'Morning & Evening'}
              </button>
              <button
                type="button"
                onClick={() => handleDailyPreset(['09:00', '13:00', '18:00'])}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition"
              >
                {lang === 'tr' ? 'İş Saatleri (09, 13, 18)' : 'Business Hours'}
              </button>
              <button
                type="button"
                onClick={() => handleDailyPreset(['08:00', '12:00', '16:00', '20:00'])}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition"
              >
                {lang === 'tr' ? 'Günde 4 Kez' : '4x Daily'}
              </button>
            </div>
          </div>

          {/* Active Times Pills */}
          <div className="flex flex-wrap items-center gap-2 min-h-[38px] p-2 bg-neutral-900/60 rounded-xl border border-neutral-800">
            {dailyTimes.map((time) => (
              <span
                key={time}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold"
              >
                <Clock className="w-3 h-3" />
                <span>{time}</span>
                {dailyTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDailyTime(time)}
                    className="hover:text-rose-400 p-0.5 transition"
                    title={lang === 'tr' ? 'Saati Kaldır' : 'Remove time'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

            {/* Add new time input */}
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="time"
                value={newTimeInput}
                onChange={(e) => setNewTimeInput(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddDailyTime}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 border border-neutral-700/80 transition"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>{lang === 'tr' ? 'Ekle' : 'Add'}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-neutral-500">
            {lang === 'tr'
              ? 'Akışınız belirlediğiniz saatlerde günde bir veya birkaç defa otomatik taranacaktır.'
              : 'The feed will be scraped automatically at each configured time slot everyday.'}
          </p>
        </div>
      )}

      {/* MODE 3: WEEKLY (HAFTALIK) */}
      {currentMode === 'weekly' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-medium text-neutral-300">
              {lang === 'tr' ? 'Çalışacak Günleri Seçin' : 'Select Scheduled Days'}
            </label>
            {/* Weekly Presets */}
            <div className="flex gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleWeeklyPreset([1, 2, 3, 4, 5])}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition"
              >
                {lang === 'tr' ? 'Hafta İçi (Pzt-Cum)' : 'Weekdays'}
              </button>
              <button
                type="button"
                onClick={() => handleWeeklyPreset([0, 6])}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition"
              >
                {lang === 'tr' ? 'Hafta Sonu' : 'Weekends'}
              </button>
              <button
                type="button"
                onClick={() => handleWeeklyPreset([0, 1, 2, 3, 4, 5, 6])}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition"
              >
                {lang === 'tr' ? 'Tüm Günler' : 'All Days'}
              </button>
            </div>
          </div>

          {/* Day of Week Buttons: Mon to Sun */}
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
              const isSelected = weeklyDays.includes(dayIdx);
              return (
                <button
                  key={dayIdx}
                  type="button"
                  onClick={() => handleToggleWeeklyDay(dayIdx)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition flex flex-col items-center gap-0.5 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="text-[11px]">{dayShort[dayIdx]}</span>
                  <span className="text-[9px] opacity-70 truncate hidden sm:block">
                    {dayNames[dayIdx].substring(0, 3)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Time Picker */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-neutral-400">{lang === 'tr' ? 'Çalışma Saati:' : 'Execution Time:'}</span>
            <input
              type="time"
              value={weeklyTime}
              onChange={(e) =>
                onChange({
                  ...schedule,
                  mode: 'weekly',
                  weeklyDays,
                  weeklyTime: e.target.value,
                })
              }
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
            />
            <span className="text-xs text-neutral-500">
              ({lang === 'tr' ? 'Seçilen her gün bu saatte taranır' : 'Runs at this time on each selected day'})
            </span>
          </div>
        </div>
      )}

      {/* MODE 4: CUSTOM CRON */}
      {currentMode === 'custom_cron' && (
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-medium text-neutral-300">
            {lang === 'tr' ? 'Standart Cron İfadesi' : 'Cron Expression (5 fields)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cronExpression}
              onChange={(e) =>
                onChange({
                  ...schedule,
                  mode: 'custom_cron',
                  cronExpression: e.target.value,
                })
              }
              placeholder="0 9,18 * * 1-5"
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          {/* Quick Cron Examples */}
          <div className="flex flex-wrap gap-1 text-[11px] text-neutral-500">
            <span>{lang === 'tr' ? 'Örnekler:' : 'Examples:'}</span>
            <button
              type="button"
              onClick={() => onChange({ ...schedule, mode: 'custom_cron', cronExpression: '0 9 * * *' })}
              className="hover:text-amber-400 underline font-mono"
            >
              0 9 * * * (Her gün 09:00)
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => onChange({ ...schedule, mode: 'custom_cron', cronExpression: '*/30 * * * *' })}
              className="hover:text-amber-400 underline font-mono"
            >
              */30 * * * * (30 dk'da bir)
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => onChange({ ...schedule, mode: 'custom_cron', cronExpression: '0 8,12,18 * * 1-5' })}
              className="hover:text-amber-400 underline font-mono"
            >
              0 8,12,18 * * 1-5 (Hafta içi 3 kez)
            </button>
          </div>
        </div>
      )}

      {/* Live Schedule Summary Banner */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-300">
          <Clock className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="font-medium">{summaryText}</span>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[11px] shrink-0">
          <span className="text-neutral-500">{lang === 'tr' ? 'Tahmini Sonraki:' : 'Next run:'}</span>
          <strong className="text-amber-400 font-semibold">{nextRunText}</strong>
        </div>
      </div>
    </div>
  );
};
