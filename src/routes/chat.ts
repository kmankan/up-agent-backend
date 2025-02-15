import express from 'express';
import { z } from "zod";
import { generateAnswer } from '../lib/rag';

const router = express.Router();

// Message validation schema
const MessageSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

// Text chat endpoint
router.post('/message', express.json(), async (req, res): Promise<void> => {
  const result = MessageSchema.safeParse(req.body);
  console.log('recieved message', result)
  if (!result.success) {
    res.status(400).json({
      status: 'error',
      error: 'Invalid message format'
    });
    return
  }

  try {
    const answer = await generateAnswer(result.data.message);
    console.log('answer', answer)
    res.json({
      status: 'success',
      response: answer
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to process message'
    });
  }
});

// Audio transcription endpoint
router.post('/transcribe', express.raw({ type: 'audio/webm', limit: '25mb' }), async (req, res): Promise<void> => {
  try {
    if (!req.body || !req.body.length) {
      res.status(400).json({
        status: 'error',
        error: 'No audio data provided'
      });
      return
    }

    // Convert request body to Buffer if it isn't already
    const audioBuffer = Buffer.from(req.body);

    const response = await fetch("https://api.deepgram.com/v1/listen", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.API_KEY_DEEPGRAM}`,
        "Content-Type": "audio/webm",
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.statusText}`);
    }

    const result = await response.json();
    const transcript = result.results.channels[0].alternatives[0].transcript;
    console.log('transcript', transcript);

    res.json({
      status: 'success',
      transcript: transcript
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to transcribe audio',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export { router as chatRouter };