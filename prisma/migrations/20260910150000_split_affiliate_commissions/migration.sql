-- Separa a comissão em venda (sale) e assinatura (subscription).
-- A config antiga (geral) vira a config de venda e é copiada para a de
-- assinatura, preservando o comportamento anterior para afiliados existentes.

-- Renomeia os campos antigos para "sale_*".
ALTER TABLE "affiliates" RENAME COLUMN "commission_type" TO "sale_commission_type";
ALTER TABLE "affiliates" RENAME COLUMN "commission_fixed_cents" TO "sale_commission_fixed_cents";
ALTER TABLE "affiliates" RENAME COLUMN "commission_percent_bps" TO "sale_commission_percent_bps";

-- Adiciona os campos de assinatura.
ALTER TABLE "affiliates" ADD COLUMN "subscription_commission_type" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE';
ALTER TABLE "affiliates" ADD COLUMN "subscription_commission_fixed_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "affiliates" ADD COLUMN "subscription_commission_percent_bps" INTEGER NOT NULL DEFAULT 0;

-- Copia a config de venda para a assinatura (preserva o comportamento atual).
UPDATE "affiliates" SET
  "subscription_commission_type" = "sale_commission_type",
  "subscription_commission_fixed_cents" = "sale_commission_fixed_cents",
  "subscription_commission_percent_bps" = "sale_commission_percent_bps";
