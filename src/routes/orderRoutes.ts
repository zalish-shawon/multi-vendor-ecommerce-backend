import express from 'express';
import { createOrder } from '../controllers/orderController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/create', verifyToken, createOrder);

export default router;