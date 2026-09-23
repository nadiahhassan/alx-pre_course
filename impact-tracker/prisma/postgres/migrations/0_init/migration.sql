-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budget" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "region" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'planning',
    "tocInputs" TEXT NOT NULL DEFAULT '',
    "tocActivities" TEXT NOT NULL DEFAULT '',
    "tocOutputs" TEXT NOT NULL DEFAULT '',
    "tocOutcomes" TEXT NOT NULL DEFAULT '',
    "tocImpact" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parameter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL DEFAULT 'increase',
    "measureType" TEXT NOT NULL DEFAULT 'point',
    "baseline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3),
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "dataSource" TEXT NOT NULL DEFAULT '',
    "isKey" BOOLEAN NOT NULL DEFAULT false,
    "leadingIndicatorForId" TEXT,
    "libraryItemId" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'human',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryParameter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL DEFAULT 'increase',
    "measureType" TEXT NOT NULL DEFAULT 'point',
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "dataSource" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "confidence" TEXT NOT NULL DEFAULT 'measured',
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trackingTag" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMetric" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CampaignMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parameterId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "origin" TEXT NOT NULL DEFAULT 'human',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "payload" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "view" TEXT NOT NULL DEFAULT 'leadership',
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Parameter_projectId_idx" ON "Parameter"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_parameterId_date_key" ON "Entry"("parameterId", "date");

-- CreateIndex
CREATE INDEX "Campaign_projectId_idx" ON "Campaign"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMetric_campaignId_date_metric_key" ON "CampaignMetric"("campaignId", "date", "metric");

-- CreateIndex
CREATE INDEX "Evidence_projectId_idx" ON "Evidence"("projectId");

-- CreateIndex
CREATE INDEX "Snapshot_projectId_idx" ON "Snapshot"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_projectId_idx" ON "ShareLink"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parameter" ADD CONSTRAINT "Parameter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parameter" ADD CONSTRAINT "Parameter_leadingIndicatorForId_fkey" FOREIGN KEY ("leadingIndicatorForId") REFERENCES "Parameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parameter" ADD CONSTRAINT "Parameter_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryParameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parameter" ADD CONSTRAINT "Parameter_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "Parameter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMetric" ADD CONSTRAINT "CampaignMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "Parameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

