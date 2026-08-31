# Phase 5 — Chapter 2: Shell Scripting

---

## Chapter Overview

Shell scripting automates repetitive tasks — deployments, backups, log rotation, health checks, CI/CD pipelines. Every DevOps and backend engineer writes shell scripts; understanding them deeply distinguishes engineers who can maintain production infrastructure from those who copy-paste from Stack Overflow.

**Topics:**
- Bash syntax: variables, conditionals, loops, functions
- String manipulation
- File and process operations
- Error handling (`set -euo pipefail`)
- Argument parsing
- Common patterns: deployment scripts, health checks, log analysis

---

## Beginner Theory

### Shebang and Variables

```bash
#!/usr/bin/env bash
# Use /usr/bin/env bash — finds bash in PATH rather than hardcoding /bin/bash
# (macOS puts bash at /usr/local/bin/bash with Homebrew, for example)

# Variables — no spaces around =
NAME="Alice"
AGE=30
echo "Hello, $NAME. You are $AGE years old."
echo "Hello, ${NAME}Smith."  # braces when adjacent to text

# Command substitution
DATE=$(date +%Y-%m-%d)
UPTIME=$(uptime -p)
LINES=$(wc -l < file.txt)

# Read-only constants
readonly MAX_RETRY=3
readonly APP_DIR="/opt/myapp"

# Environment variables
export DATABASE_URL="postgresql://localhost:5432/mydb"  # available to child processes
echo "$HOME"    # user's home
echo "$USER"    # current user
echo "$PWD"     # current directory
echo "$0"       # script name
echo "$1 $2"    # positional arguments
echo "$@"       # all arguments (as separate quoted strings)
echo "$#"       # number of arguments
echo "$?"       # exit code of last command (0 = success)
echo "$$"       # PID of current shell
```

---

## Basic Examples

### Conditionals

```bash
#!/usr/bin/env bash
set -euo pipefail  # exit on error, undefined vars, pipe failures

FILE="/etc/nginx/nginx.conf"
PORT=3000

# File tests
if [[ -f "$FILE" ]]; then echo "File exists"; fi
if [[ -d "/var/log" ]]; then echo "Dir exists"; fi
if [[ -r "$FILE" ]]; then echo "Readable"; fi
if [[ -w "$FILE" ]]; then echo "Writable"; fi
if [[ -x "$FILE" ]]; then echo "Executable"; fi
if [[ -s "$FILE" ]]; then echo "Non-empty"; fi
if [[ ! -f "$FILE" ]]; then echo "Does not exist"; fi

# String comparisons
if [[ "$NAME" == "Alice" ]]; then echo "It's Alice"; fi
if [[ "$NAME" != "Bob" ]]; then echo "Not Bob"; fi
if [[ -z "$NAME" ]]; then echo "Empty string"; fi
if [[ -n "$NAME" ]]; then echo "Non-empty string"; fi
if [[ "$NAME" == *"ice"* ]]; then echo "Contains 'ice'"; fi  # glob match

# Numeric comparisons (use -eq, -ne, -lt, -le, -gt, -ge)
if [[ "$PORT" -gt 1024 ]]; then echo "Unprivileged port"; fi
if [[ "$PORT" -eq 3000 ]]; then echo "Port 3000"; fi

# Combine with && and ||
if [[ -f "$FILE" && "$PORT" -gt 0 ]]; then echo "Both true"; fi
if [[ -z "$NAME" || "$NAME" == "default" ]]; then echo "Using default"; fi

# Case statement
case "$ENV" in
  production)  echo "Production mode" ;;
  staging)     echo "Staging mode" ;;
  *)           echo "Unknown: $ENV" ;;
esac
```

### Loops

```bash
# For loop over list
for service in nginx postgresql redis; do
  systemctl status "$service" || echo "$service is down!"
done

# For loop over files
for file in /var/log/*.log; do
  echo "Processing: $file"
  gzip "$file"
done

# For loop with range
for i in {1..10}; do
  echo "Item $i"
done

# C-style for loop
for ((i=0; i<10; i++)); do
  echo "Index: $i"
done

# While loop
RETRY=0
until curl -sf http://localhost:3000/health; do
  RETRY=$((RETRY + 1))
  if [[ "$RETRY" -ge 3 ]]; then
    echo "Health check failed after 3 attempts"
    exit 1
  fi
  echo "Waiting... attempt $RETRY"
  sleep 5
done

# Read file line by line
while IFS= read -r line; do
  echo "Line: $line"
done < /etc/hosts
```

### Functions

