-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FIXED', 'PERCENTAGE', 'FIXED_PLUS_PERCENTAGE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('AVAILABLE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionSource" AS ENUM ('ORDER', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PAID', 'REJECTED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "referral_code" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "referral_code" TEXT;

-- CreateTable
CREATE TABLE "affiliates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "document" TEXT,
    "pix_key" TEXT,
    "bank_name" TEXT,
    "bank_agency" TEXT,
    "bank_account" TEXT,
    "commission_type" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "commission_fixed_cents" INTEGER NOT NULL DEFAULT 0,
    "commission_percent_bps" INTEGER NOT NULL DEFAULT 0,
    "min_withdrawal_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "source" "CommissionSource" NOT NULL,
    "order_id" TEXT,
    "subscription_id" TEXT,
    "base_amount_cents" INTEGER NOT NULL,
    "commission_type" "CommissionType" NOT NULL,
    "fixed_cents" INTEGER NOT NULL,
    "percent_bps" INTEGER NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "pix_key" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'RECEIVED',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_user_id_key" ON "affiliates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_email_key" ON "affiliates"("email");

-- CreateIndex
CREATE INDEX "affiliates_status_idx" ON "affiliates"("status");

-- CreateIndex
CREATE INDEX "affiliates_created_at_idx" ON "affiliates"("created_at");

-- CreateIndex
CREATE INDEX "commissions_affiliate_id_status_idx" ON "commissions"("affiliate_id", "status");

-- CreateIndex
CREATE INDEX "commissions_order_id_idx" ON "commissions"("order_id");

-- CreateIndex
CREATE INDEX "commissions_subscription_id_idx" ON "commissions"("subscription_id");

-- CreateIndex
CREATE INDEX "withdrawals_affiliate_id_status_idx" ON "withdrawals"("affiliate_id", "status");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
