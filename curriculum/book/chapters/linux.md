# Linux

> [!GOALS]
> - Explain why back-end engineers need Linux, and what a Linux system is made of.
> - Navigate the file system confidently, and know where things live (`/etc`, `/var/log`, `/home`, `/opt`…).
> - Create, inspect, move and search files; read logs with the standard tools.
> - Understand **users, groups and permissions**, `sudo`, and why services run as unprivileged users.
> - Combine commands with **pipes and redirection** to answer questions about logs and data.
> - Manage **processes** and **services** (`ps`, `kill`, `systemctl`, `journalctl`), and check resources and networking.
> - Connect to servers securely with **SSH** and apply basic hardening.

## Why this matters

Almost every server you will deploy to runs Linux. Cloud virtual machines, containers ({{ch:docker}}), Kubernetes nodes, CI runners and most managed services sit on Linux underneath. Even when a platform hides the operating system, the moment something goes wrong — a service will not start, the disk is full, a process eats all the memory, a log holds the answer — someone has to open a terminal on a Linux machine and investigate.

The command line can feel old-fashioned next to graphical tools, but it is the universal interface: the same commands work over SSH on a server on another continent, inside a container, in a CI script and on your laptop (macOS is Unix-like, and Windows offers Linux through WSL). Commands can be combined into pipelines and scripts ({{ch:shell-scripting}}), recorded in documentation, and repeated exactly.

You do not need to become a system administrator. You need fluency with the tools engineers use every week: moving around, reading files and logs, finding things, understanding permissions, managing processes and services, and connecting securely. This chapter builds that fluency. Every command shown was run on a fresh Ubuntu 24.04 machine as an ordinary user named `learner`, and the outputs are exactly what it printed.

## The simple idea

Think of a Linux server as a building run by a strict caretaker. Every room (directory) and cupboard (file) has an owner and a sign saying who may enter, look or change things. People (users) and departments (groups) have keys for some rooms but not others; only the head caretaker (`root`) has a master key, and sensible staff borrow it only briefly (`sudo`). Machines in the building (processes and services) are started, watched and restarted by a building manager (systemd), who also keeps a logbook of everything they report (the journal).

You walk around this building by typing: "go to this room", "show me what's in it", "who owns this cupboard?", "which machines are running?", "show me the last fifty lines of the logbook".

> [!ANALOGY]
> A Linux server is like a building with a strict caretaker: every room and cupboard has an owner and a sign saying who may enter, read or change it; people have keys for some rooms; only the head caretaker (root) holds a master key; and a building manager (systemd) starts, watches and logs the machines.
>
> **Where the analogy breaks:** in a real building you can see who is inside and what every machine is doing. On a server you see only what you ask about — nothing appears unless you run the right command. Learning Linux is mostly learning which questions to ask, and which command asks each one.

## The proper definition and key words

**Linux** is a family of open-source operating systems built on the Linux kernel. A **distribution** (Ubuntu, Debian, Red Hat Enterprise Linux, Amazon Linux, Alpine…) packages the kernel with system tools, a package manager and default configuration.

Key words:

- **Kernel** — the core of the operating system, managing hardware, memory, processes and files.
- **Shell** — the program that reads your commands and runs them (usually **bash**; also zsh).
- **Terminal** — the window or connection through which you type into a shell.
- **File system** — the tree of directories and files, starting at `/` (the root directory).
- **Path** — the location of a file: **absolute** (`/var/log/syslog`) or **relative** to the current directory (`logs/app.log`).
- **User / group** — identities owning files and running processes; `root` is the all-powerful administrator.
- **Permissions** — rules saying who may read, write or execute a file.
- **Process** — a running program, identified by a **PID**.
- **Service** (daemon) — a long-running background process, managed by **systemd** on most distributions.
- **Package manager** — the tool that installs software (`apt` on Ubuntu/Debian, `dnf` on Red Hat family, `apk` on Alpine).
- **SSH** — the secure protocol for logging in to remote machines.

## Finding your way around

### Level 1 — Where am I, who am I, what is here?

```bash
whoami
hostname
pwd
cat /etc/os-release | grep PRETTY_NAME
```

**Output:**

```text
learner
shop-server
/home/learner
PRETTY_NAME="Ubuntu 24.04.5 LTS"
```

