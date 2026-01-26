import { Request, Response } from "express";
import Product from "../models/Product";
import Order from "../models/Order";
import Vendor from "../models/Vendor";
import { AuthRequest } from "../middleware/authMiddleware";

// --- HELPER: Resolve Vendor ID from User ID ---
// This bridges the gap between the User (Login) and Vendor (Profile) collections
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
      images,           // ✅ Saving Images array
      specifications,   // ✅ Saving Specifications array
      vendor_id: realVendorId // Link to Vendor
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