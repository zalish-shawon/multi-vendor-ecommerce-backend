import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/authMiddleware';

export const downloadInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    
    // 1. Find Order
    const order = await Order.findById(orderId)
        .populate('customer_id', 'name email')
        .populate('products.product_id', 'name price');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // 2. Security Check (Only Owner or Admin can download)
    if (req.user?.role !== 'ADMIN' && order.customer_id._id.toString() !== req.user?.id) {
        return res.status(403).json({ message: 'Access Denied' });
    }

    // 3. Create PDF Stream
    const doc = new PDFDocument();
    
    // Set headers so browser knows it's a PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);

    doc.pipe(res);

    // 4. Design the Invoice
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Date: ${(order as any).createdAt}`);
    doc.text(`Status: ${order.payment_status}`);
    doc.text(`Transaction ID: ${order.transaction_id}`);
    doc.moveDown();

    doc.text(`Customer: ${(order.customer_id as any).name}`);
    doc.text(`Address: ${order.shipping_address}`);
    doc.moveDown();

    doc.text('-------------------------------------------------------');
    
    // List Products
    order.products.forEach((item: any) => {
        doc.text(`${item.product_id.name} x ${item.quantity} = ${item.product_id.price * item.quantity} BDT`);
    });

    doc.text('-------------------------------------------------------');
    doc.fontSize(15).text(`Total Amount: ${order.total_amount} BDT`, { align: 'right' });

    doc.end(); // Finish PDF

  } catch (error) {
    res.status(500).json({ message: 'Error generating invoice' });
  }
};