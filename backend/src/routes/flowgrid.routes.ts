import { Router } from 'express';
import { getFlowGrid, updateFlowGrid } from '../controllers/flowgrid.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getFlowGrid);
router.post('/update', updateFlowGrid);

export default router;
