import { Router } from 'express';
import { submitEvidence, getEvidenceForSession } from '../controllers/eie.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/', submitEvidence);
router.get('/session/:sessionId', getEvidenceForSession);

export default router;
