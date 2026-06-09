import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getTrackers, createTracker, updateTracker, deleteTracker } from '../controllers/tracker.controller.js';

const router = express.Router();

router.use(protect);
router.get('/', getTrackers);
router.post('/', createTracker);
router.put('/:id', updateTracker);
router.delete('/:id', deleteTracker);

export default router;
