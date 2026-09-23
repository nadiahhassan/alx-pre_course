-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "mission" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "budget" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FocusArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programmeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "budget" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FocusArea_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FocusArea_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "spend" REAL NOT NULL DEFAULT 0,
    "trackingTag" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT 'external',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("channel", "createdAt", "endDate", "id", "name", "notes", "projectId", "spend", "startDate", "trackingTag", "updatedAt") SELECT "channel", "createdAt", "endDate", "id", "name", "notes", "projectId", "spend", "startDate", "trackingTag", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_projectId_idx" ON "Campaign"("projectId");
CREATE TABLE "new_Parameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL DEFAULT 'increase',
    "measureType" TEXT NOT NULL DEFAULT 'point',
    "baseline" REAL NOT NULL DEFAULT 0,
    "target" REAL NOT NULL,
    "targetDate" DATETIME,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "dataSource" TEXT NOT NULL DEFAULT '',
    "isKey" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'external',
    "leadingIndicatorForId" TEXT,
    "libraryItemId" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'human',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Parameter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Parameter_leadingIndicatorForId_fkey" FOREIGN KEY ("leadingIndicatorForId") REFERENCES "Parameter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Parameter_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryParameter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Parameter_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Parameter" ("approvedAt", "approvedById", "archivedAt", "baseline", "createdAt", "dataSource", "definition", "direction", "frequency", "id", "isKey", "leadingIndicatorForId", "level", "libraryItemId", "measureType", "name", "origin", "projectId", "sortOrder", "target", "targetDate", "unit", "updatedAt") SELECT "approvedAt", "approvedById", "archivedAt", "baseline", "createdAt", "dataSource", "definition", "direction", "frequency", "id", "isKey", "leadingIndicatorForId", "level", "libraryItemId", "measureType", "name", "origin", "projectId", "sortOrder", "target", "targetDate", "unit", "updatedAt" FROM "Parameter";
DROP TABLE "Parameter";
ALTER TABLE "new_Parameter" RENAME TO "Parameter";
CREATE INDEX "Parameter_projectId_idx" ON "Parameter"("projectId");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "focusAreaId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "budget" REAL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "region" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'planning',
    "tocInputs" TEXT NOT NULL DEFAULT '',
    "tocActivities" TEXT NOT NULL DEFAULT '',
    "tocOutputs" TEXT NOT NULL DEFAULT '',
    "tocOutcomes" TEXT NOT NULL DEFAULT '',
    "tocImpact" TEXT NOT NULL DEFAULT '',
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("archivedAt", "budget", "createdAt", "currency", "description", "endDate", "id", "name", "ownerId", "region", "startDate", "status", "tocActivities", "tocImpact", "tocInputs", "tocOutcomes", "tocOutputs", "updatedAt") SELECT "archivedAt", "budget", "createdAt", "currency", "description", "endDate", "id", "name", "ownerId", "region", "startDate", "status", "tocActivities", "tocImpact", "tocInputs", "tocOutcomes", "tocOutputs", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "team" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "role") SELECT "createdAt", "email", "id", "name", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
