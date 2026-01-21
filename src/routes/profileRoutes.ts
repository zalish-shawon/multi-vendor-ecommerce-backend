import express from 'express';
import { updateProfile, getMyProfile } from '../controllers/profileController';
import { verifyToken } from '../middleware/authMiddleware';
import { upload } from '../config/cloudinary'; // <--- Import this

const router = express.Router();

router.get('/', verifyToken, getMyProfile);

// Add 'upload.single' middleware BEFORE the controller
// 'image' is the name of the field in the form-data
router.put('/update', verifyToken, upload.single('image'), updateProfile);

export default router;