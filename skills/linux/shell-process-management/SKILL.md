---
name: shell-process-management
description: Manages Linux background processes, parallel execution, and job control
  using &, jobs, fg, bg, wait, xargs -P, and GNU parallel for shell scripting.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  triggers: shell background processes, parallel execution, job control, fg bg jobs
    wait, xargs P flag, background shell, process management
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: linux-services, linux-filesystem
------
# Linux Shell Process Management

Infrastructure engineer managing Linux background processes, parallel execution, and interactive job control using shell builtins (`&`, `jobs`, `fg`, `bg`, `wait`), signal handling with `trap`, batch parallelism with `xargs -P`, and GNU `parallel` for efficient multi-core work distribution.

## TL;DR Checklist

- [ ] Use `set -euo pipefail` in every shell script to catch failures early
- [ ] Capture PIDs immediately after backgrounding with `$!` and store them for later management
- [ ] Always trap `SIGTERM`, `SIGHUP`, and `SIGINT` before spawning background workers that create temp files or locks
- [ ] Use `wait $PID` (not bare `wait`) to detect individual background process exit codes
- [ ] Prefer `xargs -P` for simple parallel file operations; prefer GNU `parallel` for complex multi-stage pipelines
- [ ] Never ignore the exit status of background processes — always collect and report failures
- [ ] Use PID files with atomic writes (`mktemp + mv`) for daemons that must survive session logout

---

## When to Use

Use this skill when:

- **Running a long-running command non-interactively** — You need to start a process (backup, build, export) and continue using the terminal
- **Processing many files in parallel** — You have a directory of 500 log files to compress, or thousands of images to resize, and sequential execution is too slow
- **Launching multiple independent jobs from a script** — A deployment script needs to start several services or run tests concurrently while tracking all exit codes
- **Interactively managing running background jobs** — You started something with `&` in an interactive shell and need to bring it to the foreground, suspend it again, or check its status
- **Building a lightweight daemon process** — You need a script that runs persistently in the background with proper signal handling, PID file management, and clean shutdown (no systemd available)
- **Distributing work across all CPU cores** — You have embarrassingly parallel tasks (encoding, rendering, data transformation) and want to utilize 100% of available CPU

---

## When NOT to Use

Avoid this skill for:

- **Production daemon processes** — Use `systemd` (`linux-services`) for services that must survive reboots, handle dependency ordering, and integrate with system monitoring. Shell backgrounding has no restart policy or dependency management
- **Tasks requiring resource isolation or cgroup limits** — If you need CPU/memory bounds per process, use systemd slices or Docker containers instead of bare shell processes
- **Complex pipeline orchestration with dependencies between jobs** — Use dedicated workflow engines (Airflow, Makefile with proper targets) when job B depends on job A's output. Shell parallelism treats all tasks as independent by default
- **Session-critical interactive work** — If a backgrounded process needs the terminal for interactive input, backgrounding will fail (SIGTTIN/SIGTTOU). Use `tmux` or `screen` instead to detach from an existing session

---

## Core Workflow

### 1. Assess the Parallelism Model

Determine whether your workload fits single-process parallelism (`xargs -P`, simple `&`/`wait`) or requires task-level job control (`fg`, `bg`, `jobs`). File-processing tasks map to batch tools; interactive process management maps to job control.

**Checkpoint:** Identify the maximum concurrency level (number of CPU cores, I/O bottleneck, or memory constraint) and whether tasks are independent or have implicit ordering.

### 2. Choose the Execution Mechanism

Select the appropriate tool based on workload characteristics:

- Simple one-off backgrounding → `&` + `$!` + `wait`
- Interactive session management → `fg`, `bg`, `jobs`
- Batch file operations → `xargs -P` or GNU `parallel --joblog`
- Persistent background daemon → `trap` + PID file + signal routing
- CPU-bound parallel work → GNU `parallel --jobs +0`

**Checkpoint:** Verify the chosen tool supports tracking exit codes. A background job that silently fails is worse than a sequential one.

### 3. Implement with Signal Safety

