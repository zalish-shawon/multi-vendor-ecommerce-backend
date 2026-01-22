import express from 'express';
import { register, login, updateProfile, addAddress, deleteAddress, setDefaultAddress } from '../controllers/authController';
import { upload } from '../config/cloudinary';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.put('/profile', verifyToken, upload.array('image', 1), updateProfile);

// Address Management
router.post('/address', verifyToken, addAddress);
router.delete('/address/:addressId', verifyToken, deleteAddress);

router.put('/address/:addressId/default', verifyToken, setDefaultAddress);

export default router;