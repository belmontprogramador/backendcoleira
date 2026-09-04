
## Evolution API — produção + 2 fixes de integração (04/09)
- **VPS Belmont já tem envs configuradas**: `EVOLUTION_API_URL=https://evolutionapi.vps10329.panel.icontainer.cloud` + `EVOLUTION_API_KEY` setados; backend já alcança a Evolution (respondia 404 "instance does not exist"). Instância `elopet` criada (status `connecting`).
- **Fix 1 — `connectionState` 404 → `close`**: `EvolutionApiClient.connectionState` captura `EvolutionApiError` com `status === 404` (instância ainda não criada) e retorna `'close'` em vez de estourar 500. `EvolutionApiError` ganhou `status?: number` (propagado pelo `request`).
- **Fix 2 — `base64` do QR vem como data-URI**: `GET /instance/connect/{name}` retorna `base64: "data:image/png;base64,..."` (NÃO cru). Novo `normalizeQr()` (exportado) faz strip do prefixo `data:...;base64,` no `EvolutionApiClient.connect`, devolvendo base64 cru — o front (página Administração) prefixa `data:image/png;base64,` de novo e renderiza certo.
- **Validação live**: `POST /instance/create` → `{ instance.status: "connecting", qrcode.base64 (data-URI) }`; `connectionState` sem instância → 404 `{message:["The \"elopet\" instance does not exist"]}`.
- **Testes**: módulo whatsapp **25 PASS** (client ganhou 2 casos: 404→close e normalize); build EXIT 0.
