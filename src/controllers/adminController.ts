import { Request, Response } from 'express';
import User from '../models/User';
import Order from '../models/Order';
import Product from '../models/Product';
import bcrypt from 'bcryptjs';


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

// 1. Get All Users (with basic search)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

// 2. Update User Role (Promote/Demote)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    
    // Validate Role
    const validRoles = ['ADMIN', 'CUSTOMER', 'VENDOR', 'DELIVERY'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User role updated", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating role", error });
  }
};

// 3. Delete User
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};

// 4. Create New User (Admin Only)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check Duplicate
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create
    const newUser = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role
    });

    await newUser.save();

    // Return without password
    const userResponse = newUser.toObject();
    delete (userResponse as any).password;

    res.status(201).json({ message: "User created successfully", user: userResponse });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};