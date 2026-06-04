---
name: docker-debugging
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Diagnoses and resolves Docker container issues including crashes, OOM
  errors, network problems, volume mounts, resource contention, and caching optimization
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: agent-network-troubleshooting
  role: implementation
  scope: implementation
  triggers: docker debugging, container crash, oom error, network troubleshooting,
    docker compose, container logs, how do i debug docker, volume mount
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"
---
# Docker Container Debugging

Implements comprehensive Docker container debugging workflows for diagnosing crashes, OOM errors, network issues, volume mount problems, resource contention, and optimization issues using Docker CLI commands, inspection tools, and log analysis.

## TL;DR Checklist

- [ ] Check container logs with `docker logs --tail 100 <container>`
- [ ] Inspect container configuration with `docker inspect <container>`
- [ ] Monitor resource usage with `docker stats --no-stream`
- [ ] Verify network connectivity with `docker network inspect <network>`
- [ ] Check volume mounts with `docker inspect --format='{{.Mounts}}' <container>`
- [ ] Review container exit codes and crash patterns
- [ ] Use `docker system df` to identify disk space issues
- [ ] Check for OOM kills with `dmesg | grep -i 'killed process'`

---

## When to Use

Use Docker debugging when:

- Container crashes immediately on startup with exit code 137 (OOM) or other non-zero codes
- Network connectivity issues between containers or to external services
- Volume mounts appear empty or fail silently
- Container runs but exhibits unexpected behavior or performance issues
- Docker Compose services fail to start or communicate
- Resource contention detected (high CPU, memory, or I/O)
- Layer caching problems during image builds
- Health checks fail intermittently
- Container logs are missing or incomplete

---

## When NOT to Use

Avoid this skill for:

- Application-level bugs inside containers (use code-debugging skills instead)
- Infrastructure provisioning issues (use CNCF infrastructure skills)
- Kubernetes-specific debugging (use kubernetes-debugging skill)
- Cloud provider API issues (use cloud-provider debugging skills)
- Network infrastructure outside Docker (use agent-network-troubleshooting for Docker-native issues)
- Container orchestration failures (use agent-orchestration-debugging skills)
- Performance issues requiring application profiling (use code-profiling skills)

---

## Core Workflow

Docker debugging follows a systematic approach to identify and resolve container issues:

1. **Assess Container State** — Check container status, logs, and recent events. **Checkpoint:** Determine if container is running, crashed, or stuck in restart loop.
2. **Inspect Configuration** — Analyze container configuration, environment variables, and mounted volumes. **Checkpoint:** Verify configuration matches expectations and requirements.
3. **Check Network Connectivity** — Test container network connectivity and service discovery. **Checkpoint:** Confirm network policies and DNS resolution are working.
4. **Monitor Resources** — Analyze CPU, memory, and I/O usage patterns. **Checkpoint:** Identify resource constraints or bottlenecks.
5. **Review Logs and Events** — Examine application and system logs for errors. **Checkpoint:** Correlate container events with application errors.
6. **Optimize and Retry** — Apply fixes and restart container with corrected configuration. **Checkpoint:** Container starts successfully and performs as expected.

---

## Implementation Patterns

### Pattern 1: Container Crash Diagnosis (Exit Codes and OOM Errors)

Diagnose why containers crash on startup or during execution using exit codes and system logs.

```bash
# ✅ GOOD — Check container exit code and recent logs
# Check if container is running or crashed
docker ps -a --filter "name=myapp" --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"

# Get recent logs with timestamps
docker logs --tail 100 --timestamps myapp-container 2>&1 | tail -50

# Check for OOM kill in system logs
dmesg | grep -i 'killed process' | tail -20
# Or check docker logs for OOM indicator
docker logs myapp-container | grep -i 'oom'

# Get container details including exit code
docker inspect --format='{{.State.Status}} - ExitCode: {{.State.ExitCode}}' myapp-container
```

```bash
# ❌ BAD — Generic container check, missing context
docker ps -a
# ❌ No filter, shows all containers including historical
# ❌ Missing exit code in output
# ❌ No log inspection
```

