import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import complaintRoutes from './routes/complaints';
import authRoutes from './routes/auth';
import notificationRoutes from './routes/notifications';
import { errorHandler } from './middleware/error';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(morgan('dev'));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // increased to 1000 for polling support
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});
app.use('/api/', limiter);

// Routes
app.use('/api/complaints', complaintRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);

// Connect to MongoDB & Start Server
const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    console.log('--- Environment Check ---');
    console.log('PORT:', process.env.PORT || 5000);
    console.log('MONGO_URI defined:', !!mongoUri);
    if (!mongoUri) {
        console.error('CRITICAL: MONGO_URI is undefined. Check your .env file or Render environment variables.');
    }
    console.log('-------------------------');

    try {
        if (!mongoUri) throw new Error('MONGO_URI is not defined in environment variables');

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    } catch (err: any) {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('Full connection error details:', err);
        process.exit(1);
    }
};

connectDB();

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
    res.send('API is running with production-grade architecture...');
});

// Global Error Handler
app.use(errorHandler);
