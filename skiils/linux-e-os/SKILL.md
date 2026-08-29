---
name: linux-e-os
description: "Boot process, sistema de arquivos, permissões, comandos Linux, ferramentas de observabilidade, gerenciamento de memória, garbage collection e concorrência."
---

# Linux & Sistemas Operacionais

Cobre boot process (BIOS/UEFI, GRUB, systemd), sistema de arquivos (FHS, permissões, inodes, links), comandos essenciais e shell scripting, ferramentas de diagnóstico e performance, gerenciamento de memória e concorrência.

## Quando usar

- Entendendo o boot process do Linux ou sistema de arquivos
- Debugando permissões de arquivos/diretórios
- Diagnosticando processo com alto consumo de CPU/memória/I/O
- Entendendo garbage collection ou concorrência vs paralelismo
- Aprendendo comandos Linux essenciais

## Fluxo

1. Identifique a área: boot/processos, filesystem, comandos, performance ou memória
2. Carregue a referência relevante em `references/`
3. Linux é integrado: processo usa filesystem, que tem permissões, que são observadas via ferramentas

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [boot-e-processos.md](references/boot-e-processos.md) | Boot sequence, BIOS/UEFI, GRUB, systemd, processos, signals, daemons |
| [filesystem.md](references/filesystem.md) | FHS, permissões, inodes, hard/soft links, mount, journaling |
| [comandos.md](references/comandos.md) | 18 comandos essenciais, pipes, redireções, shell scripting básico |
| [diagnostico.md](references/diagnostico.md) | top, strace, lsof, /proc, ferramentas CPU/mem/I/O/rede |
| [memoria-concorrencia.md](references/memoria-concorrencia.md) | Hierarquia de memória, GC, threads, concorrência vs paralelismo |
| [troubleshooting.md](references/troubleshooting.md) | Cenários reais: CPU 100%, OOM killer, disco cheio, swap alto, zumbis, FD leak, load alto, systemd |
