import express from 'express';
import { createOrder, getAllOrders, getOrderById, updateOrderStatus, deleteOrder, paymentFail, paymentSuccess, getMyOrders, cancelOrder } from '../controllers/orderController';
import { verifyToken } from '../middleware/authMiddleware';
import { trackOrderPublic } from '../controllers/orderController';
import { assignDelivery, getMyDeliveries, updateDeliveryStatus } from '../controllers/deliveryController';

const router = express.Router();

// Delivery Routes
router.post('/assign', verifyToken, assignDelivery); // Admin Only (add isAdmin if you have it)
router.put('/status', verifyToken, updateDeliveryStatus); // Delivery Man or Admin
router.get('/my-deliveries', verifyToken, getMyDeliveries); // Delivery Man Only

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

// Cancel Order (Customer)
router.delete('/payment/cancel/:id', verifyToken, cancelOrder)



export default router;