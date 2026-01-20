import { z } from 'zod';

export const createOrderSchema = z.object({
  products: z.array(z.object({
    product_id: z.string().min(1, "Product ID is required"),
    quantity: z.number().min(1, "Quantity must be at least 1")
  })).min(1, "Order must contain at least one product"),
  shipping_address: z.string().min(10, "Address must be detailed")
});