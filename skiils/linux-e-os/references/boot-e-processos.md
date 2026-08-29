# Boot, Processos e systemd — Referência Detalhada

## 1. Boot Process (8 Passos)

### 1. Power On → BIOS/UEFI
- CPU começa executando firmware da placa-mãe (endereço fixo)
- **BIOS (Legacy):** 16-bit, MBR (Master Boot Record), limitado a 2TB
- **UEFI:** 32/64-bit, GPT (GUID Partition Table), Secure Boot, boot gráfico

### 2. POST (Power On Self Test)
- Verifica: CPU, RAM (contagem), teclado, disco, GPU
- Beep codes: padrão de bips = erro específico (varia por fabricante)
- UEFI: muito mais rápido, inicialização paralela

### 3. Boot Device
- Ordem configurada no setup: USB → SSD → Rede
- UEFI: lê partição ESP (EFI System Partition, FAT32)
- BIOS: lê primeiros 512 bytes do disco (MBR)

### 4. Boot Loader (GRUB2)
- **GRUB2:** Grand Unified Bootloader. Menu para escolher OS/kernel
- Caminho: `/boot/grub2/grub.cfg`
- Pode bootar: Linux, Windows (dual-boot), memtest, recovery mode
- Kernel parameters: `quiet splash`, `single` (modo recuperação), `nomodeset`

### 5. Kernel + initramfs
- Kernel carregado na RAM (vmlinuz)
- **initramfs:** sistema de arquivos temporário na RAM (drivers, módulos)
- Kernel monta root filesystem real, muda de initramfs → root
- `dmesg` mostra logs do kernel durante boot

### 6. systemd (PID 1)
- Primeiro processo user-space (PID = 1)
- Substituiu SysV init (mais rápido, paralelização)
- Lê unidades (units) de `/etc/systemd/system/` e `/usr/lib/systemd/system/`

### 7. Targets (Runlevels)
| Target | Equivalente SysV | Propósito |
|--------|-----------------|-----------|
| `poweroff.target` | runlevel 0 | Desligamento |
| `rescue.target` | runlevel 1 | Modo single-user |
| `multi-user.target` | runlevel 3 | CLI, rede, sem GUI |
| `graphical.target` | runlevel 5 | CLI + GUI (DM) |
| `reboot.target` | runlevel 6 | Reinicialização |

### 8. Login
- Display Manager (GDM, SDDM, LightDM) ou getty (console TTY)
- Shell carregado: `~/.bashrc`, `~/.profile`, `/etc/profile`

---

## 2. Processos

### Estados de Processo
```
R (Running)     — Executando ou na fila
S (Sleeping)    — Interruptible sleep (esperando evento)
D (Uninterruptible) — Esperando I/O (não pode ser morto)
T (Stopped)     — Pausado (SIGSTOP, debugger)
Z (Zombie)      — Terminou mas pai não deu wait()
X (Dead)        — Morto (raro de ver)
```

### Signals
| Signal | Número | Ação |
|--------|--------|------|
| SIGINT | 2 | Ctrl+C (interromper) |
| SIGTERM | 15 | Terminar graciosamente (padrão `kill`) |
| SIGKILL | 9 | Matar imediatamente (não pode ser ignorado) |
| SIGSTOP | 19 | Pausar processo |
| SIGHUP | 1 | Hangup (recarregar config) |

### Ordem de Encerramento
```bash
kill <PID>        # SIGTERM (gracioso)
kill -9 <PID>     # SIGKILL (brutal - último recurso)
```

### Process Tree
```
systemd (PID 1)
├── sshd
│   └── sshd (session)
│       └── bash
├── nginx (master)
│   ├── nginx (worker)
│   └── nginx (worker)
└── containerd
```

### Daemons (Serviços)
- Processos background. Geralmente terminam com `d` (sshd, systemd-journald)
- systemd units: `.service`
- `systemctl start/stop/restart/enable/disable <service>`
- `journalctl -u <service>` para logs

---

## 3. systemd Essencial

```bash
# Status do sistema
systemctl status                    # estado geral
systemctl list-units --failed       # units que falharam

# Serviços
systemctl start nginx
systemctl enable nginx              # iniciar no boot
systemctl disable nginx             # não iniciar no boot

# Logs
journalctl -u nginx -f              # seguir logs
journalctl --since "10 min ago"
journalctl -p err                   # só erros

# Análise de boot
systemd-analyze                     # tempo total de boot
systemd-analyze blame               # o que demorou mais
```
