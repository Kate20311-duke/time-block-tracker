-- CreateTable
CREATE TABLE "app"."Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "metric" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "goalType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."GoalPeriod" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "app"."Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_userId_isActive_idx" ON "app"."Goal"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Goal_categoryId_idx" ON "app"."Goal"("categoryId");

-- CreateIndex
CREATE INDEX "GoalPeriod_goalId_idx" ON "app"."GoalPeriod"("goalId");

-- CreateIndex
CREATE INDEX "GoalPeriod_userId_idx" ON "app"."GoalPeriod"("userId");

-- CreateIndex
CREATE INDEX "GoalPeriod_goalId_periodStart_idx" ON "app"."GoalPeriod"("goalId", "periodStart");

-- AddForeignKey
ALTER TABLE "app"."Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Goal" ADD CONSTRAINT "Goal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "app"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."GoalPeriod" ADD CONSTRAINT "GoalPeriod_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "app"."Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."GoalPeriod" ADD CONSTRAINT "GoalPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
