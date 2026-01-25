import { Request, Response } from 'express';
import User from '../models/User';
import Order from '../models/Order';
import Product from '../models/Product';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Calculate Total Revenue (Sum of total_amount from 'Success' payments)
    // Note: Assuming you have 'payment_status' or just summing all for now
    const revenueAgg = await Order.aggregate([
      { $match: { payment_status: 'Success' } }, // Optional: Filter only paid
      { $group: { _id: null, total: { $sum: "$total_amount" } } }
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin stats", error });
  }
};