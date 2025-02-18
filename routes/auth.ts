import { generateKeyPair } from "../auth/keypair";
import express from 'express';
import type { Request, Response } from 'express';
import { getDb, withDb } from '../lib/db';
import type { CreateSessionResponse, CreateSessionErrorResponse } from '../types';
import crypto from 'crypto';
import { encrypt } from '../auth/encryption';
import { validateUpApiKey } from './up';
import { generateToken, verifyToken } from '../auth/jwt';

const router = express.Router();

// Add interface at the top of file
interface Session {
  private_key: string;
  user_encrypted_api_key: string;
}

router.post('/init-session', async (req: Request, res: Response<CreateSessionResponse | CreateSessionErrorResponse>) => {
  try {
    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    console.log('🔑 Generated session ID');
    
    // Generate keypair for this session
    const { publicKey, privateKey } = generateKeyPair();
    console.log('🔑 Generated keypair:', { publicKey: !!publicKey, privateKey: !!privateKey });
    
    await withDb(async (db) => {
      await db.run(
        'INSERT INTO sessions (session_id, private_key, status) VALUES (?, ?, ?)',
        [sessionId, privateKey, 'pending']
      );
    });
    
    res.json({ sessionId, publicKey });
  } catch (error) {
    console.error('Init session error:', error);
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

router.post('/recieve-key', async (req, res): Promise<void> => {
  console.log('📥 Received encrypted API key request');
  try {
    const { sessionId, encryptedApiKey } = req.body;
    let apiKey = '';
    let session: Session | undefined;
    
    await withDb(async (db) => {
      // Store the user-encrypted key
      await db.run(
        'UPDATE sessions SET user_encrypted_api_key = ? WHERE session_id = ? AND status = ?',
        [encryptedApiKey, sessionId, 'pending']
      );
      
      session = await db.get<Session>(
        'SELECT private_key, user_encrypted_api_key FROM sessions WHERE session_id = ? AND status = ?',
        [sessionId, 'pending']
      );
    });
    
    if (!session) {
      console.log('❌ Invalid session');
      res.status(400).json({ error: 'Invalid session' });
      return
    }
    
    // Modified decryption process
    const privateKeyObject = {
      key: session.private_key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    };

    apiKey = crypto.privateDecrypt(
      privateKeyObject,
      Buffer.from(session.user_encrypted_api_key, 'base64')
    ).toString('utf-8');

    console.log('✨ Validating API key...');
    const isValid = await validateUpApiKey(apiKey);
    if (!isValid) {
      apiKey = '';
      res.status(400).json({ error: 'Invalid API key' });
    }
    
    console.log('🔒 Encrypting for storage...');
    const storedEncryptedKey = encrypt(apiKey);

    // ! clean up memory to remove unencrypted api key
    apiKey = '';
    
    await withDb(async (db) => {
      await db.run(
        'UPDATE sessions SET stored_encrypted_api_key = ?, user_encrypted_api_key = NULL, private_key = NULL, status = ? WHERE session_id = ?',
        [storedEncryptedKey, 'active', sessionId]
      );
    });
    
    // Replace cookie setting with JWT
    const token = generateToken(sessionId);
    
    console.log('🎟️ Generated JWT token');
    
    res.status(200).json({ 
      success: true, 
      apiKeyValid: isValid,
      token // Send token to client
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to store credentials' });
  }
});

router.get('/verify-session', async (req, res): Promise<void> => {
  try {
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

    let session: Session | undefined;
    await withDb(async (db) => {
      session = await db.get<Session>(
        'SELECT session_id FROM sessions WHERE session_id = ? AND status = ?',
        [sessionId, 'active']
      );
    });

    if (!session) {
      console.log('❌ Invalid session');
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    console.log('✅ Session verified');
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token found' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { sessionId } = payload;

    // Update session status in database
    await withDb(async (db) => {
      const result = await db.run(
        'UPDATE sessions SET status = ?, stored_encrypted_api_key = NULL WHERE session_id = ? AND status = ?',
        ['expired', sessionId, 'active']
      );
      
      if (result.changes === 0) {
        console.log('⚠️ No active session found to logout');
      } else {
        console.log('✅ Session expired successfully');
      }
    });

    // Send explicit instruction to clear token
    res.status(200).json({ 
      success: true,
      clearToken: true // Add this flag to explicitly tell client to clear token
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export { router as authRouter };