import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Order from "../models/Order";
import Product from "../models/Product";
import { createOrderSchema } from "../validators/orderValidator";
import Vendor from "../models/Vendor";

import SSLCommerzPayment from "sslcommerz-lts";

// ⚠️ MAKE SURE THESE MATCH YOUR .ENV FILE
const store_id = process.env.STORE_ID || "testbox";
const store_passwd = process.env.STORE_PASS || "qwerty";
const is_live = false;

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { products, total_amount, shipping_address, phone } = req.body;
    const userId = req.user?.id;
    const tran_id = `TXN-${Date.now()}`;

    // 1. Create Order in DB
    const newOrder = new Order({
      customer_id: userId,
      products,
      total_amount,
      shipping_address,
      phone,
      transaction_id: tran_id,
      status: "Pending",
    });

    await newOrder.save();

    const data = {
      total_amount: total_amount,
      currency: "BDT",
      tran_id: tran_id,
      success_url: `http://localhost:5000/api/orders/payment/success/${tran_id}`,
      fail_url: `http://localhost:5000/api/orders/payment/fail/${tran_id}`,
      cancel_url: `http://localhost:5000/api/orders/payment/cancel/${tran_id}`,
      ipn_url: "http://localhost:5000/api/orders/payment/ipn",
      shipping_method: "Courier",
      product_name: "Electronics",
      product_category: "Electronic",
      product_profile: "general",
      cus_name: (req.user as any)?.name || "Customer", // Ensure this exists
      cus_email: (req.user as any)?.email || "customer@example.com", // Ensure this exists
      cus_add1: shipping_address,
      cus_add2: "Dhaka",
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: phone, // Crucial field
      cus_fax: phone,
      ship_name: "Customer",
      ship_add1: shipping_address,
      ship_city: "Dhaka",
      ship_state: "Dhaka",
      ship_postcode: 1000,
      ship_country: "Bangladesh",
    };

    // console.log("Initiating SSLCommerz with data:", data);

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

    // 3. Initialize Payment
    sslcz.init(data).then((apiResponse: any) => {
      // console.log("SSLCommerz Response:", apiResponse);

      if (apiResponse?.GatewayPageURL) {
        res.send({ url: apiResponse.GatewayPageURL });
      } else {
        // If SSLCommerz failed, delete the order so we don't have "ghost" orders
        Order.findOneAndDelete({ transaction_id: tran_id }).then(() =>
          console.log("Order deleted due to payment init failure"),
        );
        res
          .status(400)
          .json({ message: "Payment Session Failed", error: apiResponse });
      }
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// ... keep paymentSuccess and paymentFail same as before
export const paymentSuccess = async (req: Request | any, res: Response) => {
  const { tranId } = req.params;

  // LOG 1: Check if the function is even being called
  console.log("🔥 Payment Success Callback Hit!");
  console.log("Transaction ID received:", tranId);

  try {
    // Use findOne first to check if it exists
    const order = await Order.findOne({ transaction_id: tranId });

    if (!order) {
      // LOG 2: Order not found
      console.error("❌ Order NOT FOUND for transaction:", tranId);
      return res.redirect(`http://localhost:3000/checkout/fail`);
    }

    // Update the status
    order.status = "Paid";
    order.payment_status = "Success";
    await order.save();

    // LOG 3: Success
    console.log("✅ Order updated successfully in Database:", order._id);

    // Redirect to frontend
    res.redirect(`http://localhost:3000/checkout/success?tranId=${tranId}`);
  } catch (error) {
    console.error("❌ Error inside paymentSuccess:", error);
    res.redirect(`http://localhost:3000/checkout/fail`);
  }
};

export const paymentFail = async (req: Request | any, res: Response) => {
  const { tranId } = req.params;
  await Order.findOneAndDelete({ transaction_id: tranId });
  res.redirect(`http://localhost:3000/checkout/fail`);
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

    if (role === "CUSTOMER") {
      query = { customer_id: userId };
    } else if (role === "VENDOR") {
      // Find the Vendor ID first
      const vendor = await Vendor.findOne({ user_id: userId });
      if (!vendor) return res.json([]);

      // Magic Query: Find orders where the 'products' array contains this vendor's product
      // (Note: This is a simplified version. In a real heavy app, you'd filter the specific sub-items)
      // For now, we will return orders that contain *at least one* product from this vendor.
      // Note: This requires advanced aggregation to show ONLY the vendor's items,
      // but for this stage, letting them see the order is acceptable.
      // A better approach for Vendors is to find products they own first.
      const vendorProducts = await Product.find({
        vendor_id: vendor._id,
      }).select("_id");
      const productIds = vendorProducts.map((p) => p._id);

      query = { "products.product_id": { $in: productIds } };
    }

    // Advanced: Add Pagination & Sorting
    const { page = 1, limit = 10 } = req.query;
    const orders = await Order.find(query)
      .populate("customer_id", "name email")
      .populate("products.product_id", "name price")
      .sort({ createdAt: -1 }) // Newest first
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error });
  }
};


// Get all orders for the logged-in user
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    // Find orders where user_id matches the logged-in user, sorted by newest first
    const orders = await Order.find({ customer_id: req.user?.id })
      .populate('products.product_id', 'name images') // Get product details
      .sort({ createdAt: -1 });
      // console.log(orders);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

// 3. GET SINGLE ORDER (Detail View)
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer_id', 'name email')
      .populate('products.product_id', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Security: Allow only Admin or the Owner of the order
    // Note: We cast customer_id to any because population can make it an object or string
    const ownerId = (order.customer_id as any)._id || order.customer_id;
    
    if (req.user?.role !== 'ADMIN' && ownerId.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 4. UPDATE ORDER STATUS (Admin/Vendor Only)
// Use this to change status from "Pending" -> "Shipped" -> "Delivered"
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body; // Expecting: 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

    // Security: Only Admin or Vendor should do this
    if (req.user?.role === "CUSTOMER") {
      return res
        .status(403)
        .json({ message: "Customers cannot change status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          // You might want to add a new field 'delivery_status' in your model distinct from 'payment_status'
          // For now, let's assume we are updating a status field.
          // If you haven't added `delivery_status` to your model, add it now!
          payment_status: status,
        },
      },
      { new: true },
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ message: "Error updating order" });
  }
};

// 5. DELETE ORDER (Admin Only)
export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    // Security: STRICTLY Admin only
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admins can delete orders" });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting order" });
  }
};

// 6. PUBLIC TRACKING (No Login Required)
export const trackOrderPublic = async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params; // This will be the transaction_id

    // Only select safe fields (Don't show customer email/phone to public)
    const order = await Order.findOne({ transaction_id: trackingId })
      .select("order_status payment_status total_amount createdAt products")
      .populate("products.product_id", "name images");

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found with this Tracking ID" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Error tracking order" });
  }
};

// 1. Cancel Order (Only if Pending)
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user_id: req.user?.id });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'Pending') return res.status(400).json({ message: 'Cannot cancel processed order' });

    await Order.findByIdAndDelete(req.params.id); // Or set status to 'Cancelled'
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Cancellation failed', error });
  }
};

// 2. Retry Payment (Generate New Link)
export const retryPayment = async (req: AuthRequest, res: Response) => {
    // Reuse the createOrder logic but for an existing order ID
    // For simplicity, we will just re-init the SSLCommerz session here
    try {
        const order = await Order.findById(req.params.id);
        if(!order) return res.status(404).json({message: "Order not found"});

        
        // Let's return a specific message for now:
        res.status(501).json({ message: "Retry feature coming soon" }); 
    } catch(err) {
        res.status(500).json({message: "Error"});
    }
}
