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
    const { name, phone, shop_name } = req.body;
    const userId = req.user?.id;
    
    // Get the Image URL if a file was uploaded
    // Multer adds 'req.file'
    const imageURL = req.file ? req.file.path : undefined; 

    // 1. Update User
    const userData: any = { name, phone };
    // If user uploaded a profile pic (optional logic based on your User model)
    if (imageURL) userData.profileImg = imageURL; 

    const user = await User.findByIdAndUpdate(userId, userData, { new: true });

    // 2. Update Vendor (If exists)
    let vendor = null;
    if (user?.role === 'VENDOR') {
        const vendorData: any = { shop_name };
        if (imageURL) vendorData.shop_logo = imageURL; // Update Logo

        vendor = await Vendor.findOneAndUpdate(
            { user_id: userId },
            vendorData,
            { new: true }
        );
    }

    res.json({ user, vendor });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

