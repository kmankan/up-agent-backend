import { generateKeyPair } from "../auth/keypair";
import express from 'express';
import type { Request, Response } from 'express';
import { getDb, withDb } from '../lib/db';
import type { CreateSessionResponse, CreateSessionErrorResponse } from '../types';
import crypto from 'crypto';
import { encrypt } from '../auth/encryption';
import { validateUpApiKey } from './up';

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
    console.log('🔑 Generated session ID:', sessionId);
    
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

router.post('/recieve-key', async (req, res) => {
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
      return res.status(400).json({ error: 'Invalid session' });
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
      return res.status(400).json({ error: 'Invalid API key' });
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
    
    console.log('🍪 Setting session cookie...');
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    console.log('✅ Success!');
    res.status(200).json({ success: true, apiKeyValid: isValid });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to store credentials' });
  }
});

router.get('/verify-session', async (req, res) => {
  try {
    console.log('🔍 Verifying session...');
    const sessionId = req.cookies.session_id;
    
    if (!sessionId) {
      console.log('❌ No session found');
      return res.status(401).json({ error: 'No session found' });
    }

    let session: Session | undefined;
    await withDb(async (db) => {
      session = await db.get<Session>(
        'SELECT session_id FROM sessions WHERE session_id = ? AND status = ?',
        [sessionId, 'active']
      );
    });

  if (!session) {
    console.log('❌ Invalid session');
    return res.status(401).json({ error: 'Invalid session' });
  }

  console.log('✅ Session verified');
  res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

export { router as authRouter };