import { Elysia, t } from "elysia";
import { z } from "zod";
import { generateAnswer } from '../lib/rag';

// Zod schema for message validation
const MessageSchema = z.object({
  message: z.string().min(1),
});

// all routes will have /chat prefix (e.g. /chat/message)
export const chatRouter = new Elysia({ prefix: '/chat' })
  .post('/message', async ({ body }) => {
    // Validate the incoming message
    const result = MessageSchema.safeParse(body);
    if (!result.success) {
      return {
        status: 'error',
        error: 'Invalid message format'
      };
    }

    try {
      const answer = await generateAnswer(result.data.message);
      return {
        status: 'success',
        response: `the server said: ${answer}`
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        status: 'error',
        error: 'Failed to process message'
      };
    }
  }, {
    body: t.Object({
      message: t.String()
    })
  }); 