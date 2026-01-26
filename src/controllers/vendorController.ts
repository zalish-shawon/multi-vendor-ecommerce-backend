import { Request, Response } from "express";
import Product from "../models/Product";
import Order from "../models/Order";
import Vendor from "../models/Vendor"; // Ensure you have this model imported
import { AuthRequest } from "../middleware/authMiddleware";

// --- HELPER: Resolve Vendor ID from User ID ---
// This bridges the gap between the User (Login) and Vendor (Profile) collections
const getVendorId = async (userId?: string) => {
  // If no user ID is provided, return undefined
  if (!userId) return undefined;

  // 1. Try to find a Vendor profile linked to this user
  const vendorProfile = await Vendor.findOne({ user_id: userId });

  // 2. If found, return the Vendor's _id (This is what products are linked to)
  // 3. If not found, fallback to userId (Legacy support)
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

// 2. Edit Product (Secure: Checks Ownership)
export const updateVendorProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const realVendorId = await getVendorId(req.user?.id);

    // Find product that matches ID AND Vendor ID
    const product = await Product.findOneAndUpdate(
      { _id: id, vendor_id: realVendorId },
      req.body,
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

// 3. Delete Product (Secure)
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

// 4. Get Vendor Orders & Calculate Revenue (The Smart Query)
// ... imports

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
      // 👇 FIX 1: Change 'user_id' to 'customer_id'
      .populate("customer_id", "name email")
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
          // 👇 FIX 2: Map 'customer' to 'order.customer_id'
          customer: order.customer_id,
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

// 5. Dashboard Stats
export const getVendorStats = async (req: AuthRequest, res: Response) => {
  try {
    const realVendorId = await getVendorId(req.user?.id);

    // 1. Count Products
    const totalProducts = await Product.countDocuments({
      vendor_id: realVendorId,
    });

    // 2. Calculate Revenue & Sales (Reusing logic for consistency)
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
