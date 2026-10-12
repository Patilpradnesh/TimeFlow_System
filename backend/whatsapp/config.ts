/**
 * ═══════════════════════════════════════════════════════════════════
 * WHATSAPP BOT — CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════
 * The one place that reads environment variables, so no other file in the
 * bot has to touch `process.env` directly.
 *
 * Everything here is OPTIONAL: with no new .env entries the bot still runs,
 * it just falls back to the safest behaviour (see ACCESS MODEL below).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../src/config/env.js';

/** Directory of this file, i.e. `backend/whatsapp`. */
const here = path.dirname(fileURLToPath(import.meta.url));

/** The backend package root — owner of `.env`, `node_modules` and `.wwebjs_auth`. */
export const BACKEND_ROOT = path.resolve(here, '..');

/**
 * "919876543210, +91 98123 45678" → ["919876543210", "919812345678"].
 *
 * Numbers are reduced to digits only because WhatsApp reports
 * `919876543210@c.us` while a human types "+91 98765 43210".
 */
const parseNumberList = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.replace(/\D/g, ''))
    .filter((entry) => entry.length >= 8); // anything shorter cannot be a real number
};

/** Reduces anything WhatsApp gives us to a bare digit string, or null. */
export const toDigits = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
};

/**
 * ACCESS MODEL (the security boundary for the whole bot)
 *
 *   • `WHATSAPP_ALLOWED_NUMBERS` set → only those numbers may talk to the bot.
 *     They still have to `link` themselves before any personal data is shown.
 *   • not set → any number may run `link <email> <password>` (the account
 *     password is the gate); a successful link binds that number forever.
 *   • `WHATSAPP_ALLOW_LINKING=false` → linking is refused everywhere, which
 *     turns the bot into a strict allow-list-only channel.
 */
export const whatsappConfig = {
  /**
   * Auto-start together with the Express server (the requested default).
   * Set `WHATSAPP_ENABLED=false` while doing heavy code editing: `tsx --watch`
   * restarts the whole process on every save and each restart re-opens the
   * WhatsApp session.
   */
  enabled: (process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false',

  /** Digits-only allow-list. Empty array means "anyone may try to link". */
  allowedNumbers: parseNumberList(process.env.WHATSAPP_ALLOWED_NUMBERS),

  /** When false, `link` is refused for every number (lock-down mode). */
  allowLinking: (process.env.WHATSAPP_ALLOW_LINKING ?? 'true').toLowerCase() !== 'false',

  /**
   * Timezone used to decide "is it 07:30 right now?" for recurring alarms.
   * Undefined = the machine's local time, the same convention the existing
   * cron worker uses.
   */
  timezone: process.env.WHATSAPP_TIMEZONE?.trim() || undefined,

  /** Optional daily digest, "HH:MM". Set it to an empty string to disable. */
  dailyDigestAt: (process.env.WHATSAPP_DAILY_DIGEST ?? '08:00').trim(),

  /** Prepend this country code when a student types a 10-digit number. */
  defaultCountryCode: (process.env.WHATSAPP_COUNTRY_CODE ?? '').replace(/\D/g, ''),

  /** How long a "reply *yes* to confirm" prompt stays valid. */
  confirmationWindowMs: 60_000,

  /** Naive flood guard: messages allowed per number per rolling minute. */
  maxMessagesPerMinute: 20,

  /** List replies are capped so we never exceed WhatsApp's ~4096 character limit. */
  maxListItems: 12,

  /** The bot calls the same Express app it lives inside. */
  apiBaseUrl: `http://127.0.0.1:${env.PORT}/api`,

  /** Timeout for those internal API calls (ms). */
  apiTimeoutMs: 15_000,

  /**
   * Session folder. It MUST stay `<backend>/.wwebjs_auth` with the default
   * clientId ("default"): that is where the already-paired WhatsApp Web
   * profile lives, so the bot normally boots without asking for a QR code.
   */
  sessionPath: path.join(BACKEND_ROOT, '.wwebjs_auth'),

  /** Log prefix so the bot's lines are easy to spot in the server output. */
  logTag: '[whatsapp]',
} as const;

export type WhatsAppConfig = typeof whatsappConfig;

/** Small logging helper so every bot line shares one prefix. */
export const log = (...parts: unknown[]): void => {
  console.log(whatsappConfig.logTag, ...parts);
};
export const logError = (...parts: unknown[]): void => {
  console.error(whatsappConfig.logTag, ...parts);
};
