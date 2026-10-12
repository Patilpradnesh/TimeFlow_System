/**
 * ═══════════════════════════════════════════════════════════════════
 * WHATSAPP AUTHENTICATION & SESSION RESOLVER
 * ═══════════════════════════════════════════════════════════════════
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { whatsappConfig, toDigits, log } from './config.js';

export interface BotUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
}

const allowedSet = new Set(whatsappConfig.allowedNumbers);

export const isAllowedNumber = (digits: string): boolean => {
  if (allowedSet.size === 0) return true;
  return allowedSet.has(digits);
};

// Simple rate limiter per phone
const messageHits = new Map<string, number[]>();

export const isRateLimited = (digits: string): boolean => {
  const now = Date.now();
  const windowStart = now - 60_000;
  const history = (messageHits.get(digits) || []).filter((t) => t > windowStart);
  if (history.length >= whatsappConfig.maxMessagesPerMinute) {
    return true;
  }
  history.push(now);
  messageHits.set(digits, history);
  return false;
};

/**
 * Resolves a TimeFlow user from the database given their incoming phone number digits.
 */
export const resolveUserByPhone = async (digits: string): Promise<BotUser | null> => {
  // Suffix matching to handle country code discrepancies (+919876543210 vs 9876543210)
  const suffix = digits.slice(-10);
  const user = await prisma.user.findFirst({
    where: {
      phoneNumber: {
        endsWith: suffix,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
  });

  return user;
};

/**
 * Links a WhatsApp number to a TimeFlow account after verifying credentials.
 */
export const linkAccount = async (
  digits: string,
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; message: string; user?: BotUser }> => {
  if (!whatsappConfig.allowLinking) {
    return { success: false, message: 'Account linking is currently disabled by administrator.' };
  }

  if (!isAllowedNumber(digits)) {
    return { success: false, message: 'This phone number is not on the bot access allow-list.' };
  }

  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: false, message: 'Invalid credentials. User not found.' };
  }

  const isPasswordValid = await bcrypt.compare(passwordInput, user.password);
  if (!isPasswordValid) {
    return { success: false, message: 'Invalid credentials. Incorrect password.' };
  }

  // Update user's phoneNumber
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneNumber: digits },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
  });

  log(`Successfully linked account ${updated.email} to WhatsApp phone ${digits}`);
  return {
    success: true,
    message: `Account linked successfully! Welcome, ${updated.name}.`,
    user: updated,
  };
};

/**
 * Unlinks WhatsApp phone number from the account.
 */
export const unlinkAccount = async (digits: string): Promise<boolean> => {
  const user = await resolveUserByPhone(digits);
  if (!user) return false;

  await prisma.user.update({
    where: { id: user.id },
    data: { phoneNumber: null },
  });

  log(`Unlinked phone ${digits} from account ${user.email}`);
  return true;
};
