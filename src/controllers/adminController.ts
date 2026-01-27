import { Request, Response } from "express";
import User from "../models/User";
import Order from "../models/Order";
import Product from "../models/Product";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middleware/authMiddleware";
import Vendor from "../models/Vendor";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();

    // Calculate Total Revenue (Sum of total_amount from 'Success' payments)
    // Note: Assuming you have 'payment_status' or just summing all for now
    const revenueAgg = await Order.aggregate([
      { $match: { payment_status: "Success" } }, // Optional: Filter only paid
      { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin stats", error });
  }
};

// 1. Get All Users (with basic search)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
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
    const validRoles = ["ADMIN", "CUSTOMER", "VENDOR", "DELIVERY"];
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
      role,
    });

    await newUser.save();

    // Return without password
    const userResponse = newUser.toObject();
    delete (userResponse as any).password;

    res
      .status(201)
      .json({ message: "User created successfully", user: userResponse });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};


// Create Vendor (Directly in Vendor Collection)
export const createVendor = async (req: Request, res: Response) => {
  try {
    const { 
      store_name, 
      email, 
      password, 
      phone, 
      address, // Assuming simplistic address from form
      bkash_number 
    } = req.body;

    // 1. Check if Email or Store Name exists
    const existingVendor = await Vendor.findOne({ 
        $or: [{ email }, { store_name }] 
    });
    
    if (existingVendor) {
        return res.status(400).json({ message: "Vendor email or store name already exists" });
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create Vendor
    const newVendor = await Vendor.create({
      store_name,
      email,
      password: hashedPassword,
      phone,
      bkash_number,
      is_verified: true, // Verified immediately since Admin created it
      addresses: address ? [{ ...address, isDefault: true }] : []
    });

    res.status(201).json({ message: "Vendor created successfully", vendor: newVendor });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create vendor", error });
  }
};

// 5. Get All Orders (Admin View)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate("customer_id", "name email") // <--- CHANGED from 'user_id' to 'customer_id'
      .populate("delivery_person_id", "name phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error });
  }
};

// 6. Get Available Delivery Men (For Dropdown)
export const getDeliveryMen = async (req: Request, res: Response) => {
  try {
    const deliveryMen = await User.find({ role: "DELIVERY" }).select(
      "name email phone",
    );
    res.json(deliveryMen);
  } catch (error) {
    res.status(500).json({ message: "Error fetching delivery staff", error });
  }
};

// 7. Update Admin Profile (Name, Image)
export const updateAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, profileImg } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { name, profileImg },
      { new: true },
    ).select("-password"); // Don't return password

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error });
  }
};

// 8. Change Admin Password
export const updateAdminPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Find User (and get the password field)
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Verify Old Password
    // Note: Use 'passwordHash' if that's your field name, or 'password' if you kept it simple.
    // Based on your previous error, your schema uses 'passwordHash'.
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.passwordHash ?? "",
    );
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    // 3. Hash New Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Save
    user.passwordHash = hashedPassword; // Update the hash
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating password", error });
  }
};
