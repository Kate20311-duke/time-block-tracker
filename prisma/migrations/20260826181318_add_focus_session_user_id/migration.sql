-- Phase 62.2A: add FocusSession.userId with backfill from Category.userId.
-- Existing categoryId values are intentionally left unchanged.

ALTER TABLE "app"."FocusSession" ADD COLUMN "userId" TEXT;

UPDATE "app"."FocusSession" AS fs
SET "userId" = c."userId"
FROM "app"."Category" AS c
WHERE fs."categoryId" = c."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "app"."FocusSession" WHERE "userId" IS NULL
  ) THEN
    RAISE EXCEPTION 'FocusSession.userId backfill failed: NULL userId remains';
  END IF;
END $$;

ALTER TABLE "app"."FocusSession" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "FocusSession_userId_idx" ON "app"."FocusSession"("userId");

ALTER TABLE "app"."FocusSession"
ADD CONSTRAINT "FocusSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "app"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
