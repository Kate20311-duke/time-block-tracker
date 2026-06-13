-- AlterTable
ALTER TABLE "app"."FocusSession" ADD COLUMN "pauseCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "app"."FocusSegment" (
    "id" TEXT NOT NULL,
    "focusSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusSegment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "app"."TimeBlock" ADD COLUMN "focusSegmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TimeBlock_focusSegmentId_key" ON "app"."TimeBlock"("focusSegmentId");

-- CreateIndex
CREATE INDEX "FocusSegment_focusSessionId_idx" ON "app"."FocusSegment"("focusSessionId");

-- CreateIndex
CREATE INDEX "FocusSegment_userId_idx" ON "app"."FocusSegment"("userId");

-- CreateIndex
CREATE INDEX "FocusSegment_categoryId_idx" ON "app"."FocusSegment"("categoryId");

-- AddForeignKey
ALTER TABLE "app"."TimeBlock" ADD CONSTRAINT "TimeBlock_focusSegmentId_fkey" FOREIGN KEY ("focusSegmentId") REFERENCES "app"."FocusSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."FocusSegment" ADD CONSTRAINT "FocusSegment_focusSessionId_fkey" FOREIGN KEY ("focusSessionId") REFERENCES "app"."FocusSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."FocusSegment" ADD CONSTRAINT "FocusSegment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."FocusSegment" ADD CONSTRAINT "FocusSegment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "app"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
