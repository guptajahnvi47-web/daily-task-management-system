-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "dateKey" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ArchivedTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalTaskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "dateKey" TEXT NOT NULL,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateKey" TEXT NOT NULL,
    "totalCreated" INTEGER NOT NULL,
    "totalCompleted" INTEGER NOT NULL,
    "totalPendingEndOfDay" INTEGER NOT NULL,
    "completionPercentage" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailySummaryNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateKey" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailySummaryNotification_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "DailySummary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Task_dateKey_idx" ON "Task"("dateKey");

-- CreateIndex
CREATE INDEX "ArchivedTask_dateKey_idx" ON "ArchivedTask"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_dateKey_key" ON "DailySummary"("dateKey");

-- CreateIndex
CREATE INDEX "DailySummaryNotification_dateKey_idx" ON "DailySummaryNotification"("dateKey");
