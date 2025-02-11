import express from 'express';
import { getDb } from '../lib/db'; // Make sure this import exists
import { decrypt } from '../auth/encryption'; // Make sure this import exists

const router = express.Router();

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

router.get('/get-summary', async (req, res): Promise<void> => {
  console.log('🔍 Getting UP summary...');
  
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

    // Make request to UP API to get transactions
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

    const data = await response.json();
    console.log('✅ UP API request successful');
    res.json(data);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as upRouter };