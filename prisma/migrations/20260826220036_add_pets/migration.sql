-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "sex" "PetSex",
    "birth_date" TIMESTAMP(3),
    "photo_url" TEXT,
    "description" TEXT,
    "lost_status" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_privacy" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "show_phone" BOOLEAN NOT NULL DEFAULT true,
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "show_city" BOOLEAN NOT NULL DEFAULT true,
    "show_medical" BOOLEAN NOT NULL DEFAULT false,
    "show_veterinarian" BOOLEAN NOT NULL DEFAULT false,
    "show_behavior" BOOLEAN NOT NULL DEFAULT false,
    "show_contacts" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_privacy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pets_owner_id_idx" ON "pets"("owner_id");

-- CreateIndex
CREATE INDEX "pets_deleted_at_idx" ON "pets"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "pet_privacy_pet_id_key" ON "pet_privacy"("pet_id");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_privacy" ADD CONSTRAINT "pet_privacy_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