```bash
#!/usr/bin/env bash
set -euo pipefail

# Color output helpers
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Function definition
check_dependency() {
  local cmd="$1"
  if ! command -v "$cmd" &>/dev/null; then
    log_error "Required command not found: $cmd"
    return 1
  fi
  log_info "Found: $cmd"
}

# Function with return value via stdout
get_app_version() {
  local dir="${1:-$PWD}"
  node -p "require('${dir}/package.json').version"
}

# Usage
check_dependency docker
check_dependency git
VERSION=$(get_app_version /opt/myapp)
log_info "App version: $VERSION"
```

### String Manipulation

Bash has no built-in string library like Python or JavaScript — instead, string operations use special "parameter expansion" syntax inside `${...}`. It looks cryptic at first, but each form maps to one common operation.

```bash
FILENAME="/var/log/app/error-2025-01-15.log"

# Length
echo "${#FILENAME}"              # 33 — length of the string

# Substring: ${VAR:start:length}
echo "${FILENAME:5:3}"           # "log" — 3 chars starting at index 5

# Remove a prefix/suffix pattern
echo "${FILENAME##*/}"           # "error-2025-01-15.log" — strip longest match of */ from the front (basename)
echo "${FILENAME%/*}"            # "/var/log/app" — strip shortest match of /* from the back (dirname)
echo "${FILENAME%.log}"          # "/var/log/app/error-2025-01-15" — strip the .log suffix

# Search and replace
echo "${FILENAME/error/warning}" # replaces FIRST match: .../warning-2025-01-15.log
echo "${FILENAME//o/0}"          # replaces ALL matches of "o" with "0"

# Case conversion (Bash 4+)
NAME="alice"
echo "${NAME^^}"                 # "ALICE" — uppercase
echo "${NAME^}"                  # "Alice" — capitalize first letter only

# Default values — extremely common in deployment scripts
echo "${PORT:-3000}"             # use 3000 if PORT is unset or empty
echo "${DATABASE_URL:?must be set}"  # error out with message if unset

# Splitting a string into an array
IFS=',' read -ra TAGS <<< "prod,web,us-east-1"
for tag in "${TAGS[@]}"; do echo "Tag: $tag"; done
```

### Process Operations

Deployment and monitoring scripts constantly need to inspect, wait for, or manage running processes — this is the part of shell scripting closest to actual system administration.

```bash
# Find a process by name
pgrep -f "node.*server.js"        # prints matching PIDs
pgrep -f "node.*server.js" -c     # just the count

# Check if a specific PID is still running
if kill -0 "$PID" 2>/dev/null; then
  echo "Process $PID is running"
else
  echo "Process $PID is not running"
fi

# Gracefully stop, then force-kill if it doesn't respond
stop_service() {
  local pid="$1"
  kill -TERM "$pid"              # ask nicely first (SIGTERM)
  for i in {1..10}; do
    kill -0 "$pid" 2>/dev/null || return 0   # it exited cleanly
    sleep 1
  done
  echo "Process $pid did not stop in 10s, force killing"
  kill -KILL "$pid"               # SIGKILL — last resort
}

# Run a command in the background and capture its PID
long_running_task &
TASK_PID=$!
echo "Started background task with PID $TASK_PID"

# Wait for a background job to finish (and get its exit code)
wait "$TASK_PID"
echo "Task finished with exit code $?"

# Run multiple jobs in parallel and wait for all of them
for host in web1 web2 web3; do
  deploy_to_host "$host" &
done
wait   # blocks until ALL background jobs above have finished
echo "All deployments finished"
```

---

## Intermediate Concepts

### Deployment Script

