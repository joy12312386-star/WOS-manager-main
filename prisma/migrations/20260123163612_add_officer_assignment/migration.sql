-- CreateTable
CREATE TABLE "OfficerAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventDate" TEXT NOT NULL,
    "officerType" TEXT NOT NULL,
    "utcOffset" TEXT NOT NULL DEFAULT '00:00',
    "slotsData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "OfficerAssignment_eventDate_idx" ON "OfficerAssignment"("eventDate");

-- CreateIndex
CREATE INDEX "OfficerAssignment_officerType_idx" ON "OfficerAssignment"("officerType");

-- CreateIndex
CREATE UNIQUE INDEX "OfficerAssignment_eventDate_officerType_key" ON "OfficerAssignment"("eventDate", "officerType");
