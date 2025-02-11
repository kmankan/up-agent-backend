import { Pool } from 'pg';
import OpenAI from 'openai';
import { createChunks } from './chunking';
import sqlite3 from 'sqlite3';
import type { Database } from 'sqlite';
import { open } from 'sqlite';
import type { Database as SqliteDatabase } from 'sqlite3';

// Type definitions
interface DocumentMetadata {
  source: string;
  title?: string;
  chunk_index?: number;
  total_chunks?: number;
  source_file?: string;
  [key: string]: string | number | undefined;
}

interface SearchResult {
  content: string;
  metadata: DocumentMetadata;
  similarity: number;
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.API_KEY_OPENAI
});

// Initialize Postgres connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Format embedding array for pgvector
function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// Generate embeddings using OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Search for similar documents
export async function searchSimilarDocuments(
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    const client = await pool.connect();
    const queryEmbedding = await generateEmbedding(query);
    const formattedEmbedding = formatEmbeddingForPostgres(queryEmbedding);
    
    const result = await client.query(
      `SELECT 
        content,
        metadata,
        1 - (embedding <=> $1) as similarity
       FROM documents
       ORDER BY embedding <=> $1
       LIMIT $2`,
      [formattedEmbedding, limit]
    );
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error searching similar documents:', error);
    throw error;
  }
} 

// ! NEED TO UNDERSTAND THIS BETTER 
// Create/open database connection
export async function getDb() {
  return open({
    filename: './database.sqlite', // * This is where the DB file will be created
    driver: sqlite3.Database // * sqlite3 is the actual driver creating/managing the file
  });
}

// ! NEED TO UNDERSTAND THIS BETTER 
// Initialize database tables
export async function initDb() {
  const db = await getDb();
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      private_key TEXT,
      user_encrypted_api_key TEXT,
      stored_encrypted_api_key TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_session_id ON sessions(session_id);
  `);
  
  return db;
}

export const withDb = async (
  operation: (db: Database<SqliteDatabase>) => Promise<void>
): Promise<void> => {
  const db = await getDb();
  try {
    await operation(db);
  } finally {
    await db.close();
  }
};