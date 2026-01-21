import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'multi-vendor-uploads', // The folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Restrict file types
    transformation: [{ width: 500, height: 500, crop: 'limit' }], // Optional: Resize
  } as any, // Type casting 'as any' to avoid TS strict errors with params
});

// 3. Create the Multer Instance
export const upload = multer({ storage: storage });