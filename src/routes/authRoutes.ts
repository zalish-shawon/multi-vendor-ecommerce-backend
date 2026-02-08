import express from "express";
import {
  register,
  login,
  updateProfile,
  addAddress,
  deleteAddress,
  setDefaultAddress,
  updatePassword,
  vendorLogin,
  verifyOtp,
  resendOtp,
} from "../controllers/authController";
import { upload } from "../config/cloudinary";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.put("/profile", verifyToken, upload.array("image", 1), updateProfile);

// Address Management
router.post("/address", verifyToken, addAddress);
router.delete("/address/:addressId", verifyToken, deleteAddress);

router.put("/address/:addressId/default", verifyToken, setDefaultAddress);

// Change Password
router.put("/profile/password", verifyToken, updatePassword);

router.post("/vendor/login", vendorLogin); // New separate login route

// OTP Verification
router.post("/verify-otp", verifyOtp);
// Resend OTP
router.post("/resend-otp", resendOtp);

export default router;
