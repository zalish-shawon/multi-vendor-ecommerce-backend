import express from 'express';
import { initPayment, paymentSuccess, paymentFail } from '../controllers/paymentController';

const router = express.Router();

// Initialize Payment (Called by Frontend when user clicks "Pay")
router.post('/init', initPayment);

// Callback URLs (Called by SSLCommerz)
// NOTE: We use POST because SSLCommerz sends data via POST
router.post('/success/:tranId', paymentSuccess);
router.post('/fail/:tranId', paymentFail);
router.post('/cancel/:tranId', paymentFail); // Treat cancel as fail


export default router;