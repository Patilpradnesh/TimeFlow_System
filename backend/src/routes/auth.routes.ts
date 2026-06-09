import { Router } from 'express';
import { signup, login } from '../controllers/auth.controller.js';

const router = Router();

// Signup Route: POST http://localhost:5000/api/auth/signup
router.post('/signup', signup);

// Login Route: POST http://localhost:5000/api/auth/login
router.post('/login', login);

export default router;