- `whoami` prints your user name; `hostname` the machine's name; `pwd` ("print working directory") where you are — your **home directory**, `/home/learner`.
- `cat` prints a file's contents; `|` sends that output into `grep`, which keeps only matching lines. The machine runs Ubuntu 24.04.

A command line has the form `command options arguments`: `ls -l /etc` runs `ls` with the option `-l` (long format) on the argument `/etc`. Options often have short (`-a`) and long (`--all`) forms. `man ls` opens the manual page; `ls --help` prints a summary.

### Level 1 — Creating and moving around

```bash
mkdir -p shop/app shop/logs shop/backups
cd shop
echo "PORT=3000" > app/.env
echo "console.log('hello')" > app/server.js
touch logs/app.log
ls
ls -a app
tree --noreport
```

**Output:**

```text
app
backups
logs
.
..
.env
server.js
.
├── app
│   └── server.js
├── backups
└── logs
    └── app.log
```

- `mkdir -p` creates directories, including missing parents, without complaining if they exist.
- `cd shop` changes into a directory; `cd ..` goes up one level; `cd` alone (or `cd ~`) returns home; `cd -` goes back to the previous directory.
- `echo "text" > file` writes text into a file (creating or **overwriting** it); `touch` creates an empty file (or updates its timestamp).
- `ls` lists directory contents; files starting with a dot (like `.env`) are **hidden** unless you add `-a`, which also shows `.` (this directory) and `..` (the parent).
- `tree` draws the hierarchy (it is not always installed; `find . -print` works everywhere).

### Level 1 — The standard directories

| Directory | Contains |
|---|---|
| `/` | The root of the whole file system |
| `/home/<user>` | Users' personal files (`~` is shorthand for yours) |
| `/root` | The root user's home |
| `/etc` | System-wide configuration (`/etc/nginx/`, `/etc/ssh/sshd_config`, `/etc/hosts`) |
| `/var` | Variable data: logs (`/var/log`), caches, spool files, often databases (`/var/lib/postgresql`) |
| `/tmp` | Temporary files, cleared on reboot |
| `/usr` | Installed programs and libraries (`/usr/bin`, `/usr/lib`) |
| `/opt` | Optional add-on software, often your own applications (`/opt/cornershop`) |
| `/srv` | Data served by the machine (websites, file shares) |
| `/proc`, `/sys` | Virtual files exposing kernel and process information |
| `/dev` | Device files (disks, terminals, `/dev/null`) |

When something is configured, look in `/etc`; when something logged, look in `/var/log` or the journal.

## Working with files

### Level 1 — Copy, move, remove

```bash
cp app/server.js backups/server.js.bak
mv backups/server.js.bak backups/server-2026-11-20.js
cp -r app app-copy
rm -r app-copy
ls backups
```

**Output:**

```text
server-2026-11-20.js
```

- `cp source destination` copies; `-r` copies directories recursively.
- `mv` moves **or renames**.
- `rm` deletes, and `rm -r` deletes directories — **permanently**: there is no recycle bin. Be very careful with `rm -rf` (force, no questions), especially with variables or wildcards: `rm -rf $DIR/` with an empty `$DIR` becomes `rm -rf /`.

### Level 1 — Reading files

```bash
for i in $(seq 1 8); do echo "2026-11-20T10:0$i:00Z INFO request served path=/products/$i"; done > logs/app.log
echo "2026-11-20T10:09:00Z ERROR database timeout path=/checkout" >> logs/app.log
echo "2026-11-20T10:09:30Z ERROR database timeout path=/checkout" >> logs/app.log
wc -l logs/app.log
head -n 3 logs/app.log
tail -n 2 logs/app.log
```

**Output:**

```text
10 logs/app.log
2026-11-20T10:01:00Z INFO request served path=/products/1
2026-11-20T10:02:00Z INFO request served path=/products/2
2026-11-20T10:03:00Z INFO request served path=/products/3
2026-11-20T10:09:00Z ERROR database timeout path=/checkout
2026-11-20T10:09:30Z ERROR database timeout path=/checkout
```

- `>>` **appends** to a file instead of overwriting it.
- `wc -l` counts lines; `head -n 3` shows the first 3; `tail -n 2` the last 2.
- `tail -f logs/app.log` keeps the file open and prints new lines as they are written — the classic way to watch a log live (stop with Ctrl+C).
- `less logs/app.log` opens a file for scrolling and searching (`/text` to search, `q` to quit) without loading it all — use it for large files instead of `cat`.

