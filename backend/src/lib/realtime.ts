import type { Server } from 'socket.io';

/**
 * Real-Time Engine — shared socket registry.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Controllers need to push live updates to a specific user's browser
 * (e.g. "this job moved to Technical Interview"). Importing `io` directly
 * from `server.ts` would create a circular import (server -> routes ->
 * controller -> server), which is fragile in ESM.
 *
 * Instead, `server.ts` hands the socket instance to `registerRealtime()`
 * exactly once at boot, and any controller can then call `emitToUser()`.
 *
 * ROOMS
 * -----
 * Every authenticated socket joins the room `user:<userId>` (see server.ts).
 * `emitToUser` targets only that room, so user A can never receive user B's
 * data — the security boundary is enforced by the room name.
 */

let socketServer: Server | null = null;

/** Called once from server.ts after the Socket.IO server is created. */
export const registerRealtime = (server: Server): void => {
  socketServer = server;
  console.log('🔌 Real-Time Engine registered.');
};

/**
 * Emits an event to every open tab/device of a single user.
 * Silently no-ops when the socket layer is not up yet (e.g. during tests),
 * so a real-time failure can never break an API response.
 */
export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  if (!socketServer) return;
  try {
    socketServer.to(`user:${userId}`).emit(event, payload);
  } catch (error) {
    console.error(`Realtime emit failed for event "${event}":`, error);
  }
};

/** Socket event names for the Job Application Tracker, kept in one place. */
export const JOB_APPLICATION_EVENTS = {
  CREATED: 'job-application:created',
  UPDATED: 'job-application:updated',
  DELETED: 'job-application:deleted',
} as const;
