import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'mySuperSecretKey123';

// Extend the Request interface to include 'user'
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// 1. Verify Token (Is the user logged in?)
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
     res.status(401).json({ message: 'Access Denied. No token provided.' });
     return 
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY) as { id: string; role: string };
    req.user = verified;
    next(); // Pass to the next function
  } catch (error) {
    res.status(400).json({ message: 'Invalid Token' });
  }
};

// 2. Check Role (Is the user a Vendor?)
export const isVendor = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'VENDOR') {
     res.status(403).json({ message: 'Access Denied. Vendors only.' });
     return
  }
  next();
};

// 3. Check Role (Is the user an Admin?)
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check if user exists and if role is ADMIN
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};