export type CreateSessionResponse = {
  sessionId: string;
  publicKey: string;
}

export type CreateSessionErrorResponse = {
  error: string;
}

export type Transaction = {
  type: "transactions"
  id: string
  attributes: {
    status: "HELD" | "SETTLED"
    rawText: string | null
    description: string
    message: string | null
    isCategorizable: boolean
    holdInfo: {
      amount: {
        currencyCode: string
        value: string
        valueInBaseUnits: number
      }
      foreignAmount: {
        currencyCode: string
        value: string
        valueInBaseUnits: number
      } | null
    } | null
    roundUp: {
      amount: {
        currencyCode: string
        value: string
        valueInBaseUnits: number
      }
      boostPortion: {
        currencyCode: string
        value: string
        valueInBaseUnits: number
      } | null
    } | null
    cashback: {
      description: string
      amount: {
        currencyCode: string
        value: string
        valueInBaseUnits: number
      }
    } | null
    amount: {
      currencyCode: string
      value: string
      valueInBaseUnits: number
    }
    foreignAmount: {
      currencyCode: string
      value: string
      valueInBaseUnits: number
    } | null
    cardPurchaseMethod: {
      method: "CARD_ON_FILE" | string
      cardNumberSuffix: string
    } | null
    settledAt: string | null // ISO date-time
    createdAt: string // ISO date-time
    transactionType: string | null
    note: {
      text: string
    } | null
    performingCustomer: {
      displayName: string
    } | null
    deepLinkURL: string
  }
  relationships: {
    account: {
      data: {
        type: "accounts"
        id: string
      }
      links: {
        related: string
      }
    }
    transferAccount: {
      data: {
        type: "accounts"
        id: string
      } | null
      links: {
        related: string
      }
    }
    category: {
      data: {
        type: "categories"
        id: string
      } | null
      links: {
        self: string
        related?: string
      }
    }
    parentCategory: {
      data: {
        type: "categories"
        id: string
      } | null
      links: {
        related: string
      }
    }
    tags: {
      data: Array<{
        type: "tags"
        id: string
      }>
      links: {
        self: string
      }
    }
    attachment: {
      data: {
        type: "attachments"
        id: string
      } | null
      links: {
        related: string
      }
    }
  }
  links: {
    self: string
  }
}

