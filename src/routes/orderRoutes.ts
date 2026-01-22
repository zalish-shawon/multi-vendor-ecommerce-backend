import express from 'express';
import { createOrder, getAllOrders, getOrderById, updateOrderStatus, deleteOrder, paymentFail, paymentSuccess, getMyOrders } from '../controllers/orderController';
import { verifyToken } from '../middleware/authMiddleware';
import { trackOrderPublic } from '../controllers/orderController';

const router = express.Router();

// Create Order (Customer)
router.post('/create', verifyToken, createOrder);

// Get All (Dynamic based on Role)
router.get('/', verifyToken, getAllOrders);

// Get My Orders (Customer)
router.get('/my-orders', verifyToken, getMyOrders);

// Get Single
router.get('/:id', verifyToken, getOrderById);

// Update Status (Vendor/Admin)
router.put('/:id/status', verifyToken, updateOrderStatus);

// Delete (Admin)
router.delete('/:id', verifyToken, deleteOrder);

// Public Tracking
router.get('/track/:trackingId', trackOrderPublic);

// SSLCommerz Callbacks (Public)
router.post('/payment/success/:tranId', paymentSuccess);
router.post('/payment/fail/:tranId', paymentFail);

export default router;