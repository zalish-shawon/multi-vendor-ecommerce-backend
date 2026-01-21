import express from 'express';
import { addReview, getProductReviews } from '../controllers/reviewController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/add', verifyToken, addReview); // Protected
router.get('/:productId', getProductReviews); // Public

export default router;