```bash
#!/usr/bin/env bash
set -euo pipefail

# =============================
# Production Deployment Script
# =============================

APP_NAME="myapp"
APP_DIR="/opt/${APP_NAME}"
BACKUP_DIR="/opt/backups/${APP_NAME}"
REPO_URL="git@github.com:org/${APP_NAME}.git"
SERVICE_NAME="${APP_NAME}"
DEPLOY_USER="deploy"
MAX_BACKUPS=5

# Timestamp for this deploy
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Trap errors
cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    error "Deployment FAILED at step: ${CURRENT_STEP:-unknown}. Check logs above."
  fi
}
trap cleanup EXIT

# -------- Step 1: Preflight checks --------
CURRENT_STEP="preflight"
info "=== Preflight checks ==="

[[ "$(id -u)" -ne 0 ]] && error "Must run as root or with sudo"
command -v git    &>/dev/null || error "git not installed"
command -v node   &>/dev/null || error "node not installed"
command -v pm2    &>/dev/null || error "pm2 not installed"

# Check if enough disk space (need 500MB)
AVAILABLE_MB=$(df -m "$APP_DIR" | awk 'NR==2 {print $4}')
[[ "$AVAILABLE_MB" -lt 500 ]] && error "Insufficient disk space: ${AVAILABLE_MB}MB available"

info "Preflight checks passed"

# -------- Step 2: Backup current version --------
CURRENT_STEP="backup"
info "=== Creating backup ==="

mkdir -p "$BACKUP_DIR"
if [[ -d "$APP_DIR/current" ]]; then
  cp -r "$APP_DIR/current" "$BACKUP_DIR/${TIMESTAMP}"
  info "Backup created: $BACKUP_DIR/${TIMESTAMP}"
fi

# Keep only last N backups
cd "$BACKUP_DIR"
ls -dt */ | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -rf --
info "Old backups cleaned"

# -------- Step 3: Pull latest code --------
CURRENT_STEP="git-pull"
info "=== Pulling latest code ==="

cd "$APP_DIR"
git fetch --all
CURRENT_COMMIT=$(git rev-parse HEAD)
git pull origin main
NEW_COMMIT=$(git rev-parse HEAD)

if [[ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]]; then
  warn "No new commits. Deploy anyway."
fi

info "Deploying commit: $NEW_COMMIT"

# -------- Step 4: Install dependencies --------
CURRENT_STEP="npm-install"
info "=== Installing dependencies ==="
npm ci --production  # clean install from lockfile

# -------- Step 5: Build --------
CURRENT_STEP="build"
info "=== Building ==="
npm run build

# -------- Step 6: Run migrations --------
CURRENT_STEP="migrations"
info "=== Running database migrations ==="
npm run db:migrate

# -------- Step 7: Restart service --------
CURRENT_STEP="restart"
info "=== Restarting service ==="
pm2 restart "$SERVICE_NAME" --update-env
pm2 save

# -------- Step 8: Health check --------
CURRENT_STEP="health-check"
info "=== Health check ==="

MAX_WAIT=30
WAIT=0
until curl -sf "http://localhost:3000/health" | grep -q '"status":"ok"'; do
  WAIT=$((WAIT + 1))
  [[ "$WAIT" -ge "$MAX_WAIT" ]] && error "Health check failed after ${MAX_WAIT}s"
  sleep 1
done

info "=== DEPLOY COMPLETE ==="
info "Commit: $NEW_COMMIT"
info "Time:   $TIMESTAMP"
```

### Argument Parsing

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [OPTIONS] <environment>

Deploy the application to the specified environment.

Arguments:
  environment   Target environment (staging, production)

Options:
  -b, --branch BRANCH   Git branch to deploy (default: main)
  -t, --tag    TAG      Deploy a specific git tag
  -n, --dry-run         Preview actions without executing
  -v, --verbose         Enable verbose output
  -h, --help            Show this help

Examples:
  $0 staging
  $0 production --branch feature/new-api
  $0 staging --dry-run --verbose
EOF
  exit "${1:-0}"
}

# Defaults
BRANCH="main"
TAG=""
DRY_RUN=false
VERBOSE=false

# Parse options
while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--branch)   BRANCH="$2";     shift 2 ;;
    -t|--tag)      TAG="$2";        shift 2 ;;
    -n|--dry-run)  DRY_RUN=true;   shift   ;;
    -v|--verbose)  VERBOSE=true;   shift   ;;
    -h|--help)     usage 0 ;;
    -*)            echo "Unknown option: $1"; usage 1 ;;
    *)             ENVIRONMENT="$1"; shift  ;;
  esac
done

# Validate required arguments
[[ -z "${ENVIRONMENT:-}" ]] && { echo "ERROR: environment required"; usage 1; }
[[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]] && \
  { echo "ERROR: invalid environment: $ENVIRONMENT"; usage 1; }

# Execute
if $DRY_RUN; then
  echo "[DRY RUN] Would deploy branch $BRANCH to $ENVIRONMENT"
else
  echo "Deploying $BRANCH to $ENVIRONMENT..."
