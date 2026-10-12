/**
 * ═══════════════════════════════════════════════════════════════════
 * WHATSAPP API CLIENT (Self-Hosted Internal Gateway)
 * ═══════════════════════════════════════════════════════════════════
 * Communicates with the Express backend via REST using short-lived minted
 * JWTs carrying the user's authentic identity.
 *
 * This ensures all database operations:
 *   1. Obey user isolation (`req.userId`)
 *   2. Trigger real-time Socket.IO broadcasts (`emitToUser`)
 *   3. Enforce Zod validation schemas
 *   4. Update timeline, behavioral graphs, and completion metrics
 */

import axios, { type AxiosInstance, AxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { whatsappConfig, logError } from '../config.js';

interface CachedClient {
  client: AxiosInstance;
  expiresAt: number;
}

const clientCache = new Map<string, CachedClient>();

/**
 * Creates or retrieves a cached Axios client with a valid Bearer JWT
 * for the requested user.
 */
const getClientForUser = (userId: string): AxiosInstance => {
  const now = Date.now();
  const cached = clientCache.get(userId);

  if (cached && cached.expiresAt > now + 60_000) {
    return cached.client;
  }

  // Mint a 2-hour JWT signed with the main server's JWT_SECRET
  const token = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '2h' });

  const client = axios.create({
    baseURL: whatsappConfig.apiBaseUrl,
    timeout: whatsappConfig.apiTimeoutMs,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TimeFlow-WhatsApp-Bot/1.0',
    },
  });

  clientCache.set(userId, {
    client,
    expiresAt: now + 2 * 60 * 60 * 1000,
  });

  return client;
};

/**
 * Extracts a clean, human-readable error message from an Axios error or generic error.
 */
export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string; error?: string; errors?: unknown }>;
    if (err.response?.data) {
      if (typeof err.response.data.message === 'string') return err.response.data.message;
      if (typeof err.response.data.error === 'string') return err.response.data.error;
    }
    if (err.code === 'ECONNREFUSED') return 'Backend server is unreachable. Please verify the API is running.';
    if (err.message) return err.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
};

/**
 * Uniform REST wrapper for all bot commands.
 */
export const api = {
  get: async <T>(userId: string, path: string, params?: Record<string, unknown>): Promise<T> => {
    try {
      const res = await getClientForUser(userId).get<T>(path, { params });
      return res.data;
    } catch (err) {
      logError(`GET ${path} failed for user ${userId}:`, extractErrorMessage(err));
      throw err;
    }
  },

  post: async <T>(userId: string, path: string, data?: unknown): Promise<T> => {
    try {
      const res = await getClientForUser(userId).post<T>(path, data);
      return res.data;
    } catch (err) {
      logError(`POST ${path} failed for user ${userId}:`, extractErrorMessage(err));
      throw err;
    }
  },

  patch: async <T>(userId: string, path: string, data?: unknown): Promise<T> => {
    try {
      const res = await getClientForUser(userId).patch<T>(path, data);
      return res.data;
    } catch (err) {
      logError(`PATCH ${path} failed for user ${userId}:`, extractErrorMessage(err));
      throw err;
    }
  },

  put: async <T>(userId: string, path: string, data?: unknown): Promise<T> => {
    try {
      const res = await getClientForUser(userId).put<T>(path, data);
      return res.data;
    } catch (err) {
      logError(`PUT ${path} failed for user ${userId}:`, extractErrorMessage(err));
      throw err;
    }
  },

  delete: async <T>(userId: string, path: string): Promise<T> => {
    try {
      const res = await getClientForUser(userId).delete<T>(path);
      return res.data;
    } catch (err) {
      logError(`DELETE ${path} failed for user ${userId}:`, extractErrorMessage(err));
      throw err;
    }
  },

  downloadBuffer: async (userId: string, path: string): Promise<{ buffer: Buffer; mimeType: string }> => {
    try {
      const res = await getClientForUser(userId).get(path, { responseType: 'arraybuffer' });
      const mimeType = (res.headers['content-type'] as string) || 'application/octet-stream';
      return { buffer: Buffer.from(res.data), mimeType };
    } catch (err) {
      logError(`Download ${path} failed for user ${userId}:`, extractErrorMessage(err));
      throw err;
    }
  },
};
