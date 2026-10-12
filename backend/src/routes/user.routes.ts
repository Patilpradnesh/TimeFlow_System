import { Router } from 'express';
import { updateIndustry } from '../controllers/user.controller.js';
import {
  getWhatsAppStatus,
  updateWhatsAppNumber,
  disconnectWhatsApp,
  sendTestWhatsApp,
} from '../controllers/user.controller.js';

import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Update Industry Route: PUT http://localhost:5000/api/user/industry
// We use 'protect' because only logged-in users can update their industry
router.put('/industry', protect, updateIndustry);

// WhatsApp Connection Management Routes
router.get('/whatsapp', protect, getWhatsAppStatus);
router.post('/whatsapp/connect', protect, updateWhatsAppNumber);
router.post('/whatsapp/disconnect', protect, disconnectWhatsApp);
router.post('/whatsapp/test', protect, sendTestWhatsApp);

export default router;
