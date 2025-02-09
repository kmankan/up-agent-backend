import { Elysia, t } from "elysia";
import { z } from "zod";

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
      // TODO: Implement AI processing here
      // For now, return a mock response
      return {
        status: 'success',
        response: `mock response to: ${result.data.message}`
      };
    } catch (error) {
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