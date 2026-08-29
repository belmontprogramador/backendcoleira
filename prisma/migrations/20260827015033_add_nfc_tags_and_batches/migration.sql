-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('CREATED', 'READY', 'IN_STOCK', 'SOLD', 'DELIVERED', 'AVAILABLE', 'ACTIVE', 'SUSPENDED', 'LOST', 'DEACTIVATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'GENERATING', 'GENERATED', 'WRITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "nfc_tags" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "uid" TEXT,
    "activation_code_hash" TEXT NOT NULL,
    "status" "TagStatus" NOT NULL DEFAULT 'CREATED',
    "batch_id" TEXT,
    "owner_id" TEXT,
    "pet_id" TEXT,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfc_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prefix" TEXT,
    "external_ref" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "generated_count" INTEGER NOT NULL DEFAULT 0,
    "written_count" INTEGER NOT NULL DEFAULT 0,
    "verified_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nfc_tags_public_id_key" ON "nfc_tags"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "nfc_tags_uid_key" ON "nfc_tags"("uid");

-- CreateIndex
CREATE INDEX "nfc_tags_status_idx" ON "nfc_tags"("status");

-- CreateIndex
CREATE INDEX "nfc_tags_batch_id_idx" ON "nfc_tags"("batch_id");

-- CreateIndex
CREATE INDEX "nfc_tags_owner_id_idx" ON "nfc_tags"("owner_id");

-- CreateIndex
CREATE INDEX "nfc_tags_pet_id_idx" ON "nfc_tags"("pet_id");

-- CreateIndex
CREATE UNIQUE INDEX "batches_name_key" ON "batches"("name");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE INDEX "batches_created_by_idx" ON "batches"("created_by");

-- CreateIndex
CREATE INDEX "batches_created_at_idx" ON "batches"("created_at");

-- AddForeignKey
ALTER TABLE "nfc_tags" ADD CONSTRAINT "nfc_tags_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_tags" ADD CONSTRAINT "nfc_tags_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_tags" ADD CONSTRAINT "nfc_tags_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
