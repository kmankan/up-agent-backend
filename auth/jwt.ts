import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Make sure to set this in production

export function generateToken(sessionId: string): string {
  return jwt.sign({ sessionId }, JWT_SECRET, {
    expiresIn: '24h' // Matching the previous cookie expiry
  });
}

// Takes a token and returns the sessionId if the token is valid
export function verifyToken(token: string): { sessionId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sessionId: string };
  } catch (error) {
    return null;
  }
} 