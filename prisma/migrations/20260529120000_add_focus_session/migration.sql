-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "note" TEXT,
    "categoryId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "plannedDurationMinutes" INTEGER NOT NULL,
    "actualDurationMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "convertedToTimeBlock" BOOLEAN NOT NULL DEFAULT false,
    "timeBlockId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FocusSession_timeBlockId_key" ON "FocusSession"("timeBlockId");

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_timeBlockId_fkey" FOREIGN KEY ("timeBlockId") REFERENCES "TimeBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
