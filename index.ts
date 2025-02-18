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
const FRONTEND_URLS = [
  'https://whatsup.mahlen.dev',
  'https://www.whatsup.mahlen.dev',
  'https://voice-agent-up.vercel.app',
  'https://upassistant.online',
  'https://www.upassistant.online',
  // Add localhost for development
  'http://localhost:3000'
];

// Initialize database before starting server
const startServer = async () => {
  try {
    // Initialize database
    await initDb();
    console.log('Database initialized successfully');

    // Middleware
    app.use(cors({
      origin: (origin, callback) => {
        console.log('🔍 Incoming origin:', origin);
        
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Check if origin matches any of our allowed domains
        const isAllowed = FRONTEND_URLS.some(allowedOrigin => {
          const originMatches = origin === allowedOrigin || origin.startsWith(allowedOrigin);
          console.log(`Checking ${origin} against ${allowedOrigin}: ${originMatches}`);
          return originMatches;
        });

        if (isAllowed) {
          callback(null, origin);
        } else {
          console.log('❌ Blocked by CORS:', origin);
          console.log('Allowed origins:', FRONTEND_URLS);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express.json({ limit: '2mb'}));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    // Add OPTIONS handling for preflight requests
    app.options('*', cors());

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
