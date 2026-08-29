/*
  Warnings:

  - You are about to drop the column `activation_code_hash` on the `nfc_tags` table. All the data in the column will be lost.
  - Added the required column `activation_code_encrypted` to the `nfc_tags` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nfc_tags" DROP COLUMN "activation_code_hash",
ADD COLUMN     "activation_code_encrypted" TEXT NOT NULL;
