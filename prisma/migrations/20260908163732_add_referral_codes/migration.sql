/*
  Warnings:

  - You are about to drop the column `referral_code` on the `subscriptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "referral_code" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "referral_code";
