import express from 'express';
import { getDb } from '../lib/db'; // Make sure this import exists
import { decrypt } from '../auth/encryption'; // Make sure this import exists
import type { InsightRequest, InsightResponse, Message, TransactionResponse, Transaction } from '../types';

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

router.post('/get-summary', async (req, res): Promise<void> => {
  console.log('recieved request', req.body);
  console.log('🔍 Getting UP summary...');

  const { accountTypes } = req.body;

  try {
    // Get session ID from cookie
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      console.log('❌ No session found');
      res.status(401).json({ error: 'No session found' });
    }

    // Get encrypted API key from database
    const db = await getDb();
    const session = await db.get(
      'SELECT stored_encrypted_api_key FROM sessions WHERE session_id = ? AND status = ?',
      [sessionId, 'active']
    );

    if (!session) {
      console.log('❌ Invalid session');
      res.status(401).json({ error: 'Invalid session' });
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

    console.log('📡 Fetching transactions from UP API...');
    const response = await fetch('https://api.up.com.au/api/v1/transactions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.log('❌ UP API request failed');
      res.status(response.status).json({ error: 'UP API request failed' });
    }

    const transactionsData = await response.json() as TransactionResponse;
    console.log('✅ UP API request successful');

    // Filter transactions based on account types so that we only return the relevant ones
    const filteredTransactions: Transaction[] = transactionsData.data.filter((transaction: Transaction) => {
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

  const systemPrompt = `You are a helpful financial assistant analyzing bank transaction data. 
Your task is to:
1. Understand the user's question about their spending
2. Analyze the provided transaction data
3. Provide a clear, concise response with relevant financial insights
4. If amounts are mentioned, always include the total and individual transactions
5. Keep responses brief and focused on the specific question asked

Transaction data format:
${JSON.stringify(anonymisedSummary[0], null, 2)}`;

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
4. Any notable patterns or insights`;

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