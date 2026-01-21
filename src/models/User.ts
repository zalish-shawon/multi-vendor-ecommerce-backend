import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  phone?: string;
  profileImg?: string; // 
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['ADMIN', 'VENDOR', 'CUSTOMER'], 
    default: 'CUSTOMER' 
  },
  phone: { type: String },
  profileImg: { type: String } // 
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);