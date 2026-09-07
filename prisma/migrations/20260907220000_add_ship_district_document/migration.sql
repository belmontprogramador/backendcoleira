-- Add optional ship address fields (district + recipient document/CPF)
-- needed by the Melhor Envio cart payload (from/to must carry district + document).
ALTER TABLE "orders" ADD COLUMN "ship_district" TEXT;
ALTER TABLE "orders" ADD COLUMN "ship_document" TEXT;
