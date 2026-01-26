import express from 'express';
import { addReview, getProductReviews, getVendorReviews, replyToReview } from '../controllers/reviewController';
import { isVendor, verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// 1. Vendor Routes (MUST be first)
router.get('/vendor/all', verifyToken, isVendor, getVendorReviews);
router.put('/vendor/:reviewId/reply', verifyToken, isVendor, replyToReview);


router.post('/add', verifyToken, addReview); // Protected
router.get('/:productId', getProductReviews); // Public

export default router;