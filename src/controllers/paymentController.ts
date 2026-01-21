import { Request, Response } from 'express';
import SSLCommerzPayment from 'sslcommerz-lts';
import Order from '../models/Order';
import Product from '../models/Product';
import dotenv from 'dotenv';

dotenv.config();

const store_id = process.env.STORE_ID || 'testbox';
const store_passwd = process.env.STORE_PASS || 'qwerty';
const is_live = false; // true for live, false for sandbox

// 1. INITIALIZE PAYMENT
export const initPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    // A. Find the Order
    const order = await Order.findById(orderId).populate('customer_id');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.payment_status === 'PAID') {
        return res.status(400).json({ message: 'Order already paid' });
    }

    // B. Prepare Data for SSLCommerz
    const data = {
      total_amount: order.total_amount,
      currency: 'BDT',
      tran_id: order.transaction_id, // Use the unique ID we generated in Order Controller
      success_url: `http://localhost:5000/api/payment/success/${order.transaction_id}`,
      fail_url: `http://localhost:5000/api/payment/fail/${order.transaction_id}`,
      cancel_url: `http://localhost:5000/api/payment/cancel/${order.transaction_id}`,
      ipn_url: 'http://localhost:5000/api/payment/ipn',
      shipping_method: 'Courier',
      product_name: 'Order #' + order._id,
      product_category: 'General',
      product_profile: 'general',
      cus_name: (order.customer_id as any).name,
      cus_email: (order.customer_id as any).email,
      cus_add1: order.shipping_address,
      cus_add2: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: (order.customer_id as any).phone || '01711111111',
      cus_fax: '01711111111',
      ship_name: 'Customer',
      ship_add1: 'Dhaka',
      ship_add2: 'Dhaka',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: 1000,
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    
    // C. Get the Gateway URL
    sslcz.init(data).then((apiResponse: any) => {
      let GatewayPageURL = apiResponse.GatewayPageURL;
      res.send({ url: GatewayPageURL });
    });

  } catch (error) {
    res.status(500).json({ message: 'Payment Init Error', error });
  }
};

// 2. PAYMENT SUCCESS (The Secure Way)
export const paymentSuccess = async (req: Request, res: Response) => {
  try {
    const { tranId } = req.params;

    // A. Verify Database Record
    const order = await Order.findOne({ transaction_id: tranId });
    if (!order) return res.redirect('http://localhost:3000/payment/fail');

    // B. Update Database
    const update = await Order.updateOne(
        { transaction_id: tranId },
        { 
            $set: { 
                payment_status: 'PAID',
                paidAt: new Date()
            } 
        }
    );

    // C. Redirect to Frontend "Success Page"
    // (We will create this frontend page later: localhost:3000/payment/success)
    res.redirect(`http://localhost:3000/payment/success?tranId=${tranId}`);

  } catch (error) {
    res.status(500).json({ message: 'Payment Success Error', error });
  }
};

// 3. PAYMENT FAIL
export const paymentFail = async (req: Request, res: Response) => {
  try {
    const { tranId } = req.params;

    // Mark as Failed
    const order = await Order.findOne({ transaction_id: tranId });
    if (order) {
        order.payment_status = 'FAILED';
        await order.save();
        
        // OPTIONAL: Restore Stock (Advanced Feature)
        // Since the order failed, we should add the items back to the Product Stock.
        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product_id, {
                $inc: { stock: item.quantity } 
            });
        }
    }

    res.redirect(`http://localhost:3000/payment/fail?tranId=${tranId}`);
  } catch (error) {
    res.status(500).json({ message: 'Payment Fail Error', error });
  }
};