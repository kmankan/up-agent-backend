export type CreateSessionResponse = {
  sessionId: string;
  publicKey: string;
}

export type CreateSessionErrorResponse = {
  error: string;
}