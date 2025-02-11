import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { chatRouter } from './routes/chat';
import { authRouter } from './routes/auth';
import { upRouter } from './routes/up';
import { initDb } from './lib/db';

const app = express();
const PORT = 3010;

// Initialize database before starting server
const startServer = async () => {
  try {
    // Initialize database
    await initDb();
    console.log('Database initialized successfully');

    // Middleware
    app.use(cors({
      origin: 'http://localhost:3000', // Your frontend URL
      credentials: true, // Allow credentials
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    }));
    app.use(cookieParser());
    app.use(express.json());

    // Routes
    app.use('/chat', chatRouter);
    app.use('/auth', authRouter);
    app.use('/up', upRouter);

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
