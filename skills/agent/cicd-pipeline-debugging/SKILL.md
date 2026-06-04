---
name: cicd-pipeline-debugging
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Debugging patterns for GitHub Actions, GitLab CI, Jenkins and other CI/CD
  systems including log analysis, runner issues, cache problems, and workflow optimization
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cicd-pipeline-troubleshooting, cncf-argocd, cncf-tekton
  role: implementation
  scope: implementation
  triggers: github actions debugging, gitlab ci troubleshooting, jenkins pipeline,
    ci cd failures, build errors, workflow debugging, pipeline logs, runner issues
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
  version: 1.0.0
------
# CI/CD Pipeline Debugging

Debugging complex CI/CD pipelines across GitHub Actions, GitLab CI, Jenkins, and other systems. Provides systematic approaches to diagnose build failures, test errors, cache problems, runner issues, and workflow optimization challenges with actionable debugging commands and real-world examples.

## TL;DR Checklist

- [ ] Extract and analyze complete pipeline logs from the beginning of failure
- [ ] Check runner status, logs, and resource constraints
- [ ] Verify environment variables and secrets are correctly configured
- [ ] Inspect cache operations: hits, misses, corruption, and expiration
- [ ] Reproduce the failure locally using the same Docker image and steps
- [ ] Use step-level debugging with debug mode enabled (set -x, ACTIONS_RUNNER_DEBUG)
- [ ] Check for timing issues: race conditions, parallel execution conflicts
- [ ] Review recent changes: workflow modifications, dependency updates, infrastructure changes

---

## When to Use

Use this skill when:

- Pipeline fails with cryptic error messages and you need systematic debugging steps
- Build succeeds locally but fails in CI/CD environment (environment differences)
- Test suite passes locally but fails intermittently in CI/CD (flaky tests, timing issues)
- Cache operations cause build failures or inconsistent behavior
- Runner is unresponsive, slow, or showing resource constraints
- Deployment fails and you need to trace through the entire pipeline
- Workflow optimization is needed but you need to identify bottlenecks first

---

## When NOT to Use

Avoid this skill for:

- Simple syntax errors in workflow files - use YAML validation instead
- Infrastructure provisioning failures - use infrastructure debugging skills
- Application logic bugs that only manifest in production - use application debugging skills
- Network connectivity issues unrelated to CI/CD - use network troubleshooting
- Security vulnerabilities detected by static analysis - use security review skills

---

## Core Workflow

1. **Gather Initial Information** — Collect logs, environment details, and failure context.
   **Checkpoint:** Have you captured the full error message and pipeline run ID?

2. **Isolate the Failure Point** — Identify which job, step, or command is failing.
   **Checkpoint:** Can you reproduce the failure locally with the same inputs?

3. **Check Runner Environment** — Verify runner status, resources, and configuration.
   **Checkpoint:** Is the runner healthy and have sufficient resources?

4. **Verify Dependencies and Cache** — Check package managers, cached artifacts, and dependencies.
   **Checkpoint:** Are all required dependencies available and correctly cached?

5. **Enable Debug Mode** — Activate verbose logging for detailed diagnostic information.
   **Checkpoint:** Do you now have actionable error details?

6. **Apply Fix and Verify** — Implement the appropriate fix and validate in a test run.
   **Checkpoint:** Does the fix resolve the issue without introducing new problems?

---

## Implementation Patterns

### Pattern 1: GitHub Actions Log Analysis

Debugging GitHub Actions failures requires extracting logs and understanding the runner environment.

```bash
# ❌ BAD — Only checking the final error
echo "Build failed, let me guess what went wrong"

# ✅ GOOD — Extracting full logs for analysis
curl -H "Authorization: token $GITHUB_TOKEN" \
     "https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/logs"
```

```bash
# ❌ BAD — Missing runner details
echo "Runner failed"

# ✅ GOOD — Getting runner information
curl -H "Authorization: token $GITHUB_TOKEN" \
     "https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/attempt/$ATTEMPT"
```

```bash
# ❌ BAD — Not checking environment
echo "Build failed"

# ✅ GOOD — Checking environment in GitHub Actions
- name: Debug Environment
  run: |
    echo "=== System Info ==="
    uname -a
    echo "=== Node Version ==="
    node -v
    echo "=== npm Version ==="
    npm -v
    echo "=== Current Directory ==="
    pwd
    echo "=== Environment Variables ==="
    env | sort
```

