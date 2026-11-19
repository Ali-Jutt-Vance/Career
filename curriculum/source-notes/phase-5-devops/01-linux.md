# Phase 5 — Chapter 1: Linux

---

## Chapter Overview

Linux powers 96% of the world's servers. As a backend or cloud engineer, you will SSH into Linux servers, debug running processes, manage files, set permissions, and configure services. Comfort on the command line separates junior from senior engineers.

**Core topics:**
- Filesystem structure and navigation
- File permissions and ownership
- Processes and signals
- Networking commands
- User management
- Package management (apt/yum)
- `systemd` service management
- Useful tools: `grep`, `awk`, `sed`, `find`, `curl`, `jq`

---

## Beginner Theory

### Filesystem Hierarchy Standard (FHS)

```
/           Root of the filesystem
/bin        Essential user binaries (ls, cp, cat, bash)
/sbin       System binaries (root only: fdisk, iptables, mount)
/etc        Configuration files (nginx.conf, /etc/hosts, crontab)
/var        Variable data: logs (/var/log), spool, mail
/tmp        Temporary files (cleared on reboot)
/home       User home directories (/home/alice)
/root       Root user's home
/usr        User programs (/usr/bin, /usr/lib, /usr/local)
/opt        Optional third-party software
/proc       Virtual filesystem — kernel & process info (/proc/cpuinfo, /proc/meminfo)
/sys        Virtual filesystem — hardware info
/dev        Device files (/dev/sda, /dev/null, /dev/random)
/mnt /media Mount points for external filesystems
```

---

## Basic Examples

### Navigation and File Operations

```bash
# Navigation
pwd                         # current directory
ls -la                      # list with permissions, hidden files, sizes
ls -lh /var/log             # human-readable sizes
cd /etc/nginx               # change directory
cd ~                        # go to home directory
cd -                        # go to previous directory

# File operations
cp  file.txt backup.txt           # copy
cp  -r dir/ backup/               # copy directory recursively
mv  file.txt /tmp/file.txt        # move/rename
rm  file.txt                      # delete file (no recycle bin!)
rm  -rf /tmp/old-files/           # force delete directory (dangerous!)
mkdir -p /opt/myapp/logs          # create nested directories
touch /opt/myapp/.env             # create empty file

# View file contents
cat /etc/os-release           # print file
less /var/log/nginx/error.log  # paginate (q to quit, / to search)
head -n 50 app.log            # first 50 lines
tail -n 100 app.log           # last 100 lines
tail -f /var/log/nginx/access.log  # follow live (Ctrl+C to stop)

# Find files
find /var/log -name "*.log" -newer /tmp/marker  # logs modified after marker
find /etc -type f -name "*.conf"               # all config files
find /home -size +10M                          # files > 10MB

# Disk usage
df -h              # disk space per filesystem
du -sh /var/log/*  # size of each item in /var/log
```

### File Permissions

```bash
# Permissions: rwxrwxrwx = owner group others
# r=4, w=2, x=1
# chmod 755 = rwxr-xr-x (owner: all, group: rx, others: rx)
# chmod 644 = rw-r--r-- (owner: rw, group: r, others: r)
# chmod 600 = rw------- (owner: rw, group: none, others: none) ← SSH keys

ls -la file.sh
# -rwxr-xr-x 1 alice web 1234 Jan 15 09:00 file.sh
# ^ ^     ^^ ^ ^     ^
# | |     || | |     group
# | |     || | owner
# | |     || hard links
# | |     |others (rx)
# | |     group (rx)
# | owner (rwx)
# type: - file, d dir, l symlink

chmod 755 deploy.sh          # rwxr-xr-x
chmod 644 config.json        # rw-r--r--
chmod 600 ~/.ssh/id_rsa      # rw------- (private key must be 600)
chmod +x  deploy.sh          # add execute bit for all
chmod u+x deploy.sh          # add execute bit for owner only
chown alice:web file.txt     # change owner:group
chown -R alice:web /opt/app/ # recursive ownership change
```

---

## Intermediate Concepts

### Process Management

