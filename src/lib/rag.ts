import { searchSimilarDocuments } from './db';

export async function generateAnswer(question: string): Promise<string> {
  // 1. Find relevant documents using db.ts
  const similarDocs = await searchSimilarDocuments(question, 7);
  
  // 2. Format context
  const context = similarDocs
    .map(doc => `${doc.content}\n(Source: ${doc.metadata.source})`)
    .join('\n\n');

  // 3. Generate answer using OpenRouter/Gemini
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.API_KEY_OPENROUTER}`,
      "HTTP-Referer": process.env.SITE_URL || "", 
      "X-Title": "Up Bank Assistant",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "user",
          content: `You are a knowledgeable brand ambassador that provides accurate, factual answers based on the provided context.
Please follow these guidelines:
- Answer the users questions as though you are talking to them over the phone. You can use both the context provided and any information in the question itself.
- Never mention 'the context' or 'the provided context' in your response to customers, instead speak as though you represent Up Bank.
- If the context doesn't contain enough information to fully answer the question, acknowledge this limitation
- Keep responses clear and concise (4 sentences max)
- If you're unsure about any part of your answer, express that uncertainty
- Do not make assumptions or provide information beyond what is factually known
- Always consider where in the flow of the converastion you are and what the user is trying to accomplish. Don't say Hi in the middle of a conversation.`
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ],
      max_tokens: 500,
      temperature: 0.6,
    })
  });

  const completion = await response.json();
  return completion.choices[0]?.message?.content || 'Unable to generate answer';
} 