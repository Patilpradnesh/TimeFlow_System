import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { logEvent, startExecutionSession, endExecutionSession } from '../controllers/behavior.controller.js';

const router = express.Router();

router.use(protect);

router.post('/log', logEvent);
router.post('/session/start', startExecutionSession);
router.post('/session/end', endExecutionSession);

export default router;
