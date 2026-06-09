import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goal.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getGoals);
router.post('/', createGoal);
router.patch('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
