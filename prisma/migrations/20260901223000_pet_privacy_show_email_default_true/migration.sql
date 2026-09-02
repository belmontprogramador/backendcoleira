-- Plano Basic deve expor o e-mail do tutor (contato direto — o formulário de
-- mensagem é Premium-only). Altera o default para true e faz backfill nos pets
-- existentes (antes o e-mail era privado por default).
ALTER TABLE "pet_privacy" ALTER COLUMN "show_email" SET DEFAULT true;

UPDATE "pet_privacy" SET "show_email" = true WHERE "show_email" = false;
