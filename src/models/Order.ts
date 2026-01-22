import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  customer_id: mongoose.Types.ObjectId;
  products: {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
  }[];
  total_amount: number;
  shipping_address: string;
  phone: string;
  transaction_id: string;
  status: 'Pending' | 'Paid' | 'Failed' | 'Shipped' | 'Delivered';
  payment_status: 'Pending' | 'Success' | 'Failed';
}

const OrderSchema: Schema = new Schema(
  {
    // Match this with Controller (customer_id)
    customer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    products: [
      {
        product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        // Match this with Controller (price)
        price: { type: Number, required: true }, 
      },
    ],
    total_amount: { type: Number, required: true },
    shipping_address: { type: String, required: true },
    phone: { type: String, required: true },
    transaction_id: { type: String, unique: true, required: true },
    status: { 
      type: String, 
      enum: ['Pending', 'Paid', 'Failed', 'Shipped', 'Delivered'], 
      default: 'Pending' 
    },
    payment_status: { 
      type: String, 
      enum: ['Pending', 'Success', 'Failed'], 
      default: 'Pending' 
    },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);