import express from 'express';
import { createOrder, getAllOrders, getOrderById, updateOrderStatus, deleteOrder } from '../controllers/orderController';
import { verifyToken } from '../middleware/authMiddleware';
import { trackOrderPublic } from '../controllers/orderController';

const router = express.Router();

// Create Order (Customer)
router.post('/create', verifyToken, createOrder);

// Get All (Dynamic based on Role)
router.get('/', verifyToken, getAllOrders);

// Get Single
router.get('/:id', verifyToken, getOrderById);

// Update Status (Vendor/Admin)
router.put('/:id/status', verifyToken, updateOrderStatus);

// Delete (Admin)
router.delete('/:id', verifyToken, deleteOrder);

// Public Tracking
router.get('/track/:trackingId', trackOrderPublic);

export default router;