### Level 2 — Finding files and text

```bash
grep -n "ERROR" logs/app.log
grep -c "INFO" logs/app.log
grep -rl "PORT" .
find . -name "*.js" -type f | sort
```

**Output:**

```text
9:2026-11-20T10:09:00Z ERROR database timeout path=/checkout
10:2026-11-20T10:09:30Z ERROR database timeout path=/checkout
8
./app/.env
./app/server.js
./backups/server-2026-11-20.js
```

- `grep pattern file` prints matching lines; `-n` adds line numbers, `-c` counts matches, `-i` ignores case, `-v` inverts (non-matching lines), `-r` searches directories recursively, `-l` lists only file names, `-E` enables extended regular expressions.
- `find path -name pattern -type f` finds files by name (and by size, age, owner…): `find /var/log -name "*.log" -mtime -1` finds logs modified in the last day; `find . -size +100M` finds large files.

## Pipes and redirection

### Level 2 — Small tools combined

Linux tools each do one thing and read and write plain text, so they combine with **pipes** (`|`), which send one command's output into the next command's input. Questions about logs become one-line answers:

```bash
cat > logs/access.log <<'EOF'
203.0.113.9 GET /products 200 12ms
198.51.100.4 GET /checkout 500 2003ms
203.0.113.9 GET /products/7 200 9ms
192.0.2.33 POST /login 401 30ms
198.51.100.4 GET /checkout 500 2011ms
203.0.113.9 GET /cart 200 15ms
192.0.2.33 POST /login 401 28ms
192.0.2.33 POST /login 401 31ms
EOF
echo "requests per IP:"
awk '{print $1}' logs/access.log | sort | uniq -c | sort -rn
echo "status codes:"
cut -d' ' -f4 logs/access.log | sort | uniq -c
echo "slowest request:"
sort -k5 -n -r <(sed 's/ms$//' logs/access.log) | head -n 1
```

**Output:**

```text
requests per IP:
      3 203.0.113.9
      3 192.0.2.33
      2 198.51.100.4
status codes:
      3 200
      3 401
      2 500
slowest request:
198.51.100.4 GET /checkout 500 2011
```

- `cat > file <<'EOF' … EOF` (a **here-document**) writes several lines into a file.
- `awk '{print $1}'` prints the first whitespace-separated field (the IP); `sort | uniq -c` counts identical lines (`uniq` only collapses **adjacent** duplicates, so sort first); `sort -rn` sorts numerically, largest first. `192.0.2.33` made three failed logins — worth a look ({{ch:rate-limiting}}).
- `cut -d' ' -f4` takes the fourth space-separated field (the status).
- `sed 's/ms$//'` removes the "ms" suffix; `<( … )` passes a command's output as if it were a file; `sort -k5 -n -r` sorts by the fifth field numerically, descending.

Redirection controls where input and output go:

| Syntax | Meaning |
|---|---|
| `cmd > file` | Write standard output to a file (overwrite) |
| `cmd >> file` | Append standard output |
| `cmd 2> file` | Write **standard error** (error messages) to a file |
| `cmd > file 2>&1` | Write both output and errors to the same file |
| `cmd < file` | Read standard input from a file |
| `cmd > /dev/null` | Discard output |
| `cmd1 \| cmd2` | Pipe output of cmd1 into cmd2 |

Every process has three standard streams: **stdin** (0), **stdout** (1) and **stderr** (2). Keeping errors separate from normal output is why `2>` exists. For JSON, `jq` is the essential tool: `curl -s https://api.example.com/orders | jq '.[] | select(.status == "paid") | .id'` ({{ch:rest-apis}}).

## Users, groups and permissions

### Level 2 — Reading permissions

```bash
id
stat -c '%A %U %G %n' app/server.js app logs
```

**Output:**

```text
uid=1001(learner) gid=1001(learner) groups=1001(learner)
-rw-r--r-- learner learner app/server.js
drwxr-xr-x learner learner app
drwxr-xr-x learner learner logs
```

`id` shows your user and the groups you belong to (here, `sudo` membership is granted through a sudoers file instead). `stat -c '%A %U %G %n'` prints each file's permissions, owner, group and name. The permission string `-rw-r--r--` reads as:

