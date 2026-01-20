import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import Order from '../models/Order';
import Product from '../models/Product';
import { createOrderSchema } from '../validators/orderValidator';

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