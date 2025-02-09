import { Elysia } from "elysia";
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

// Import chat routes
import { chatRouter } from './routes/chat';

const app = new Elysia()
  .use(swagger())
  .use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001'
  }))
  .use(chatRouter)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
