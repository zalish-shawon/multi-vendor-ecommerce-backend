import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import Vendor from "../models/Vendor";

const SECRET_KEY = process.env.JWT_SECRET || "mySuperSecretKey123";

// 1. REGISTER USER
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Hash the password (encrypt it)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      passwordHash,
      role: role || "CUSTOMER", // Default to customer if not specified
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update User Profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user?.id;

    // Prepare update data
    const updateData: any = { name, phone, address };

    // If an image file is uploaded (handled by Multer)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      updateData.profileImg = (req.files[0] as any).path;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Profile update failed", error });
  }
};

// 2. LOGIN USER
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // --- STRATEGY 1: Check USER Collection (Admin, Customer, Delivery) ---
    let user: any = await User.findOne({ email });
    let role = "";
    let isVendor = false;

    if (user) {
      // It's a normal user
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      role = user.role;
    }

    // --- STRATEGY 2: Check VENDOR Collection ---
    else {
      const vendor = await Vendor.findOne({ email });

      if (!vendor) {
        // Not in User AND not in Vendor
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // It's a vendor
      const isMatch = await bcrypt.compare(password, vendor.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      user = vendor; // Treat vendor as the "user" object for token generation
      role = "VENDOR"; // Force role
      isVendor = true;
    }

    // --- GENERATE TOKEN ---
    // We use the ID found (whether User ID or Vendor ID)
    const token = jwt.sign(
      { id: user._id, role: role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    // Response
    res.json({
      token,
      user: {
        _id: user._id,
        name: isVendor ? (user as any).store_name : user.name, // Handle difference in name fields
        email: user.email,
        role: role,
        profileImg: isVendor ? (user as any).store_logo : user.profileImg,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed", error });
  }
};

// Add a new address
export const addAddress = async (req: AuthRequest, res: Response) => {
  try {
    const { details, city, postalCode } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If it's the first address, make it default
    const isDefault = user.addresses.length === 0;

    user.addresses.push({ details, city, postalCode, isDefault });
    await user.save();

    res.json({ message: "Address added", user });
  } catch (error) {
    res.status(500).json({ message: "Error adding address", error });
  }
};

// Delete an address
export const deleteAddress = async (req: AuthRequest, res: Response) => {
  try {
    const { addressId } = req.params;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Filter out the address to delete
    user.addresses = user.addresses.filter(
      (addr) => (addr as any)._id.toString() !== addressId,
    );

    await user.save();

    res.json({ message: "Address deleted", user });
  } catch (error) {
    res.status(500).json({ message: "Error deleting address", error });
  }
};

// Set an address as default
export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
  try {
    const { addressId } = req.params;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Loop through all addresses
    user.addresses.forEach((addr: any) => {
      // Set TRUE only if IDs match, otherwise FALSE
      addr.isDefault = addr._id.toString() === addressId;
    });

    await user.save();

    res.json({ message: "Default address updated", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating default address", error });
  }
};

// Change Password
export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Verify Current Password
    // (If user used Google Login, they might not have a password. You can handle that edge case if needed)
    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }
    }

    // 2. Hash New Password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const vendorLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Check VENDOR collection
    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    // 2. Verify Password
    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // 3. Generate Token
    // We add 'role: vendor' to the token payload
    const token = jwt.sign(
      { id: vendor._id, role: "vendor" },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        _id: vendor._id,
        name: vendor.store_name, // Use store name as their display name
        email: vendor.email,
        role: "vendor",
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};