```bash
# ✅ GOOD — OOM diagnosis script
#!/bin/bash
# Script to diagnose OOM kills

CONTAINER_NAME=$1

if [ -z "$CONTAINER_NAME" ]; then
    echo "Usage: $0 <container-name>"
    exit 1
fi

# Check container exit code
EXIT_CODE=$(docker inspect --format='{{.State.ExitCode}}' "$CONTAINER_NAME" 2>/dev/null)

if [ "$EXIT_CODE" = "137" ]; then
    echo "Container $CONTAINER_NAME exited with code 137 (SIGKILL - likely OOM)"
    
    # Check system OOM logs
    echo "=== System OOM Logs ==="
    dmesg | grep -i 'killed process' | grep "$CONTAINER_NAME" | tail -10
    
    # Check container memory usage
    echo "=== Container Memory Stats ==="
    docker stats --no-stream "$CONTAINER_NAME" 2>/dev/null || echo "Container not running"
    
    # Check container memory limit
    echo "=== Container Memory Limit ==="
    docker inspect --format='{{.HostConfig.Memory}}' "$CONTAINER_NAME"
else
    echo "Container $CONTAINER_NAME exited with code $EXIT_CODE"
    echo "Check logs: docker logs --tail 100 $CONTAINER_NAME"
fi
```

```bash
# ✅ GOOD — Generic crash diagnosis with common exit codes
# Exit code 125: Container command could not be invoked
# Exit code 126: Command found but not executable
# Exit code 127: Command not found
# Exit code 134: SIGABRT
# Exit code 137: SIGKILL (OOM)
# Exit code 143: SIGTERM

#!/bin/bash
# Crash diagnosis helper
CRASH_EXIT_CODES=(
    "125:Container command could not be invoked"
    "126:Command found but not executable"
    "127:Command not found"
    "134:SIGABRT"
    "137:SIGKILL (OOM)"
    "143:SIGTERM"
)

for entry in "${CRASH_EXIT_CODES[@]}"; do
    IFS=':' read -r code description <<< "$entry"
    echo "Exit code $code: $description"
done
```

```bash
# ✅ GOOD — Get comprehensive container crash info
docker inspect \
    --format='
Status: {{.State.Status}}
ExitCode: {{.State.ExitCode}}
Error: {{.State.Error}}
StartedAt: {{.State.StartedAt}}
FinishedAt: {{.State.FinishedAt}}
OOMKilled: {{.State.OOMKilled}}
Death: {{.State.Dead}}
Paused: {{.State.Paused}}
Running: {{.State.Running}}
' myapp-container
```

---

### Pattern 2: Network Troubleshooting (Container Connectivity and DNS)

Diagnose network issues between containers, external services, and DNS resolution.

```bash
# ✅ GOOD — Check container network connectivity
# Check if container is connected to expected networks
docker network ls
docker network inspect bridge --format='{{range .Containers}}{{.Name}} {{end}}'

# Test DNS resolution from inside container
docker exec myapp-container nslookup api.external-service.com
docker exec myapp-container host api.external-service.com

# Test connectivity to other containers
docker exec myapp-container ping -c 3 db-container
docker exec myapp-container curl -v http://api-container:8080/health

# Check firewall rules
docker exec myapp-container iptables -L -n
```

```bash
# ❌ BAD — Basic connectivity test without context
docker exec myapp-container ping google.com
# ❌ No timeout, may hang indefinitely
# ❌ No context about what should be reachable
# ❌ No DNS check
```

