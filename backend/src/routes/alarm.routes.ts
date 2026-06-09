import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getAlarms, createAlarm, updateAlarm, deleteAlarm } from '../controllers/alarm.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getAlarms);
router.post('/', createAlarm);
router.patch('/:id', updateAlarm);
router.delete('/:id', deleteAlarm);

export default router;
