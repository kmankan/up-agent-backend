export type CreateSessionResponse = {
  sessionId: string;
  publicKey: string;
}

export type CreateSessionErrorResponse = {
  error: string;
}

export interface Category {
  type: string;
  id: string;
}

export interface Transaction {
  id: string;
  attributes: {
    status: string;
    rawText: string;
    description: string;
    message: string | null;
    isCategorizable: boolean;
    amount: {
      currencyCode: string;
      value: string;
      valueInBaseUnits: number;
    };
    cardPurchaseMethod?: {
      method: string;
      cardNumberSuffix: string;
    } | null;
    settledAt: string;
    createdAt: string;
    transactionType: string;
    performingCustomer?: {
      displayName: string;
    } | null;
    deepLinkURL?: string;
  };
  relationships: {
    category: {
      data: Category | null;
    };
    parentCategory: {
      data: Category | null;
    };
    tags: {
      data: string[];
    };
    account?: {
      data: Category | null;
    };
    attachment?: {
      data: string | null;
    };
  };
}

export interface TransactionResponse {
  data: Transaction[];
}

export interface InsightRequest {
  messages: Message[];
  summary: TransactionResponse;
}

export interface InsightResponse {
  answer: string;
}

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};
