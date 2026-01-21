import express from 'express';
import { getDashboardStats } from '../controllers/statsController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', verifyToken, getDashboardStats);

export default router;