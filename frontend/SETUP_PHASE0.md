# Phase 0 Setup Instructions

## 1. Install Dependencies

```bash
cd frontend
pnpm install

# Add backend dependencies
pnpm add prisma @prisma/client next-auth bcryptjs bull ioredis sharp resend @aws-sdk/client-s3 uuid

# Add dev dependencies for testing
pnpm add -D @types/bcryptjs @types/uuid jest ts-jest @types/jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

## 2. Initialize Prisma

```bash
cd frontend
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma`. Replace its content with the provided schema (already done).

## 3. Configure Environment

```bash
cd frontend
cp .env.example .env
```

Edit `.env` with your actual values:
- `DATABASE_URL`: your PostgreSQL connection string
- `NEXTAUTH_SECRET`: generate with `openssl rand -base64 32`
- `RESEND_API_KEY`: from Resend dashboard

## 4. Create Database

```bash
cd frontend
npx prisma db push   # creates tables in PostgreSQL
```

Or for production migrations:
```bash
npx prisma migrate dev --name init
```

## 5. Verify Setup

```bash
# Run tests
pnpm test

# Should pass:
# - Database connection test
# - Storage adapter test
# - Watermark test
```

## 6. Generate Prisma Client (if needed)

```bash
npx prisma generate
```

## Notes

- Storage currently uses local filesystem (`./storage`). Create this directory if needed.
- Redis is optional —Bull falls back to in-memory if `REDIS_URL` not set.
- `canvas` package (used by watermark) requires system libraries on Linux. On Windows, `sharp` prebuilt binaries should work.