---

### Pattern 2: GitLab CI Pipeline Debugging

GitLab CI provides powerful debugging features including trace mode and artifacts.

```bash
# ❌ BAD — No debug information
.job:
  script:
    - make test

# ✅ GOOD — Enabling trace mode for detailed logging
.job:
  variables:
    CI_DEBUG_TRACE: "true"
  script:
    - set -x  # bash debug mode
    - make test
```

```bash
# ❌ BAD — Not checking pipeline details
echo "Pipeline failed"

# ✅ GOOD — Getting pipeline information
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipelines/$PIPELINE_ID"
```

```bash
# ❌ BAD — Not checking job details
echo "Job failed"

# ✅ GOOD — Getting job details and trace
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$JOB_ID"
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$JOB_ID/trace"
```

```bash
# ❌ BAD — Ignoring cache issues
.job:
  script:
    - npm install
    - npm test

# ✅ GOOD — Debugging cache issues
.job:
  variables:
    CI_DEBUG_TRACE: "true"
  script:
    - echo "=== Cache Debug ==="
    - ls -la $CI_PROJECT_DIR/.npm
    - echo "=== Installing dependencies ==="
    - npm ci 2>&1 | tee npm-install.log
    - echo "=== Checksum verification ==="
    - cat package-lock.json | md5sum
    - npm test
  artifacts:
    paths:
      - npm-install.log
      - .npm/
    when: on_failure
```

---

### Pattern 3: Jenkins Pipeline Debugging

Jenkins provides extensive debugging capabilities through pipeline steps and system logs.

```groovy
// ❌ BAD — No debugging
node {
    stage('Build') {
        sh 'mvn clean test'
    }
}

// ✅ GOOD — Enabling pipeline debugging
node {
    stage('Debug Info') {
        echo '=== Environment Variables ==='
        sh 'printenv | sort'
        echo '=== Node Info ==='
        sh 'node -v || echo Node not installed'
        echo '=== Maven Info ==='
        sh 'mvn -v'
        echo '=== Workspace ==='
        sh 'pwd && ls -la'
    }
    stage('Build') {
        withEnv(['MAVEN_OPTS=-Xmx2g -Xms512m']) {
            sh 'set -x && mvn clean test'
        }
    }
}
```

```bash
# ❌ BAD — Not checking Jenkins system logs
echo "Pipeline failed"

# ✅ GOOD — Checking Jenkins logs
curl -u "$JENKINS_USER:$JENKINS_TOKEN" \
     "$JENKINS_URL/log/all"
```

```bash
# ❌ BAD — Not checking node status
echo "Agent failed"

# ✅ GOOD — Checking Jenkins node status
curl -u "$JENKINS_USER:$JENKINS_TOKEN" \
     "$JENKINS_URL/computer/$NODE_NAME/api/json?tree=displayName,offline,launchSupported,computerDescription,manualLaunchAllowed,monitorData"
```

```bash
# ❌ BAD — Not checking build details
echo "Build failed"

# ✅ GOOD — Getting build information
curl -u "$JENKINS_USER:$JENKINS_TOKEN" \
     "$JENKINS_URL/job/$JOB_NAME/$BUILD_NUMBER/api/json?pretty=true"
```

---

### Pattern 4: Docker Container Debugging in CI

Debugging Docker-based CI pipelines requires understanding container isolation and image contents.

```bash
# ❌ BAD — Assuming container state
.job:
  script:
    - docker run myapp:latest npm test

# ✅ GOOD — Debugging container issues
.job:
  script:
    - echo "=== Image inspection ==="
    - docker inspect myapp:latest | jq '.[0].Config.Env'
    - echo "=== Container run with debug ==="
    - docker run --rm myapp:latest env
    - docker run --rm myapp:latest pwd
    - docker run --rm myapp:latest ls -la
    - echo "=== Running tests ==="
    - docker run --rm myapp:latest npm test
```

```bash
# ❌ BAD — Not checking Docker build cache
job:
  script:
    - docker build -t myapp .
    - docker run myapp npm test

# ✅ GOOD — Debugging Docker build cache
job:
  script:
    - echo "=== Docker build cache info ==="
    - docker history myapp:latest
    - echo "=== Build with cache info ==="
    - docker build --progress=plain -t myapp:latest .
    - echo "=== Running with cache ==="
    - docker run --rm myapp:latest npm test
```

