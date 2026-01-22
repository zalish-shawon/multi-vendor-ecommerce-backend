import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const SECRET_KEY = process.env.JWT_SECRET || 'mySuperSecretKey123';

// 1. REGISTER USER
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
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
      role: role || 'CUSTOMER' // Default to customer if not specified
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
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

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Profile update failed', error });
  }
};

// 2. LOGIN USER
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      SECRET_KEY, 
      { expiresIn: '1d' } // Token expires in 1 day
    );

    res.json({ 
      token, 
      user: { id: user._id, name: user.name, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};