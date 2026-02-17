import express from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../controllers/productController";
import { verifyToken, isVendor, isAdmin } from "../middleware/authMiddleware";
import { upload } from "../config/cloudinary";

const router = express.Router();

// Public Route: Anyone can see products
router.get("/", getAllProducts);
// Public Route: Anyone can see a single product by ID
router.get("/:id", getProductById);
// Protected Route: Only Logged-in Vendors can add products
router.post(
  "/add",
  verifyToken,
  isVendor,
  upload.array("images", 5),
  createProduct,
);
router.put("/:id", verifyToken, isVendor, updateProduct);
router.delete("/:id", verifyToken, isVendor, deleteProduct);

export default router;
