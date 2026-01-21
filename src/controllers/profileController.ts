import { Response } from 'express';
import User from '../models/User';
import Vendor from '../models/Vendor';
import { AuthRequest } from '../middleware/authMiddleware';

// Get My Profile
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-passwordHash');
    let vendorInfo = null;
    
    if (user?.role === 'VENDOR') {
        vendorInfo = await Vendor.findOne({ user_id: user._id });
    }

    res.json({ user, vendorInfo });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update Profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, shop_name, shop_logo } = req.body;
    
    // 1. Update User Basic Info
    const user = await User.findByIdAndUpdate(
        req.user?.id, 
        { name, phone }, 
        { new: true }
    ).select('-passwordHash');

    // 2. If Vendor, Update Vendor Info
    let vendor = null;
    if (user?.role === 'VENDOR') {
        vendor = await Vendor.findOneAndUpdate(
            { user_id: user._id },
            { shop_name, shop_logo },
            { new: true }
        );
    }

    res.json({ user, vendor });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
};