```bash
# ✅ GOOD — Comprehensive network diagnostic script
#!/bin/bash
# Network diagnostic script for Docker containers

CONTAINER=$1
EXPECTED_DNS=$2
TARGET_HOST=$3

if [ -z "$CONTAINER" ]; then
    echo "Usage: $0 <container> [expected-dns] [target-host]"
    exit 1
fi

echo "=== Container Network Diagnostics ==="
echo "Container: $CONTAINER"

# Check container networks
echo "=== Connected Networks ==="
docker inspect --format='{{range $key, $value := .NetworkSettings.Networks}}{{$key}} ({{(index $value.IPCache).IPAddress}}){{end}}' "$CONTAINER"

# Test DNS resolution
if [ -n "$EXPECTED_DNS" ]; then
    echo "=== DNS Resolution Test ==="
    docker exec "$CONTAINER" nslookup "$EXPECTED_DNS" 2>&1
fi

# Test host connectivity
if [ -n "$TARGET_HOST" ]; then
    echo "=== Host Connectivity Test ==="
    docker exec "$CONTAINER" nc -zv "$TARGET_HOST" 80 2>&1 || \
    docker exec "$CONTAINER" curl -s --connect-timeout 5 "http://$TARGET_HOST" 2>&1 || \
    echo "Connection failed"
fi

# Check /etc/hosts
echo "=== /etc/hosts Contents ==="
docker exec "$CONTAINER" cat /etc/hosts

# Check /etc/resolv.conf
echo "=== DNS Configuration ==="
docker exec "$CONTAINER" cat /etc/resolv.conf
```

```bash
# ✅ GOOD — Test Docker Compose service connectivity
#!/bin/bash
# Test connectivity between Docker Compose services

COMPOSE_PROJECT=${1:-default}

# Get service names
SERVICES=$(docker ps --filter "label=com.docker.compose.project=$COMPOSE_PROJECT" --format '{{.Names}}' | tr '\n' ' ')

echo "Services in project $COMPOSE_PROJECT: $SERVICES"

# Test each service can reach every other service
for src in $SERVICES; do
    for dst in $SERVICES; do
        if [ "$src" != "$dst" ]; then
            echo "Testing $src -> $dst"
            docker exec "$src" nc -zv "$dst" 80 2>&1 | grep -v "^$" || true
        fi
    done
done
```

---

### Pattern 3: Volume Mount Issues (Empty Volumes and Permission Problems)

Diagnose volume mount problems including empty directories, permission errors, and path issues.

```bash
# ✅ GOOD — Inspect volume mounts and permissions
# Check container mounts
docker inspect --format='{{range .Mounts}}{{.Name}}: {{.Destination}} ({{.Type}}) {{end}}' myapp-container

# Verify host path exists and is accessible
docker run --rm -v /host/path:/data alpine ls -la /data

# Check volume driver and options
docker volume inspect myapp-data --format='{{json .}}'

# Test volume permissions from inside container
docker exec myapp-container ls -la /app/data
docker exec myapp-container touch /app/data/test.txt 2>&1
```

```bash
# ❌ BAD — Basic mount check without verification
docker inspect --format='{{.Mounts}}' myapp-container
# ❌ Output is hard to read
# ❌ No permission test
# ❌ No host path verification
```

```bash
# ✅ GOOD — Volume mount diagnostic script
#!/bin/bash
# Volume mount diagnostic script

CONTAINER=$1
EXPECTED_MOUNT=$2

if [ -z "$CONTAINER" ]; then
    echo "Usage: $0 <container> [expected-mount-path]"
    exit 1
fi

echo "=== Volume Mount Diagnostics ==="
echo "Container: $CONTAINER"

# List all mounts
echo "=== Container Mounts ==="
docker inspect --format='{{range .Mounts}}
Name: {{.Name}}
Destination: {{.Destination}}
Source: {{.Source}}
Type: {{.Type}}
Readonly: {{.RW}}
Driver: {{.Driver}}
Options: {{.Options}}
{{end}}' "$CONTAINER"

# Check if mount exists in container
if [ -n "$EXPECTED_MOUNT" ]; then
    echo "=== Checking $EXPECTED_MOUNT ==="
    docker exec "$CONTAINER" ls -la "$EXPECTED_MOUNT" 2>&1 || \
    echo "Path $EXPECTED_MOUNT not found or not accessible"
fi

# Check for empty directory (common issue)
echo "=== Checking for Empty Mounts ==="
docker exec "$CONTAINER" sh -c 'find /app/data -mindepth 1 -maxdepth 1 2>/dev/null | wc -l' | \
while read count; do
    if [ "$count" -eq 0 ]; then
        echo "WARNING: /app/data appears empty"
    else
        echo "INFO: /app/data contains $count items"
    fi
done

# Check permissions
echo "=== Volume Permissions ==="
docker exec "$CONTAINER" stat /app/data 2>&1 | head -10 || \
echo "Cannot stat /app/data"
```

