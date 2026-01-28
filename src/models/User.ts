import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'VENDOR' | 'CUSTOMER' | 'DELIVERY';
  phone?: string;
  profileImg?: string; // 

  // NEW: Address Array
  addresses: {
    _id?: string; // Auto-generated ID for each address
    details: string; // "House 12, Road 5..."
    city: string;    // "Dhaka"
    postalCode: string;
    isDefault: boolean;
  }[];
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['ADMIN', 'VENDOR', 'CUSTOMER', 'DELIVERY'], 
    default: 'CUSTOMER' 
  },
  phone: { type: String },
  profileImg: { type: String },
  
   addresses: [
      {
        details: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
      }
    ],
    login_otp: { type: String },
    otp_expires: { type: Date },
  }, 
 { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);