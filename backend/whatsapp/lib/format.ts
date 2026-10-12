/**
 * FORMATTING & PARSING HELPERS - Part 1
 */
import { whatsappConfig } from '../config.js';

export interface LocalTimeParts {
  time: string;       // "14:30"
  dateKey: string;    // "2026-09-25"
  weekday: string;    // "MON" | "TUE" | ...
  hour: number;
  minute: number;
}

export const getLocalTimeParts = (date: Date = new Date(), timeZone?: string): LocalTimeParts => {
  const tz = timeZone || whatsappConfig.timezone;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});

  const hourStr = parts.hour === '24' ? '00' : (parts.hour || '00');
  const minuteStr = parts.minute || '00';
  const weekday = (parts.weekday || 'MON').toUpperCase().slice(0, 3);

  return {
    time: `${hourStr}:${minuteStr}`,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
};

export const formatDateOnly = (d: Date | string | null | undefined): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (d: Date | string | null | undefined): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const parseWhen = (raw: string | undefined | null): Date | null => {
  if (!raw) return null;
  const input = raw.trim().toLowerCase();
  const now = new Date();

  const rel = input.match(/^in\s+(\d+)\s*(m|min|mins|h|hr|hrs|d|day|days)$/);
  if (rel) {
    const val = parseInt(rel[1], 10);
    const unit = rel[2][0];
    const target = new Date(now.getTime());
    if (unit === 'm') target.setMinutes(target.getMinutes() + val);
    else if (unit === 'h') target.setHours(target.getHours() + val);
    else if (unit === 'd') target.setDate(target.getDate() + val);
    return target;
  }

  if (input.startsWith('today')) {
    const timePart = input.replace('today', '').trim();
    const target = new Date(now);
    if (!timePart) { target.setHours(23, 59, 0, 0); return target; }
    const [h, m] = timePart.split(':').map((s) => parseInt(s, 10));
    if (!isNaN(h)) { target.setHours(h, isNaN(m) ? 0 : m, 0, 0); return target; }
  }

  if (input.startsWith('tomorrow')) {
    const timePart = input.replace('tomorrow', '').trim();
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    if (!timePart) { target.setHours(23, 59, 0, 0); return target; }
    const [h, m] = timePart.split(':').map((s) => parseInt(s, 10));
    if (!isNaN(h)) { target.setHours(h, isNaN(m) ? 0 : m, 0, 0); return target; }
  }

  const timeOnly = input.match(/^(\d{1,2}):(\d{2})$/);
  if (timeOnly) {
    const h = parseInt(timeOnly[1], 10);
    const m = parseInt(timeOnly[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
      return target;
    }
  }

  const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (iso) {
    const [, yr, mo, da, hr, min] = iso;
    const target = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, parseInt(da, 10), hr ? parseInt(hr, 10) : 23, min ? parseInt(min, 10) : 59);
    return isNaN(target.getTime()) ? null : target;
  }

  const dmy = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (dmy) {
    const [, da, mo, yr, hr, min] = dmy;
    const target = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, parseInt(da, 10), hr ? parseInt(hr, 10) : 23, min ? parseInt(min, 10) : 59);
    return isNaN(target.getTime()) ? null : target;
  }

  const direct = new Date(raw);
  return isNaN(direct.getTime()) ? null : direct;
};

export const JOB_STATUSES = [
  'BOOKMARKED', 'APPLIED', 'ONLINE_ASSESSMENT', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW', 'OFFERED', 'REJECTED'
] as const;

export type JobStatusType = (typeof JOB_STATUSES)[number];

export const STATUS_META: Record<JobStatusType, { label: string; emoji: string }> = {
  BOOKMARKED: { label: 'Bookmarked', emoji: '🔖' },
  APPLIED: { label: 'Applied', emoji: '📤' },
  ONLINE_ASSESSMENT: { label: 'Assessment/OA', emoji: '💻' },
  TECHNICAL_INTERVIEW: { label: 'Tech Round', emoji: '⚙️' },
  HR_INTERVIEW: { label: 'HR Round', emoji: '👥' },
  OFFERED: { label: 'Offered', emoji: '🎉' },
  REJECTED: { label: 'Rejected', emoji: '❌' },
};

export const normalizeStatus = (raw: string | undefined | null): JobStatusType | null => {
  if (!raw) return null;
  const s = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (s === 'BOOKMARKED' || s === 'SAVED' || s === 'BOOKMARK') return 'BOOKMARKED';
  if (s === 'APPLIED' || s === 'APPLY') return 'APPLIED';
  if (s === 'OA' || s === 'ASSESSMENT' || s === 'ONLINEASSESSMENT' || s === 'TEST') return 'ONLINE_ASSESSMENT';
  if (s === 'TECH' || s === 'TECHNICAL' || s === 'TECHNICALINTERVIEW' || s === 'TECHROUND') return 'TECHNICAL_INTERVIEW';
  if (s === 'HR' || s === 'HRROUND' || s === 'HRINTERVIEW') return 'HR_INTERVIEW';
  if (s === 'OFFER' || s === 'OFFERED' || s === 'ACCEPT' || s === 'ACCEPTED') return 'OFFERED';
  if (s === 'REJECT' || s === 'REJECTED' || s === 'REJECTION') return 'REJECTED';
  return null;
};

export const truncate = (str: string | undefined | null, max: number = 40): string => {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
};