Every backgrounded process or spawned worker must have a shutdown path. If a script spawns children, it must trap signals and forward them to those children so all processes terminate cleanly together.

**Checkpoint:** Confirm every `trap` handler runs cleanup before calling `exit`. Test by sending `SIGTERM` (kill) to the parent and verifying no orphaned child processes remain.

### 4. Collect Results from Parallel Execution

Never start parallel tasks without a collection strategy. Use named pipes, temp files, or associative arrays to gather exit codes and output from each worker. A single failure among 50 parallel jobs must not go unnoticed.

**Checkpoint:** Validate that your result-collection mechanism handles the case where workers finish in non-deterministic order and writes can interleave.

### 5. Verify Clean Termination and Cleanup

After all work completes, confirm no stale PID files, lock files, or temp directories remain. Check that all exit codes were collected and reported.

**Checkpoint:** Run `ps --ppid <pid>` to verify no orphan processes survive. Remove every temporary artifact the script created.

---

## Implementation Patterns

### Pattern 1: Basic Background Execution (&)

Run a command in the background, track its PID, monitor with `jobs`, and wait for completion while capturing the exit code.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Launch a long-running backup in the background ──────────────────
echo "Starting full backup..."
tar -czf /tmp/backup_$(date +%Y%m%d_%H%M%S).tar.gz \
     -C /data . &          # The & forks the process into the background
BACKUP_PID=$!             # $! captures the PID of the last backgrounded job

echo "Backup started with PID ${BACKUP_PID}"

# ── Monitor the background job using the jobs builtin ───────────────
sleep 2                   # Give it a moment to start
jobs -l                   # Lists all jobs with their PIDs
# Output example: [1]+ 12345 Running    tar -czf /tmp/backup_20260519_143000.tar.gz

# ── Wait for the specific background process and capture its exit code ─
if wait $BACKUP_PID; then
    echo "Backup completed successfully (PID ${BACKUP_PID})."
else
    EXIT_CODE=$?
    echo "ERROR: Backup failed with exit code ${EXIT_CODE} (PID ${BACKUP_PID})." >&2
    exit "$EXIT_CODE"
fi

# ── Cleanup verification ───────────────────────────────────────────
if [[ ! -f "/tmp/backup_*.tar.gz" ]]; then
    echo "WARNING: Backup file not found after wait returned success." >&2
fi
```

**Explanation:** The `&` operator forks the preceding command, returning control to the shell immediately. The shell assigns `$!` with the child's PID so we can explicitly `wait` on it (rather than a bare `wait` which waits for all background jobs). This pattern is essential: without storing `$!`, there is no way to check the exit status of an individual backgrounded process, because `jobs -l` only shows state (`Running`, `Done`, `Stopped`) but never the exit code.

**BAD example — losing the PID:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# ❌ BAD: $! is overwritten by sleep, so we can never check tar's exit code
tar -czf /tmp/backup.tar.gz -C /data . &
sleep 10                  # $! now holds sleep's PID, not tar's
wait                      # Waits for ALL jobs, but we lost the specific PID

# We have no idea if tar succeeded or failed — tar's exit code is silently consumed
```

---

### Pattern 2: Job Control (fg, bg, jobs, kill)

Interactively manage running background processes: list them, switch between foreground and background, and send signals.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Start multiple background jobs ─────────────────────────────────
echo "Starting 3 workers..."
sleep 120 &   # Job 1: long sleep
PID_A=$!
jobs -l       # Show initial job list with PIDs

sleep 60 &    # Job 2: medium sleep
PID_B=$!
jobs -l

sleep 30 &    # Job 3: short sleep
PID_C=$!
jobs -l

# ── List all jobs with full details ────────────────────────────────
# jobs -lp shows PIDs for all background jobs:
#   [1]  PID_A Running
#   [2]  PID_B Running
#   [3]  PID_C Running
echo ""
echo "=== All Jobs ==="
jobs -l

