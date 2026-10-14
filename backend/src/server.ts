import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import noteRoutes from './routes/note.routes.js';
import reminderRoutes from './routes/reminder.routes.js';
import flowgridRoutes from './routes/flowgrid.routes.js';
import alarmRoutes from './routes/alarm.routes.js';
import goalRoutes from './routes/goal.routes.js';
import trackerRoutes from './routes/tracker.routes.js';
import behaviorRoutes from './routes/behavior.routes.js';
import processRoutes from './routes/process.routes.js';
import eieRoutes from './routes/eie.routes.js';
import jobApplicationRoutes from './routes/jobApplication.routes.js';
// import { startWhatsAppBot } from '../whatsapp/index.js';
import { prisma } from './lib/prisma.js';
import { registerRealtime } from './lib/realtime.js';

const app = express();
const PORT = env.PORT;

// Initialize HTTP server and Socket.IO
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Hand the socket instance to the realtime registry so any controller can
// push live updates without importing this file (avoids a circular import).
registerRealtime(io);

/**
 * Socket authentication handshake.
 * The browser sends its JWT in `auth.token`; we verify it once and stash the
 * real userId on the socket. Clients with a missing/invalid token may still
 * connect (so the UI can degrade gracefully) but are never placed in a room.
 */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next();

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    (socket.data as { userId?: string }).userId = decoded.userId;
    next();
  } catch {
    // Invalid/expired token: allow the connection, but keep it room-less.
    next();
  }
});

// Middleware
const ALLOWED_ORIGIN = env.FRONTEND_URL;
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,  // Required for HttpOnly cookie auth
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' })); // Allows large CSV JSON payloads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/flowgrid', flowgridRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/trackers', trackerRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/processes', processRoutes);
app.use('/api/eie', eieRoutes);
app.use('/api/job-applications', jobApplicationRoutes);

// Health Check Route (now pings DB for real status)
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'ok';
  try {
    await (prisma as any).$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }
  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    message: 'TimeFlow Backend is running',
    timestamp: new Date().toISOString(),
    services: { database: dbStatus }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 TimeFlow Server running on http://localhost:${PORT}`);
  
  io.on('connection', (socket) => {
    console.log('⚡ A user connected to the Live Sync Engine:', socket.id);

    // The room is derived from the VERIFIED token (see io.use above), never
    // from a value the client sends — otherwise anyone could subscribe to
    // another student's stream by guessing an id.
    const authenticatedUserId = (socket.data as { userId?: string }).userId;

    if (authenticatedUserId) {
      socket.join(`user:${authenticatedUserId}`);
      console.log(`🔒 Socket ${socket.id} auto-joined room user:${authenticatedUserId}`);
    }

    // Kept for backward compatibility with older clients that explicitly ask
    // to join. The payload is intentionally IGNORED.
    const joinOwnRoom = () => {
      if (authenticatedUserId) socket.join(`user:${authenticatedUserId}`);
    };
    socket.on('join', joinOwnRoom);
    socket.on('join-user-room', joinOwnRoom);

    socket.on('disconnect', () => {
      console.log('🔌 User disconnected:', socket.id);
    });
  });

  // // Start the Intelligent WhatsApp & Notification Bot
  // startWhatsAppBot().catch((err) => {
  //   console.error('[whatsapp] Startup error:', err);
  // });
});