```bash
# ❌ BAD — Ignoring volume issues
job:
  script:
    - docker run -v $(pwd):/app myapp npm test

# ✅ GOOD — Debugging volume issues
job:
  script:
    - echo "=== Host directory ==="
    - pwd && ls -la
    - echo "=== Container mount ==="
    - docker run --rm -v $(pwd):/app myapp ls -la /app
    - echo "=== Permissions ==="
    - docker run --rm -v $(pwd):/app myapp stat /app
    - echo "=== Running tests ==="
    - docker run --rm -v $(pwd):/app myapp npm test
```

---

### Pattern 5: Cache Debugging and Optimization

Cache issues are common in CI/CD pipelines. This pattern helps diagnose cache problems.

```bash
# ❌ BAD — Ignoring cache status
.job:
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - node_modules/
  script:
    - npm ci
    - npm test

# ✅ GOOD — Debugging cache operations
.job:
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - node_modules/
      - .npm/
    policy: pull-push
  script:
    - echo "=== Cache Debug ==="
    - echo "Cache key: $CI_CACHE_KEY"
    - echo "Cache path: node_modules/"
    - echo "=== Checking cache ==="
    - test -d node_modules && echo "node_modules exists" || echo "node_modules missing"
    - test -d .npm && echo ".npm cache exists" || echo ".npm cache missing"
    - echo "=== Installing dependencies ==="
    - npm ci 2>&1 | tee npm-ci.log
    - echo "=== Cache size ==="
    - du -sh node_modules/ .npm/ 2>/dev/null || echo "No cache"
    - npm test
```

```bash
# ❌ BAD — Not validating cache integrity
.job:
  cache:
    key: npm-${CI_COMMIT_SHA}
    paths:
      - node_modules/
  script:
    - npm ci
    - npm test

# ✅ GOOD — Validating cache integrity
.job:
  cache:
    key: npm-${CI_COMMIT_SHA}
    paths:
      - node_modules/
      - .npm/
  script:
    - echo "=== Cache validation ==="
    - npm ci --package-lock-only 2>&1 | head -20
    - echo "=== Checking package-lock.json ==="
    - cat package-lock.json | jq -r '.packages | keys | length' || echo "Invalid JSON"
    - echo "=== Installing with verification ==="
    - npm ci 2>&1 | tee npm-ci.log
    - echo "=== Verifying installation ==="
    - test -d node_modules && echo "node_modules verified" || exit 1
    - npm list --depth=0 2>&1 | head -20
    - npm test
```

```yaml
# ❌ BAD — Generic cache key
.job:
  cache:
    key: cache
    paths:
      - node_modules/
  script:
    - npm ci
    - npm test

# ✅ GOOD — Optimized cache key with fallback
.job:
  cache:
    key:
      files:
        - package-lock.json
        - package.json
    paths:
      - node_modules/
      - .npm/
    policy: pull-push
  script:
    - echo "=== Cache key: $CI_CACHE_KEY ==="
    - echo "=== Checking lockfile ==="
    - test -f package-lock.json && echo "package-lock.json exists" || exit 1
    - npm ci 2>&1 | tee npm-ci.log
    - echo "=== Cache report ==="
    - du -sh node_modules/
    - npm test
```

---

### Pattern 6: Runner Troubleshooting

Runner issues can cause pipeline failures. This pattern helps diagnose runner problems.

```bash
# ❌ BAD — Ignoring runner status
job:
  script:
    - make build

# ✅ GOOD — Checking runner status (GitHub Actions)
job:
  steps:
    - name: Check Runner Status
      run: |
        echo "=== Runner Information ==="
        echo "Runner Name: $GITHUB_RUNNER_NAME"
        echo "Runner OS: $RUNNER_OS"
        echo "Runner Architecture: $RUNNER_ARCH"
        echo "=== System Resources ==="
        free -h
        df -h
        echo "=== CPU Info ==="
        lscpu | grep -E "Model name|Architecture|CPU\(s\)"
```

```bash
# ❌ BAD — Not checking runner disk space
job:
  script:
    - make build

# ✅ GOOD — Checking runner disk space
job:
  script:
    - echo "=== Disk Space ==="
    - df -h
    - echo "=== Large Directories ==="
    - du -sh /* 2>/dev/null | sort -hr | head -10
    - echo "=== User Directory ==="
    - du -sh ~/* 2>/dev/null | sort -hr | head -10
    - echo "=== Building ==="
    - make build
```

