-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "allianceId" TEXT,
    "allianceName" TEXT,
    "coordinateX" INTEGER,
    "coordinateY" INTEGER,
    "powerPoints" INTEGER,
    "T11Status" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TimeslotSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "reportDay" INTEGER NOT NULL,
    "fireSparkle" INTEGER NOT NULL,
    "fireGem" INTEGER NOT NULL,
    "researchAccel" INTEGER NOT NULL,
    "generalAccel" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeslotSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceStatistic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allianceName" TEXT NOT NULL,
    "totalMembersT11" INTEGER NOT NULL DEFAULT 0,
    "totalMembersT10" INTEGER NOT NULL DEFAULT 0,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "totalFireSparkle" INTEGER NOT NULL DEFAULT 0,
    "totalFireGem" INTEGER NOT NULL DEFAULT 0,
    "totalResearchAccel" INTEGER NOT NULL DEFAULT 0,
    "totalGeneralAccel" INTEGER NOT NULL DEFAULT 0,
    "statisticDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceStatistic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SVSApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "allianceName" TEXT NOT NULL,
    "applicationDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SVSApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "isOfficer" BOOLEAN NOT NULL DEFAULT false,
    "assignedDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT,
    "changes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settingKey" TEXT NOT NULL,
    "settingValue" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_gameId_key" ON "User"("gameId");

-- CreateIndex
CREATE INDEX "User_gameId_idx" ON "User"("gameId");

-- CreateIndex
CREATE INDEX "User_allianceId_idx" ON "User"("allianceId");

-- CreateIndex
CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin");

-- CreateIndex
CREATE INDEX "TimeslotSubmission_userId_idx" ON "TimeslotSubmission"("userId");

-- CreateIndex
CREATE INDEX "TimeslotSubmission_reportDate_idx" ON "TimeslotSubmission"("reportDate");

-- CreateIndex
CREATE INDEX "AllianceStatistic_allianceId_idx" ON "AllianceStatistic"("allianceId");

-- CreateIndex
CREATE INDEX "AllianceStatistic_userId_idx" ON "AllianceStatistic"("userId");

-- CreateIndex
CREATE INDEX "AllianceStatistic_statisticDate_idx" ON "AllianceStatistic"("statisticDate");

-- CreateIndex
CREATE INDEX "SVSApplication_userId_idx" ON "SVSApplication"("userId");

-- CreateIndex
CREATE INDEX "SVSApplication_allianceId_idx" ON "SVSApplication"("allianceId");

-- CreateIndex
CREATE INDEX "SVSApplication_status_idx" ON "SVSApplication"("status");

-- CreateIndex
CREATE INDEX "PlayerPosition_userId_idx" ON "PlayerPosition"("userId");

-- CreateIndex
CREATE INDEX "PlayerPosition_allianceId_idx" ON "PlayerPosition"("allianceId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSettings_settingKey_key" ON "AdminSettings"("settingKey");

-- CreateIndex
CREATE INDEX "AdminSettings_settingKey_idx" ON "AdminSettings"("settingKey");
