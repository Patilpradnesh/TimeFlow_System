import { Router } from 'express';
import { updateIndustry } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Update Industry Route: PUT http://localhost:5000/api/user/industry
// We use 'protect' because only logged-in users can update their industry
router.put('/industry', protect, updateIndustry);

export default router;