```text
 -    rw-   r--   r--
 │    │     │     └── others: read
 │    │     └──────── group:  read
 │    └────────────── owner:  read, write
 └─────────────────── type: - file, d directory, l symbolic link
```

- **r** (read): read a file's contents / list a directory.
- **w** (write): change a file / create, rename and delete entries in a directory.
- **x** (execute): run a file as a program / enter (`cd` into) a directory.

### Level 2 — Changing permissions and ownership

```bash
chmod 600 app/.env
printf '#!/bin/bash\necho "deploying..."\n' > deploy.sh
chmod +x deploy.sh
stat -c '%A %a %n' app/.env deploy.sh
./deploy.sh
```

**Output:**

```text
-rw------- 600 app/.env
-rwxr-xr-x 755 deploy.sh
deploying...
```

- **Numeric (octal) modes** add read = 4, write = 2, execute = 1 for owner, group and others: `600` = owner read+write, nobody else anything — right for secrets like `.env` files and SSH keys. `644` (rw-r--r--) suits ordinary files; `755` (rwxr-xr-x) suits programs and directories.
- **Symbolic modes**: `chmod +x` adds execute permission; `chmod g-w` removes group write; `chmod o=` removes everything for others.
- `./deploy.sh` runs a script in the current directory — it needs the execute bit and a **shebang** line (`#!/bin/bash`) saying which interpreter runs it ({{ch:shell-scripting}}).
- `chown user:group file` changes ownership (usually requires `sudo`).

### Level 2 — root and sudo

```bash
cat /etc/shadow 2>&1 | head -n 1
sudo head -n 1 /etc/shadow | cut -d: -f1
sudo whoami
```

**Output:**

```text
cat: /etc/shadow: Permission denied
root
root
```

- `/etc/shadow` holds password hashes, readable only by root — so the normal user is refused.
- `sudo command` runs one command as root, if your user is allowed to (configured in `/etc/sudoers`, edited only with `visudo`).
- Work as a normal user and use `sudo` only for the specific commands that need it. Logging in as root, or running applications as root, means any mistake or vulnerability has unlimited power.

### Level 3 — Service users and least privilege

Applications should run as their **own unprivileged user**, owning only the files they need:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin cornershop
sudo mkdir -p /opt/cornershop /var/log/cornershop
sudo chown -R cornershop:cornershop /opt/cornershop /var/log/cornershop
sudo chmod 750 /opt/cornershop
stat -c '%A %U %G %n' /opt/cornershop /var/log/cornershop
getent passwd cornershop | cut -d: -f1,7
```

**Output:**

```text
drwxr-x--- cornershop cornershop /opt/cornershop
drwxr-xr-x cornershop cornershop /var/log/cornershop
cornershop:/usr/sbin/nologin
```

- A **system user** with no home directory and the `nologin` shell cannot be logged into; it exists only to own files and run the service.
- The application's directory is readable by its user and group only (`750`); the log directory is writable by the service. If the application is compromised, the attacker gets this user's limited rights, not root's.
- Containers follow the same principle: run as a non-root user inside the image ({{ch:docker}}).

## Processes and services

### Level 2 — Processes

```bash
sleep 300 &
pgrep -af "sleep 300" | cut -d' ' -f2-
kill %1
sleep 0.2
pgrep -af "sleep 300" || echo "no 'sleep 300' process left"
```

**Output:**

```text
sleep 300
no 'sleep 300' process left
```

- `command &` starts a process **in the background**; `pgrep -af pattern` finds processes whose command line matches and prints their PID and command line (here `cut` removes the PID, which differs on every machine).
- `kill PID` (or `kill %1` for the shell's first background job) sends the **TERM** signal, asking the process to stop gracefully. `kill -9 PID` sends **KILL**, which cannot be caught — the process dies immediately without cleaning up. Use it only when TERM fails.
- Signals matter for back-end services: on deployments, the platform sends TERM, and your Node.js process should close servers and connections gracefully before exiting ({{ch:nodejs}}).

Exploring processes on a real server:

```bash
# fragment
ps aux --sort=-%mem | head -n 6       # processes using the most memory
top                                   # live view (press q to quit); htop is a friendlier alternative
pstree -p                             # processes as a tree
lsof -i :3000                         # which process is listening on port 3000
```

### Level 3 — systemd services

On most servers, long-running processes are managed by **systemd**, which starts them at boot, restarts them if they crash, and collects their logs. A service is described by a **unit file**:

```ini
# /etc/systemd/system/cornershop.service
[Unit]
Description=Corner Shop API
After=network-online.target
Wants=network-online.target

