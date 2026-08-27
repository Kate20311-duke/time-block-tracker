-- Phase 62.2B: FocusSession / FocusSegment categoryId nullable + ON DELETE SET NULL.
-- Existing categoryId values are intentionally left unchanged.

ALTER TABLE "app"."FocusSegment" DROP CONSTRAINT "FocusSegment_categoryId_fkey";
ALTER TABLE "app"."FocusSession" DROP CONSTRAINT "FocusSession_categoryId_fkey";

ALTER TABLE "app"."FocusSegment" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "app"."FocusSession" ALTER COLUMN "categoryId" DROP NOT NULL;

ALTER TABLE "app"."FocusSession"
ADD CONSTRAINT "FocusSession_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "app"."Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "app"."FocusSegment"
ADD CONSTRAINT "FocusSegment_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "app"."Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
