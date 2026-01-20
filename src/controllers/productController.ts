import { Response } from 'express';
import Product from '../models/Product';
import Vendor from '../models/Vendor';
import { AuthRequest } from '../middleware/authMiddleware';

// 1. Create a Product (Vendor Only)
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, price, category, stock, images } = req.body;
    const userId = req.user?.id;

    // Find the Vendor Profile associated with this User
    // (In a real app, you'd auto-create a Vendor profile on registration, 
    // but for now, we'll check if one exists or create a placeholder)
    let vendor = await Vendor.findOne({ user_id: userId });

    if (!vendor) {
      // Auto-create a vendor profile if it doesn't exist (for simplicity now)
      vendor = new Vendor({
        user_id: userId,
        shop_name: `Shop-${userId}`, 
        is_verified: true
      });
      await vendor.save();
    }

    const newProduct = new Product({
      vendor_id: vendor._id, // Link product to the Vendor ID, not User ID
      name,
      description,
      price,
      category,
      stock,
      images
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// 2. Get All Products (Public)
export const getAllProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await Product.find().populate('vendor_id', 'shop_name');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};