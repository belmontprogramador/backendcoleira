# Troubleshooting Linux — Cenarios Reais

## Cenario 1: CPU 100%

1. top/htop -> identificar PID
2. ps -T -p <PID> (threads). strace -c -p <PID> (syscalls)
3. cat /proc/<PID>/stack (onde no kernel)
4. Java: jstack. Node: kill -USR1. Python: py-spy top

## Cenario 2: OOM Killer

1. dmesg | grep "killed process" -> confirmar
2. dmesg | grep -A10 "oom-kill" -> detalhes
3. cat /proc/<PID>/oom_score -> score. echo -1000 > oom_score_adj -> proteger
4. ps aux --sort=-%mem | head -> quem usa mais RAM

## Cenario 3: Disco Cheio

1. df -h -> qual particao? df -i -> inodes?
2. du -h --max-depth=1 / | sort -hr -> culpado
3. lsof | grep deleted -> espaco fantasma (arquivo deletado aberto)
4. journalctl --vacuum-size=500M. find /var/log -name "*.log" -mtime +7 -delete

## Cenario 4: Swap Alto (Sistema Lento)

1. free -h -> swap usado?
2. for pid in /proc/[0-9]*; do awk /VmSwap/{print FILENAME,$2} $pid/status; done -> quem?
3. swappiness: cat /proc/sys/vm/swappiness (60 default, 10 = menos agressivo)
4. swapoff -a && swapon -a -> limpar (precisa RAM livre!)

## Cenario 5: Processo Zumbi

1. ps aux | grep Z -> identificar. Nao da pra matar (ja morto!)
2. ps -o pid,ppid,stat,cmd -p <ZOMBIE> -> PPID = pai
3. kill <PPID> -> mata pai. init adota zumbi e limpa.

## Cenario 6: File Descriptors Estourados

1. ulimit -n -> limite atual. lsof -p <PID> | wc -l -> uso
2. watch -n 5 "lsof -p <PID> | wc -l" -> sobe sem parar = FD leak
3. /etc/security/limits.conf: * soft nofile 65535. systemd: LimitNOFILE=65535

## Cenario 7: Load Average Altissimo

1. uptime -> load > cores = sobrecarga. vmstat 1 -> us (CPU) vs wa (I/O)
2. iostat -x 1 -> %util e await -> disco saturado?
3. mpstat -P ALL 1 -> todos cores ou so 1? Single-threaded?

## Cenario 8: Servico systemd Nao Sobe

1. journalctl -u servico -n 50. systemctl status servico -l
2. "permission denied"? "address already in use"? ss -tlnp | grep :porta
3. "DATABASE_URL not defined"? Environment= na unit
