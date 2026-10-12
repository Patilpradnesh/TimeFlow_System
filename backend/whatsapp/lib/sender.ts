/**
 * ═══════════════════════════════════════════════════════════════════
 * WHATSAPP SENDER — the ONE place that actually talks to WhatsApp
 * ═══════════════════════════════════════════════════════════════════
 * Why this file exists separately from `index.ts`:
 * the scheduler (`notifications.ts`) and the commands both need to send
 * messages, and if they imported the client module directly we would get a
 * circular import (index → scheduler → index). So `index.ts` registers its
 * client here once, and everybody else calls these functions.
 *
 * Every send is:
 *   • gated on `ready` — a message sent before the session is authenticated
 *     would silently disappear;
 *   • wrapped in try/catch — one failed send must never take down the server;
 *   • reported as a boolean, so callers can decide whether to update their
 *     "already sent" bookkeeping (never mark something as sent if it wasn't).
 */

import pkg from 'whatsapp-web.js';
import { log, logError } from '../config.js';

/** The slice of the `whatsapp-web.js` Client that this project uses. */
interface WhatsAppClientLike {
  sendMessage(chatId: string, content: unknown, options?: unknown): Promise<{ id?: { id?: string } }>;
  getState?(): Promise<string>;
  info?: {
    wid?: {
      user?: string;
      _serialized?: string;
    };
  };
}

/**
 * `MessageMedia` is a class export of a CommonJS package, so it is pulled off
 * the default export the same way `Client`/`LocalAuth` are.
 */
const MessageMediaCtor = (pkg as unknown as {
  MessageMedia?: new (mimetype: string, data: string, filename?: string, filesize?: number) => unknown;
}).MessageMedia;

let client: WhatsAppClientLike | null = null;
let ready = false;
let lastReadyAt: number | null = null;

/** Called once by `index.ts` with the live client. */
export const registerSenderClient = (instance: WhatsAppClientLike): void => {
  client = instance;
};

/** Called on `ready` / `disconnected` so sends can be safely skipped. */
export const setSenderReady = (value: boolean): void => {
  ready = value;
  if (value) lastReadyAt = Date.now();
};

/** True only when the session is authenticated AND the client exists. */
export const isSenderReady = (): boolean => ready && client !== null;

/** Retrieves the connected bot's phone digits if authenticated. */
export const getBotPhoneNumber = (): string | null => {
  if (process.env.WHATSAPP_BOT_NUMBER) {
    const cleaned = process.env.WHATSAPP_BOT_NUMBER.replace(/\D/g, '');
    if (cleaned.length >= 8) return cleaned;
  }
  const widUser = client?.info?.wid?.user;
  if (widUser) {
    const cleaned = widUser.replace(/\D/g, '');
    if (cleaned.length >= 8) return cleaned;
  }
  return null;
};

/** Diagnostics for `/api/health`-style checks and the startup log. */
export const senderStatus = (): { ready: boolean; configured: boolean; lastReadyAt: number | null; botPhone: string | null } => ({
  ready,
  configured: client !== null,
  lastReadyAt,
  botPhone: getBotPhoneNumber(),
});

/** "919876543210" → "919876543210@c.us" (already-qualified ids pass through). */
const toChatId = (phone: string): string => (phone.includes('@') ? phone : `${phone}@c.us`);

/**
 * Sends a plain text message.
 * Returns true only when WhatsApp accepted the message — callers use this to
 * decide whether to record the notification as sent.
 */
export const sendText = async (phone: string, text: string): Promise<boolean> => {
  if (!client || !ready) {
    log(`skip send (session not ready) → ${phone}`);
    return false;
  }

  try {
    const chatId = toChatId(phone);
    // The typing indicator makes long replies feel responsive instead of broken.
    await client.sendMessage(chatId, text);
    return true;
  } catch (error) {
    logError(`failed to send to ${phone}:`, error);
    return false;
  }
};

/**
 * Sends a document (used to hand a stored resume back to the student).
 * `buffer` is the exact byte content previously stored in Postgres.
 */
export const sendDocument = async (
  phone: string,
  options: { buffer: Buffer; fileName: string; mimeType: string; caption?: string }
): Promise<boolean> => {
  if (!client || !ready) {
    log(`skip document send (session not ready) → ${phone}`);
    return false;
  }
  if (!MessageMediaCtor) {
    logError('MessageMedia is unavailable in this whatsapp-web.js build; sending a text notice instead.');
    return sendText(phone, `📄 ${options.fileName} — download it from the TimeFlow web app (file sending is unavailable).`);
  }

  try {
    const media = new MessageMediaCtor(
      options.mimeType,
      options.buffer.toString('base64'),
      options.fileName,
      options.buffer.byteLength
    );
    const chatId = toChatId(phone);
    await client.sendMessage(chatId, media, options.caption ? { caption: options.caption } : undefined);
    return true;
  } catch (error) {
    logError(`failed to send document to ${phone}:`, error);
    return false;
  }
};
