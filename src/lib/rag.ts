import { searchSimilarDocuments } from './db';
import Anthropic from '@anthropic-ai/sdk';

export async function generateAnswer(question: string): Promise<string> {
  // 1. Find relevant documents using db.ts
  const similarDocs = await searchSimilarDocuments(question, 7);
  
  // 2. Format context
  const context = similarDocs
    .map(doc => `${doc.content}\n(Source: ${doc.metadata.source})`)
    .join('\n\n');

  // 3. Generate answer using Claude
  const anthropic = new Anthropic({
    apiKey: process.env.API_KEY_ANTHROPIC,
  });

  const completion = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    messages: [
      {
        role: 'user',
        content: `You are a knowledgeable assistant that provides accurate, factual answers based on the provided context.
Please follow these guidelines:
- Deliver your response as though you are talking to a customer over the phone.
- Never mention 'the context' or 'the provided context' in your response to customers, instead speak as though you represent Up Bank.
- Only use information from the provided context to answer questions
- If the context doesn't contain enough information to fully answer the question, acknowledge this limitation
- Keep responses clear and concise (4 sentences max)
- If you're unsure about any part of your answer, express that uncertainty
- Do not make assumptions or provide information beyond what's in the context`
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`
      }
    ],
    max_tokens: 500,
    temperature: 0.6,
  });

  // Check if the first content block has a 'text' property
  const firstContent = completion.content[0];
  return 'text' in firstContent ? firstContent.text : 'Unable to generate answer';
} 