import express from 'express';
import { createUser, deleteUser, getAllUsers, getDashboardStats, updateUserRole } from '../controllers/adminController';
import { verifyToken, isAdmin } from '../middleware/authMiddleware';
import { AdminCreateProduct, AdminDeleteProduct, AdminUpdateProduct } from '../controllers/productController';

const router = express.Router();
// Dashboard Stats
router.get('/stats', verifyToken, isAdmin, getDashboardStats);

// User Management
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.put('/users/role', verifyToken, isAdmin, updateUserRole);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);

router.post('/users', verifyToken, isAdmin, createUser);


// Admin Product Management
router.post('/products', verifyToken, isAdmin, AdminCreateProduct);
router.put('/products/:id', verifyToken, isAdmin, AdminUpdateProduct);
router.delete('/products/:id', verifyToken, isAdmin, AdminDeleteProduct);

export default router;