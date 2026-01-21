import { Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;

    // --- ADMIN VIEW (Sees Everything) ---
    if (role === 'ADMIN') {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        
        // Calculate Revenue: Sum of 'total_amount' from all PAID orders
        const revenueData = await Order.aggregate([
            { $match: { payment_status: 'PAID' } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        
        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        return res.json({ 
            role: 'ADMIN',
            totalUsers, 
            totalProducts, 
            totalOrders, 
            totalRevenue 
        });
    }

    // --- VENDOR VIEW (Sees only their items) ---
    // (This is a simplified count for now)
    if (role === 'VENDOR') {
        return res.json({ 
            role: 'VENDOR',
            message: "Vendor specific analytics would go here."
            // Future Goal: Filter orders by vendor's product ID
        });
    }
    
    // --- CUSTOMER VIEW ---
    if (role === 'CUSTOMER') {
        const myOrders = await Order.countDocuments({ customer_id: req.user?.id });
        return res.json({ role: 'CUSTOMER', myOrders });
    }

  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error });
  }
};