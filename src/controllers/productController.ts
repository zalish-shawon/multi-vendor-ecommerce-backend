import { Response } from 'express';
import Product from '../models/Product';
import Vendor from '../models/Vendor';
import { AuthRequest } from '../middleware/authMiddleware';

// 1. Create a Product (Vendor Only)
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, category, stock } = req.body;
    
    // Multer adds 'req.files' (Array) for multiple uploads
    const files = (req.files as Express.Multer.File[]) || [];
    const images = files.map(file => file.path); // Extract URLs

    // Find vendor from authenticated user
    const userId = req.user?.id;
    const vendor = await Vendor.findOne({ user_id: userId });
    if (!vendor) {
      return res.status(403).json({ message: 'Only vendors can create products' });
    }

    const newProduct = new Product({
      vendor_id: vendor._id,
      name,
      description,
      price: Number(price), // Important: Convert string to number
      stock: Number(stock),
      category,
      images: images // Save the array of Cloudinary URLs
    });

    await newProduct.save();
    res.status(201).json(newProduct);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// 2. Get All Products (Public)
export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Destructure Query Params
    const { searchTerm, category, minPrice, maxPrice, sortBy, page = 1, limit = 10 } = req.query;

    // 2. Build the Filter Object
    let filter: any = {};

    // Search Logic (Regex for partial match, case insensitive)
    if (searchTerm) {
        filter.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    // Exact Filter
    if (category) {
        filter.category = category;
    }

    // Range Filter
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice); // Greater than
        if (maxPrice) filter.price.$lte = Number(maxPrice); // Less than
    }

    // 3. Sorting Logic
    let sortOptions: any = {};
    if (sortBy === 'price_asc') sortOptions.price = 1;
    if (sortBy === 'price_desc') sortOptions.price = -1;
    if (sortBy === 'newest') sortOptions.createdAt = -1;

    // 4. Pagination Logic
    const skip = (Number(page) - 1) * Number(limit);

    // 5. Execute Query
    const products = await Product.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .populate('vendor_id', 'shop_name');

    // 6. Get Total Count (For frontend pagination UI)
    const total = await Product.countDocuments(filter);

    res.json({
        products,
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update Product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 1. Check if product exists
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // 2. Verify Ownership (Is this YOUR product?)
    const vendor = await Vendor.findOne({ user_id: userId });
    if (!vendor || product.vendor_id.toString() !== vendor._id.toString()) {
        return res.status(403).json({ message: 'You can only update your own products' });
    }

    // 3. Update
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

//  Get product by ID
export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error });
  }
};

// Delete Product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const vendor = await Vendor.findOne({ user_id: userId });
    if (!vendor || product.vendor_id.toString() !== vendor._id.toString()) {
        return res.status(403).json({ message: 'You can only delete your own products' });
    }

    await Product.findByIdAndDelete(id);
    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};