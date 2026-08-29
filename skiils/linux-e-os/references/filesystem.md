# Sistema de Arquivos Linux — Referencia Detalhada

## 1. FHS (Filesystem Hierarchy Standard)

| Diretorio | Conteudo |
|-----------|----------|
| / | Raiz. NAO crie diretorios aqui |
| /bin | Binarios essenciais (ls, cp) -> /usr/bin |
| /etc | Configuracoes (nginx, ssh, systemd) |
| /home | Diretorios usuarios (/home/joao) |
| /root | Home do root (separado) |
| /var | Dados variaveis (logs, spool) |
| /tmp | Temporarios. Limpo no reboot. Sticky bit |
| /usr | User System Resources (/usr/bin, /usr/lib) |
| /opt | Software third-party |
| /proc | Sistema de arquivos virtual (processos, kernel) |
| /dev | Dispositivos (/dev/sda, /dev/tty) |
| /boot | Kernel, GRUB, initramfs |
| /sys | Kernel e devices (mais estruturado que /proc) |
| /run | Dados volateis em RAM (PID files, sockets) |

## 2. Permissoes

```
-rwxr-xr--  1 joao devs  4096 Jun 25 script.sh
 |_|_||_||
 | U  G  O
 tipo: - arquivo, d dir, l link
```

r=4, w=2, x=1. chmod 755 = rwx r-x r-x. chmod 600 = rw- --- --- (chave SSH).

### Bits Especiais
SUID (4000): executa como owner. SGID (2000): executa como grupo, herda em dir. Sticky (1000): so owner deleta (ex: /tmp).

## 3. Inodes

Cada arquivo tem inode: permissoes, owner, timestamps (access/modify/change), tamanho, ponteiros para blocos.
NAO contem nome (nome esta no diretorio pai). `ls -i`, `stat arquivo`. `df -i` verifica uso.

## 4. Hard Links vs Soft Links

**Hard Link:** `ln original.txt link.txt`. Mesmo inode. Se deletar original, link funciona. Nao cruza filesystems.

**Soft Link (Symlink):** `ln -s /caminho link.txt`. Contem caminho para alvo. Cruza filesystems. Se deletar original = dangling.

## 5. Mount e fstab

`mount /dev/sdb1 /mnt/data`. fstab: UUID, mount point, tipo (ext4/xfs), opcoes.

Journaling (ext4/XFS): registra mudancas antes de aplicar. Crash -> replay journal -> consistente.
