import { Router } from 'express';
import { getActiveReminders } from '../controllers/reminder.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/active', protect, getActiveReminders);

export default router;
