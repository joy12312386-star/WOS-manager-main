/*
  Warnings:

  - You are about to drop the column `fireGem` on the `TimeslotSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `fireSparkle` on the `TimeslotSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `generalAccel` on the `TimeslotSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `TimeslotSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reportDate` on the `TimeslotSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reportDay` on the `TimeslotSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `researchAccel` on the `TimeslotSubmission` table. All the data in the column will be lost.
  - Added the required column `alliance` to the `TimeslotSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fid` to the `TimeslotSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameId` to the `TimeslotSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerName` to the `TimeslotSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slotsData` to the `TimeslotSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TimeslotSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fid" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "alliance" TEXT NOT NULL,
    "slotsData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeslotSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TimeslotSubmission" ("createdAt", "id", "updatedAt", "userId") SELECT "createdAt", "id", "updatedAt", "userId" FROM "TimeslotSubmission";
DROP TABLE "TimeslotSubmission";
ALTER TABLE "new_TimeslotSubmission" RENAME TO "TimeslotSubmission";
CREATE INDEX "TimeslotSubmission_userId_idx" ON "TimeslotSubmission"("userId");
CREATE INDEX "TimeslotSubmission_alliance_idx" ON "TimeslotSubmission"("alliance");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