[Service]
User=cornershop
Group=cornershop
WorkingDirectory=/opt/cornershop
EnvironmentFile=/etc/cornershop/env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5
# Hardening: limit what the process can touch
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/log/cornershop
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
# fragment
sudo systemctl daemon-reload              # after creating or editing unit files
sudo systemctl enable --now cornershop    # start now and at every boot
systemctl status cornershop               # running? since when? last log lines
sudo systemctl restart cornershop
journalctl -u cornershop -n 50 --no-pager # the last 50 log lines of this service
journalctl -u cornershop -f               # follow logs live
journalctl -u cornershop --since "10 min ago" -p err   # only errors from the last ten minutes
```

- `User=` runs the service as the unprivileged user; `EnvironmentFile=` loads configuration (and secrets, from a file readable only by root and the service — or better, from a secrets manager, {{ch:secrets-manager}}).
- `Restart=on-failure` restarts crashed processes; the hardening options restrict the file system the service can write to.
- Anything the service writes to stdout or stderr goes to the **journal**, read with `journalctl` — so applications should log to stdout in structured form ({{ch:logging}}).
- In containers and on platforms such as Kubernetes or ECS, the platform plays systemd's role ({{ch:docker}}, {{ch:ecs}}), but the ideas — a supervisor, restarts, signals, stdout logs — are the same.

## Resources and networking

### Level 2 — Disk, memory, CPU

```bash
# fragment
df -h                           # disk space per file system — "No space left on device" starts here
du -sh /var/log/* | sort -h     # what is using space in a directory
free -h                         # memory and swap
uptime                          # load averages for the last 1, 5 and 15 minutes
nproc                           # number of CPU cores (compare with the load average)
```

A full disk is one of the most common production incidents: logs that are never rotated, old Docker images, core dumps. `logrotate` (configured in `/etc/logrotate.d/`) compresses and deletes old log files; journald limits its own size (`SystemMaxUse=` in `/etc/systemd/journald.conf`).

### Level 2 — Networking basics

```bash
getent hosts localhost
getent services ssh https postgresql
```

**Output:**

```text
::1             localhost ip6-localhost ip6-loopback
ssh                   22/tcp
https                 443/tcp
postgresql            5432/tcp postgres
```

`getent hosts` resolves a name the way programs on the machine do — through `/etc/hosts` and then DNS ({{ch:dns}}) — and `getent services` looks up the standard port numbers registered for well-known services in `/etc/services`. (`localhost` resolves to the IPv6 loopback address `::1` here; on many systems it is `127.0.0.1`.)

Useful commands on real servers:

```bash
# fragment
ip address                      # network interfaces and IP addresses
ss -tlnp                        # TCP sockets listening, with the owning process (sudo shows all)
curl -v http://localhost:3000/health   # make an HTTP request and show headers
curl -I https://cornershop.example     # only response headers
dig cornershop.example +short   # DNS lookup ({{ch:dns}})
ping -c 3 db.internal           # basic reachability (often blocked by firewalls)
nc -vz db.internal 5432         # can I open a TCP connection to this port?
```

"Is it listening? Can I reach it? Does the name resolve?" — `ss`, `nc` and `dig` answer the three questions behind most connectivity problems ({{ch:networking}}).

## Remote access with SSH

### Level 2 — Keys, not passwords

```bash
ssh-keygen -t ed25519 -f ~/.ssh/cornershop_deploy -N "" -C "deploy@cornershop" -q
ls ~/.ssh
stat -c '%A %n' ~/.ssh/cornershop_deploy ~/.ssh/cornershop_deploy.pub
cut -d' ' -f1,3 ~/.ssh/cornershop_deploy.pub
```

**Output:**

```text
cornershop_deploy
cornershop_deploy.pub
-rw------- /home/learner/.ssh/cornershop_deploy
-rw-r--r-- /home/learner/.ssh/cornershop_deploy.pub
ssh-ed25519 deploy@cornershop
```

- `ssh-keygen -t ed25519` creates a key pair: a **private key** (keep secret, permissions `600`) and a **public key** (`.pub`, safe to share). (`-N ""` creates it without a passphrase for this demonstration; protect personal keys with a passphrase.)
- The public key is added to the server's `~/.ssh/authorized_keys` (`ssh-copy-id user@server` does this). Logging in then proves possession of the private key, without sending a password.
- Connect with `ssh -i ~/.ssh/cornershop_deploy deploy@203.0.113.10`, or configure a host alias in `~/.ssh/config`. Copy files with `scp` or `rsync -avz`.

### Level 3 — Basic server hardening

```bash
# fragment
# /etc/ssh/sshd_config (then: sudo systemctl reload ssh)
PasswordAuthentication no        # keys only
PermitRootLogin no               # log in as a normal user, then sudo
```

Other basics: keep the system patched (`sudo apt update && sudo apt upgrade`, or unattended security upgrades); allow only needed ports through a firewall (`ufw` on Ubuntu, or cloud security groups, {{ch:vpc}}); run services as unprivileged users; and prefer managed access tools (cloud session managers, bastion hosts) over SSH open to the internet ({{ch:systems-manager}}). Many teams avoid logging into servers at all, treating them as disposable and replacing them through automation ({{ch:terraform}}).

## From beginner to enterprise

**Level 1–2 — first steps.** Navigating, creating, copying and deleting files; reading files with `cat`, `less`, `head`, `tail`; `grep` and `find`; pipes and redirection.

**Level 3 — working on servers.** Permissions and ownership; `sudo` and service users; processes and signals; systemd services and `journalctl`; disk, memory and network checks; SSH keys.

**Level 4 — production operations.** Hardened unit files; log rotation; investigating incidents from the command line (full disks, runaway processes, port conflicts, DNS failures); basic firewalling; automated patching.

**Level 5 — senior practice.** Immutable infrastructure — servers built from images and replaced rather than changed by hand; configuration management; performance analysis tools (`vmstat`, `iostat`, `strace`, `perf`).

**Level 6 — enterprises.** Fleets managed by automation and policy; centralised logging and auditing of administrative access; compliance baselines (CIS benchmarks); just-in-time access instead of standing SSH keys.

## Real-world use cases

### "The API is down" at 2 a.m.

- **Steps**: `systemctl status cornershop` (crashed? restarting?); `journalctl -u cornershop -n 100` (the error); `df -h` (disk full?); `free -h` (out of memory?); `ss -tlnp | grep 3000` (is anything listening?); `curl -v localhost:3000/health` (does it answer locally?).
- **Common causes found this way**: a full disk from unrotated logs, a missing environment variable after a config change, a port already in use, the database unreachable.

### Investigating suspicious traffic

- **Steps**: count requests per IP in the access log (`awk | sort | uniq -c | sort -rn`), filter failed logins (`grep " 401 "`), check the time pattern, then block or rate-limit at the edge ({{ch:rate-limiting}}).

## Common mistakes

### Beginner: `rm -rf` with unchecked paths

**Fix:** check variables, avoid running destructive commands as root, and use `ls` first with the same path.

### Beginner: `chmod 777` to "fix" permissions

**Consequence:** anyone on the machine can change or replace the file. **Fix:** give the right user or group the minimum permissions needed.

### Beginner: running applications as root

**Fix:** dedicated service users and systemd `User=`.

### Intermediate: overwriting with `>` when you meant `>>`

**Fix:** pause before redirecting into important files; `set -o noclobber` prevents accidental overwrites in interactive shells.

### Intermediate: `kill -9` first

**Consequence:** no graceful shutdown, possible data loss. **Fix:** TERM first, KILL only if needed.

### Intermediate: unrotated logs

**Consequence:** full disks. **Fix:** logrotate, journald limits, logs to stdout collected centrally.

### Production: password SSH logins exposed to the internet

**Fix:** keys only, no root login, restricted network access, or session managers.

### Production: editing servers by hand

**Consequence:** undocumented, unreproducible "snowflake" servers. **Fix:** automation and infrastructure as code.

## Debugging and troubleshooting

- **"Permission denied"**: check `stat`/`ls -l` for the file and every parent directory (each needs `x` to be entered), the user the process runs as, and whether you need `sudo`.
- **"command not found"**: the program is not installed or not on your `PATH` (`echo $PATH`, `which node`).
- **"No space left on device"**: `df -h`, then `du -sh` to find what grew; also check inodes with `df -i`.
- **"Address already in use"**: another process holds the port — `ss -tlnp` or `lsof -i :3000`.
- **A service keeps restarting**: `systemctl status` and `journalctl -u` show the exit code and error; run the `ExecStart` command manually as the service user to reproduce.
- **"Host key verification failed" in SSH**: the server's key changed — verify it is legitimate (a rebuilt server) before removing the old entry with `ssh-keygen -R host`.

## Security summary

- **Least privilege**: normal users, `sudo` only when needed, services as unprivileged system users.
- **Protect secrets with permissions** (`600` for keys and env files) — and better, a secrets manager ({{ch:secrets-manager}}).
- **SSH**: keys only, no root login, restricted network access; protect private keys with passphrases.
- **Patch** regularly; **firewall** to the minimum; **harden** systemd units.
- **Audit**: keep logs of administrative actions; avoid shared accounts.
- Never `curl … | sudo bash` from untrusted sources — read scripts before running them.

## How a senior engineer thinks about this

- **The terminal is the universal debugger.** They know which question each command answers and work from symptoms to causes quickly.
- **Small tools, combined.** Pipes turn logs and data into answers without writing programs.
- **Least privilege everywhere.** Users, files, services and SSH access are given only what they need.
- **Servers are cattle, not pets.** Manual changes are for investigation; fixes go into automation.
- **Logs to stdout, managed by the platform.** Services are supervised, restarted and observed consistently.

## Exercises

These continue on the same machine as the chapter's examples, in `~/shop`.

### Exercise 1 — Answer questions from the access log

**Objective:** practise pipelines.
**What to write:** using `logs/access.log`, print (1) the number of requests that returned a 5xx status, and (2) each distinct path with how many times it was requested, most requested first.

<details>
<summary>Show the solution</summary>

```bash
awk '$4 >= 500' logs/access.log | wc -l
awk '{print $3}' logs/access.log | sort | uniq -c | sort -rn
```

**Output:**

```text
2
      3 /login
      2 /checkout
      1 /products/7
      1 /products
      1 /cart
```

**Walkthrough:** `awk '$4 >= 500'` keeps lines whose fourth field (the status) is at least 500 — awk compares numerically — and `wc -l` counts them. The second pipeline extracts the path (field 3), groups identical paths with `sort | uniq -c`, and orders by count. Ties keep `sort`'s secondary ordering, so equal counts appear in reverse alphabetical order here because of `-r`.

</details>

### Exercise 2 — Lock down the configuration

**Objective:** practise permissions.
**What to do:** create `/etc/cornershop/env` containing `DATABASE_URL=postgresql://...`, owned by root and the `cornershop` group, readable by the group but not by others, and show its permissions.

<details>
<summary>Show the solution</summary>

```bash
sudo mkdir -p /etc/cornershop
echo "DATABASE_URL=postgresql://app@db.internal/cornershop" | sudo tee /etc/cornershop/env > /dev/null
sudo chown root:cornershop /etc/cornershop/env
sudo chmod 640 /etc/cornershop/env
stat -c '%A %U %G %n' /etc/cornershop/env
cat /etc/cornershop/env 2>&1
```

**Output:**

```text
-rw-r----- root cornershop /etc/cornershop/env
cat: /etc/cornershop/env: Permission denied
```

**Walkthrough:** `sudo tee` writes the file as root (`sudo echo … > file` would not work, because the redirection happens in your unprivileged shell). Mode `640` gives root read and write, the `cornershop` group read, and others nothing — so the service can read its configuration, but `learner` (not in the group) is refused.

</details>

### Exercise 3 — Production scenario: the disk is full

**Objective:** practise incident investigation.
**The scenario:** the API logs `ENOSPC: no space left on device`. Describe the commands you would run, in order, and the likely fixes.

<details>
<summary>Show the solution</summary>

1. `df -h` — confirm which file system is full (often `/` or `/var`); `df -i` — check inodes (millions of tiny files can exhaust them while space remains).
2. `sudo du -xh --max-depth=1 / | sort -h` — find the largest top-level directories on that file system (`-x` stays on one file system); repeat inside the largest (often `/var/log`, `/var/lib/docker`, `/tmp`).
3. Typical culprits: an application log written to a file without rotation; the journal growing without limits; old Docker images and build cache (`docker system df`); core dumps; forgotten backups.
4. **Immediate relief**: truncate (not delete) a huge open log file (`sudo truncate -s 0 /var/log/cornershop/app.log` — deleting an open file does not free space until the process closes it; `lsof +L1` lists such files); `sudo journalctl --vacuum-size=500M`; `docker system prune` for unused images.
5. **Fix the cause**: configure logrotate or log to stdout/journald with size limits; alert on disk usage at 80% ({{ch:monitoring}}); clean up build artefacts in CI images.

</details>

## Summary

Linux runs nearly every server, container and CI runner, and the shell is the universal interface to it. Commands take options and arguments; `man` and `--help` explain them. You navigate the file system tree from `/` with `pwd`, `ls` and `cd`, create and manage files with `mkdir`, `touch`, `cp`, `mv` and the permanent `rm`, read them with `cat`, `less`, `head`, `tail` (and `tail -f` for live logs), and search with `grep` and `find`. Configuration lives in `/etc`, logs in `/var/log` and the journal, applications often in `/opt`.

Small tools combine through **pipes** and **redirection** (`>`, `>>`, `2>`, `2>&1`, `<`) — `awk`, `cut`, `sort`, `uniq`, `sed`, `wc` and `jq` turn logs into answers. **Permissions** (read, write, execute for owner, group and others; numeric modes like `600`, `644`, `755`) and **ownership** control access; `root` can do anything, so you work as a normal user, use `sudo` sparingly, and run services as **unprivileged system users**.

**Processes** have PIDs and receive signals (TERM for graceful stop, KILL as a last resort); **systemd** runs services from unit files, restarts them and collects their output in the **journal** (`systemctl`, `journalctl`). `df`, `du`, `free` and `uptime` check resources; `ip`, `ss`, `curl`, `dig` and `nc` check networking. **SSH** with key pairs (private key `600`, public key in `authorized_keys`) provides secure remote access, hardened by disabling passwords and root logins, patching and firewalling.

## Key terms

- **Linux** — An open-source operating system family built on the Linux kernel.
- **Distribution** — A packaged Linux system such as Ubuntu or Red Hat Enterprise Linux.
- **Kernel** — The core of the operating system managing hardware, processes and memory.
- **Shell** — The program that interprets typed commands, such as bash.
- **Terminal** — The interface through which you interact with a shell.
- **Root directory (/)** — The top of the Linux file system tree.
- **Home directory (~)** — A user's personal directory.
- **Absolute / relative path** — A location from the root, or from the current directory.
- **Hidden file** — A file whose name starts with a dot, not listed by default.
- **Pipe (|)** — Sending one command's output as the next command's input.
- **Redirection** — Sending a command's input or output to or from files.
- **Standard streams** — stdin, stdout and stderr: a process's input, output and error channels.
- **Here-document** — A way to pass several lines of text to a command inline.
- **grep** — A command that searches text for matching lines.
- **find** — A command that searches for files by name, type, size or age.
- **awk** — A text-processing language often used to extract and filter fields.
- **Permissions** — Read, write and execute rights for a file's owner, group and others.
- **chmod / chown** — Commands that change permissions and ownership.
- **root** — The administrator account with unlimited privileges.
- **sudo** — A command that runs another command with elevated privileges.
- **System user** — A non-login account used only to own files and run a service.
- **Process / PID** — A running program and its numeric identifier.
- **Signal** — A message sent to a process, such as TERM (stop gracefully) or KILL (stop immediately).
- **systemd** — The service manager that starts, supervises and logs services on most distributions.
- **Unit file** — A systemd configuration file describing a service.
- **journalctl** — The command for reading logs collected by systemd's journal.
- **logrotate** — A tool that rotates, compresses and deletes old log files.
- **SSH** — The secure protocol for logging in to and copying files to remote machines.
- **SSH key pair** — A private key kept secret and a public key placed on servers for authentication.
- **Package manager** — A tool that installs and updates software, such as apt.

## What comes next

Typing commands one at a time is the start; repeating them reliably is the next step. The next chapter, {{ch:shell-scripting}}, turns commands into scripts: variables, conditions, loops and functions in bash, handling arguments and errors safely with `set -euo pipefail`, processing files, and writing the deployment, backup and maintenance scripts that every team relies on.
