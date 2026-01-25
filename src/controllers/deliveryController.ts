import { Request, Response } from "express";
import Order from "../models/Order";
import { AuthRequest } from "../middleware/authMiddleware";

// 1. Admin assigns order to Delivery Man
export const assignDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, deliveryManId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.set("delivery_person_id", deliveryManId);
    order.set("order_status", "Processing"); // Auto-update status

    // Add to history
    {
      const history = (order.get("tracking_history") as any[]) || [];
      history.push({
        status: "Processing",
        note: "Order assigned to delivery personnel",
      });
      order.set("tracking_history", history);
    }

    await order.save();
    res.json({ message: "Delivery man assigned successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Error assigning delivery", error });
  }
};

// 2. Delivery Man updates status (e.g., "Out for Delivery")
export const updateDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, status, note } = req.body;

    // Security: Ensure only the assigned delivery man (or Admin) can update
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (
      req.user?.role === "DELIVERY" &&
      order.get("delivery_person_id")?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized for this order" });
    }

    order.set("order_status", status);
    {
      const history = (order.get("tracking_history") as any[]) || [];
      history.push({
        status,
        note: note || `Status updated to ${status}`,
      });
      order.set("tracking_history", history);
    }

    await order.save();
    res.json({ message: "Status updated", order });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
};


// 3. Get Orders assigned to me
export const getMyDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ delivery_person_id: req.user?.id })
                              // 👇 CHANGE THIS LINE
                              .populate('customer_id', 'name phone address') 
                              .sort({ createdAt: -1 });
                              
    res.json(orders);
  } catch (error) {
    console.error(error); // Log the error to see details in terminal
    res.status(500).json({ message: 'Error fetching deliveries', error });
  }
};