fi
```

---

## Interview Preparation

**Q1: What does `set -euo pipefail` do and why is it important?**
A: Three separate settings: `set -e` — exit immediately if any command returns non-zero exit code. Without it, a failed command is silently skipped and the script continues, often in a broken state. `set -u` — treat undefined variables as errors. Without it, `$UNDEFINED_VAR` silently expands to empty string, causing bugs like `rm -rf $TMPDIR/` deleting `/` when TMPDIR is unset. `set -o pipefail` — in a pipeline (`cmd1 | cmd2`), the exit code is normally the last command's exit code. With `pipefail`, if any command in the pipe fails, the pipeline fails. Together these make scripts fail loudly and clearly rather than silently continuing.

**Q2: What is the difference between `$@` and `$*` for passing arguments?**
A: Both expand to all positional parameters. The difference is quoting. `"$@"` expands to separate quoted strings: `"$1" "$2" "$3"` — each argument is a separate word, preserving spaces. `"$*"` expands to a single string with arguments joined by IFS (usually space): `"$1 $2 $3"`. Use `"$@"` almost always — it correctly handles arguments with spaces. Example: if `$1="hello world"`, then `func "$@"` passes one argument `"hello world"`, but `func "$*"` also passes one argument but through a different mechanism. For loops: `for arg in "$@"` iterates over each argument separately.

**Q3: How do you handle cleanup on script failure?**
A: Use `trap 'cleanup_function' EXIT`. The EXIT trap runs whenever the script exits — success, failure, or signal. Combine with `set -e` so failures trigger the trap. Pattern: create a `CURRENT_STEP` variable updated at each step; the trap reads it to report where the script failed. For temporary files: create in `TMPDIR=$(mktemp -d)` and `trap 'rm -rf "$TMPDIR"' EXIT`. For half-applied changes (half-deployed files): store the previous state before modifying, restore it in the trap if `$?` is non-zero.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Write a script that prints "Hello, World!" and accepts a name as argument.
2. Write a script that checks if a file exists and prints its size.
3. Write a script that loops over all `.log` files and counts their lines.
4. Write a script that reads `/etc/hosts` line by line and prints IPs only.
5. Write a function that checks if a command is installed.
6. Write a script that makes a backup of a directory with a timestamp.
7. Parse a simple argument: `--dry-run` flag.
8. Write a script that waits for a port to be open (retry 10 times).
9. Write a health check script that returns 0 if service is up.
10. Use `set -euo pipefail` and test error exit behavior.

### Intermediate (10 Tasks)
1. Write a deployment script with git pull, build, restart, health check.
2. Implement full argument parsing with `-h`, `-e`, `-b` flags.
3. Write a log analyzer: count 4xx/5xx status codes from nginx access log.
4. Write a script to rotate old log files and compress them.
5. Write a script that monitors disk usage and sends alert when > 80%.
6. Write a database backup script that stores backups with timestamp.
7. Write a script that runs `npm ci && npm run build` and retries on failure.
8. Implement cleanup with `trap 'rm -rf "$TMP_DIR"' EXIT`.
9. Write a script that processes a CSV file and outputs JSON.
10. Write a script that sets up a new user with SSH key.

### Advanced (10 Tasks)
1. Write a complete CI/CD deploy script with rollback.
2. Write a script that canary-deploys a new version (traffic split).
3. Implement distributed lock in Bash using Redis CLI.
4. Write a cluster health monitoring script with alerting.
5. Write a script that auto-scales based on CPU load.
6. Parse complex nested JSON with `jq` in a script.
7. Write a script that generates an Nginx config from a template.
8. Write a secret rotation script for AWS Secrets Manager.
9. Implement a git hook that runs lint/tests before push.
10. Write a script that zero-downtime deploys to multiple servers.

---

## Self Assessment
1. What does `#!/usr/bin/env bash` do?
2. What does `set -e` do?
3. What is the difference between `$@` and `$*`?
4. How do you read a file line by line?
5. What is `$?` in a script?
6. What is `trap` used for?
7. What is command substitution?
8. What is a local variable in Bash?
9. What does `[[ -f file ]]` test?
10. What does `2>/dev/null` do?

---

## Cheat Sheet

```bash
#!/usr/bin/env bash
set -euo pipefail

# Variables
VAR="value"; readonly CONST="immutable"; export ENV_VAR="child-visible"
DATE=$(date +%Y-%m-%d)    # command substitution
${VAR:-default}           # use default if unset
${VAR:?required}          # error if unset

# Conditionals
[[ -f file ]]  [[ -d dir ]]  [[ -z str ]]  [[ -n str ]]  [[ $a -eq $b ]]
if [[ cond ]]; then ...; elif [[ cond ]]; then ...; else ...; fi

# Loops
for item in a b c; do echo "$item"; done
for i in {1..10}; do echo $i; done
while [[ cond ]]; do ...; done
while IFS= read -r line; do echo "$line"; done < file.txt

# Functions
fn_name() { local arg="$1"; echo "$arg"; return 0; }
result=$(fn_name "hello")

# Strings
${#VAR}         # length
${VAR:2:5}      # substring (start at 2, length 5)
${VAR/foo/bar}  # replace first match
${VAR,,}        # lowercase
${VAR^^}        # uppercase

# Error handling
trap 'echo "Failed at line $LINENO"' ERR
trap 'rm -rf "$TMPDIR"' EXIT
command || { echo "Failed"; exit 1; }

# Argument parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--verbose) VERBOSE=true; shift ;;
    -b|--branch)  BRANCH="$2";  shift 2 ;;
    *)            break ;;
  esac
done
```
