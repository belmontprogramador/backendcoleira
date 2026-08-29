# Git e UML — Referencia Detalhada

## 1. Git Internals

4 localizacoes: Working Directory -> Staging Area -> Local Repo -> Remote Repo.

Objetos: Blob (conteudo), Tree (diretorio), Commit (snapshot), Tag (ponteiro nomeado).

Branches = ponteiros moveis. HEAD = branch atual.

## 2. Merge vs Rebase vs Squash

**Merge:** cria merge commit. Preserva historico completo (nao-linear). Seguro. Nao altera commits.
**Rebase:** reaplica commits. Historico linear. Reescreve historico. NUNCA em branches compartilhados!
**Squash:** compacta em 1 commit. Historico limpo. Perde granularidade.

Regra: rebase para atualizar seu branch local. Merge para integrar -> main. Squash para features pequenas.

## 3. Conventional Commits
```
feat(api): adiciona endpoint
fix(db): corrige deadlock
refactor(auth): extrai logica
docs: atualiza README
```

## 4. Comandos Uteis
git log --oneline --graph (visual), git reflog (recuperar perdidos), git stash (guardar temp), git cherry-pick (aplicar commit), git bisect (encontrar bug), git blame (autor)

## 5. UML — Diagrama de Classes

Elementos: nome, atributos (- private, + public, # protected), metodos.

Relacoes:
- Associacao: A ---> B (usa)
- Agregacao: A <>--- B (tem, vida independente)
- Composicao: A <*>--- B (parte de, vida dependente)
- Heranca: A --|> B (extends)
- Interface: A ..|> B (implements)
