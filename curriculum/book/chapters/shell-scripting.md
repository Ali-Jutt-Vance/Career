# Shell Scripting

> [!GOALS]
> - Write bash scripts that are **safe by default**: shebang, `set -euo pipefail`, quoting.
> - Use variables, parameters and command substitution correctly.
> - Make decisions with `if`, `case` and tests, and repeat work with `for` and `while` loops.
> - Organise scripts into **functions**, handle **arguments and options**, and print helpful usage messages.
> - Handle errors deliberately: exit codes, `trap` for cleanup, logging to stderr.
> - Write the scripts teams actually rely on — backups, deploys, health checks — and know when to switch to a real programming language.

## Why this matters

Every engineering team has shell scripts: the script that backs up the database at night, the one that deploys the application, the one that sets up a new developer's machine, the dozens of small steps inside CI pipelines ({{ch:github-actions}}) and container start-ups ({{ch:docker}}). They exist because the shell is everywhere and good at gluing commands together — the commands from {{ch:linux}} become repeatable procedures.

Shell scripts also have a reputation for fragility, and it is earned. By default, bash keeps going after a command fails, treats unset variables as empty strings, and splits unquoted text on spaces — so a script that deletes "old backups" can delete the wrong thing because a variable was empty or a file name had a space. Most scripting disasters come from a handful of well-known traps.

This chapter teaches bash scripting with those traps closed from the first line: safe settings, quoting, explicit error handling and cleanup. Every script shown was run on Ubuntu 24.04, and the outputs are exactly what it printed.

## The simple idea

A shell script is a recipe card for the terminal. Instead of typing ten commands every time you deploy — and occasionally forgetting one or mistyping another — you write them down once, in order, with notes on what to do when an ingredient is missing. Anyone can then follow the card exactly the same way.

> [!ANALOGY]
> A shell script is like a recipe card for the terminal: the steps written down once, in order, so anyone can repeat them exactly.
>
> **Where the analogy breaks:** a human cook notices when a step goes wrong — the oven is cold, the milk is sour — and stops. Bash, by default, does not: if a step fails, it calmly carries on with the next one. A good script has to be told explicitly to stop on failure, which is the first thing this chapter does.

## The proper definition and key words

A **shell script** is a text file containing commands for a shell interpreter (here, **bash**), executed in sequence, with variables, conditions, loops and functions for control.

Key words:

- **Shebang** — the first line, `#!/usr/bin/env bash`, naming the interpreter.
- **Exit status** (exit code) — the number a command returns: `0` for success, anything else for failure.
- **Variable** — a named value: `name="Sara"`, used as `"$name"`.
- **Positional parameters** — arguments given to a script or function: `$1`, `$2`, `$@`, `$#`.
- **Command substitution** — capturing a command's output: `$(date +%F)`.
- **Quoting** — `"double quotes"` keep a value as one word while expanding variables; `'single quotes'` keep text literally.
- **Test** — a condition such as `[[ -f "$file" ]]` (file exists) or `[[ "$a" == "$b" ]]`.
- **Function** — a named group of commands inside a script.
- **trap** — a command that runs on exit or on signals, used for cleanup.
- **Strict mode** — `set -euo pipefail`: stop on errors, on unset variables, and on failures inside pipelines.

## A first safe script

### Level 1 — Shebang, strict mode, variables

```bash
mkdir -p ~/scripts && cd ~/scripts
cat > greet.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

shop_name="Corner Shop"
today="$(date -u +%Y-%m-%d)"
customer="${1:-friend}"            # first argument, or "friend" if none was given

echo "Hello, ${customer}! Welcome to ${shop_name}."
echo "Script name: $0, arguments: $#"
[[ -n "$today" ]] && echo "Today has a date, as expected."
EOF
chmod +x greet.sh
./greet.sh
./greet.sh "Sara Khan"
```

**Output:**

```text
Hello, friend! Welcome to Corner Shop.
Script name: ./greet.sh, arguments: 0
Today has a date, as expected.
Hello, Sara Khan! Welcome to Corner Shop.
Script name: ./greet.sh, arguments: 1
Today has a date, as expected.
```

