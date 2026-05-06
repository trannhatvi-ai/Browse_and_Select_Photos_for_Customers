# Phase 0: Infrastructure Setup — Completed

## What Was Built

### Files Created
- `.env.example` — environment variables template
- `prisma/schema.prisma` — complete database schema
- `lib/db.ts` — Prisma client singleton
- `lib/storage.ts` — storage abstraction (LocalStorage + S3 stub)
- `lib/watermark.ts` — watermark generation with sharp
- `lib/auth.ts` — NextAuth configuration
- `app/api/auth/[...nextauth]/route.ts` — NextAuth endpoint
- `jest.config.js` — test configuration
- `lib/__tests__/db.test.ts` — DB connection test
- `lib/__tests__/storage.test.ts` — storage adapter test
- `lib/__tests__/watermark.test.ts` — watermark test
- `lib/__tests__/auth.test.ts` — bcrypt auth test
- `SETUP_PHASE0.md` — setup instructions

### package.json Updates
Added dependencies:
- `prisma`, `@prisma/client`
- `next-auth`, `bcryptjs`
- `bull`, `ioredis`
- `sharp`
- `resend`
- `@aws-sdk/client-s3`
- `uuid`

Added devDependencies:
- `jest`, `ts-jest`, `@types/jest`
- `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`
- `@types/bcryptjs`, `@types/uuid`

Added script: `"test": "jest"`

## Manual Steps Required (User)

1. **Install dependencies**: `cd frontend && pnpm install`
2. **Initialize Prisma**: `npx prisma init --datasource-provider postgresql` (already have schema, just ensure prisma folder exists)
3. **Configure .env**: `cp .env.example .env` và điền `DATABASE_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`
4. **Create database**: `npx prisma db push` (or `npx prisma migrate dev --name init`)
5. **Generate Prisma client**: `npx prisma generate`
6. **Run tests**: `pnpm test` — expect all to pass

## Verification

Once steps above completed:
- ✅ Database connected
- ✅ Storage adapter working
- ✅ Watermark function returns valid image buffer
- ✅ Auth hashing works

## Next

After Phase 0 complete, move to **Phase 1: Auth API** — implement login/logout/session endpoints.
