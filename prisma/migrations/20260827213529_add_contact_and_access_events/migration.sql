-- CreateEnum
CREATE TYPE "AccessSource" AS ENUM ('NFC', 'QR', 'DIRECT');

-- CreateTable
CREATE TABLE "access_events" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT,
    "nfc_tag_id" TEXT,
    "source" "AccessSource" NOT NULL DEFAULT 'DIRECT',
    "device_type" TEXT,
    "ip_hash" TEXT,
    "location_approx" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "nfc_tag_id" TEXT,
    "sender_name" TEXT,
    "sender_phone" TEXT,
    "sender_email" TEXT,
    "message" TEXT NOT NULL,
    "source" "AccessSource" NOT NULL DEFAULT 'DIRECT',
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_events_pet_id_idx" ON "access_events"("pet_id");

-- CreateIndex
CREATE INDEX "access_events_nfc_tag_id_idx" ON "access_events"("nfc_tag_id");

-- CreateIndex
CREATE INDEX "access_events_created_at_idx" ON "access_events"("created_at");

-- CreateIndex
CREATE INDEX "contact_messages_pet_id_idx" ON "contact_messages"("pet_id");

-- CreateIndex
CREATE INDEX "contact_messages_nfc_tag_id_idx" ON "contact_messages"("nfc_tag_id");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_nfc_tag_id_fkey" FOREIGN KEY ("nfc_tag_id") REFERENCES "nfc_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_nfc_tag_id_fkey" FOREIGN KEY ("nfc_tag_id") REFERENCES "nfc_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