```bash
# View processes
ps aux                        # all processes: user, PID, CPU%, MEM%
ps aux | grep nginx           # find nginx processes
pgrep nginx                   # just PIDs
top                           # interactive process monitor
htop                          # better interactive monitor (may need install)

# Signals
kill -SIGTERM 1234     # graceful stop (ask process to exit, 15)
kill -SIGKILL 1234     # force kill (cannot be ignored, 9)
kill -SIGHUP  1234     # reload config (many daemons support this)
pkill nginx            # kill by name
killall node           # kill all node processes

# Background jobs
node server.js &           # run in background
jobs                       # list background jobs
fg %1                      # bring job 1 to foreground
bg %1                      # send to background
nohup node server.js &     # survive terminal close
disown %1                  # detach from shell
screen / tmux              # terminal multiplexers (persist sessions)

# Process info
lsof -i :3000             # what process is using port 3000
lsof -p 1234              # files opened by PID 1234
strace -p 1234            # system calls made by PID 1234
```

### Networking

```bash
# Network info
ip addr                      # IP addresses (replaces ifconfig)
ip route                     # routing table
ss -tlnp                     # listening ports (replaces netstat -tlnp)
ss -s                        # socket statistics

# Connectivity
ping 8.8.8.8                 # ICMP echo (test reachability)
traceroute google.com        # trace network path
curl -I https://example.com  # HTTP headers only
curl -v https://api.example.com/users  # verbose HTTP request
curl -X POST -H "Content-Type: application/json" -d '{"name":"test"}' http://localhost:3000/api/users

# DNS
dig example.com              # DNS lookup (full)
dig example.com A            # A record only
nslookup example.com         # simple DNS lookup
host example.com             # another DNS tool

# Firewall (UFW on Ubuntu)
ufw status verbose
ufw allow 22/tcp             # SSH
ufw allow 80/tcp             # HTTP
ufw allow 443/tcp            # HTTPS
ufw deny 3306                # block MySQL from internet
ufw enable

# iptables (lower level)
iptables -L -n -v            # list all rules
```

### Text Processing

```bash
# grep — search text
grep "ERROR" app.log                      # lines containing ERROR
grep -i "error" app.log                   # case-insensitive
grep -n "ERROR" app.log                   # with line numbers
grep -c "ERROR" app.log                   # count matches
grep -v "DEBUG" app.log                   # invert — exclude DEBUG lines
grep -r "TODO" ./src                      # recursive search
grep -E "ERROR|WARN" app.log             # regex OR
grep -A 3 -B 1 "FATAL" app.log          # 3 lines after, 1 before

# awk — column extraction
awk '{print $1, $2}' file.txt            # print columns 1 and 2
awk -F: '{print $1}' /etc/passwd         # colon separator, print username
awk '$9 == "404" {print $7}' access.log  # print URLs with 404 status
awk '{sum += $1} END {print sum}' nums.txt  # sum a column

# sed — stream editor
sed 's/foo/bar/g' file.txt               # replace foo with bar (global)
sed 's/foo/bar/g' -i file.txt           # in-place edit
sed '/^#/d' config.txt                  # delete comment lines
sed -n '10,20p' file.txt               # print lines 10-20

# sort, uniq
sort -k2 -n file.txt          # sort by column 2, numeric
sort file.txt | uniq -c | sort -rn  # count unique lines, sort by count

# xargs — run command with each line as arg
cat urls.txt | xargs curl -I
find . -name "*.tmp" | xargs rm
```

### systemd Service Management

```bash
# Service management
systemctl status nginx        # service status
systemctl start  nginx
systemctl stop   nginx
systemctl restart nginx
systemctl reload  nginx       # reload config without downtime
systemctl enable  nginx       # start on boot
systemctl disable nginx       # don't start on boot

# Logs (journald)
journalctl -u nginx           # nginx logs
journalctl -u nginx -f        # follow live
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx -n 100    # last 100 lines
journalctl --disk-usage       # how much space logs use

# Create custom service
# /etc/systemd/system/myapp.service
cat > /etc/systemd/system/myapp.service << 'EOF'
[Unit]
Description=My Node.js App
After=network.target

[Service]
Type=simple
User=nodeuser
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node /opt/myapp/dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/myapp/.env
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload       # reload unit files
systemctl enable myapp
systemctl start myapp
```

---

## Interview Preparation

**Q1: What is the difference between `kill -9` and `kill -15`?**
A: `kill -15` (SIGTERM) is a polite request to terminate — the process can intercept this signal, perform cleanup (close connections, flush buffers, write pid file removal), then exit gracefully. Most well-behaved programs respond to SIGTERM. `kill -9` (SIGKILL) is an unconditional kill sent to the kernel — the process cannot intercept, block, or ignore it. The kernel terminates it immediately with no cleanup. Use SIGTERM first, give the process a few seconds, then use SIGKILL if it doesn't stop. Never use SIGKILL first as it can leave orphan connections, corrupt files, and cause data loss.

