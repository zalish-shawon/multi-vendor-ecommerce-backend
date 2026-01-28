import express from "express";
import {
  createUser,
  createVendor,
  deleteUser,
  getAllOrders,
  getAllUsers,
  getDeliveryMen,
  updateAdminPassword,
  updateAdminProfile,
  updateUserRole,
} from "../controllers/adminController";
import { verifyToken, isAdmin } from "../middleware/authMiddleware";
import {
  AdminCreateProduct,
  AdminDeleteProduct,
  AdminUpdateProduct,
} from "../controllers/productController";
import { assignDelivery } from "../controllers/deliveryController";
import { deleteVendor, getAllVendors } from "../controllers/vendorController";
import { getDashboardStats } from "../controllers/statsController";

const router = express.Router();
// Dashboard Stats
router.get("/stats", verifyToken, isAdmin, getDashboardStats);

// User Management
router.get("/users", verifyToken, isAdmin, getAllUsers);
router.put("/users/role", verifyToken, isAdmin, updateUserRole);
router.delete("/users/:id", verifyToken, isAdmin, deleteUser);

router.post("/users", verifyToken, isAdmin, createUser);

router.post("/create-vendor", verifyToken, isAdmin, createVendor);

// Admin Product Management
router.post("/products", verifyToken, isAdmin, AdminCreateProduct);
router.put("/products/:id", verifyToken, isAdmin, AdminUpdateProduct);
router.delete("/products/:id", verifyToken, isAdmin, AdminDeleteProduct);

// Reuse the delivery controller's assign function, but protect it with isAdmin
// --- ORDER ROUTES (Remove '/admin' from here) ---
router.get("/orders", verifyToken, isAdmin, getAllOrders);
router.get("/delivery-men", verifyToken, isAdmin, getDeliveryMen);
router.post("/orders/assign", verifyToken, isAdmin, assignDelivery);

// --- PROFILE MANAGEMENT ---
router.put("/profile", verifyToken, isAdmin, updateAdminProfile);
router.put("/profile/password", verifyToken, isAdmin, updateAdminPassword);

// Vendor Management Routes
router.post("/vendors", verifyToken, isAdmin, createVendor); // Create
router.get("/vendors", verifyToken, isAdmin, getAllVendors); // Read
router.delete("/vendors/:id", verifyToken, isAdmin, deleteVendor); // Delete

export default router;
