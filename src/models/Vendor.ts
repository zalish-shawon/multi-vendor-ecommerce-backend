import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  user_id: mongoose.Types.ObjectId; // Link to the User Login
  shop_name: string;
  shop_logo?: string;
  description?: string;
  bkash_number?: string; // Important for payout in BD
  is_verified: boolean; // Admin must approve the vendor
}

const VendorSchema: Schema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shop_name: { type: String, required: true, unique: true },
  shop_logo: { type: String },
  description: { type: String },
  bkash_number: { type: String }, 
  is_verified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IVendor>('Vendor', VendorSchema);