# ── Bring a specific job to the foreground by job number ───────────
# In an interactive shell you would run: fg %1
# In a script, we use kill/signal instead (fg/bg are interactive-only)
# To send SIGCONT to a suspended job: kill -CONT %2

# ── Suspend and resume a background job ────────────────────────────
kill -STOP $PID_A   # Suspend (same as Ctrl+Z)
echo "Job 1 suspended."
jobs -l             # Shows: [1]  PID_A Stopped

kill -CONT $PID_A   # Resume (same as 'bg' or 'fg')
echo "Job 1 resumed."

# ── Send signals to background jobs ────────────────────────────────
# Graceful shutdown: send SIGTERM to a specific job
kill -TERM $PID_C
wait $PID_C 2>/dev/null || true
echo "Job 3 terminated gracefully (PID ${PID_C})."

# ── Force-kill if SIGTERM doesn't work ─────────────────────────────
if kill -0 $PID_A 2>/dev/null; then
    echo "Job 1 still alive. Sending SIGKILL."
    kill -9 $PID_A
fi

wait 2>/dev/null || true   # Wait for any remaining jobs
echo "All jobs cleaned up."
```

**Explanation:** `jobs -l` is the single most useful command for inspecting background state — it lists job numbers, PIDs, and current status (`Running`, `Stopped`, `Done`) in one line. In interactive shells, `fg %N` brings job N to the foreground and `bg %N` resumes a stopped job in the background. In scripts (non-interactive), you must use `kill` signals directly since `fg`/`bg` only work in interactive shells attached to a terminal. The `kill -STOP` / `kill -CONT` pair mirrors the `Ctrl+Z` / `fg` interaction.

**Key job control flags:**
| Flag | Meaning |
|------|---------|
| `jobs -l` | List jobs with PIDs and status |
| `jobs -p` | List only PIDs (useful for scripting) |
| `jobs -n` | List only jobs that have changed status since last notification |
| `fg %1` | Bring job 1 to foreground (interactive only) |
| `bg %1` | Resume stopped job 1 in background (interactive only) |
| `kill -STOP $PID` | Suspend a process by PID |
| `kill -CONT $PID` | Resume a suspended process by PID |

---

### Pattern 3: Parallel Execution with xargs -P

Process many files in parallel using `xargs -P`, which splits input lines into batches of concurrent worker processes.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────
INPUT_DIR="${1:-/var/log}"
WORKERS="${2:-$(nproc)}"   # Default to all available CPU cores
RESULTS_FILE=$(mktemp /tmp/xargs-results.XXXXXX)
LOCK_FILE=$(mktemp /tmp/xargs-lock.XXXXXX)

# ── Cleanup trap ───────────────────────────────────────────────────
cleanup() {
    rm -f "$RESULTS_FILE" "$LOCK_FILE"
}
trap cleanup EXIT INT TERM

echo "Processing files in '${INPUT_DIR}' with ${WORKERS} parallel workers..."

# ── Function that processes a single file ──────────────────────────
process_file() {
    local filepath="$1"
    local filename
    filename=$(basename "$filepath")

    # Simulate work: compress the log file if it's text-based
    if file --mime-type -b "$filepath" | grep -q 'text/'; then
        gzip -9 -c "$filepath" > "${filepath}.gz" 2>/dev/null && \
            STATUS="OK" || STATUS="FAIL"
    else
        STATUS="SKIP (binary)"
    fi

    # Thread-safe write to results file using a lock
    (
        flock -x 200
        echo "${STATUS} | ${filename}" >> "$RESULTS_FILE"
    ) 200>"$LOCK_FILE"
}
export -f process_file   # Required for xargs -P to inherit the function

# ── Parallel execution using xargs -P ──────────────────────────────
# Find all files, pass them through xargs which spawns up to $WORKERS concurrent workers
find "$INPUT_DIR" -maxdepth 1 -type f \
    | sort \
    | xargs -P "$WORKERS" -I {} bash -c 'process_file "$@"' _ {}

# ── Analyze results ────────────────────────────────────────────────
TOTAL=$(wc -l < "$RESULTS_FILE")
OK_COUNT=$(grep -c '^OK' "$RESULTS_FILE" || true)
FAIL_COUNT=$(grep -c '^FAIL' "$RESULTS_FILE" || true)

echo ""
echo "=== Parallel Processing Summary ==="
echo "Total files processed : ${TOTAL}"
echo "Successfully processed: ${OK_COUNT}"
echo "Failed               : ${FAIL_COUNT}"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
    echo ""
    echo "Failed files:"
    grep '^FAIL' "$RESULTS_FILE" | while IFS='|' read -r _ fname; do
        echo "  ❌ ${fname}"
    done
    exit 1
fi

echo ""
echo "All ${TOTAL} files processed successfully."
```

