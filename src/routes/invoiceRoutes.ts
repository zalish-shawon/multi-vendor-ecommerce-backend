import express from 'express';
import { downloadInvoice } from '../controllers/invoiceController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:orderId', verifyToken, downloadInvoice);

export default router;