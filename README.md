# Voice Agent Backend

A TypeScript-based backend service for the Up Bank Voice Agent, built with Express and Bun runtime.

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Node.js 18+ (for development tools)
- Up Bank API key
- Anthropic API key (for Claude)

## Quick Start

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Copy the environment variables file:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`
5. Start the development server:

```bash
bun run dev
```

## Scripts

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `UP_API_KEY` - Your Up Bank API key
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude
- `PORT` - Server port (default: 3000)

See `.env.example` for all required variables.

## Project Structure

```
backend/
├── auth/           # Authentication related code
├── lib/            # Shared utilities and helpers
├── routes/         # API route handlers
├── content.ts      # Content management
├── index.ts        # Application entry point
├── types.ts        # TypeScript type definitions
└── database.sqlite # SQLite database
```

## Dependencies

- Express - Web framework
- Zod - Schema validation
- SQLite - Local database
- Anthropic SDK - AI integration
- CORS - Cross-origin resource sharing

## Development

The server will automatically restart when you make changes to the source files in development mode.

## Database

The project uses SQLite for data persistence. The database file is located at `database.sqlite`.

## API Documentation

API endpoints are documented in the source code. Key endpoints include:

- Authentication routes
- Transaction management
- Voice agent interactions

## License

MIT
