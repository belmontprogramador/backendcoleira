# Requisitos e Regras de Negócio

## 1. Requisitos Funcionais

- **RF01** — Cadastrar usuário.
- **RF02** — Autenticar usuário.
- **RF03** — Recuperar senha.
- **RF04** — Verificar e-mail.
- **RF05** — Cadastrar pet.
- **RF06** — Editar pet.
- **RF07** — Excluir pet.
- **RF08** — Ativar pingente.
- **RF09** — Associar pingente ao usuário.
- **RF10** — Associar pingente ao pet.
- **RF11** — Consultar perfil público.
- **RF12** — Acessar via NFC.
- **RF13** — Acessar via QR.
- **RF14** — Enviar mensagem ao tutor.
- **RF15** — Compartilhar localização.
- **RF16** — Ativar modo perdido.
- **RF17** — Desativar modo perdido.
- **RF18** — Registrar acessos.
- **RF19** — Enviar notificações.
- **RF20** — Assinar Premium.
- **RF21** — Cancelar assinatura.
- **RF22** — Renovar assinatura.
- **RF23** — Atualizar assinatura via webhook.
- **RF24** — Controlar funcionalidades por plano.
- **RF25** — Configurar privacidade.
- **RF26** — Transferir pingente.
- **RF27** — Desvincular pingente.
- **RF28** — Substituir pingente.
- **RF29** — Gerenciar produção.
- **RF30** — Gerenciar lotes.
- **RF31** — Gerenciar estoque.
- **RF32** — Gerenciar pedidos.
- **RF33** — Administrar usuários.
- **RF34** — Auditar operações.

---

## 2. Requisitos Não Funcionais

- **RNF01 — Disponibilidade:** meta **99,9%**.
- **RNF02 — Performance:** perfil público otimizado para carregamento rápido.
- **RNF03 — Escalabilidade:** API stateless.
- **RNF04 — Segurança:** HTTPS, hashing, rate limiting, autorização e validação.
- **RNF05 — Privacidade:** minimização e controle de exposição.
- **RNF06 — Backup:** backup automatizado e restauração testada.
- **RNF07 — Observabilidade:** logs, métricas, tracing e alertas.
- **RNF08 — Manutenibilidade:** TypeScript, testes e arquitetura modular.
- **RNF09 — Idempotência:** pagamentos e eventos externos idempotentes.
- **RNF10 — Resiliência:** serviços secundários não podem derrubar o perfil público.

---

## 3. Regras de Negócio Principais

- **RB01** — Public ID é único.
- **RB02** — UID físico é único.
- **RB03** — Código de ativação é único.
- **RB04** — Código de ativação é single-use.
- **RB05** — Pingente AVAILABLE pode ser ativado.
- **RB06** — Pingente ACTIVE não pode ser ativado novamente.
- **RB07** — Somente proprietário pode alterar dados.
- **RB08** — Perfil público não exige login.
- **RB09** — Dados privados exigem autenticação.
- **RB10** — NFC e QR apontam para a mesma identidade.
- **RB11** — NFC nunca armazena dados pessoais.
- **RB12** — QR nunca armazena dados pessoais.
- **RB13** — Public ID não concede propriedade.
- **RB14** — Premium não altera o hardware.
- **RB15** — Premium altera os recursos disponíveis.
- **RB16** — Backend é responsável pela autorização Premium.
- **RB17** — Pagamento deve ser confirmado antes da liberação.
- **RB18** — Webhook deve ser validado.
- **RB19** — Webhook deve ser idempotente.
- **RB20** — Downgrade não apaga dados automaticamente.
- **RB21** — Dados públicos dependem de privacidade.
- **RB22** — NFC não fornece localização.
- **RB23** — Localização depende de consentimento.
- **RB24** — Transferência deve ser auditada.
- **RB25** — Desvinculação invalida código anterior.
- **RB26** — Exclusão do pet não libera automaticamente o pingente.
- **RB27** — Pingente substituído pode manter o mesmo perfil.
- **RB28** — Operações administrativas devem ser auditadas.