```bash
# ✅ GOOD — Test bind mount from host
#!/bin/bash
# Test bind mount from host to container

HOST_PATH=$1
CONTAINER_PATH=${2:-/test}

if [ -z "$HOST_PATH" ]; then
    echo "Usage: $0 <host-path> [container-path]"
    exit 1
fi

echo "=== Bind Mount Test ==="
echo "Host path: $HOST_PATH"
echo "Container path: $CONTAINER_PATH"

# Check host path exists
if [ ! -d "$HOST_PATH" ] && [ ! -f "$HOST_PATH" ]; then
    echo "ERROR: Host path does not exist: $HOST_PATH"
    exit 1
fi

# Test mount with temp container
CONTAINER_ID=$(docker run -d -v "$HOST_PATH:$CONTAINER_PATH" alpine sleep 300)

echo "=== Mount Contents ==="
docker exec "$CONTAINER_ID" ls -la "$CONTAINER_PATH" 2>&1 || \
echo "Mount failed or path inaccessible"

echo "=== File Count ==="
docker exec "$CONTAINER_ID" find "$CONTAINER_PATH" -type f 2>/dev/null | wc -l

# Cleanup
docker stop "$CONTAINER_ID" >/dev/null 2>&1
docker rm "$CONTAINER_ID" >/dev/null 2>&1
```

```bash
# ✅ GOOD — Check Docker volume driver
# List volumes with driver info
docker volume ls --format '{{.Name}}\t{{.Driver}}'

# Inspect specific volume
docker volume inspect myapp-data --format='Driver: {{.Driver}}\nMountpoint: {{.Mountpoint}}\nOptions: {{.Options}}'

# Check if volume is local or remote (nfs, cifs, etc.)
docker inspect --format='{{range .Mounts}}{{.Driver}} {{end}}' myapp-container
```

---

### Pattern 4: Resource Contention (CPU, Memory, and I/O)

Diagnose resource issues using Docker stats, cgroup information, and system monitoring.

```bash
# ✅ GOOD — Monitor container resource usage
# Real-time resource monitoring
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

# Historical stats (requires prometheus-node-exporter or similar)
docker stats --no-stream myapp-container --format '{{.CPUPerc}} {{.MemUsage}}'

# Check cgroup limits
docker inspect --format='CPU: {{.HostConfig.NanoCpus}} Memory: {{.HostConfig.Memory}}' myapp-container

# Check if container is throttled
docker inspect --format='{{.State.Status}}' myapp-container
docker stats --no-stream myapp-container --format '{{.CPULimit}} {{.CPU}}' | awk '{print $1, $2}'
```

```bash
# ❌ BAD — Basic stats without filtering
docker stats
# ❌ Shows all containers including system containers
# ❌ No specific focus on the problematic container
# ❌ No historical data
```

```bash
# ✅ GOOD — Resource contention diagnostic script
#!/bin/bash
# Resource diagnostic script

CONTAINER=$1

if [ -z "$CONTAINER" ]; then
    echo "Usage: $0 <container>"
    exit 1
fi

echo "=== Resource Contention Diagnostics ==="
echo "Container: $CONTAINER"

# Current resource limits
echo "=== Resource Limits ==="
docker inspect --format='
CPU Shares: {{.HostConfig.CpuShares}}
Nano CPUs: {{.HostConfig.NanoCpus}}
Memory: {{.HostConfig.Memory}}
Memory Swap: {{.HostConfig.MemorySwap}}
CPU Period: {{.HostConfig.CpuPeriod}}
CPU Quota: {{.HostConfig.CpuQuota}}
Cgroup Parent: {{.HostConfig.CgroupParent}}
' "$CONTAINER"

# Current resource usage
echo "=== Current Usage ==="
docker stats --no-stream "$CONTAINER" --format 'CPU: {{.CPUPerc}} Memory: {{.MemUsage}} ({{.MemPerc}})'

# Check for OOM
echo "=== OOM Status ==="
docker inspect --format='OOM Killed: {{.State.OOMKilled}}' "$CONTAINER"

# Check for restarts (indicates resource issues)
echo "=== Restart Count ==="
docker inspect --format='Restart Count: {{.RestartCount}}' "$CONTAINER"

# Check system resources
echo "=== System Resource Check ==="
docker system df
docker system info | grep -A5 "Storage Driver"
```

