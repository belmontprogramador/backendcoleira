-- F3 (localização por GPS no contato): o visitante reporta coordenadas
-- (latitude/longitude) junto com a mensagem de contato. Guardamos as coords
-- no ContactMessage para exibir "Ver no mapa" no e-mail de contato e no inbox.
ALTER TABLE "contact_messages" ADD COLUMN     "latitude" DOUBLE PRECISION;
ALTER TABLE "contact_messages" ADD COLUMN     "longitude" DOUBLE PRECISION;
