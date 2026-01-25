import express from 'express';
import { createUser, deleteUser, getAllUsers, getDashboardStats, updateUserRole } from '../controllers/adminController';
import { verifyToken, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();
// Dashboard Stats
router.get('/stats', verifyToken, isAdmin, getDashboardStats);

// User Management
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.put('/users/role', verifyToken, isAdmin, updateUserRole);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);

router.post('/users', verifyToken, isAdmin, createUser);

export default router;