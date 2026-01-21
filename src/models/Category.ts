import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string; // URL-friendly version (e.g., "smart-phones")
  image?: string;
}

const CategorySchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, lowercase: true, unique: true },
  image: { type: String }
});

export default mongoose.model<ICategory>('Category', CategorySchema);