```bash
# ✅ GOOD — Check container I/O throttling
# Check for I/O throttling in cgroups
docker inspect --format='{{.HostConfig.IpcMode}} {{.HostConfig.PidMode}}' myapp-container

# Monitor block I/O
docker stats --no-stream myapp-container --format '{{.BlockIO}}'

# Check for I/O wait (high IOWait indicates disk contention)
docker exec myapp-container iostat -x 1 2 2>/dev/null || \
echo "iostat not available - checking /proc/diskstats"
docker exec myapp-container cat /proc/diskstats 2>/dev/null | head -20 || \
echo "Cannot read diskstats"
```

```bash
# ✅ GOOD — Memory diagnostic with cgroup details
# Check container memory usage breakdown
docker stats --no-stream myapp-container --format '{{.MemUsage}} {{.MemPerc}} {{.Limit}}'

# Check cgroup memory stats
docker exec myapp-container cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null || \
echo "cgroup memory stats not available"

# Check container OOM kill counter
docker inspect --format='OOM Kill Counter: {{.State.OOMKilled}}' myapp-container
```

---

### Pattern 5: Layer Caching Optimization (Build Performance)

Diagnose and optimize Docker image layer caching for faster builds.

```bash
# ✅ GOOD — Analyze layer cache effectiveness
# Build with cache analysis
docker build --progress=plain --no-cache=false . 2>&1 | grep -E "(CACHED|cache|layer)"

# List image layers with sizes
docker history myapp-image | head -20

# Check which layers are cached
docker build --progress=plain . 2>&1 | grep -E "(CACHED|-->|Step)" | head -30
```

```bash
# ❌ BAD — Basic build without cache analysis
docker build -t myapp .
# ❌ No visibility into cache usage
# ❌ Cannot identify which layers are cached
```

```bash
# ✅ GOOD — Cache diagnostic script
#!/bin/bash
# Docker build cache diagnostic

IMAGE=$1
CONTEXT=${2:-.}

if [ -z "$IMAGE" ]; then
    echo "Usage: $0 <image-name> [context-path]"
    exit 1
fi

echo "=== Docker Build Cache Diagnostics ==="
echo "Image: $IMAGE"
echo "Context: ${CONTEXT:-.}"

# Check image layers
echo "=== Image Layers ==="
docker history "$IMAGE" --format '{{.ID}}\t{{.Size}}\t{{.CreatedBy}}' | head -30

# Check for duplicate layers (inefficient builds)
echo "=== Duplicate Layer Check ==="
docker history "$IMAGE" --format '{{.CreatedBy}}' | \
    sort | uniq -c | sort -rn | head -20

# Build with cache analysis
echo "=== Build Cache Analysis ==="
BUILD_OUTPUT=$(docker build --progress=plain --no-cache=false "$CONTEXT" 2>&1)

# Show cache hits
echo "$BUILD_OUTPUT" | grep -E "CACHED" | head -10

# Show cache misses
echo "$BUILD_OUTPUT" | grep -v "CACHED" | grep -E "Step [0-9]+/[0-9]+" | head -20

# Build time (if measured)
echo "$BUILD_OUTPUT" | grep -E "Done|Successfully" || echo "Build completed"
```

```bash
# ✅ GOOD — Cache invalidation analysis
# Analyze why cache was invalidated
docker build --progress=plain --no-cache=false . 2>&1 | \
    awk '/Step [0-9]+\/[0-9]+/{step=$0} /CACHED/ && step {print step; step=""}'

# Check Docker build cache size
docker system df -v | grep -A20 "Build cache"

# Prune old cache (use with caution)
# docker builder prune --all --filter "until=24h"
```