**Q2: How do you find which process is listening on port 3000?**
A: `ss -tlnp | grep ':3000'` or `lsof -i :3000`. `ss` (socket statistics) shows listening TCP/UDP sockets with process info. The output includes the PID and process name. Alternatively: `fuser 3000/tcp` shows just the PID. If you need to find and kill it: `kill $(lsof -ti :3000)`. Understanding which process uses which port is essential for debugging port conflicts.

**Q3: What is the difference between `apt install` and `apt-get install`?**
A: Both install packages on Debian/Ubuntu, but `apt` is the modern user-facing command (introduced in 2014) with better output formatting, progress bars, and saner defaults. `apt-get` is the older, scripting-friendly version with more stable output format — it should be used in scripts (the output of `apt` can change between versions). Use `apt` interactively, `apt-get` in scripts. Key commands: `apt update` (refresh package list), `apt upgrade` (update installed packages), `apt install nginx`, `apt remove nginx`, `apt search nginx`, `dpkg -l` (list installed packages).

---

## Practical Tasks

### Beginner (10 Tasks)
1. Navigate the filesystem — find all `.conf` files in `/etc`.
2. Create directory structure `/opt/myapp/logs/nginx` with one command.
3. Set correct permissions: 600 for a private key, 755 for a script.
4. View the last 200 lines of a log file and follow for new entries.
5. Find all files in `/var/log` modified in the last 1 hour.
6. Check disk usage — find the top 5 largest directories under `/var`.
7. Install nginx with apt and start it.
8. Check which process is listening on port 80.
9. View running processes sorted by memory usage.
10. Send SIGTERM to a process by name.

### Intermediate (10 Tasks)
1. Create a `systemd` unit file for a Node.js app.
2. Configure the app to restart on failure and start on boot.
3. Extract all 4xx errors from an Nginx access log with `awk`.
4. Count requests per IP from access log using `awk | sort | uniq -c | sort -rn`.
5. Use `grep -E` to extract all email addresses from a file.
6. Create a new system user for running app services.
7. Configure `ufw` to allow only SSH, HTTP, HTTPS.
8. Use `ss` to identify all listening ports and their processes.
9. Use `strace` to trace system calls of a process for 5 seconds.
10. Set up a log rotation configuration with `logrotate`.

### Advanced (10 Tasks)
1. Write a Bash script to deploy an app (git pull, npm build, restart service).
2. Debug a slow server: CPU/memory/disk I/O analysis.
3. Set up SSH key-based authentication and disable password login.
4. Configure `sudoers` to grant limited sudo access to a user.
5. Use `iptables` to block all traffic except SSH, HTTP, HTTPS.
6. Analyze an OOM kill from `/var/log/kern.log`.
7. Set file system limits with `ulimit` for a service.
8. Use `tcpdump` to capture HTTP traffic on port 80.
9. Set up automatic security updates with `unattended-upgrades`.
10. Harden an Ubuntu 22.04 server following CIS Benchmark.

---

## Self Assessment
1. What directory stores system configuration files?
2. What does `chmod 600` mean?
3. What is the difference between SIGTERM and SIGKILL?
4. What does `tail -f` do?
5. What command shows listening ports?
6. What is `systemd` used for?
7. What does `grep -v` do?
8. What is `/proc` filesystem?
9. What is `chown` used for?
10. What is `nohup` used for?

---

## Cheat Sheet

```bash
# Navigation
ls -la; cd ~; pwd; find / -name "*.conf" 2>/dev/null

# Permissions
chmod 755 script.sh; chmod 600 ~/.ssh/id_rsa; chown user:group file

# View files  
cat /etc/hosts; less file; head -50 f; tail -f f.log; grep -n "err" f

# Processes
ps aux | grep node; kill -15 PID; pkill node; lsof -i :3000; ss -tlnp

# Disk
df -h; du -sh /var/log/*; du -sh * | sort -rh | head -10

# Text processing
grep -i "error" log.log | awk '{print $1}' | sort | uniq -c | sort -rn
sed 's/old/new/g' -i file.txt

# systemd
systemctl {status|start|stop|restart|reload|enable|disable} nginx
journalctl -u nginx -f -n 100

# Network
ip addr; ss -tlnp; ping 8.8.8.8; curl -I https://example.com; dig example.com

# Package management (Debian/Ubuntu)
apt update && apt upgrade -y; apt install nginx; apt remove nginx
```
