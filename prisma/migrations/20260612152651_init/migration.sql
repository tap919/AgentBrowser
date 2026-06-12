-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" JSONB,
    "code" TEXT,
    "securityTier" TEXT NOT NULL DEFAULT 'full',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutonomousSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "policyLevel" TEXT NOT NULL DEFAULT 'conservative',
    "autoConfigure" BOOLEAN NOT NULL DEFAULT true,
    "autoUpgradeSafe" BOOLEAN NOT NULL DEFAULT true,
    "resumeOnRestart" BOOLEAN NOT NULL DEFAULT true,
    "lastConfiguredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutonomousAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "skills" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutonomousAgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousAgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AutonomousAgent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutonomousUpgradeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "requestMessage" TEXT NOT NULL,
    "approvalTier" TEXT NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "autoExecute" BOOLEAN NOT NULL DEFAULT false,
    "approvalRationale" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recommendedRepos" JSONB NOT NULL,
    "report" JSONB,
    "createdBy" TEXT NOT NULL DEFAULT 'AgentBrowser',
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "AutonomousAgentRun_agentId_createdAt_idx" ON "AutonomousAgentRun"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AutonomousUpgradeJob_status_createdAt_idx" ON "AutonomousUpgradeJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AutonomousUpgradeJob_targetId_idx" ON "AutonomousUpgradeJob"("targetId");
