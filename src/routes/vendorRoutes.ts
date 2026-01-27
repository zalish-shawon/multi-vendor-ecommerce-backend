import express from 'express';
import { 
    getMyProducts, 
    updateVendorProduct, 
    deleteVendorProduct, 
    getVendorOrders, 
    getVendorStats, 
    createVendorProduct,
    getVendorProfile,
    updateVendorProfile,
    changeVendorPassword
} from '../controllers/vendorController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// Middleware checking for VENDOR role
const isVendor = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'VENDOR') return res.status(403).json({ message: "Vendor access only" });
    next();
};

router.post('/products', verifyToken, isVendor, createVendorProduct);
router.get('/stats', verifyToken, isVendor, getVendorStats);
router.get('/products', verifyToken, isVendor, getMyProducts);
router.put('/products/:id', verifyToken, isVendor, updateVendorProduct);
router.delete('/products/:id', verifyToken, isVendor, deleteVendorProduct);
router.get('/orders', verifyToken, isVendor, getVendorOrders);

// Vendor Profile & Settings
router.get('/profile', verifyToken, isVendor, getVendorProfile);
router.put('/profile', verifyToken, isVendor, updateVendorProfile);
router.put('/profile/password', verifyToken, isVendor, changeVendorPassword);
export default router;