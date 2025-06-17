# Outer

The open source frontend for Google Chat.

## Prerequisite

- Set up Google Cloud Project
- Set up OAuth 2.0 Client
- Set up Google Chat API

## Setup

Copy the `.env.example` file to `.env` and fill in the values.

```bash
bun install
```

Run the development server:

```bash
bun run dev
```

## Environment variables

| Variable             | Description                | Required |
| -------------------- | -------------------------- | -------- |
| DATABASE_URL         | Database URL (SQLite path) | Yes      |
| BETTER_AUTH_SECRET   | Better Auth secret         | Yes      |
| BETTER_AUTH_URL      | Better Auth URL            | Yes      |
| GOOGLE_CLIENT_ID     | Google Client ID           | Yes      |
| GOOGLE_CLIENT_SECRET | Google Client Secret       | Yes      |
