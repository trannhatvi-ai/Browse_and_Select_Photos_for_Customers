CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "CloudinaryAccount" (
  "id" TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "cloudName" TEXT NOT NULL,
  "apiKey" TEXT NOT NULL,
  "apiSecret" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "usedBytes" BIGINT NOT NULL DEFAULT 0,
  "limitBytes" BIGINT NOT NULL DEFAULT 26843545600,
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CloudinaryAccount_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CloudinaryAccount_userId_fkey'
  ) THEN
    ALTER TABLE "CloudinaryAccount"
      ADD CONSTRAINT "CloudinaryAccount_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CloudinaryAccount_userId_idx" ON "CloudinaryAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "CloudinaryAccount_userId_cloudName_key" ON "CloudinaryAccount"("userId", "cloudName");

ALTER TABLE "Photo"
  ADD COLUMN IF NOT EXISTS "cloudinaryAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "cloudinaryCloudName" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Photo_cloudinaryAccountId_fkey'
  ) THEN
    ALTER TABLE "Photo"
      ADD CONSTRAINT "Photo_cloudinaryAccountId_fkey"
      FOREIGN KEY ("cloudinaryAccountId") REFERENCES "CloudinaryAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Photo_cloudinaryAccountId_idx" ON "Photo"("cloudinaryAccountId");

INSERT INTO "CloudinaryAccount" ("userId", "label", "cloudName", "apiKey", "apiSecret")
SELECT "userId", "cloudinaryCloudName", "cloudinaryCloudName", "cloudinaryApiKey", "cloudinaryApiSecret"
FROM "Settings"
WHERE COALESCE(trim("cloudinaryCloudName"), '') <> ''
  AND COALESCE(trim("cloudinaryApiKey"), '') <> ''
  AND COALESCE(trim("cloudinaryApiSecret"), '') <> ''
ON CONFLICT ("userId", "cloudName") DO NOTHING;

UPDATE "Photo"
SET "cloudinaryCloudName" = (regexp_match("previewUrl", 'res\.cloudinary\.com/([^/]+)/'))[1]
WHERE "cloudinaryCloudName" IS NULL
  AND "previewUrl" LIKE '%res.cloudinary.com/%';

UPDATE "Photo" p
SET "cloudinaryAccountId" = ca."id"
FROM "Project" pr, "CloudinaryAccount" ca
WHERE p."projectId" = pr."id"
  AND p."cloudinaryAccountId" IS NULL
  AND p."cloudinaryCloudName" = ca."cloudName"
  AND (
    ca."userId" = pr."createdBy"
    OR ca."userId" IN (SELECT "id" FROM "User" WHERE "role" = 'ADMIN')
  );
