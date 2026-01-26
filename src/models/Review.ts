import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  user_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
}

const ReviewSchema: Schema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

// Prevent duplicate reviews: One user can review a product only ONCE
ReviewSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', ReviewSchema);



