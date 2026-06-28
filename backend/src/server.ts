import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { initializeWhatsApp } from './utils/whatsapp.js';
import { startBackgroundWorker } from './utils/worker.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize HTTP server and Socket.IO
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Middleware
app.use(cors()); // Allows the frontend to talk to the backend
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

// Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'TimeFlow Backend is running perfectly!',
    timestamp: new Date().toISOString()
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 TimeFlow Server running on http://localhost:${PORT}`);
  
  io.on('connection', (socket) => {
    console.log('⚡ A user connected to the Live Sync Engine:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('🔌 User disconnected:', socket.id);
    });
  });

  // Start the Intelligent Engines (DISABLED FOR NOW)
  // initializeWhatsApp();
  // startBackgroundWorker();
});
