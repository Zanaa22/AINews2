-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "generatedAtUtc" DATETIME NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "hotCount" INTEGER NOT NULL DEFAULT 0,
    "notableCount" INTEGER NOT NULL DEFAULT 0,
    "quietCount" INTEGER NOT NULL DEFAULT 0,
    "morningNote" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerLabel" TEXT NOT NULL,
    "trackKey" TEXT NOT NULL,
    "trackLabel" TEXT NOT NULL,
    "heat" TEXT NOT NULL,
    "streamKey" TEXT NOT NULL,
    "streamLabel" TEXT NOT NULL,
    "rank" INTEGER,
    "sourceUrl" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "citations" JSONB NOT NULL,
    "confidence" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "occurredAtUtc" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Signal_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "providerLabel" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAtUtc" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editionId" TEXT,
    "status" TEXT NOT NULL,
    "startedAtUtc" DATETIME NOT NULL,
    "finishedAtUtc" DATETIME,
    "itemsFetched" INTEGER NOT NULL DEFAULT 0,
    "itemsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "logText" TEXT,
    "logPath" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngestionRun_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Edition_date_key" ON "Edition"("date");

-- CreateIndex
CREATE INDEX "Edition_generatedAtUtc_idx" ON "Edition"("generatedAtUtc");

-- CreateIndex
CREATE INDEX "Signal_editionId_streamKey_rank_idx" ON "Signal"("editionId", "streamKey", "rank");

-- CreateIndex
CREATE INDEX "Signal_editionId_heat_idx" ON "Signal"("editionId", "heat");

-- CreateIndex
CREATE INDEX "Signal_editionId_trackKey_idx" ON "Signal"("editionId", "trackKey");

-- CreateIndex
CREATE INDEX "Signal_providerKey_idx" ON "Signal"("providerKey");

-- CreateIndex
CREATE INDEX "Signal_occurredAtUtc_idx" ON "Signal"("occurredAtUtc");

-- CreateIndex
CREATE INDEX "Source_enabled_idx" ON "Source"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Source_type_identifier_key" ON "Source"("type", "identifier");

-- CreateIndex
CREATE INDEX "IngestionRun_startedAtUtc_idx" ON "IngestionRun"("startedAtUtc");

-- CreateIndex
CREATE INDEX "IngestionRun_status_idx" ON "IngestionRun"("status");

