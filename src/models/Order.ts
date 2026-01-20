import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  customer_id: mongoose.Types.ObjectId;
  products: {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    price_at_purchase: number; // Snapshot of price in case it changes later
  }[];
  total_amount: number;
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  transaction_id: string; // SSLCommerz Tran ID
  shipping_address: string;
}

const OrderSchema: Schema = new Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, required: true },
      price_at_purchase: { type: Number, required: true }
    }
  ],
  total_amount: { type: Number, required: true },
  payment_status: { 
    type: String, 
    enum: ['PENDING', 'PAID', 'FAILED'], 
    default: 'PENDING' 
  },
  transaction_id: { type: String, unique: true },
  shipping_address: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);