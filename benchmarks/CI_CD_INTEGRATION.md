# CI/CD Integration for Real MCP Benchmark

This guide shows how to integrate the Real MCP Benchmark into your CI/CD pipeline for continuous performance monitoring.

## GitHub Actions

### Basic Workflow

Create `.github/workflows/real-mcp-benchmark.yml`:

```yaml
name: Real MCP Benchmark

on:
  push:
    branches: [main]
  schedule:
    # Run daily at 9 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    
    services:
      router:
        image: skill-router:latest
        ports:
          - 3000:3000
        options: >-
          --health-cmd "curl -f http://localhost:3000/health || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install aiohttp asyncio
      
      - name: Run Real MCP Benchmark
        run: |
          cd benchmarks
          python3 harness/benchmark.py \
            --tier simple \
            --use-real-mcp \
            --output results/benchmark-${GITHUB_RUN_ID}.json
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmarks/results/
          retention-days: 30
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(
              fs.readFileSync('benchmarks/results/benchmark-*.json', 'utf8')
            );
            const summary = results.summary;
            
            const comment = `## 📊 Real MCP Benchmark Results
            
            | Metric | Value |
            |--------|-------|
            | Accuracy | ${(summary.accuracy_pct).toFixed(1)}% |
            | Avg Baseline | ${summary.avg_baseline_ms.toFixed(1)}ms |
            | Avg with Router | ${summary.avg_with_router_ms.toFixed(1)}ms |
            | Overhead | ${summary.avg_overhead_pct.toFixed(1)}% |
            
            ✅ Benchmark completed successfully!`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Performance Regression Detection

```yaml
name: Performance Regression Check

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    
    services:
      router:
        image: skill-router:latest
        ports:
          - 3000:3000
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Run benchmark on PR branch
        run: |
          cd benchmarks
          python3 harness/benchmark.py \
            --tier simple \
            --use-real-mcp \
            --output results/pr-benchmark.json
      
      - name: Check for regressions
        run: |
          python3 - <<'EOF'
          import json
          
          with open('benchmarks/results/pr-benchmark.json') as f:
              results = json.load(f)
          
          overhead_pct = results['summary']['avg_overhead_pct']
          accuracy_pct = results['summary']['accuracy_pct']
          
          # Fail if overhead exceeds 60% or accuracy drops below 90%
          if overhead_pct > 60:
              print(f"❌ FAIL: Overhead increased to {overhead_pct:.1f}%")
              exit(1)
          
          if accuracy_pct < 90:
              print(f"❌ FAIL: Accuracy dropped to {accuracy_pct:.1f}%")
              exit(1)
          
          print(f"✅ PASS: Overhead {overhead_pct:.1f}%, Accuracy {accuracy_pct:.1f}%")
          EOF
```

## GitLab CI

### Configuration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - benchmark

real_mcp_benchmark:
  stage: benchmark
  image: python:3.11
  
  services:
    - name: skill-router:latest
      alias: router
  
  before_script:
    - cd benchmarks
    - pip install aiohttp
  
  script:
    - |
      python3 harness/benchmark.py \
        --tier simple \
        --use-real-mcp \
        --router-url http://router:3000 \
        --output results/benchmark-${CI_COMMIT_SHA}.json
  
  artifacts:
    paths:
      - benchmarks/results/
    reports:
      dotenv: benchmark.env
    expire_in: 30 days
  
  retry:
    max: 2
    when: runner_system_failure

performance_check:
  stage: benchmark
  image: python:3.11
  
  needs:
    - real_mcp_benchmark
  
  script:
    - |
      python3 - <<'EOF'
      import json
      
      with open('benchmarks/results/benchmark-${CI_COMMIT_SHA}.json') as f:
          results = json.load(f)
      
      overhead = results['summary']['avg_overhead_pct']
      accuracy = results['summary']['accuracy_pct']
      
      with open('benchmark.env', 'w') as f:
          f.write(f"OVERHEAD_PCT={overhead}\n")
          f.write(f"ACCURACY_PCT={accuracy}\n")
      
      exit(0 if overhead < 60 and accuracy > 90 else 1)
      EOF
```

## Jenkins

### Declarative Pipeline

```groovy
pipeline {
    agent any
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    echo "Starting skill router..."
                    sh '''
                        docker run -d \
                          --name skill-router-${BUILD_ID} \
                          -p 3000:3000 \
                          skill-router:latest
                        sleep 5
                    '''
                }
            }
        }
        
        stage('Benchmark') {
            steps {
                script {
                    echo "Running Real MCP Benchmark..."
                    sh '''
                        cd benchmarks
                        python3 harness/benchmark.py \
                          --tier simple \
                          --use-real-mcp \
                          --output results/jenkins-${BUILD_NUMBER}.json \
                          --verbose
                    '''
                }
            }
        }
        
        stage('Analyze') {
            steps {
                script {
                    sh '''
                        python3 <<EOF
import json
import sys

with open('benchmarks/results/jenkins-${BUILD_NUMBER}.json') as f:
    results = json.load(f)

summary = results['summary']
print(f"Accuracy: {summary['accuracy_pct']:.1f}%")
print(f"Overhead: {summary['avg_overhead_pct']:.1f}%")
print(f"Baseline: {summary['avg_baseline_ms']:.1f}ms")
print(f"With Router: {summary['avg_with_router_ms']:.1f}ms")

if summary['accuracy_pct'] < 90:
    print("FAIL: Accuracy below threshold")
    sys.exit(1)
EOF
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "Cleaning up..."
                sh '''
                    docker stop skill-router-${BUILD_ID} || true
                    docker rm skill-router-${BUILD_ID} || true
                '''
            }
            
            archiveArtifacts artifacts: 'benchmarks/results/**/*.json', allowEmptyArchive: true
        }
    }
}
```

