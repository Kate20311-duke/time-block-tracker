-- AlterTable
ALTER TABLE "app"."FocusSession" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'pomodoro';

-- AlterTable
ALTER TABLE "app"."TimeBlock" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
