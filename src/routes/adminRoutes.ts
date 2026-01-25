import express from 'express';
import { getDashboardStats } from '../controllers/adminController';
import { verifyToken, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/stats', verifyToken, isAdmin, getDashboardStats);

export default router;