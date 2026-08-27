-- Add currency + amountOriginal to existing project_upsells tables.
-- Run after deploying schema changes, or use: npx prisma db push

ALTER TABLE "project_upsells"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "amountOriginal" BIGINT NOT NULL DEFAULT 0;

UPDATE "project_upsells"
SET "amountOriginal" = "amountPkr"
WHERE "amountOriginal" = 0 AND "amountPkr" <> 0;
