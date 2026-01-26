import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import reviewRoutes from './routes/reviewRoutes';
import statsRoutes from './routes/statsRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import profileRoutes from './routes/profileRoutes';
import adminRoutes from './routes/adminRoutes';
import vendorRoutes from './routes/vendorRoutes';

// Initialize environment variables
dotenv.config();
// Initialize Express App
export const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes)
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vendor', vendorRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('API is Running for Multi-Vendor Platform...');
});