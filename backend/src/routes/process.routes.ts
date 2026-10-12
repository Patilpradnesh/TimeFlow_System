import { Router } from 'express';
import { getProcesses, createProcess, createPhase } from '../controllers/process.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getProcesses);
router.post('/', createProcess);
router.post('/:processId/phases', createPhase);

export default router;
