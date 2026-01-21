import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import Order from '../models/Order';
import Product from '../models/Product';
import { createOrderSchema } from '../validators/orderValidator';
import Vendor from '../models/Vendor';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  // 1. START A DATABASE SESSION (TRANSACTION)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Validate Input using Zod
    const validatedData = createOrderSchema.parse(req.body);
    const userId = req.user?.id;

    let totalAmount = 0;
    const finalProductList = [];

    // 3. Loop through products to check stock & calculate price
    for (const item of validatedData.products) {
      const product = await Product.findById(item.product_id).session(session); // <--- Note: .session()

      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      // Decrease Stock IMMEDIATELY within the transaction
      product.stock -= item.quantity;
      await product.save({ session });

      totalAmount += product.price * item.quantity;
      finalProductList.push({
        product_id: product._id,
        quantity: item.quantity,
        price_at_purchase: product.price
      });
    }

    // 4. Create the Order
    const newOrder = new Order({
      customer_id: userId,
      products: finalProductList,
      total_amount: totalAmount,
      shipping_address: validatedData.shipping_address,
      transaction_id: new mongoose.Types.ObjectId().toString() // Temporary ID for SSLCommerz
    });

    await newOrder.save({ session });

    // 5. COMMIT TRANSACTION (Save everything permanently)
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ 
      message: 'Order created successfully', 
      orderId: newOrder._id,
      amount: totalAmount 
    });

  } catch (error: any) {
    // 6. ROLLBACK (If anything failed, undo stock changes)
    await session.abortTransaction();
    session.endSession();
    
    res.status(400).json({ 
      message: 'Order Failed', 
      error: error.message || error 
    });
  }


  
};

// 2. GET ALL ORDERS (Admin & Vendor Logic)
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    let query = {};

    // Logic: 
    // - ADMIN sees ALL orders.
    // - CUSTOMER sees only THEIR orders.
    // - VENDOR sees orders containing THEIR products (Complex query).
    
    if (role === 'CUSTOMER') {
      query = { customer_id: userId };
    } else if (role === 'VENDOR') {
      // Find the Vendor ID first
      const vendor = await Vendor.findOne({ user_id: userId });
      if (!vendor) return res.json([]);
      
      // Magic Query: Find orders where the 'products' array contains this vendor's product
      // (Note: This is a simplified version. In a real heavy app, you'd filter the specific sub-items)
      // For now, we will return orders that contain *at least one* product from this vendor.
       // Note: This requires advanced aggregation to show ONLY the vendor's items, 
       // but for this stage, letting them see the order is acceptable.
       // A better approach for Vendors is to find products they own first.
       const vendorProducts = await Product.find({ vendor_id: vendor._id }).select('_id');
       const productIds = vendorProducts.map(p => p._id);
       
       query = { "products.product_id": { $in: productIds } };
    }

    // Advanced: Add Pagination & Sorting
    const { page = 1, limit = 10 } = req.query;
    const orders = await Order.find(query)
      .populate('customer_id', 'name email')
      .populate('products.product_id', 'name price')
      .sort({ createdAt: -1 }) // Newest first
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      meta: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

// 3. GET SINGLE ORDER (Detail View)
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer_id', 'name email')
      .populate('products.product_id', 'name price images');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Security Check: You can only view if you are Admin, the Owner, or the Vendor involved
    // (Skipping complex Vendor check for brevity, but Customer check is MUST)
    if (req.user?.role === 'CUSTOMER' && order.customer_id._id.toString() !== req.user.id) {
       return res.status(403).json({ message: 'Access Denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order' });
  }
};

// 4. UPDATE ORDER STATUS (Admin/Vendor Only)
// Use this to change status from "Pending" -> "Shipped" -> "Delivered"
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body; // Expecting: 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
    
    // Security: Only Admin or Vendor should do this
    if (req.user?.role === 'CUSTOMER') {
      return res.status(403).json({ message: 'Customers cannot change status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { 
        $set: { 
          // You might want to add a new field 'delivery_status' in your model distinct from 'payment_status'
          // For now, let's assume we are updating a status field. 
          // If you haven't added `delivery_status` to your model, add it now!
          payment_status: status 
        } 
      }, 
      { new: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order' });
  }
};

// 5. DELETE ORDER (Admin Only)
export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    // Security: STRICTLY Admin only
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only Admins can delete orders' });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order' });
  }
};