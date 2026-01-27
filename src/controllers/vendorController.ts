import { Request, Response } from "express";
import Product from "../models/Product";
import Order from "../models/Order";
import Vendor from "../models/Vendor";
import { AuthRequest } from "../middleware/authMiddleware";
import User from "../models/User";


const getVendorId = async (userId?: string) => {
  if (!userId) return undefined;
  const vendorProfile = await Vendor.findOne({ user_id: userId });
  return vendorProfile ? vendorProfile._id : userId;
};

// 1. Get Vendor's Products
export const getMyProducts = async (req: AuthRequest, res: Response) => {
  try {
    const realVendorId = await getVendorId(req.user?.id);
    const products = await Product.find({ vendor_id: realVendorId }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
};

// 2. CREATE PRODUCT (Added this missing function)
export const createVendorProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const realVendorId = await getVendorId(userId);

    const { name, description, price, stock, category, images, specifications } = req.body;

    const newProduct = await Product.create({
      name,
      description,
      price,
      stock,
      category,
      images,           
      specifications,   
      vendor_id: realVendorId 
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: "Error creating product", error });
  }
};

// 3. Edit Product (Secure: Checks Ownership)
export const updateVendorProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const realVendorId = await getVendorId(req.user?.id);

    // Find product that matches ID AND Vendor ID
    const product = await Product.findOneAndUpdate(
      { _id: id, vendor_id: realVendorId },
      { 
        $set: {
            name: req.body.name,
            price: req.body.price,
            stock: req.body.stock,
            category: req.body.category,
            description: req.body.description,
            images: req.body.images,            // ✅ Update Images
            specifications: req.body.specifications // ✅ Update Specs
        }
      },
      { new: true },
    );

    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or unauthorized" });
    res.json({ message: "Product updated", product });
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error });
  }
};

// 4. Delete Product (Secure)
export const deleteVendorProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const realVendorId = await getVendorId(req.user?.id);

    const product = await Product.findOneAndDelete({
      _id: id,
      vendor_id: realVendorId,
    });

    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or unauthorized" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error });
  }
};

// 5. Get Vendor Orders & Calculate Revenue (The Smart Query)
export const getVendorOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const realVendorId = await getVendorId(userId);

    // 1. Get Products
    const myProducts = await Product.find({ vendor_id: realVendorId }).select(
      "_id",
    );
    const myProductIds = myProducts.map((p) => p._id);

    if (myProductIds.length === 0) return res.json([]);

    // 2. Find Orders
    const orders = await Order.find({
      "products.product_id": { $in: myProductIds },
    })
      .populate("customer_id", "name email") // ✅ Correct field name
      .populate({
        path: "products.product_id",
        select: "name price vendor_id images",
      })
      .sort({ createdAt: -1 });

    // 3. Format Response
    const vendorOrders = orders
      .map((order) => {
        const myItems = order.products.filter((item: any) => {
          if (!item.product_id) return false;
          return (
            item.product_id.vendor_id?.toString() === realVendorId?.toString()
          );
        });

        if (myItems.length === 0) return null;

        const myRevenue = myItems.reduce(
          (sum: number, item: any) => sum + item.price * item.quantity,
          0,
        );

        return {
          _id: order._id,
          transaction_id: order.transaction_id,
          customer: order.customer_id, // ✅ Map customer correctly
          status: (order as any).order_status,
          createdAt: (order as any).createdAt,
          items: myItems.map((item: any) => ({
            name: item.product_id.name,
            price: item.price,
            quantity: item.quantity,
            image: item.product_id.images?.[0],
          })),
          vendor_total: myRevenue,
        };
      })
      .filter((order) => order !== null);

    res.json(vendorOrders);
  } catch (error) {
    console.error("Vendor Order Error:", error);
    res.status(500).json({ message: "Error fetching orders", error });
  }
};

// 6. Dashboard Stats
export const getVendorStats = async (req: AuthRequest, res: Response) => {
  try {
    const realVendorId = await getVendorId(req.user?.id);

    // 1. Count Products
    const totalProducts = await Product.countDocuments({
      vendor_id: realVendorId,
    });

    // 2. Calculate Revenue & Sales
    const myProducts = await Product.find({ vendor_id: realVendorId }).select(
      "_id",
    );
    const myProductIds = myProducts.map((p) => p._id.toString());

    // Find all successful orders with my products
    const orders = await Order.find({
      "products.product_id": { $in: myProductIds },
      payment_status: "Success",
    });

    let totalRevenue = 0;
    let totalSales = 0;

    orders.forEach((order) => {
      order.products.forEach((item: any) => {
        if (
          item.product_id &&
          myProductIds.includes(item.product_id.toString())
        ) {
          totalRevenue += item.price * item.quantity;
          totalSales += item.quantity;
        }
      });
    });

    res.json({
      totalProducts,
      totalSales,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error });
  }
};


// 7. GET VENDOR PROFILE (To pre-fill the form)
export const getVendorProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // Fetch User Data (Name, Email, Image)
    const user = await User.findById(userId).select('-password');
    
    // Fetch Vendor Data (Store Name, Phone, Address)
    const vendor = await Vendor.findOne({ user_id: userId });

    if (!user || !vendor) return res.status(404).json({ message: "Vendor not found" });

    // Combine them into one response
    res.json({
      name: user.name,
      email: user.email,
      profileImg: user.profileImg,
      store_name: vendor.store_name,
      phone: vendor.phone,
      address: vendor.addresses
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error });
  }
};


// GET ALL VENDORS
export const getAllVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await Vendor.find().select('-password').sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch vendors", error });
  }
};


export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Vendor.findByIdAndDelete(id);
    res.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete vendor", error });
  }
};

// 8. UPDATE VENDOR PROFILE
export const updateVendorProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, profileImg, store_name, phone, address } = req.body;

    // A. Update User Collection (Name, Image)
    await User.findByIdAndUpdate(userId, { name, profileImg });

    // B. Update Vendor Collection (Store Info)
    await Vendor.findOneAndUpdate(
      { user_id: userId },
      { store_name, phone, address } // Update these specific fields
    );

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update profile", error });
  }
};