```bash
# ❌ BAD — Not checking runner memory
job:
  script:
    - make build

# ✅ GOOD — Checking runner memory
job:
  script:
    - echo "=== Memory Usage ==="
    - free -h
    - echo "=== Process List ==="
    - ps aux --sort=-%mem | head -20
    - echo "=== Memory Limits ==="
    - cat /proc/sys/vm/swappiness 2>/dev/null || echo "No swap info"
    - echo "=== Building ==="
    - make build
```

```bash
# ❌ BAD — Ignoring network issues
job:
  script:
    - npm install
    - npm test

# ✅ GOOD — Debugging network issues
job:
  variables:
    npm_config_loglevel: verbose
  script:
    - echo "=== Network Debug ==="
    - echo "=== DNS Resolution ==="
    - nslookup registry.npmjs.org || dig registry.npmjs.org
    - echo "=== Connection Test ==="
    - curl -v https://registry.npmjs.org/npm/-/npm-8.0.0.tgz 2>&1 | head -30
    - echo "=== npm Config ==="
    - npm config list
    - echo "=== Installing ==="
    - npm ci 2>&1 | tee npm.log
    - npm test
```

```bash
# ❌ BAD — Not checking runner logs (self-hosted)
job:
  script:
    - make build

# ✅ GOOD — Checking self-hosted runner logs
job:
  script:
    - echo "=== Runner Logs ==="
    - tail -100 ~/actions-runner/_diag/Runner_*.log 2>/dev/null || echo "No runner logs"
    - echo "=== System Logs ==="
    - journalctl -u actions-runner.service -n 50 --no-pager 2>/dev/null || echo "No systemd logs"
    - echo "=== Building ==="
    - make build
```

---

### Pattern 7: Workflow Optimization Debugging

Identifying bottlenecks in CI/CD workflows requires careful measurement and analysis.

```bash
# ❌ BAD — Ignoring timing
.job:
  script:
    - npm ci
    - npm run lint
    - npm run build
    - npm test

# ✅ GOOD — Measuring timing
.job:
  script:
    - echo "=== Timing Start ==="
    - START_TIME=$(date +%s)
    - echo "=== npm ci ==="
    - TIME_NPM_CI=$(date +%s)
    - npm ci
    - echo "npm ci took $(( $(date +%s) - TIME_NPM_CI )) seconds"
    - echo "=== npm run lint ==="
    - TIME_LINT=$(date +%s)
    - npm run lint
    - echo "lint took $(( $(date +%s) - TIME_LINT )) seconds"
    - echo "=== npm run build ==="
    - TIME_BUILD=$(date +%s)
    - npm run build
    - echo "build took $(( $(date +%s) - TIME_BUILD )) seconds"
    - echo "=== npm test ==="
    - TIME_TEST=$(date +%s)
    - npm test
    - echo "test took $(( $(date +%s) - TIME_TEST )) seconds"
    - echo "=== Total Time: $(( $(date +%s) - START_TIME )) seconds ==="
```

```bash
# ❌ BAD — Not checking parallel execution
.job1:
  script:
    - npm run build
.job2:
  script:
    - npm test

# ✅ GOOD — Debugging parallel execution
.job1:
  script:
    - echo "=== Job 1 Start: $(date) ==="
    - echo "=== Parallel execution check ==="
    - echo "Job 1 PID: $$"
    - echo "Parallel jobs:"
    - jobs -l || echo "No background jobs"
    - npm run build
    - echo "=== Job 1 End: $(date) ==="
.job2:
  script:
    - echo "=== Job 2 Start: $(date) ==="
    - echo "=== Waiting for job 1 ==="
    - while ! curl -s http://localhost:8080/health >/dev/null 2>&1; do
        echo "Waiting for job 1..."
        sleep 5
      done
    - echo "Job 1 completed at $(date)"
    - npm test
    - echo "=== Job 2 End: $(date) ==="
```