**Explanation:** `xargs -P N` is the simplest parallel execution tool available on virtually every Linux system (it's part of GNU findutils, not a separate install). The `-P` flag tells xargs to spawn up to N concurrent processes. Key points: the worker function must be exported (`export -f`) so child bash processes inherit it; file writes from concurrent workers need locking (`flock`) to avoid interleaved output; and `xargs -I {}` replaces each input line as a single argument to the command.

**BAD example — ignoring parallel exit codes:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# ❌ BAD: xargs returns 0 if ANY invocation succeeds, not ALL
find . -name "*.log" | xargs -P 4 gzip

# If one file fails to compress, xargs still exits 0 and the script continues as if everything worked.
# The compressed output is missing, but no failure is reported.

# ✅ GOOD: Check each file individually with a wrapper that reports failures
find . -name "*.log" | sort | xargs -P "$(nproc)" -I {} bash -c '
    if gzip "$1"; then
        echo "OK: $1"
    else
        echo "FAIL: $1" >&2
        exit 1
    fi
' _ {}
```

---

### Pattern 4: Background Service with Signal Handling (trap)

Create a long-running background daemon that handles signals properly, writes a PID file for management, and performs clean shutdown. This is the standard pattern when you need a persistent process without systemd.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────
PID_FILE="/tmp/my-daemon.pid"
LOG_FILE="/var/log/my-daemon.log"
WORK_INTERVAL="${DAEMON_INTERVAL:-5}"   # Seconds between work cycles

# ── PID file management (atomic write to avoid race conditions) ───
write_pid_file() {
    local tmpfile
    tmpfile=$(mktemp "${PID_FILE}.XXXXXX")
    echo $$ > "$tmpfile"
    mv -f "$tmpfile" "$PID_FILE"           # Atomic rename guarantees PID consistency
}

cleanup_pid_file() {
    rm -f "$PID_FILE"
}

# ── Cleanup handler for temp resources ─────────────────────────────
TEMP_FILES=()
trap_temp_cleanup() {
    local tmpfile
    for tmpfile in "${TEMP_FILES[@]}"; do
        [[ -f "$tmpfile" ]] && rm -f "$tmpfile"
    done
}

# ── Graceful shutdown: forward signals to child workers ─────────────
CHILD_PIDS=()

stop_children() {
    local pid
    for pid in "${CHILD_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "[$(date -Iseconds)] SIGTERM -> PID ${pid}" >> "$LOG_FILE"
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done

    # Wait up to 10 seconds for children to exit gracefully
    local i=0
    while (( i < 20 )); do
        local still_alive=false
        for pid in "${CHILD_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                still_alive=true
                break
            fi
        done
        $still_alive && sleep 0.5 || break
        (( i++ ))
    done

    # Force-kill any stragglers
    for pid in "${CHILD_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "[$(date -Iseconds)] SIGKILL -> PID ${pid}" >> "$LOG_FILE"
            kill -9 "$pid" 2>/dev/null || true
        fi
    done

    cleanup_pid_file
}

# ── Signal traps: catch termination requests from OS, cron, or admin ─
trap 'echo "[$(date -Iseconds)] Received SIGINT, shutting down..." >&2; stop_children; exit 130' INT
trap 'echo "[$(date -Iseconds)] Received SIGTERM, shutting down..." >&2; stop_children; exit 143' TERM
trap 'echo "[$(date -Iseconds)] Received SIGHUP, closing connections..." >&2; stop_children; exit 129' HUP

# ── Main daemon loop ───────────────────────────────────────────────
main() {
    # Write PID file
    write_pid_file
    echo "[$(date -Iseconds)] Daemon started (PID $$) with ${WORK_INTERVAL}s interval" >> "$LOG_FILE"

    while true; do
        # Spawn a worker process for each cycle
        {
            # Worker task — replace with actual work
            local tmpfile
            tmpfile=$(mktemp /tmp/worker-output.XXXXXX)
            TEMP_FILES+=("$tmpfile")

            echo "[$(date -Iseconds)] Worker $(date +%s%N) started" >> "$LOG_FILE"
            # Example: process a batch of data
            date -u +"%Y-%m-%dT%H:%M:%SZ" > "$tmpfile"

            local rc=0
            echo "[$(date -Iseconds)] Worker completed (exit ${rc})" >> "$LOG_FILE"
            exit $rc
        } &
        CHILD_PIDS+=($!)

        # Log the running child PIDs
        echo "[$(date -Iseconds)] Child PID: ${CHILD_PIDS[*]}" >> "$LOG_FILE"

        # Sleep with signal interruption — this is the key trick that
        # allows immediate shutdown instead of waiting for the full interval.
        local waited=0
        while (( waited < WORK_INTERVAL )); do
            sleep 1 || break     # sleep returns non-zero if interrupted by a signal
            (( waited++ ))
        done
    done
}

# ── Entry point ────────────────────────────────────────────────────
main "$@"
```

**Explanation:** This pattern is the standard shell-based daemon. Key elements: (1) `trap` registers handlers for `SIGINT`, `SIGTERM`, and `SIGHUP` — these are the three signals the OS sends during shutdown, user logout, or admin intervention; (2) the PID file uses atomic `mktemp + mv` to prevent partial writes if two instances start simultaneously; (3) child PIDs are tracked in an array so `stop_children()` can forward SIGTERM to every worker; (4) the sleep loop checks the return value of `sleep 1` — when a signal interrupts `sleep`, it returns non-zero, which breaks the inner loop and allows immediate shutdown without waiting for the full `WORK_INTERVAL`.

**PID file usage by other scripts:**

```bash
#!/usr/bin/env bash
set -euo pipefail

PID_FILE="/tmp/my-daemon.pid"

# Check if daemon is running
if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Daemon is running (PID ${PID}). Sending SIGTERM..."
        kill -TERM "$PID"
        # Wait up to 10 seconds for graceful shutdown
        local i=0
        while (( i < 20 )) && kill -0 "$PID" 2>/dev/null; do
            sleep 0.5
            (( i++ ))
        done
        # Force-kill if still alive
        if kill -0 "$PID" 2>/dev/null; then
            echo "Daemon did not exit gracefully. Sending SIGKILL." >&2
            kill -9 "$PID"
        fi
        echo "Daemon stopped."
    else
        echo "Stale PID file found (PID ${PID} not running). Cleaning up." >&2
        rm -f "$PID_FILE"
    fi
else
    echo "No PID file found. Daemon is not running."
fi
```

---

### Pattern 5: Parallel Execution with GNU parallel

Install and use GNU `parallel` for advanced parallel task distribution with job tracking, tagged output, and result collection.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Check if GNU parallel is available ─────────────────────────────
if ! command -v parallel &>/dev/null; then
    echo "ERROR: GNU parallel not found. Install with:" >&2
    echo "  Ubuntu/Debian: sudo apt install parallel" >&2
    echo "  RHEL/CentOS:   sudo yum install parallel" >&2
    echo "  macOS:          brew install parallel" >&2
    exit 1
fi

# ── Configuration ──────────────────────────────────────────────────
INPUT_DIR="${1:-.}"
OUTPUT_PREFIX="parallel-results"
MAX_JOBS="${2:-$(nproc)}"   # Default to all cores; use +0 for unlimited

echo "GNU Parallel Execution Engine"
echo "  Input directory : ${INPUT_DIR}"
echo "  Max parallel jobs: ${MAX_JOBS}"
echo ""

# ── Simple parallel file processing ────────────────────────────────
# Process each file in the input directory in parallel, tagged with filename
echo "--- Phase 1: File Analysis ---"
find "$INPUT_DIR" -maxdepth 1 -type f \
    | sort \
    | parallel --jobs "$MAX_JOBS" \
        --tag \
        'echo "Size: $(stat -c%s {} 2>/dev/null || echo N/A) bytes | Type: $(file --mime-type -b {}) | {}"' \
    | tee "${OUTPUT_PREFIX}-phase1.txt"

echo ""
echo "--- Phase 2: Parallel Transformation ---"

# ── Worker function that parallel calls into ───────────────────────
transform_file() {
    local input="$1"
    local basename
    basename=$(basename "$input")
    local output="${INPUT_DIR}/transformed_${basename}"

    # Simulate transformation: convert to uppercase (works on text files only)
    if file --mime-type -b "$input" | grep -q 'text/'; then
        tr '[:lower:]' '[:upper:]' < "$input" > "$output" 2>/dev/null && \
            echo "OK" || echo "FAIL"
    else
        echo "SKIP (binary)"
    fi
}

export -f transform_file

# Process files with tagged output and collect results in a single file
find "$INPUT_DIR" -maxdepth 1 -type f \
    | sort \
    | parallel --jobs "$MAX_JOBS" \
        --tag \
        --joblog "${OUTPUT_PREFIX}-joblog.csv" \
        'transform_file "{}"' \
    | tee "${OUTPUT_PREFIX}-phase2.txt"

# ── Display results from the job log (machine-readable summary) ───
echo ""
echo "--- Job Log Summary ---"
if [[ -f "${OUTPUT_PREFIX}-joblog.csv" ]]; then
    echo "Total jobs logged: $(tail -n +2 "${OUTPUT_PREFIX}-joblog.csv" | wc -l)"
    echo ""
    echo "Job log columns:"
    echo "  StartTime, EndTime, JobId, Duration (seconds), Exit Value, Hostname, ShellID, CommandLine"
fi

# ── Parallel with a timeout per job ────────────────────────────────
echo ""
echo "--- Phase 3: Time-limited Parallel Execution ---"

timeout_job() {
    local input="$1"
    if parallel --timeout 5 \
        'echo "Processing {}..."; sleep 2; echo "Done: $@"' _ $(basename "$input"); then
        echo "OK: $(basename "$input")"
    else
        echo "TIMEOUT: $(basename "$input")"
    fi
}

export -f timeout_job

find "$INPUT_DIR" -maxdepth 1 -type f \
    | head -20   # Limit to 20 files for the demo
    | parallel --jobs "$MAX_JOBS" \
        --tag \
        --results "${OUTPUT_PREFIX}-phase3-results.txt" \
        'timeout_job "{}"'

echo ""
echo "=== Complete ==="
echo "Results written to: ${OUTPUT_PREFIX}-*"
```

**Explanation:** GNU `parallel` is a more powerful alternative to `xargs -P` with features that matter for serious parallel work: (1) `--tag` prepends the job's input line to every output line, making it trivially easy to associate results with their source; (2) `--joblog` writes a CSV log of all jobs including duration and exit codes, enabling post-hoc analysis of which tasks were slow or failed; (3) `--results` collects per-job output into separate files named by job number; (4) `--timeout N` kills any single job that exceeds the time limit without affecting other jobs; (5) `--jobs N` limits concurrency, with special values like `+0` (one job per CPU core beyond the base level).

**Common parallel flags cheat sheet:**

| Flag | Purpose | Example |
|------|---------|---------|
| `--jobs N` | Max concurrent jobs | `--jobs 4` or `--jobs +0` (all cores) |
| `--tag` | Prefix each output line with the input | `parallel --tag echo {}` |
| `--joblog file` | Write CSV job log with timings/exit codes | `--joblog results.csv` |
| `--results dir` | Collect per-job output into separate files | `--results output/` |
| `--timeout N` | Kill jobs exceeding N seconds | `--timeout 30` |
| `--link` | Pass multiple inputs in lockstep to one command | `parallel --link echo {1} {2}` |
| `-k` | Keep job output in input order (slower, memory-intensive) | `parallel -k echo {}` |

---

## Constraints

### MUST DO
- Always use `set -euo pipefail` at the top of shell scripts to catch unset variables, pipeline errors, and command failures immediately
- Capture `$!` immediately after every `&` backgrounding — without the PID you cannot check exit codes or send targeted signals
- Use `wait $PID` (with explicit PID) rather than bare `wait` when you need to distinguish between multiple independent background processes
- Wrap trap handlers with `exit N` where N encodes the signal number (`130` for SIGINT, `143` for SIGTERM, `129` for SIGHUP) so consumers can diagnose how the process terminated
- Protect concurrent file writes with `flock -x` — parallel workers writing to the same file without locking produce corrupted interleaved output
- Use atomic PID file creation (`mktemp + mv`) — two instances racing to write a PID file must never leave a partial or overwritten PID

### MUST NOT DO
- **Never background without a collection strategy** — Starting 50 jobs and doing nothing with their output is worse than running them sequentially, because you lose all visibility into what succeeded or failed. Always have a results file, log, or exit-code check ready before launching parallel work
- **Never use bare `wait` in scripts that spawn multiple independent background processes** — A bare `wait` waits for ALL background jobs and returns the exit code of the LAST one to finish. If job 3 (exit code 1) finishes after jobs 1 and 2 (both exit code 0), you get exit code 1 with no idea which of the first two jobs also failed. Always use `wait $PID`
- **Never trap signals without calling `exit`** — A trap handler that just runs cleanup and then falls through to the main loop means the signal was effectively ignored, leaving orphaned child processes running indefinitely. Every signal trap must call `exit`
- **Never skip `export -f` when using xargs -P or parallel with custom functions** — Both tools spawn new shell processes for workers. Without `export -f`, the worker processes don't have your function definitions and will fail with "command not found"
- **Never rely on jobs array order for result collection in parallel execution** — Parallel workers complete in non-deterministic order. If you write results to an associative array keyed by index, workers finishing out of order will overwrite each other's data. Always use filenames or job IDs as keys
- **Never background a process that requires terminal I/O (stdin/stdout)** — A process reading from stdin while backgrounded receives SIGTTIN and is stopped by the kernel. Use input redirection (`< /dev/null`) or `tmux` if interactive input is needed

---

## Output Template

When applying this skill, produce:

1. **Execution plan with tool selection** — State whether you're using `&`/`wait`, job control (`fg`/`bg`), `xargs -P`, or GNU `parallel`, and justify the choice based on workload characteristics
2. **Complete, runnable script** — A full shell script with `set -euo pipefail`, proper signal handling, PID management, and error reporting. Every parallel execution must include exit-code collection
3. **Exit code analysis section** — Explicit handling for each failure mode (worker timeout, disk full, permission denied) with human-readable error messages
4. **Cleanup verification** — Confirm that all temp files, PID files, lock files, and child processes are cleaned up in the trap handlers

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `linux-services` | Use systemd for long-running daemons instead of shell backgrounding when you need restart policies, dependency ordering, and boot integration |
| `linux-filesystem` | Path management and directory traversal strategies for file-processing parallel jobs that scan large filesystem trees |

> 📖 skill(local cache): linux-services, linux-filesystem

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GNU Bash Manual](https://www.gnu.org/software/bash/manual/)
- [Process Management in Linux](https://man7.org/linux/man-pages/man1/ps.1.html)
- [Job Control with Foreground/Background](https://man7.org/linux/man-pages/man1/jobs.1p.html)
- [Signal Handling in Bash](https://www.gnu.org/software/bash/manual/html_node/Signals.html)
- [Linux Process Scheduling](https://man7.org/linux/man-pages/man7/sched.7.html)