## Docker Compose for Local Testing

Create `docker-compose.benchmark.yml`:

```yaml
version: '3.8'

services:
  router:
    image: skill-router:latest
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    environment:
      - LOG_LEVEL=info

  benchmark:
    build:
      context: .
      dockerfile: Dockerfile.benchmark
    depends_on:
      router:
        condition: service_healthy
    volumes:
      - ./benchmarks/results:/app/benchmarks/results
    environment:
      - ROUTER_URL=http://router:3000
    command: >
      python3 benchmarks/harness/benchmark.py
      --tier simple
      --use-real-mcp
      --router-url http://router:3000
      --output results/docker-compose-benchmark.json
```

Create `Dockerfile.benchmark`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install aiohttp

COPY . .

ENTRYPOINT ["python3"]
```

Run with:

```bash
docker-compose -f docker-compose.benchmark.yml up --abort-on-container-exit
```

## Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: real-mcp-benchmark
spec:
  # Run daily at 2 AM UTC
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: benchmark
            image: skill-router-benchmark:latest
            env:
            - name: ROUTER_URL
              value: "http://skill-router:3000"
            args:
            - "python3"
            - "benchmarks/harness/benchmark.py"
            - "--tier"
            - "all"
            - "--use-real-mcp"
            - "--router-url"
            - "http://skill-router:3000"
            volumeMounts:
            - name: results
              mountPath: /results
          - name: router
            image: skill-router:latest
            ports:
            - containerPort: 3000
          restartPolicy: OnFailure
          volumes:
          - name: results
            emptyDir: {}
```

## Performance Tracking

### Store Results in Database

```python
#!/usr/bin/env python3
"""Store benchmark results in PostgreSQL for historical tracking."""

import json
import psycopg2
from datetime import datetime
import sys

RESULTS_FILE = sys.argv[1] if len(sys.argv) > 1 else 'benchmarks/results/latest-results.json'
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'benchmarks')

with open(RESULTS_FILE) as f:
    results = json.load(f)

conn = psycopg2.connect(f"dbname={DB_NAME} host={DB_HOST} user=postgres")
cur = conn.cursor()

summary = results['summary']
cur.execute("""
    INSERT INTO benchmark_results 
    (timestamp, tier, accuracy, overhead_pct, baseline_ms, with_router_ms)
    VALUES (%s, %s, %s, %s, %s, %s)
""", (
    datetime.now(),
    'simple',  # or extract from results
    summary['accuracy_pct'],
    summary['avg_overhead_pct'],
    summary['avg_baseline_ms'],
    summary['avg_with_router_ms'],
))

conn.commit()
cur.close()
conn.close()

print("Results stored in database")
```

## Alerting

### Alert on Performance Degradation

```python
#!/usr/bin/env python3
"""Alert if benchmark results exceed thresholds."""

import json
import sys
import subprocess

THRESHOLDS = {
    'accuracy_pct': 90,  # Must be >= 90%
    'avg_overhead_pct': 60,  # Must be < 60%
}

with open('benchmarks/results/latest-results.json') as f:
    results = json.load(f)

summary = results['summary']
alerts = []

if summary['accuracy_pct'] < THRESHOLDS['accuracy_pct']:
    alerts.append(f"⚠️  Accuracy dropped to {summary['accuracy_pct']:.1f}%")

if summary['avg_overhead_pct'] > THRESHOLDS['avg_overhead_pct']:
    alerts.append(f"⚠️  Overhead increased to {summary['avg_overhead_pct']:.1f}%")

if alerts:
    # Send to Slack
    for alert in alerts:
        subprocess.run([
            'curl', '-X', 'POST',
            os.getenv('SLACK_WEBHOOK'),
            '-d', json.dumps({'text': alert})
        ])
    sys.exit(1)

print("✅ All metrics within thresholds")
```

## Integration Points

1. **Pre-Commit Hook** - Run benchmark before committing
2. **Pre-Push Hook** - Run benchmark before pushing
3. **PR Checks** - Run on every PR to catch regressions
4. **Nightly Builds** - Run full suite periodically
5. **Release Builds** - Final benchmark before release
6. **Production Monitoring** - Track live router performance

See [REAL_MCP_BENCHMARK.md](./REAL_MCP_BENCHMARK.md) for more details.