```yaml
# ❌ BAD — No workflow optimization
workflow:
  jobs:
    - build
    - lint
    - test
    - deploy

# ✅ GOOD — Optimized workflow with timing
workflow:
  jobs:
    - build:
        steps:
          - name: Checkout
            uses: actions/checkout@v4
          - name: Debug Timing
            run: |
              echo "Build start: $(date)"
              echo "=== Step Timing ==="
              START=$(date +%s)
          - name: Build
            run: |
              npm run build
          - name: Build Timing
            run: |
              echo "Build end: $(date)"
              echo "Build duration: $(( $(date +%s) - $START )) seconds"
```

---

### Pattern 8: Environment and Dependency Debugging

Environment differences between local and CI/CD are a common source of failures.

```bash
# ❌ BAD — Not comparing environments
.job:
  script:
    - npm install
    - npm test

# ✅ GOOD — Comparing environments
.job:
  script:
    - echo "=== Environment Comparison ==="
    - echo "=== Node Version ==="
    - node -v
    - echo "=== Local Node Version ==="
    - echo "v$(node -p "process.versions.node")"
    - echo "=== npm Version ==="
    - npm -v
    - echo "=== Python Version ==="
    - python3 --version || echo "Python not installed"
    - echo "=== Platform ==="
    - uname -a
    - echo "=== PATH ==="
    - echo $PATH
    - echo "=== Installing ==="
    - npm ci
    - npm test
```

```bash
# ❌ BAD — Ignoring environment variables
.job:
  script:
    - npm test

# ✅ GOOD — Debugging environment variables
.job:
  script:
    - echo "=== Environment Variables ==="
    - env | sort
    - echo "=== Secret Variables (not showing values) ==="
    - echo "DATABASE_URL present: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'no')"
    - echo "API_KEY present: $([ -n "$API_KEY" ] && echo 'yes' || echo 'no')"
    - echo "=== npm config ==="
    - npm config list
    - echo "=== Testing ==="
    - npm test
```

```bash
# ❌ BAD — Not checking locale issues
.job:
  script:
    - npm test

# ✅ GOOD — Debugging locale issues
.job:
  variables:
    LC_ALL: en_US.UTF-8
    LANG: en_US.UTF-8
  script:
    - echo "=== Locale Debug ==="
    - locale
    - echo "=== Installing locale ==="
    - sudo locale-gen en_US.UTF-8 2>/dev/null || echo "Locale generation not available"
    - echo "=== Testing with locale ==="
    - npm test
```

---

## Constraints

### MUST DO

- Always capture complete logs before starting debugging
- Reproduce failures locally using the same environment and commands
- Enable debug mode (set -x, ACTIONS_RUNNER_DEBUG, CI_DEBUG_TRACE) for detailed logging
- Check runner status, resources, and logs for any issues
- Validate cache operations and integrity with checksums
- Use step-level timing to identify performance bottlenecks
- Compare local and CI/CD environments systematically
- Implement proper error handling and logging in all scripts
- Document findings and solutions for future reference

### MUST NOT DO

- Assume the failure cause without evidence or logs
- Make changes without understanding their impact on the pipeline
- Disable important checks to make failures "go away"
- Ignore intermittent failures - they often indicate real issues
- Skip debugging steps because "it works locally"
- Modify production pipelines without testing in a staging environment
- Share sensitive information (secrets, credentials) in logs or output
- Assume Docker images are identical across environments without verification

---

## Output Template

When applying this skill, produce:

1. **Failure Analysis** - Detailed breakdown of the failure with log excerpts
2. **Root Cause** - Identified cause with supporting evidence from logs
3. **Debugging Steps Taken** - Complete list of debugging commands and their output
4. **Environment Comparison** - Local vs CI/CD environment differences
5. **Fix Implementation** - Code changes or configuration updates needed
6. **Verification Steps** - How to confirm the fix resolves the issue
7. **Prevention Measures** - How to prevent similar issues in the future

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cicd-pipeline-troubleshooting` | Higher-level troubleshooting approach for common CI/CD issues |
| `cncf-tekton` | Debugging Tekton pipelines and tasks |
| `cncf-argocd` | Debugging Argo CD deployment issues |
| `agent-git-pr-workflows-git-workflow` | Git workflow debugging in CI/CD contexts |
| `agent-bash-scripting` | Bash debugging techniques for pipeline scripts |

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Docker Documentation](https://docs.docker.com/)
- [npm Documentation](https://docs.npmjs.com/)
- [CI/CD Best Practices](https://docs.gitlab.com/ee/ci/best_practices/)
- [Debugging GitHub Actions](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)
