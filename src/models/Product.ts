import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  vendor_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: string;
  specifications: { key: string; value: string }[];
  images: string[];
  stock: number;
}

const ProductSchema: Schema = new Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    specifications: [
    {
      key: { type: String, required: true },   // e.g., "Processor Model"
      value: { type: String, required: true }  // e.g., "Core i5-13420H"
    }
  ],
    price: { type: Number, required: true },
    category: { type: String, required: true }, // e.g., "Electronics", "Fashion"
    images: [{ type: String }],
    stock: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<IProduct>("Product", ProductSchema);