```bash
# ✅ GOOD — Multi-stage build cache optimization
# Check multi-stage build cache usage
docker build --progress=plain --target=builder . 2>&1 | grep -E "(CACHED|Step [0-9]+/[0-9]+)" | head -30

# Verify cache is used across stages
docker build --progress=plain --target=runtime . 2>&1 | \
    grep -B5 "CACHED" | grep "Step [0-9]+/[0-9]+"
```

---

### Pattern 6: Docker Compose Troubleshooting (Service Dependencies and Network)

Diagnose Docker Compose issues including service startup order and network problems.

```bash
# ✅ GOOD — Docker Compose diagnostic commands
# Check compose services status
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# View logs for all services
docker-compose logs --tail=100 --timestamps

# Check network connectivity between services
docker-compose exec web ping -c 3 db
docker-compose exec api curl -v http://database:5432

# Inspect compose network
docker network inspect $(docker-compose ps -q | head -1 | xargs docker inspect --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}') --format='{{range .Containers}}{{.Name}} {{end}}'
```

```bash
# ❌ BAD — Basic compose check
docker-compose ps
# ❌ No status details
# ❌ No log inspection
# ❌ No network check
```

```bash
# ✅ GOOD — Compose troubleshooting script
#!/bin/bash
# Docker Compose diagnostic script

COMPOSE_PROJECT=${1:-$(basename $(pwd))}
COMPOSE_FILE=${2:-docker-compose.yml}

echo "=== Docker Compose Diagnostics ==="
echo "Project: $COMPOSE_PROJECT"
echo "File: $COMPOSE_FILE"

# Check compose configuration
echo "=== Configuration Validation ==="
docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" config --quiet && \
    echo "Configuration valid" || \
    echo "Configuration error - run without --quiet to see details"

# Check service status
echo "=== Service Status ==="
docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps \
    --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Check service logs (last 50 lines)
echo "=== Recent Logs ==="
for service in $(docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps -q | xargs docker inspect --format='{{.Name}}' | sed 's/^\///'); do
    echo "--- $service ---"
    docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" logs --tail=50 "$service" 2>&1 | tail -20 || echo "No logs available"
done

# Check network connectivity
echo "=== Network Connectivity ==="
for service in $(docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps -q | xargs docker inspect --format='{{.Name}}' | sed 's/^\///'); do
    for target in $(docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps -q | xargs docker inspect --format='{{.Name}}' | sed 's/^\///'); do
        if [ "$service" != "$target" ]; then
            echo "$service -> $target:"
            docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" exec -T "$service" \
                sh -c "nc -zv $target 80 2>&1" | grep -v "^$" || echo "Connection failed"
        fi
    done
done

# Check for restart loops
echo "=== Restart Count ==="
docker-compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps --format '{{.Name}}\t{{.RestartCount}}'
```

```bash
# ✅ GOOD — Check compose service dependencies
# Verify service depends_on configuration
docker-compose -f docker-compose.yml config | grep -A10 "depends_on"

# Check if dependent services are healthy
docker-compose -f docker-compose.yml ps --format '{{.Name}}\t{{.Status}}' | \
    awk '{if($2=="healthy") print $1 ": OK"; else print $1 ": WARNING - " $2}'
```

---

## Constraints

### MUST DO

- Always start debugging with container logs using `docker logs --tail 100 <container>`
- Check container exit codes with `docker inspect --format='{{.State.ExitCode}}' <container>`
- Use `docker inspect` to verify container configuration matches expectations
- Monitor resource usage with `docker stats --no-stream` for memory and CPU analysis
- Check for OOM kills in system logs with `dmesg | grep -i 'killed process'`
- Test network connectivity from inside containers with `docker exec <container> ping <target>`
- Verify volume mounts are correctly configured and accessible with `docker inspect --format='{{.Mounts}}' <container>`
- Use Docker's built-in health checks to detect issues early
- Analyze layer cache effectiveness with `docker build --progress=plain`
- Check Docker Compose service dependencies with `docker-compose ps`

### MUST NOT DO

