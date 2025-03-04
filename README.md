# Up Bank Assistant - Backend

## Overview

This is the backend service for the [Up Bank Assistant](https://github.com/kmankan/up-agent-frontend) project, an AI-powered tool that enhances banking experiences using the [Up Bank API](https://developer.up.com.au/). The backend handles secure API key management, Up Bank data retrieval, AI integrations, and serves the frontend application.

**Frontend Repository**: The frontend for this project can be found at [https://github.com/kmankan/up-agent-frontend](https://github.com/kmankan/up-agent-frontend)

## Features

### API Integration

- **Secure Up Bank API Access**: Manages secure connections to the Up Bank API
- **Transaction & Account Data**: Retrieves and processes transaction and account data

### AI Services

- **Information Assistant**: Provides information about Up Bank using AI models
- **Transaction Analysis**: Enables natural language querying of transaction data
- **Voice Agent Integration**: Backend services for Bland AI voice agent capabilities

### Security

- **End-to-End Encryption**: Public-private key encryption for API key transmission
- **Secure Key Storage**: AES-256-GCM encryption for stored sensitive data
- **JWT Authentication**: Secure session management with short-lived tokens

## Technical Architecture

### Backend Framework

- Node.js with TypeScript
- Express for API endpoints
- Zod for schema validation

### Database

- SQLite for lightweight data persistence
- Stores encrypted keys and session information

### AI Integration

- OpenAI API for Deep Research capabilities
- Google's Gemini-Flash-1.5 for efficient query processing
- Vector database for storing embedded information

### Security Implementation

- RSA public-private key generation for secure key exchange
- AES-256-GCM encryption for data at rest
- HTTPS for secure data transmission

## API Endpoints

The backend provides several API endpoints:

- **Authentication**: Endpoints for session initialization and verification
- **Up Bank Data**: Secure proxying of Up Bank API requests
- **AI Services**: Endpoints for information retrieval and transaction analysis
- **Voice Agent**: Integration points for Bland AI voice services

## Security Considerations

**IMPORTANT SECURITY DISCLAIMER**: This project implements several security measures for handling API keys:

- Public-private key encryption for initial API key transmission
- Keys are only decrypted momentarily when needed for API calls
- No plain text storage of keys
- No logging or storing of transaction information
- Personal information is anonymized before being sent to LLMs

However, this is a demonstration project that hasn't undergone comprehensive security review. For maximum security, it's recommended to clone the repository and run it locally.

## Getting Started

### Prerequisites

- Node.js (v16+)
- Up Bank account with API access
- API keys for OpenAI and other services

### Installation

1. Clone the repository

   ```
   git clone https://github.com/kmankan/up-agent-backend.git
   cd up-agent-backend
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Configure environment variables

   ```
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. Start the development server
   ```
   npm run dev
   ```

### Environment Variables

Required environment variables include:

- `UP_API_KEY`: For development/testing only (in production, user keys are used)
- `ANTHROPIC_API_KEY`: For Claude AI integration
- `PORT`: Server port (default: 3000)
- `CORS_ORIGIN`: Frontend URL for CORS policy
- `JWT_SECRET`: Secret for signing JWTs
- `ENCRYPTION_KEY`: Key for AES encryption

See `.env.example` for all required variables.

## Project Structure

```
backend/
├── auth/           # Authentication related code
├── lib/            # Shared utilities and helpers
├── routes/         # API route handlers
├── content.ts      # Content management for AI
├── index.ts        # Application entry point
├── types.ts        # TypeScript type definitions
└── database.sqlite # SQLite database
```

## Development

The server will automatically restart when you make changes to the source files in development mode.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
