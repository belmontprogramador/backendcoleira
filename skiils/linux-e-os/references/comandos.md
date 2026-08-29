# Comandos Linux Essenciais — Referência Detalhada

## 1. Navegação e Arquivos

```bash
ls -la              # lista detalhada (inclui ocultos)
ls -ltr             # ordenado por data (recentes no final)
cd -                # volta para diretório anterior
pwd                 # diretório atual
mkdir -p a/b/c      # cria diretórios pais
rm -rf dir/         # remove recursivo forçado (PERIGOSO!)
rm -i *.txt         # pergunta antes de remover
cp -a src/ dst/     # cópia preservando permissões/timestamps
mv old new          # move ou renomeia
```

## 2. Visualização

```bash
cat file.txt            # conteúdo completo
less file.txt           # paginado (navegar com setas, /buscar, q sair)
head -20 file.txt       # primeiras 20 linhas
tail -f app.log         # seguir logs em tempo real
tail -n 100 app.log     # últimas 100 linhas
wc -l file.txt          # contar linhas
```

## 3. Busca

```bash
grep "erro" app.log                     # busca simples
grep -i "erro" app.log                  # case insensitive
grep -r "TODO" src/                     # recursivo
grep -v "debug" app.log                 # excluir matches
grep -c "erro" app.log                  # contar matches
grep -A 3 -B 2 "erro" app.log           # 3 linhas depois, 2 antes

find . -name "*.py"                     # busca por nome
find . -type f -mtime -7                # modificados há 7 dias
find . -size +100M                       # maiores que 100 MB
find . -name "*.log" -delete            # encontra e deleta
find . -name "*.txt" -exec grep "erro" {} \;  # grep em resultados
```

## 4. Pipes e Redireções

```bash
# Pipe: saída de um → entrada de outro
cat app.log | grep "erro" | wc -l

# Redireção
ls > arquivos.txt       # stdout para arquivo (sobrescreve)
ls >> arquivos.txt      # stdout para arquivo (append)
cmd 2>&1                # stderr para stdout
cmd > /dev/null 2>&1    # silenciar tudo
cmd | tee arquivo.txt   # mostra na tela E salva
```

## 5. Processos

```bash
ps aux                  # todos processos (BSD)
ps -ef                  # todos processos (Unix)
ps aux | grep nginx
top                     # interativo (P = CPU, M = mem, k = matar)
htop                    # mais amigável (cores, mouse)

kill 1234               # SIGTERM
kill -9 1234            # SIGKILL
killall nginx           # matar por nome
pkill -f "python app"   # matar por padrão
```

## 6. Permissões e Donos

```bash
chmod 755 script.sh
chmod +x script.sh
chown joao:devs arquivo
chown -R joao:devs /home/joao
```

## 7. Disco

```bash
df -h                   # espaço por filesystem (human-readable)
df -i                   # inodes
du -sh dir/             # tamanho total do diretório
du -h --max-depth=1     # tamanho 1 nível
ncdu                    # interativo (ncurses, precisa instalar)
```

## 8. Rede

```bash
ip a                    # interfaces de rede (substituiu ifconfig)
ss -tlnp                # portas TCP ouvindo
ss -tulnp               # TCP + UDP ouvindo
curl -v https://api     # verbose (mostra handshake, headers)
wget https://arquivo    # download
ping -c 4 host          # 4 pings
```

## 9. Arquivo e Compactação

```bash
tar -czf backup.tar.gz dir/     # cria tar.gz
tar -xzf backup.tar.gz          # extrai
tar -czf - dir/ | ssh user@host "tar -xzf - -C /dest"  # cópia remota
gzip arquivo                    # comprime (substitui por .gz)
gunzip arquivo.gz               # descomprime
```

## 10. Sistema

```bash
uname -a                # informações do sistema
uptime                  # há quanto tempo ligado, load average
who                     # usuários logados
dmesg | tail -50        # últimas 50 mensagens do kernel
journalctl -xe          # logs do systemd com detalhes
date                    # data/hora atual
```

## 11. Atalhos de Shell

```bash
Ctrl+C    # interromper processo
Ctrl+Z    # pausar (bg para continuar em background)
Ctrl+D    # EOF (sair do shell)
Ctrl+R    # busca reversa no histórico
Ctrl+L    # limpar tela
!!        # repetir último comando
!$        # último argumento do comando anterior
```
