import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // Native Node module for random numbers
import User from "../models/User";
import Vendor from "../models/Vendor";
import { AuthRequest } from "../middleware/authMiddleware";
import { sendEmail } from "../utils/sendEmail"; // Ensure you created this helper

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

// 2. LOGIN USER (With 2FA for Admin)
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

    // 🛑 2FA CHECK FOR ADMIN 🛑
    if (role === "ADMIN") {
      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();

      // Save to DB (Expires in 5 mins)
      // Note: Ensure your User model has 'login_otp' and 'otp_expires' fields
      (user as any).login_otp = otp;
      (user as any).otp_expires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      // Send Email
      await sendEmail(
        user.email,
        "Nexus Admin Login Verification",
        `Your Secure Login OTP is: ${otp}. It expires in 5 minutes.`,
      );

      // Return Special Response (NO TOKEN YET)
      return res.json({
        require_otp: true,
        userId: user._id,
        message: "OTP sent to admin email",
      });
    }

    // --- GENERATE TOKEN (For Non-Admins) ---
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


// 3. VERIFY OTP (Step 2 for Admins)
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;

    const user: any = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.login_otp) {
       return res.status(400).json({ message: "No OTP request found. Please login again." });
    }


    if (String(user.login_otp).trim() !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    if (user.otp_expires && new Date() > user.otp_expires) {
      return res.status(400).json({ message: "OTP has expired. Please login again." });
    }

    user.login_otp = undefined;
    user.otp_expires = undefined;
    await user.save();

    // 6. Issue Token
    const token = jwt.sign(
      { id: user._id, role: "ADMIN" },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // 7. Return Success
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: "ADMIN",
        profileImg: user.profileImg,
      },
    });

  } catch (error) {
    console.error("Verification failed:", error);
    res.status(500).json({ message: "Verification failed", error });
  }
};


// 4. RESEND OTP
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const user: any = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Security Check: Only Admins use this flow
    if (user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Unauthorized action" });
    }

    // Generate New OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Update DB
    user.login_otp = otp;
    user.otp_expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await user.save();

    // Send Email
    await sendEmail(
      user.email, 
      "Resend: Nexus Admin Login OTP", 
      `Your new login code is: ${otp}`
    );

    res.json({ message: "OTP resent successfully" });

  } catch (error) {
    res.status(500).json({ message: "Failed to resend OTP", error });
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

// Vendor Login (Optional - can rely on main login instead)
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
