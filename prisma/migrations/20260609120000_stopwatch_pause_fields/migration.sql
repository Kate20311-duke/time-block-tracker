-- AlterTable
ALTER TABLE "app"."FocusSession" ADD COLUMN "pausedAt" TIMESTAMP(3),
ADD COLUMN "pausedTotalSeconds" INTEGER NOT NULL DEFAULT 0;
