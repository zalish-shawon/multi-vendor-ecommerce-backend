import express from 'express';
import { createProduct, deleteProduct, getAllProducts, updateProduct } from '../controllers/productController';
import { verifyToken, isVendor } from '../middleware/authMiddleware';

const router = express.Router();

// Public Route: Anyone can see products
router.get('/', getAllProducts);

// Protected Route: Only Logged-in Vendors can add products
router.post('/add', verifyToken, isVendor, createProduct);

router.put('/:id', verifyToken, isVendor, updateProduct);
router.delete('/:id', verifyToken, isVendor, deleteProduct);

export default router;