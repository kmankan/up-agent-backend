import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { chatRouter } from './routes/chat';
import { authRouter } from './routes/auth';
import { blandRouter } from './routes/bland';
import { upRouter } from './routes/up';
import { initDb } from './lib/db';

const app = express();
const PORT = process.env.PORT || 3010;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initialize database before starting server
const startServer = async () => {
  try {
    // Initialize database
    await initDb();
    console.log('Database initialized successfully');

    // Middleware
    app.use(cors({
      origin: FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposedHeaders: ['set-cookie']
    }));
    app.use(cookieParser());
    app.use(express.json());

    // Add this middleware to debug cookies
    app.use((req, res, next) => {
      console.log('🍪 Incoming cookies:', req.cookies);
      next();
    });

    // Routes
    app.use('/chat', chatRouter);
    app.use('/auth', authRouter);
    app.use('/up', upRouter);
    app.use('/bland', blandRouter);

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running at ${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
