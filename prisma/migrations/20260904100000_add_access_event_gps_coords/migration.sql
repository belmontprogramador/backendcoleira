-- F1 (localização por GPS): o navegador do visitante reporta coordenadas
-- (latitude/longitude) após o scan. Guardamos as coords no AccessEvent para
-- exibir "Ver no mapa" na aba Acessos e no e-mail de scan (pet perdido).
ALTER TABLE "access_events" ADD COLUMN     "latitude" DOUBLE PRECISION;
ALTER TABLE "access_events" ADD COLUMN     "longitude" DOUBLE PRECISION;