- Never skip log inspection - always check `docker logs` before making changes
- Never assume container is running without verifying with `docker ps`
- Never ignore exit codes - code 137 always indicates OOM kill
- Never test network from host only - test from inside container for accurate results
- Never mount volumes without verifying permissions from inside container
- Never debug Docker Compose issues by inspecting individual containers - use `docker-compose` commands
- Never restart containers without first inspecting configuration for the root cause
- Never assume cache issues without analyzing build output with `--progress=plain`
- Never modify containers with `docker exec` for permanent fixes - update Dockerfile/image
- Never ignore Docker system warnings - check `docker system df` and `docker info`

---

## Output Template

When diagnosing Docker container issues, the output must include:

1. **Container Status**
   - Current state (running, exited, restarting)
   - Exit code and OOM kill status
   - Restart count and last start/finish times

2. **Configuration Analysis**
   - Container configuration from `docker inspect`
   - Environment variables and command
   - Volume mounts and network settings
   - Resource limits (CPU, memory)

3. **Log Analysis**
   - Recent container logs (last 100 lines)
   - Application errors and stack traces
   - System-level errors (OOM, segfault)

4. **Network Assessment**
   - Container network configuration
   - DNS resolution results
   - Cross-container connectivity tests
   - Port mapping verification

5. **Resource Profile**
   - CPU and memory usage patterns
   - I/O statistics
   - Cgroup configuration
   - Throttling indicators

6. **Recommended Actions**
   - Specific fixes based on diagnosis
   - Commands to apply changes
   - Verification steps

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-network-troubleshooting` | Broader network troubleshooting including Docker Compose and external services |

---

## References

### Official Docker Documentation

- **Docker CLI Reference:** [https://docs.docker.com/engine/reference/commandline/cli/](https://docs.docker.com/engine/reference/commandline/cli/)
- **Docker Inspect:** [https://docs.docker.com/engine/reference/commandline/inspect/](https://docs.docker.com/engine/reference/commandline/inspect/)
- **Docker Logs:** [https://docs.docker.com/engine/reference/commandline/logs/](https://docs.docker.com/engine/reference/commandline/logs/)
- **Docker Stats:** [https://docs.docker.com/engine/reference/commandline/stats/](https://docs.docker.com/engine/reference/commandline/stats/)
- **Docker Compose:** [https://docs.docker.com/compose/reference/overview/](https://docs.docker.com/compose/reference/overview/)
- **Docker Network:** [https://docs.docker.com/network/](https://docs.docker.com/network/)
- **Docker Volumes:** [https://docs.docker.com/storage/volumes/](https://docs.docker.com/storage/volumes/)
- **Docker Build Cache:** [https://docs.docker.com/build/building/cache/](https://docs.docker.com/build/building/cache/)

### Common Exit Codes Reference

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 125 | Container command could not be invoked |
| 126 | Command found but not executable |
| 127 | Command not found |
| 134 | SIGABRT (abort) |
| 137 | SIGKILL (OOM kill) |
| 143 | SIGTERM |

### Quick Reference Commands

```bash
# Container status and logs
docker ps -a --filter "name=<name>" --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"
docker logs --tail 100 --timestamps <container> 2>&1 | tail -50

# Container inspection
docker inspect <container>
docker inspect --format='{{.State.Status}} - ExitCode: {{.State.ExitCode}}' <container>
docker inspect --format='{{.State.OOMKilled}}' <container>

# Resource monitoring
docker stats --no-stream <container>
docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'

# Network testing
docker network inspect <network>
docker exec <container> nslookup <hostname>
docker exec <container> ping -c 3 <target>

# Volume inspection
docker inspect --format='{{range .Mounts}}{{.Name}}: {{.Destination}} ({{.Type}}) {{end}}' <container>
docker volume inspect <volume>

# Docker Compose
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
docker-compose logs --tail 100 <service>
docker-compose exec <service> <command>

# System diagnostics
docker system df
docker info | grep -A5 "Storage Driver"
dmesg | grep -i 'killed process' | tail -20

# Build cache analysis
docker build --progress=plain --no-cache=false .
docker history <image>
```

---

*Docker Container Debugging Skill - Version 1.0.0*
