import { Request, Response } from "express";
import Review from "../models/Review";
import Order from "../models/Order";
import { AuthRequest } from "../middleware/authMiddleware";
import Product from "../models/Product";

// Helper to resolve vendor id from authenticated user id.
// If your app stores vendors in a separate collection, replace this with the proper lookup.
const getVendorId = async (
  userId?: string | undefined,
): Promise<string | undefined> => {
  return userId;
};

// 1. Add Review (Secure Check: Must have purchased item)
export const addReview = async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, rating, comment } = req.body;
    const userId = req.user?.id;

    // A. Check if user actually bought and received the product
    const hasPurchased = await Order.findOne({
      customer_id: userId,
      "products.product_id": product_id, // Check inside the products array
      order_status: "Delivered", // Only allow if delivered
    });

    if (!hasPurchased) {
      return res
        .status(403)
        .json({
          message:
            "You can only review products you have purchased and received.",
        });
    }

    // B. Check if review already exists
    const existingReview = await Review.findOne({
      user_id: userId,
      product_id,
    });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product." });
    }

    // C. Create Review
    const review = await Review.create({
      user_id: userId,
      product_id,
      rating,
      comment,
    });

    await review.populate("user_id", "name profileImg");

    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add review", error });
  }
};

// 2. Get Reviews for a Product (Public)
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product_id: productId })
      .populate("user_id", "name")
      .sort({ createdAt: -1 }); // Newest first

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews" });
  }
};

// 3. Get Vendor Reviews (Vendor Portal)
export const getVendorReviews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const realVendorId = await getVendorId(userId);

    // A. Find all products owned by this vendor
    const myProducts = await Product.find({ vendor_id: realVendorId }).select(
      "_id",
    );
    const myProductIds = myProducts.map((p) => p._id);

    // B. Find reviews for these products
    const reviews = await Review.find({ product_id: { $in: myProductIds } })
      .populate("user_id", "name profileImg") // Customer details
      .populate("product_id", "name images") // Product details
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error });
  }
};

// 4. Reply to Review (Vendor Portal)
export const replyToReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    const userId = req.user?.id;
    const realVendorId = await getVendorId(userId);

    // A. Find the review
    const review = await Review.findById(reviewId).populate("product_id");
    if (!review) return res.status(404).json({ message: "Review not found" });

    // B. Security Check: Does this product belong to this vendor?
    const product = review.product_id as any;
    // Ensure we compare strings to avoid ObjectId mismatches
    if (product.vendor_id.toString() !== realVendorId?.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Not your product" });
    }

    // C. Save Reply
    (review as any).vendor_reply = reply;
    (review as any).reply_date = new Date();
    await review.save();

    res.json({ message: "Reply sent", review });
  } catch (error) {
    res.status(500).json({ message: "Failed to reply", error });
  }
};
