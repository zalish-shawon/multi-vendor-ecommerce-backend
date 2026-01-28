import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  store_name: string;
  email: string;
  password: string; // We will store the Hashed Password here
  store_logo?: string;
  description?: string;
  phone?: string;
  addresses: {
    details: string;
    city: string;
    postalCode: string;
    isDefault: boolean;
  }[];
  bkash_number?: string;
  is_verified: boolean;
  role: string; 
}

const VendorSchema: Schema = new Schema({
  // ❌ REMOVED: user_id field (No longer needed)
  
  store_name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Store hashed password here
  
  store_logo: { type: String },
  description: { type: String },
  phone: { type: String },
  
  addresses: [
      {
        details: { type: String },
        city: { type: String },
        postalCode: { type: String },
        isDefault: { type: Boolean, default: false }
      }
    ],
  
  bkash_number: { type: String }, 
  is_verified: { type: Boolean, default: true }, // Default true if Admin creates it
  role: { type: String, default: 'vendor' } // Helps with Auth checks
}, { timestamps: true });

export default mongoose.model<IVendor>('Vendor', VendorSchema);