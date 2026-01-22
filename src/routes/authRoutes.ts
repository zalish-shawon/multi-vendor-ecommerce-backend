import express from 'express';
import { register, login, updateProfile } from '../controllers/authController';
import { upload } from '../config/cloudinary';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.put('/profile', verifyToken, upload.array('image', 1), updateProfile);

export default router;