# Diagnostico e Performance — Referencia Detalhada

## 1. Kit de Ferramentas

**CPU:** top/htop, mpstat (por core), pidstat (por processo), uptime (load avg). Load avg < numero de cores = ok.

**Memoria:** free -h, vmstat, pmap -x <PID>, /proc/meminfo.

**I/O:** iostat -xz, iotop, lsblk.

**Rede:** ss -tlnp (portas ouvindo), iftop (banda), tcpdump (captura).

**Sistema:** dmesg, journalctl -xe, strace -p <PID>, lsof -p <PID>/lsof -i :80.

## 2. Diagnostico: CPU Alta

1. top -> identificar PID
2. ps -p <PID> -o pid,ppid,cmd,%cpu
3. strace -c -p <PID> (syscalls)
4. lsof -p <PID>
5. /proc/<PID>/status, cmdline, fd/

## 3. Diagnostico: Memoria Alta

1. ps aux --sort=-%mem | head
2. pmap -x <PID>
3. watch -n 5 "ps -p <PID> -o rss" (se cresce sem parar = leak)
4. /proc/<PID>/smaps, limits

## 4. Diagnostico: Disco Cheio

1. df -h e df -i (inodes!)
2. du -h --max-depth=1 / | sort -hr
3. find / -type f -size +1G
4. lsof | grep deleted (processo segurando arquivo deletado)

## 5. /proc — Canivete Suico

/proc/cpuinfo, meminfo, loadavg, uptime. /proc/<PID>/cmdline, environ, cwd, exe, fd/, stack.

## 6. Performance Checklist

CPU ok? Memoria ok (swap=0)? Disco >15% livre? I/O iowait <10%? Rede conexoes ok? FD limits ok?