- **`#!/usr/bin/env bash`** finds bash on the `PATH` — more portable than hard-coding `/bin/bash`. Scripts that need bash features must not be run with `sh`, which may be a simpler shell.
- **`set -euo pipefail`** — the safety line every script should start with:
  - `-e`: exit as soon as a command fails;
  - `-u`: treat use of an unset variable as an error;
  - `-o pipefail`: a pipeline fails if **any** command in it fails, not only the last.
- **Variables** are assigned without spaces (`name="value"`) and used with `$`, ideally as `"${name}"` — braces mark where the name ends, quotes keep the value as one word.
- **`"$(command)"`** captures output (here, today's date in UTC).
- **`${1:-friend}`** uses the first argument, or a default when it is missing or empty. `$0` is the script's name and `$#` the number of arguments.
- `"Sara Khan"` was quoted, so it arrived as **one** argument (`$# = 1`); unquoted, it would be two.

### Level 2 — Why quoting matters

```bash
cd ~/scripts
mkdir -p demo && touch "demo/old report.txt" demo/notes.txt
file="demo/old report.txt"
ls $file 2>&1 || true
ls "$file"
for f in demo/*; do echo "found: $f"; done
```

**Output:**

```text
ls: cannot access 'demo/old': No such file or directory
ls: cannot access 'report.txt': No such file or directory
demo/old report.txt
found: demo/notes.txt
found: demo/old report.txt
```

- **Unquoted** `$file` was split at the space into two arguments, `demo/old` and `report.txt`, neither of which exists. In a `rm` command, that splitting can delete the wrong files.
- **Quoted** `"$file"` stays one argument.
- **Globs** (`demo/*`) expand to file names safely, one per loop iteration, even with spaces — as long as the loop variable is quoted when used.
- `|| true` lets the demonstration continue despite the failure; in real scripts, avoid hiding errors this way.

The rule: **always quote variable expansions** (`"$var"`, `"$@"`, `"$(cmd)"`) unless you specifically want word splitting. Tools such as **ShellCheck** catch unquoted variables and dozens of other mistakes — run it on every script, locally and in CI.

## Making decisions

### Level 2 — Exit codes, `if` and tests

Every command returns an **exit status**: `0` means success. `if` runs a command and branches on its status:

```bash
cd ~/scripts
cat > check.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

path="${1:?usage: check.sh <path>}"     # stop with a message if no argument

if [[ -d "$path" ]]; then
  echo "$path is a directory with $(find "$path" -maxdepth 1 -type f | wc -l) file(s)"
elif [[ -f "$path" ]]; then
  echo "$path is a file of $(wc -c < "$path") bytes"
else
  echo "$path does not exist" >&2
  exit 1
fi

if grep -q "ERROR" "$path" 2>/dev/null; then
  echo "it contains errors"
fi
EOF
chmod +x check.sh
printf 'INFO ok\nERROR failed\n' > app.log
./check.sh demo
./check.sh app.log
./check.sh missing.txt; echo "exit status: $?"
./check.sh 2>&1 || true
```

**Output:**

```text
demo is a directory with 2 file(s)
app.log is a file of 21 bytes
it contains errors
missing.txt does not exist
exit status: 1
./check.sh: line 4: 1: usage: check.sh <path>
```

- **`[[ … ]]`** is bash's test command: `-d` (directory exists), `-f` (regular file exists), `-e` (exists), `-s` (non-empty), `-x` (executable), `-z` (string empty), `-n` (string not empty), `==` and `!=` for strings, `=~` for regular expressions, and `-eq`, `-lt`, `-gt` for numbers (or `(( count > 5 ))` for arithmetic).
- **`grep -q`** prints nothing and only sets its exit status — perfect for `if`.
- **Errors go to stderr** (`>&2`), and the script **exits with a non-zero status** (`exit 1`). Callers — other scripts, CI, cron — rely on exit codes to detect failure.
- **`${1:?message}`** stops the script with a message when a required argument is missing.
- `$?` holds the exit status of the last command.

`case` matches a value against patterns — clearer than long `if` chains:

```bash
# fragment
case "$environment" in
  production) url="https://api.cornershop.example" ;;
  staging)    url="https://staging-api.cornershop.example" ;;
  dev|local)  url="http://localhost:3000" ;;
  *)          echo "unknown environment: $environment" >&2; exit 2 ;;
esac
```

## Repeating work

### Level 2 — Loops and arrays

```bash
cd ~/scripts
services=("api" "worker" "scheduler")
for service in "${services[@]}"; do
  echo "checking ${service}..."
done
echo "number of services: ${#services[@]}"

for i in {1..3}; do echo "attempt $i"; done

printf 'TEA-GRN,40\nCOF-BNS,0\nSNK-OAT,60\n' > stock.csv
while IFS=, read -r sku qty; do
  if (( qty == 0 )); then echo "$sku is out of stock"; fi
done < stock.csv
```

**Output:**

```text
checking api...
checking worker...
checking scheduler...
number of services: 3
attempt 1
attempt 2
attempt 3
COF-BNS is out of stock
```

- **Arrays**: `services=(…)`; iterate with `"${services[@]}"` (quoted, so each element stays whole); `${#services[@]}` is the count.
- **Brace expansion** `{1..3}` generates sequences.
- **`while IFS=, read -r a b`** reads a file line by line, splitting on commas into variables — the standard way to process files (`-r` keeps backslashes literal). Never loop over `$(cat file)`, which splits on spaces, not lines.
- **`(( … ))`** does integer arithmetic and comparisons.

## Functions, arguments and errors

### Level 3 — A real script: backups with rotation

Here is the kind of script teams really keep: back up a directory into a dated archive, keep only the newest N archives, log what happens, clean up temporary files even on failure, and accept options:

```bash
cd ~/scripts
cat > backup.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $(basename "$0") [-k KEEP] [-n] SOURCE_DIR DEST_DIR
  -k KEEP   number of backups to keep (default 3)
  -n        dry run: show what would happen
USAGE
}

log() { printf '[%s] %s\n' "backup" "$*" >&2; }

keep=3
dry_run=false
while getopts ":k:nh" opt; do
  case "$opt" in
    k) keep="$OPTARG" ;;
    n) dry_run=true ;;
    h) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))
[[ $# -eq 2 ]] || { usage >&2; exit 2; }
source_dir="$1"; dest_dir="$2"
[[ -d "$source_dir" ]] || { log "source '$source_dir' not found"; exit 1; }
[[ "$keep" =~ ^[0-9]+$ && "$keep" -ge 1 ]] || { log "KEEP must be a positive number"; exit 2; }

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT                 # always clean up, even if a later command fails

stamp="${BACKUP_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
archive="$dest_dir/backup-$stamp.tar.gz"

if $dry_run; then
  log "would create $archive"
else
  mkdir -p "$dest_dir"
  tar -czf "$workdir/backup.tar.gz" -C "$source_dir" .
  mv "$workdir/backup.tar.gz" "$archive"       # appears only when complete
  log "created $(basename "$archive")"
fi

# Rotate: delete all but the newest $keep archives
mapfile -t old < <(ls -1 "$dest_dir"/backup-*.tar.gz 2>/dev/null | sort -r | tail -n +$((keep + 1)))
for f in "${old[@]}"; do
  if $dry_run; then log "would delete $(basename "$f")"; else rm -- "$f"; log "deleted $(basename "$f")"; fi
done
EOF
chmod +x backup.sh
mkdir -p ~/shopdata && echo "orders" > ~/shopdata/orders.csv
for stamp in 20261116T020000Z 20261117T020000Z 20261118T020000Z 20261119T020000Z 20261120T020000Z; do
  BACKUP_STAMP=$stamp ./backup.sh -k 3 ~/shopdata ~/backups
done
ls ~/backups
```

**Output:**

```text
[backup] created backup-20261116T020000Z.tar.gz
[backup] created backup-20261117T020000Z.tar.gz
[backup] created backup-20261118T020000Z.tar.gz
[backup] created backup-20261119T020000Z.tar.gz
[backup] deleted backup-20261116T020000Z.tar.gz
[backup] created backup-20261120T020000Z.tar.gz
[backup] deleted backup-20261117T020000Z.tar.gz
backup-20261118T020000Z.tar.gz
backup-20261119T020000Z.tar.gz
backup-20261120T020000Z.tar.gz
```

Walk through the important parts:

- **Functions** (`usage`, `log`) name repeated steps. `"$*"` joins a function's arguments into one string; `"$@"` passes them along separately.
- **Logging to stderr** (`>&2`) keeps messages out of stdout, so a script's real output can be piped elsewhere.
- **`getopts`** parses short options: `-k 3` sets `keep`, `-n` enables dry run, `-h` prints help; unknown options print usage and exit with status `2` (a common convention for usage errors). `shift` removes the parsed options, leaving the positional arguments.
- **Validation** checks the argument count, that the source exists, and that `KEEP` is a positive number — before doing anything.
- **`mktemp -d`** creates a unique temporary directory, and **`trap '…' EXIT`** deletes it however the script ends — success, failure under `set -e`, or Ctrl+C.
- **Atomic result**: the archive is built in the temporary directory and moved into place only when complete, so a crash never leaves a half-written backup that looks valid.
- **Rotation**: list backups, sort newest first, skip the first `KEEP`, delete the rest. `rm --` stops a file name beginning with `-` from being treated as an option.
- **`BACKUP_STAMP`** lets the example run five "nights" in a row with fixed dates; normally the current time is used.
- Five runs produced five backups; rotation kept the newest three, deleting the two oldest along the way.

A dry run shows what would happen without changing anything:

```bash
cd ~/scripts
BACKUP_STAMP=20261121T020000Z ./backup.sh -n -k 2 ~/shopdata ~/backups
./backup.sh -k zero ~/shopdata ~/backups; echo "exit status: $?"
```

**Output:**

```text
[backup] would create /home/learner/backups/backup-20261121T020000Z.tar.gz
[backup] would delete backup-20261118T020000Z.tar.gz
[backup] KEEP must be a positive number
exit status: 2
```

Dry-run modes, input validation and clear exit codes are what make scripts safe to run in production — and in cron jobs, where nobody is watching ({{ch:cron-jobs}}).

### Level 3 — Retrying and waiting

Scripts often wait for something to become ready — a database after a container starts, a service after a deployment:

```bash
cd ~/scripts
cat > retry.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# retry <attempts> <delay-seconds> <command...>
retry() {
  local attempts="$1" delay="$2"; shift 2
  local n=1
  until "$@"; do
    if (( n >= attempts )); then echo "failed after $n attempts: $*" >&2; return 1; fi
    echo "attempt $n failed, retrying in ${delay}s..." >&2
    sleep "$delay"; n=$((n + 1))
  done
}

ready_after=3; calls=0
fake_health_check() { calls=$((calls + 1)); (( calls >= ready_after )); }

retry 5 0 fake_health_check && echo "service is healthy after $calls checks"
retry 2 0 false || echo "gave up, as expected"
EOF
chmod +x retry.sh
./retry.sh
```

**Output:**

```text
attempt 1 failed, retrying in 0s...
attempt 2 failed, retrying in 0s...
service is healthy after 3 checks
attempt 1 failed, retrying in 0s...
failed after 2 attempts: false
gave up, as expected
```

- `local` keeps variables inside the function.
- `until command; do … done` repeats while the command **fails**; `"$@"` runs the remaining arguments as a command, preserving each argument exactly.
- In real use, the command would be `curl -fsS http://localhost:3000/health` or `pg_isready -h db`, with a delay of a few seconds — and exponential backoff for anything calling external services ({{ch:queues}}).
- A function's exit status works with `&&` and `||` just like a command's.

## Scripts in practice

### Level 3 — Conventions that keep scripts maintainable

- Start every script with the **shebang and `set -euo pipefail`**; run **ShellCheck** in CI.
- **Quote everything**; use `[[ ]]` for tests and `$(…)` for command substitution (not backticks).
- Make scripts **idempotent** where possible — safe to run twice (`mkdir -p`, checking before creating) ({{ch:rest-apis}}).
- Provide **`-h` usage**, validate inputs, offer **dry runs** for destructive actions.
- Send logs to **stderr**, results to stdout, and **exit with meaningful codes**.
- Never put **secrets** in scripts; read them from the environment or a secrets manager ({{ch:secrets-manager}}), and avoid `set -x` (command tracing) around them, which prints values.
- Keep scripts in the repository, reviewed like code.

### Level 4 — When to stop using bash

Bash is excellent for gluing commands together. It is a poor choice when a script needs complex data structures, parsing JSON beyond `jq` one-liners, careful error handling across many steps, unit tests, or more than a few hundred lines. At that point, rewrite it in TypeScript/Node.js, Python or Go — languages with real data types, libraries and testing. Many teams also replace deployment scripts with declarative tools (CI pipelines, Terraform, Kubernetes manifests), keeping bash for small, focused tasks.

## From beginner to enterprise

**Level 1–2 — first scripts.** Shebang, variables, arguments, `if` and loops; running commands in sequence; quoting.

**Level 3 — reliable scripts.** Strict mode, functions, `getopts`, validation, exit codes, logging to stderr, `trap` cleanup, temporary directories, dry runs, retries; ShellCheck.

**Level 4 — production scripts.** Idempotent automation in CI and cron; atomic file operations; locking to prevent concurrent runs (`flock`); secrets from the environment; monitoring of scheduled scripts with heartbeats ({{ch:cron-jobs}}).

**Level 5 — senior practice.** Knowing when to replace scripts with code or declarative tooling; shared script libraries with tests (bats); standard templates.

**Level 6 — enterprises.** Automation platforms and runbooks-as-code; audited execution of operational scripts; policies forbidding ad-hoc production changes.

## Real-world use cases

### Nightly database backup

- **Script**: `pg_dump` the database to a temporary file, compress, upload to object storage with a dated name, verify the upload, rotate old backups, ping a heartbeat URL on success; strict mode and `trap` cleanup; credentials from the environment; run by cron or a scheduler ({{ch:postgresql}}).

### Container entrypoint

- **Script**: wait for the database with `retry`, run migrations, then `exec node dist/server.js` — `exec` replaces the shell with the Node process so it receives signals directly and shuts down gracefully ({{ch:docker}}).

## Common mistakes

### Beginner: no `set -euo pipefail`

**Consequence:** scripts continue after failures, with empty variables. **Fix:** strict mode on line 2.

### Beginner: unquoted variables

**Consequence:** word splitting and glob expansion on spaces and wildcards. **Fix:** `"$var"` always.

### Beginner: `for line in $(cat file)`

**Fix:** `while IFS= read -r line; do …; done < file`.

### Intermediate: ignoring exit codes

**Fix:** check results; exit non-zero on failure; log to stderr.

### Intermediate: temporary files left behind

**Fix:** `mktemp` plus `trap … EXIT`.

### Intermediate: hard-coded paths and secrets

**Fix:** arguments, environment variables and a secrets manager.

### Production: destructive commands without validation

`rm -rf "$DIR/"*` with an empty `$DIR`. **Fix:** `set -u`, `${DIR:?}`, validation and dry runs.

### Production: thousand-line bash programs

**Fix:** rewrite in a programming language with tests.

## Debugging and troubleshooting

- **"unbound variable"**: `set -u` caught an unset variable — provide a default (`${VAR:-default}`) or fix the caller.
- **Script stops silently**: `set -e` exited on a failing command — run with `bash -x script.sh` to trace each command, or add an `ERR` trap that prints the failing line (`trap 'echo "failed at line $LINENO" >&2' ERR`).
- **"bad interpreter: /bin/bash^M"**: the file has Windows line endings — convert with `dos2unix` and configure Git to keep LF for scripts.
- **"Permission denied" running `./script.sh`**: missing execute bit — `chmod +x`.
- **Works in the terminal, fails in cron**: cron has a minimal `PATH` and environment — use absolute paths or set `PATH` at the top of the script.
- **Unexpected word splitting**: run ShellCheck; it points to the exact unquoted expansion.

## Security summary

- **Quote variables and validate input** — especially anything used in `rm`, `mv` or command arguments.
- **Never `eval` untrusted input**; avoid building commands as strings.
- **Keep secrets out of scripts, arguments and logs** (process lists show arguments; `set -x` prints values).
- **Use `mktemp`** for temporary files instead of predictable names in `/tmp`.
- **Pin and verify downloads** in scripts (checksums) rather than `curl | bash` from the internet.
- **Run with the least privilege needed**; use `sudo` only for specific commands.

## How a senior engineer thinks about this

- **Fail loudly and early.** Strict mode, validation and exit codes turn silent corruption into visible errors.
- **Quote by default.** Word splitting is a bug until proven otherwise.
- **Leave no mess.** Traps clean up; results appear atomically.
- **Safe to run twice.** Idempotence and dry runs make scripts trustworthy in automation.
- **Know the limit.** Bash glues commands; real programs belong in real languages.

## Exercises

These run in the same session as the chapter's examples.

### Exercise 1 — Count log levels

**Objective:** practise loops and conditions.
**What to write:** a script `levels.sh` that takes a log file and prints how many lines contain `INFO`, `WARN` and `ERROR`, exiting with status `1` if there is at least one error.

<details>
<summary>Show the solution</summary>

```bash
cd ~/scripts
cat > levels.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
file="${1:?usage: levels.sh <logfile>}"
[[ -f "$file" ]] || { echo "no such file: $file" >&2; exit 2; }

errors=0
for level in INFO WARN ERROR; do
  count="$(grep -c "$level" "$file" || true)"     # grep -c exits 1 when the count is 0
  echo "$level: $count"
  [[ "$level" == "ERROR" ]] && errors="$count"
done
(( errors == 0 ))
EOF
chmod +x levels.sh
printf 'INFO start\nWARN slow query\nINFO ok\nERROR timeout\n' > sample.log
./levels.sh sample.log; echo "exit status: $?"
```

**Output:**

```text
INFO: 2
WARN: 1
ERROR: 1
exit status: 1
```

**Walkthrough:** `grep -c` prints the count but **exits with 1 when the count is zero** (as for `WARN` in a clean log), which would stop the script under `set -e`; `|| true` handles that one expected case. The last line, `(( errors == 0 ))`, is the script's final command, so its result becomes the exit status: `1` here, because there was an error — making the script usable in CI or monitoring checks.

</details>

### Exercise 2 — Review a script

**Objective:** practise spotting dangerous patterns.
**The script:** `#!/bin/sh` / `DIR=$1` / `cd $DIR` / `rm -rf *` / `echo "cleaned $DIR"`. List the problems and write a safe version.

<details>
<summary>Show the solution</summary>

**Problems**
1. No strict mode: if `cd` fails (missing or wrong directory), the script continues and runs `rm -rf *` in **whatever directory it is in** — potentially home or `/`.
2. No argument check: with no argument, `cd $DIR` becomes `cd` — the home directory — and the script deletes everything there.
3. Unquoted `$DIR`: spaces in the path break it.
4. `#!/bin/sh` while potentially relying on bash features later.
5. No confirmation, dry run or logging.

**Safe version**

```bash
# fragment
#!/usr/bin/env bash
set -euo pipefail
dir="${1:?usage: clean.sh <directory>}"
[[ -d "$dir" ]] || { echo "not a directory: $dir" >&2; exit 2; }
[[ "$dir" == /var/cache/cornershop/* ]] || { echo "refusing to clean outside /var/cache/cornershop" >&2; exit 2; }
find "$dir" -mindepth 1 -delete
echo "cleaned $dir" >&2
```

`${1:?}` fails without an argument; the directory is checked and restricted to an allowed location; `find -mindepth 1 -delete` removes contents without `cd` or globbing.

</details>

### Exercise 3 — Production scenario: the backup that "succeeded"

**Objective:** practise reasoning about pipelines and exit codes.
**The scenario:** a cron job runs `pg_dump cornershop | gzip > /backups/db.sql.gz && echo OK`. Monitoring shows "OK" every night, but when a restore is needed, the backup file is a few bytes long. Explain why and fix the script.

<details>
<summary>Show the solution</summary>

**Why:** without `pipefail`, a pipeline's exit status is the **last** command's — `gzip`, which happily compresses empty input and succeeds. `pg_dump` had been failing (wrong password, unreachable host), its error went to cron's mail or nowhere, and the script reported success every night.

**Fix:**

```bash
# fragment
#!/usr/bin/env bash
set -euo pipefail
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
pg_dump --format=custom cornershop > "$tmp"           # fails loudly if pg_dump fails
[[ -s "$tmp" ]] || { echo "empty dump" >&2; exit 1; }
pg_restore --list "$tmp" > /dev/null                  # verify the archive is readable
mv "$tmp" "/backups/db-$(date -u +%Y%m%dT%H%M%SZ).dump"
curl -fsS "$HEARTBEAT_URL" > /dev/null                # report success only after verification
```

`pipefail` (and avoiding the pipe) makes failures visible; the size and `pg_restore --list` checks verify the result; the heartbeat fires only on real success, so monitoring alerts when backups fail ({{ch:cron-jobs}}). And test restores regularly ({{ch:postgresql}}).

</details>

## Summary

Shell scripts turn command sequences into repeatable procedures, and bash is everywhere — CI, containers, cron, servers. Safe scripts start with **`#!/usr/bin/env bash`** and **`set -euo pipefail`** (stop on errors, on unset variables, and on failures anywhere in a pipeline), and **quote every expansion** to avoid word splitting. Variables, positional parameters (`$1`, `$@`, `$#`), defaults (`${1:-x}`), required arguments (`${1:?msg}`) and command substitution (`$(…)`) carry data.

Decisions use exit statuses: `if` with `[[ … ]]` tests, `grep -q`, `case`; repetition uses `for` over arrays and globs, brace expansion, and `while IFS= read -r` for files, with `(( … ))` for arithmetic. **Functions** organise scripts (`local` variables, `"$@"` to pass arguments); **`getopts`** parses options; input is validated up front; messages go to stderr; scripts exit with meaningful codes. **`mktemp`** and **`trap … EXIT`** guarantee cleanup; results are moved into place atomically; **dry runs** and retries with `until` make automation safe.

Run **ShellCheck**, keep scripts idempotent and in version control, keep secrets out of them, and switch to a real programming language when a script outgrows gluing commands together.

## Key terms

- **Shell script** — A file of shell commands executed in sequence by an interpreter such as bash.
- **bash** — The most common Linux shell and scripting language.
- **Shebang** — The first line of a script naming its interpreter, such as `#!/usr/bin/env bash`.
- **Exit status** — The number a command returns; `0` means success.
- **Strict mode** — `set -euo pipefail`, which stops scripts on errors, unset variables and pipeline failures.
- **Variable expansion** — Replacing `$name` with the variable's value.
- **Quoting** — Using quotes so a value stays one word and special characters are not interpreted.
- **Word splitting** — The shell breaking unquoted expansions into separate words at spaces.
- **Glob** — A filename pattern such as `*.log` that the shell expands to matching names.
- **Positional parameters** — `$1`, `$2`, … : arguments passed to a script or function.
- **Command substitution** — Capturing a command's output with `$(…)`.
- **Parameter default** — `${var:-default}` substituting a value when a variable is unset or empty.
- **Test expression** — A condition evaluated by `[[ … ]]`, such as file existence or string comparison.
- **Array (bash)** — A list of values in one variable, accessed with `"${arr[@]}"`.
- **Function (bash)** — A named group of commands with its own arguments.
- **getopts** — A bash built-in for parsing command-line options.
- **trap** — A command that runs code on exit or when a signal arrives.
- **mktemp** — A command creating a unique temporary file or directory.
- **Idempotent script** — A script that is safe to run more than once with the same result.
- **Dry run** — A mode that shows what a script would do without doing it.
- **ShellCheck** — A static analysis tool that finds bugs and risky patterns in shell scripts.
- **here-document** — Inline multi-line text passed to a command with `<<'EOF'`.

## What comes next

Scripts and servers talk to each other over networks. The next chapter, {{ch:networking}}, explains how: IP addresses and subnets, TCP and UDP, ports, the layers of the network stack, how an HTTP request travels from a browser to a server, firewalls and load balancers, and the tools for diagnosing network problems.
