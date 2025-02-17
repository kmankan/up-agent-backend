import express from 'express';
import { getDb } from '../lib/db'; // Make sure this import exists
import { decrypt } from '../auth/encryption'; // Make sure this import exists
import type { InsightRequest, InsightResponse, Message, TransactionResponse, Transaction } from '../types';
import { verifyToken } from '../auth/jwt';

const router = express.Router();

interface AccountInfo {
  id: string;
  accountOwnership: 'INDIVIDUAL' | 'JOINT';
}

interface AccountIds {
  'personal': AccountInfo[];
  'joint': AccountInfo[]; // Changed from '2Up' to 'joint' for better naming
  'all': AccountInfo[];
}

interface UpAccount {
  id: string;
  attributes: {
    ownershipType: 'INDIVIDUAL' | 'JOINT';
  };
}

interface UpAccountsResponse {
  data: UpAccount[];
}

// Utility function for UP API validation
export async function validateUpApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.up.com.au/api/v1/util/ping', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Utility function to fetch transactions with pagination
async function fetchPaginatedTransactions(apiKey: string, maxTransactions: number = 50): Promise<Transaction[]> {
  let transactions: Transaction[] = [];
  let nextPageUrl: string | null = 'https://api.up.com.au/api/v1/transactions?page[size]=100';

  while (nextPageUrl && transactions.length < maxTransactions) {
    const response = await fetch(nextPageUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`UP API request failed with status ${response.status}`);
    }

    const data = await response.json() as TransactionResponse & { links: { next: string | null } };
    transactions = [...transactions, ...data.data];
    nextPageUrl = data.links.next;

    // Add a small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return transactions.slice(0, maxTransactions);
}

router.post('/get-summary', async (req, res): Promise<void> => {
  console.log('received request', req.body);
  console.log('🔍 Getting UP summary...');

  const { accountTypes } = req.body;

  try {
    // Get and verify JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token found');
      res.status(401).json({ error: 'No token found' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    
    if (!payload) {
      console.log('❌ Invalid token');
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { sessionId } = payload;

    // Get encrypted API key from database
    const db = await getDb();
    const session = await db.get(
      'SELECT stored_encrypted_api_key FROM sessions WHERE session_id = ? AND status = ?',
      [sessionId, 'active']
    );

    if (!session) {
      console.log('❌ Invalid session');
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    // Decrypt the API key
    console.log('🔓 Decrypting API key...');
    const apiKey = decrypt(session.stored_encrypted_api_key);

    // Fetch all accounts
    const accounts = await fetch('https://api.up.com.au/api/v1/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });

    if (!accounts.ok) {
      console.log('❌ UP API request failed');
      res.status(accounts.status).json({ error: 'UP API request failed' });
      return;
    }

    const accountsData = await accounts.json() as UpAccountsResponse;
    console.log('✅ UP API request successful');

    const accountIds: AccountIds = accountsData.data.reduce((acc: AccountIds, account: UpAccount) => {
      const ownership = account.attributes.ownershipType;
      const accountInfo: AccountInfo = {
        id: account.id,
        accountOwnership: ownership
      };
      
      if (ownership === 'INDIVIDUAL') {
        acc.personal.push(accountInfo);
        acc.all.push(accountInfo);
      } else if (ownership === 'JOINT') {
        acc.joint.push(accountInfo);
        acc.all.push(accountInfo);
      }
      
      return acc;
    }, { personal: [], joint: [], all: [] });

    // Replace the single transactions fetch with paginated fetch to get the last n transactions
    console.log('📡 Fetching transactions from UP API...');
    const transactionsData = await fetchPaginatedTransactions(apiKey, 50);
    console.log(`✅ Fetched ${transactionsData.length} transactions`);

    // Filter transactions based on account types
    const filteredTransactions: Transaction[] = transactionsData.filter((transaction: Transaction) => {
      const accountId = transaction.relationships.account?.data?.id;
      if (accountTypes.includes('joint') && accountTypes.includes('personal')) {
        return accountIds.all.some(account => account.id === accountId)
      } else if (accountTypes.includes('joint')) {
        return accountIds.joint.some(account => account.id === accountId)
      } else if (accountTypes.includes('personal')) {
        return accountIds.personal.some(account => account.id === accountId)
      }
    });

    // Return the filtered transactions
    const dataFilteredForSelectedAccountTypes: TransactionResponse = {
      data: filteredTransactions
    };

    res.json(dataFilteredForSelectedAccountTypes);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/insights', async (req, res): Promise<void> => {
  console.log('received request', req.body); // now req.body will be typed as InsightRequest
  console.log('🔍 Getting insights...');

  const { messages, anonymisedSummary } = req.body;
  const sydneyTime = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  const systemPrompt = `You are a helpful financial assistant analyzing bank transaction data. 
Your task is to:
1. Understand the user's question about their spending
2. Analyze the provided transaction data
3. Provide a clear, concise response with relevant financial insights
4. If amounts are mentioned, always include the total and individual transactions
5. Keep responses brief and focused on the specific question asked

Transaction data format:
${JSON.stringify(anonymisedSummary[0], null, 2)}

If the user asks questions about their transactions, make sure your output follows this EXACT format:
[A clear summary statement about the spending analysis]

The transactions are:

[DATE]: [DESCRIPTION] - $[AMOUNT] AUD
[DATE]: [DESCRIPTION] - $[AMOUNT] AUD
[DATE]: [DESCRIPTION] - $[AMOUNT] AUD

Rules for formatting:
- Dates must be in YYYY-MM-DD format
- Always use positive dollar amounts with a $ prefix
- Always include "AUD" after the amount
- Each transaction must be on a new line
- Use a hyphen (-) before the amount
- No extra text or annotations

Example output:
You spent $127.50 AUD at restaurants over 3 transactions.

The transactions are:

2024-03-15: UBER EATS MELBOURNE - $42.50 AUD
2024-03-14: GRILL'D MELBOURNE - $35.00 AUD
2024-03-13: MCDONALDS SOUTH YARRA - $50.00 AUD
`;

  const userQuestion = messages[messages.length - 1].content;
  const userContent = `Question: ${userQuestion}

Please analyze the following bank transaction data to answer this question.
Each transaction includes:
- description: The merchant or transaction description
- amount: The transaction amount in AUD
- createdAt: The transaction date
- status: The transaction status
- rawText: Additional transaction details

Transaction Data:
${JSON.stringify(anonymisedSummary, null, 2)}

Please provide:
1. A direct answer to the question
2. The total amount (if applicable)
3. A brief breakdown of relevant transactions
4. Any notable patterns or insights

For your reference the date today is ${sydneyTime}`;

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
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 500,
      temperature: 0.6,
    })
  });

  const completion = await response.json();
  console.log('completion', completion);
  res.json({ answer: completion.choices[0].message.content });
});

export { router as upRouter };