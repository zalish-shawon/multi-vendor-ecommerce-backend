import express from 'express';
import { createCategory, updateCategory, deleteCategory, getAllCategories } from '../controllers/categoryController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', getAllCategories);
router.post('/', verifyToken, createCategory); // Add isAdmin middleware here later
router.put('/:id', verifyToken, updateCategory);
router.delete('/:id', verifyToken, deleteCategory);

export default router;