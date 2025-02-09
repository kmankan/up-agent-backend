import { Elysia } from "elysia";
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

// Import chat routes
import { chatRouter } from './routes/chat';

const app = new Elysia()
  .use(swagger())
  .use(cors({
    origin: '*'  // Allow all origins
  }))
  .use(chatRouter)
  .listen(3010);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
