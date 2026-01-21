import { Request, Response } from 'express';
import Review from '../models/Review';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/authMiddleware';

// 1. Add Review (Secure Check: Must have purchased item)
export const addReview = async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, rating, comment } = req.body;
    const userId = req.user?.id;

    // A. Check if user already reviewed this
    const existingReview = await Review.findOne({ user_id: userId, product_id });
    if (existingReview) {
        return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // B. Verify Purchase (The "Advanced" Check)
    // We look for an order that is PAID and contains this product ID
    const hasPurchased = await Order.findOne({
        customer_id: userId,
        "products.product_id": product_id,
        payment_status: "PAID"
    });

    if (!hasPurchased) {
        return res.status(403).json({ message: 'You can only review products you bought!' });
    }

    // C. Save Review
    const review = new Review({
        user_id: userId,
        product_id,
        rating,
        comment
    });

    await review.save();
    res.status(201).json({ message: 'Review added successfully', review });

  } catch (error) {
    res.status(500).json({ message: 'Error adding review', error });
  }
};

// 2. Get Reviews for a Product (Public)
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product_id: productId })
        .populate('user_id', 'name')
        .sort({ createdAt: -1 }); // Newest first

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};