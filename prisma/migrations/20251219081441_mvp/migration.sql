-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('BUSINESS', 'PERSONAL');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('CREDIT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "userType" "UserType" NOT NULL DEFAULT 'PERSONAL',
    "businessName" TEXT,
    "gstIn" TEXT,
    "displayName" TEXT,
    "autoReminder" BOOLEAN NOT NULL DEFAULT true,
    "riskLimit" DECIMAL(65,30) NOT NULL DEFAULT 5000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_requests" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "TxType" NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "senderId" TEXT NOT NULL,
    "recieverPhone" TEXT,
    "recieverId" TEXT,
    "lastReminderSent" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "TxType" NOT NULL,
    "note" TEXT,
    "requestId" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "contacts_linkedUserId_idx" ON "contacts"("linkedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_userId_phoneNumber_key" ON "contacts"("userId", "phoneNumber");

-- CreateIndex
CREATE INDEX "transaction_requests_recieverPhone_status_idx" ON "transaction_requests"("recieverPhone", "status");

-- CreateIndex
CREATE INDEX "ledger_userId_transactionDate_idx" ON "ledger"("userId", "transactionDate");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_recieverId_fkey" FOREIGN KEY ("recieverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "transaction_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
