# Deployment & Rollout Strategy

## Feature Flag Strategy

### The ENABLE_LLM_COMPRESSION Flag

Master switch controls compression system without restarting:

```typescript
// Feature flag check happens on every request
if (process.env.ENABLE_LLM_COMPRESSION === 'true') {
  // Use LLM compression
  return await skillRegistry.getCompressed(skillName, level);
} else {
  // Fallback to regex compression (lightweight alternative)
  return await regexCompressionFallback(skillName);
}
```

### Configuration

```bash
# Enable compression (production)
ENABLE_LLM_COMPRESSION=true npm start

# Disable compression (fallback)
ENABLE_LLM_COMPRESSION=false npm start

# Change at runtime via API
POST /api/admin/config/compression
{
  "enabled": false
}
```

### Fallback: Regex Compression

When LLM compression is disabled, lightweight regex-based compression serves as fallback:

```typescript
function regexCompressionFallback(skillMd: string): string {
  // Keep H1 title
  // Keep first 2 sentences
  // Keep first 3 bullet points
  // Remove examples, detailed patterns
  // ~40% token reduction (vs 65% for LLM)
  
  return compressedSkill;
}
```

**Advantages:**
- No API calls (instant)
- No cache needed
- Deterministic (same input = same output)
- Safe fallback if LLM unavailable

**Disadvantages:**
- Less intelligent compression (45% vs 65%)
- No semantic understanding
- May lose important context

---

## Rollout Plan

### Phase 1: Shadow Mode (Week 1-2)

**Configuration:**
```bash
ENABLE_LLM_COMPRESSION=true
COMPRESSION_SHADOW_MODE=true           # Compare LLM vs regex
SHADOW_MODE_SAMPLE_RATE=0.10          # 10% of requests
SHADOW_MODE_LOG_DIFFERENCES=true       # Log where they differ
```

**What happens:**
- 10% of incoming requests get **both** compressions
- LLM compression served to client (normal behavior)
- Regex compression computed in background (not served)
- Results compared and logged
- Metrics: latency difference, token difference, validation failures

**Metrics to collect:**
- LLM compression latency: `mean=1800ms, p99=2900ms`
- Regex compression latency: `mean=15ms` (baseline)
- Token savings LLM vs regex: `+20% more with LLM`
- Validation failure rate: `0.5%` (acceptable)
- Semantic similarity (LLM vs original): `0.92` (high confidence)

**Success criteria:**
- ✅ LLM latency acceptable (<3 seconds)
- ✅ Validation failures <1%
- ✅ No data corruption
- ✅ Cache hit rates as expected
- ✅ Disk I/O within limits

**Decision point:** If all metrics green, proceed to Phase 2. If not:
- Increase memory TTL to reduce LLM calls
- Optimize prompts to reduce latency
- Adjust validation rules if too strict
- Re-run shadow mode for 1 more week

### Phase 2: Canary Deployment (Week 3)

**Configuration:**
```bash
ENABLE_LLM_COMPRESSION=true
COMPRESSION_CANARY_MODE=true           # Canary deployment
CANARY_SAMPLE_RATE=0.25                # 25% of traffic
CANARY_ERROR_THRESHOLD=0.01            # 1% failure rate threshold
ALERT_ON_COMPRESSION_FAILURES=true     # PagerDuty alerts
```

**What happens:**
- 25% of production traffic uses LLM compression
- 75% of traffic still uses original (uncompressed)
- Real production requests, real users affected
- Continuous monitoring for errors and performance

**Deployment:**
```bash
# Deploy to one region or subset of instances
docker run \
  -e ENABLE_LLM_COMPRESSION=true \
  -e COMPRESSION_CANARY_MODE=true \
  -e CANARY_SAMPLE_RATE=0.25 \
  skill-router:v2.0.0

# Keep previous version (v1.9.0) on remaining 75% of traffic
# Use load balancer to split traffic
```

**Metrics to monitor (continuous):**
- Compression failure rate (should be <1%)
- Cache hit rate (should be >70%)
- LLM API latency (should be <3s)
- User-facing latency increase (<100ms)
- Disk usage growth (should be stable)
- Error logs (should have no surprises)

**Alerting:**
```yaml
# PagerDuty alerts for critical metrics
alerts:
  - name: compression_failure_rate_high
    condition: compression_failures / total_compressions > 0.01
    severity: critical
    
  - name: llm_latency_high
    condition: compression_latency_p99 > 5000ms
    severity: warning
    
  - name: cache_hit_rate_low
    condition: cache_hit_rate < 0.50
    severity: warning
    
  - name: disk_usage_high
    condition: disk_usage_gb > 100
    severity: info
```

**Canary duration:** 1 week minimum

**Success criteria (before proceeding):**
- ✅ Compression failure rate <0.5%
- ✅ Cache hit rate >70%
- ✅ LLM latency <3 seconds p99
- ✅ No user complaints or support tickets
- ✅ Disk usage stable
- ✅ No unexpected error patterns in logs

**Rollback trigger (automatic):**
```
IF compression_failures > 1% THEN
  NOTIFY on-call engineer
  REVERT to 100% original compression
  SCALE DOWN LLM compression to 0%
END
```

### Phase 3: Progressive Rollout (Week 4-5)

**Week 4a: 50% Traffic**
```bash
CANARY_SAMPLE_RATE=0.50  # Now 50% of traffic
```

- Deploy to 50% of instances
- Monitor same metrics as canary
- Duration: 3-4 days

**Week 4b: 75% Traffic**
```bash
CANARY_SAMPLE_RATE=0.75  # Now 75% of traffic
```

- Deploy to 75% of instances
- Monitor same metrics
- Duration: 3-4 days

**Week 5: 100% Production**
```bash
CANARY_SAMPLE_RATE=1.00  # All traffic
COMPRESSION_CANARY_MODE=false  # Exit canary mode
ENABLE_LLM_COMPRESSION=true  # Fully enabled
```

- Deploy to remaining instances
- Remove canary mode flags
- Full production rollout complete

**Deployment command:**
```bash
# For each phase, update percentage and redeploy
docker kill $(docker ps -q -f label=app=skill-router)

docker run \
  -e ENABLE_LLM_COMPRESSION=true \
  -e CANARY_SAMPLE_RATE=0.50 \  # Increase each phase
  -e LOG_COMPRESSION_METRICS=true \
  skill-router:v2.0.0
```

---

## Metrics to Monitor

### Real-time Monitoring Dashboard

Track these metrics during rollout:

| Metric | Target | Alert Threshold | Data Source |
|--------|--------|-----------------|-------------|
| **Compression Enabled %** | Ramp up to 100% | Manual phase control | Feature flag |
| **Compression Failure Rate** | <0.5% | >1% | Application logs |
| **Cache Hit Rate** | >70% | <50% | Metrics endpoint |
| **LLM API Latency** | <3s p99 | >5s | Request timings |
| **User-Facing Latency** | <100ms increase | >200ms increase | Load balancer metrics |
| **Disk Usage Growth** | <50MB/day | >100MB/day | Disk metrics |
| **Token Savings** | >40% | <20% (indicates low compression) | Metrics endpoint |
| **Error Rate** | <0.1% | >0.5% | Application errors |
| **LLM Deduplication Ratio** | >2:1 | <1:1 (bad dedup) | Request deduplicator stats |
| **Validation Failure Rate** | <0.5% | >1% | Compression logs |

### Metrics Queries

```bash
# Check failure rate (should be <0.5%)
curl http://localhost:3000/metrics?filter=compression | jq '.compression.errorRate'

# Check cache hit rate (should be >70%)
curl http://localhost:3000/metrics?filter=compression | jq '.compression.cacheHitRate'

# Check LLM latency (should be <3000ms p99)
curl http://localhost:3000/metrics?filter=compression | jq '.compression.latency.llmCall.p99'

# Check deduplication effectiveness
curl http://localhost:3000/metrics?filter=compression | jq '.compression | {totalRequests, llmCalls, dedupRatio: (.totalRequests / .llmCalls)}'

# Check disk usage
du -sh .skills/

# Monitor logs in real-time
tail -f logs/compression.log | grep -E "ERROR|WARN|validation"
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "LLM Compression Rollout",
    "panels": [
      {
        "title": "Compression Enabled %",
        "targets": [{"expr": "increase(compression_enabled_total[5m])"}]
      },
      {
        "title": "Failure Rate",
        "targets": [{"expr": "rate(compression_failures_total[5m])"}]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [{"expr": "compression_cache_hit_rate"}]
      },
      {
        "title": "LLM Latency (p99)",
        "targets": [{"expr": "compression_llm_latency_seconds{quantile='0.99'}"}]
      },
      {
        "title": "Disk Usage",
        "targets": [{"expr": "compression_disk_usage_bytes"}]
      }
    ]
  }
}
```

---

## Rollback Strategy

### Automatic Rollback Triggers

System automatically reverts to original compression if thresholds exceeded:

```typescript
// Check every 60 seconds
setInterval(() => {
  const metrics = getCompressionMetrics();
  
  // Trigger 1: High failure rate
  if (metrics.failureRate > 0.05) {
    logger.error('Compression failure rate >5%, rolling back');
    disableCompression();
    alertOncall('Compression disabled due to high failure rate');
  }
  
  // Trigger 2: High LLM latency
  if (metrics.llmLatencyP99 > 10000) {
    logger.error('LLM latency >10s, falling back to original');
    disableCompression();
    alertOncall('Compression disabled due to high LLM latency');
  }
  
  // Trigger 3: Disk space exceeded
  if (metrics.diskUsageBytes > 100 * 1024 * 1024 * 1024) { // 100GB
    logger.warn('Disk usage >100GB, triggering cleanup');
    runCleanupJob();
    if (metrics.diskUsageBytes > 120 * 1024 * 1024 * 1024) { // Still >120GB
      disableCompression();
    }
  }
  
  // Trigger 4: Low cache hit rate
  if (metrics.cacheHitRate < 0.50) {
    logger.warn('Cache hit rate <50%, investigate TTL settings');
    // Don't auto-disable, just alert
    alertOncall('Low cache hit rate - investigate');
  }
}, 60000);
```

### Manual Rollback Procedure

If automatic rollback doesn't trigger, manually disable:

**Step 1: Stop using LLM compression**
```bash
# Set feature flag to false
ENABLE_LLM_COMPRESSION=false

# Restart services gracefully
docker restart skill-router
```

**Step 2: Verify fallback working**
```bash
curl http://localhost:3000/skill/some-skill
# Should return original (uncompressed) content
```

**Step 3: Clear corrupted cache (if needed)**
```bash
# Remove disk cache to force fresh compression on next attempt
rm -rf .skills/*/.compressed/

# Or just clear metadata
rm -f .skills/*/*/.compressed/metadata.json
```

**Step 4: Root cause analysis**
- Check logs: `grep -i error logs/compression.log | tail -50`
- Review metrics: What exactly failed?
- Identify specific skills causing issues
- Patch and re-test

**Step 5: Re-deploy fixed version**
Once root cause fixed, restart rollout from Phase 1 (shadow mode).

### Rollback Checklist

```
□ Feature flag disabled (ENABLE_LLM_COMPRESSION=false)
□ Services restarted
□ Fallback (original) verified working
□ Disk cache cleared if corrupted
□ Root cause documented
□ Alert sent to team
□ Post-mortem scheduled
□ Fix deployed and tested
□ Metrics reset
□ Rollout plan updated if needed
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing: `npm test` (72/72 tests)
- [ ] No type errors: `tsc --noEmit`
- [ ] No linting issues: `eslint .`
- [ ] Documentation updated (LLM_COMPRESSION.md, DEPLOYMENT.md)
- [ ] Feature flag defaults correct (ENABLE_LLM_COMPRESSION=true)
- [ ] Environment variables documented
- [ ] Docker image builds: `docker build -t skill-router:v2.0.0 .`
- [ ] Docker image tested: `docker run ... skill-router:v2.0.0`

### Phase 1: Shadow Mode

- [ ] Shadow mode enabled: `COMPRESSION_SHADOW_MODE=true`
- [ ] Sample rate set: `SHADOW_MODE_SAMPLE_RATE=0.10`
- [ ] Metrics collection enabled: `LOG_COMPRESSION_METRICS=true`
- [ ] Alerts configured in PagerDuty
- [ ] Dashboard created in Grafana
- [ ] Run for 1-2 weeks, collect data
- [ ] Analyze results before proceeding

### Phase 2: Canary

- [ ] Canary mode enabled: `COMPRESSION_CANARY_MODE=true`
- [ ] Sample rate set: `CANARY_SAMPLE_RATE=0.25`
- [ ] Error threshold defined: `CANARY_ERROR_THRESHOLD=0.01`
- [ ] Automatic rollback configured
- [ ] On-call engineer notified
- [ ] Run for 1 week minimum
- [ ] Metrics reviewed daily

### Phase 3: Progressive (50% → 75% → 100%)

- [ ] Increase sample rate incrementally
- [ ] Monitor metrics after each increase
- [ ] Pause 3-4 days between phases
- [ ] Continue monitoring alerts
- [ ] Document any issues

### Post-Deployment

- [ ] All instances running v2.0.0
- [ ] Metrics show compression working (>70% cache hit rate)
- [ ] Disk space stable
- [ ] Error rates normal
- [ ] Performance as expected
- [ ] User-facing impact verified
- [ ] Deployment summary prepared
- [ ] Team celebrates success 🎉

---

## Deployment Timeline

```
Week 1-2:    Phase 1 (Shadow Mode)         ████░░░░░░
             - Compare LLM vs regex
             - Validate approach
             - Decision point

Week 3:      Phase 2 (Canary 25%)         ████░░░░░░
             - Real production traffic
             - Monitor 7 days
             - Decision point

Week 4:      Phase 3a (Progressive 50%)   ████░░░░░░
             - Double the traffic
             - Monitor 3-4 days
             
             Phase 3b (Progressive 75%)   ████░░░░░░
             - Triple the traffic
             - Monitor 3-4 days
             
Week 5:      Phase 3c (Full 100%)         ████████░░
             - All traffic using LLM
             - Remove canary mode
             - Production complete

Post-deployment: Monitoring & optimization
```

---

## Operational Playbooks

### Playbook: High Compression Failure Rate

**Alert:** `compression_failures > 1%`

**Investigation (5 min):**
```bash
# 1. Check which skills are failing
tail -100 logs/compression.log | grep FAIL

# 2. Check LLM API status
# https://status.anthropic.com

# 3. Check recent LLM errors
tail -50 logs/compression.log | grep ERROR
```

**Actions:**
- If LLM API down: Disable compression (`ENABLE_LLM_COMPRESSION=false`)
- If specific skills failing: Review LLM output, adjust validation
- If rate limiting: Increase retry backoff delay

### Playbook: High Disk Usage

**Alert:** `disk_usage > 100GB`

**Investigation (5 min):**
```bash
# 1. Check total size
du -sh .skills/

# 2. Find largest domains
du -sh .skills/*/

# 3. Count files
find .skills -type f | wc -l

# 4. Check old files
find .skills -type f -mtime +7 | wc -l
```

**Actions:**
1. Run cleanup immediately: `npm run compression:cleanup`
2. Verify cleanup removes old versions: `du -sh .skills/` should decrease
3. If not: Check cleanup job logs, manually delete old files
4. Reduce disk TTL if growth continues

### Playbook: Low Cache Hit Rate

**Alert:** `cache_hit_rate < 50%`

**Investigation (5 min):**
```bash
# 1. Check current cache stats
curl http://localhost:3000/metrics | jq '.compression.cacheHitRate'

# 2. Check memory cache size
curl http://localhost:3000/metrics | jq '.compression.cacheSize'

# 3. Check access patterns
tail -1000 logs/compression.log | grep "MISS" | head -20
```

**Actions:**
1. Check if TTL is too low: `echo $SKILL_COMPRESSION_MEMORY_TTL_MINUTES`
2. Increase if <30: Set to 120-240 minutes for high-traffic clusters
3. Check if requests are for different compression levels (spread cache)
4. Investigate if access pattern changed (new skills being requested)

### Playbook: LLM Latency High

**Alert:** `compression_latency_p99 > 5 seconds`

**Investigation (5 min):**
```bash
# 1. Check actual latency
curl http://localhost:3000/metrics | jq '.compression.latency'

# 2. Check API status
# https://status.anthropic.com

# 3. Review recent calls
tail -100 logs/compression.log | grep "latency"
```

**Actions:**
1. Check Anthropic status page (may be experiencing issues)
2. Check rate limiting: Verify request deduplicator is coalescing requests
3. Reduce compression batch size if too large
4. Consider switching to faster model (Haiku is fastest)
5. Increase memory TTL to reduce LLM calls

---

## Success Criteria

### During Rollout

✅ **Phase 1:** <0.5% compression failures, proper deduplication observed  
✅ **Phase 2:** <1% user impact, no support tickets, cache hit rate >70%  
✅ **Phase 3:** Gradual increase with no incidents, metrics stable  
✅ **Phase 3c:** 100% traffic, all metrics green, ready for production ops  

### Post-Deployment

✅ **Token savings:** 45-65% reduction (depending on level)  
✅ **Cost reduction:** 30-50% lower API spend  
✅ **Cache hit rate:** >75% (75-85% typical)  
✅ **Disk usage:** Stable (grows slowly, cleanup removes old)  
✅ **Error rate:** <0.1% (0% ideal)  
✅ **Validation failures:** <0.5% (should be rare)  
✅ **User impact:** Zero negative impact, imperceptible latency increase  

---

## Rollback Timeline

If rollback needed:

| Time | Action |
|------|--------|
| T+0 | Automatic alert fires, on-call engineer notified |
| T+5min | Engineer acknowledges, investigates metrics |
| T+10min | Decision: rollback or investigate further |
| T+15min | Feature flag disabled, services restarting |
| T+20min | Fallback verified working, services stable |
| T+30min | Root cause analysis starts, team assembled |
| T+1hr | Initial findings documented, fix identified |
| T+24hr | Fix tested, re-deployment plan created |
| T+2-7 days | Restart rollout from Phase 1 with fixes applied |

---

## References

- `LLM_COMPRESSION.md` — Complete technical documentation
- `COMPRESSION.md` — Architecture deep-dive
- `COMPRESSION_VALIDATION_REPORT.md` — Validation results

---

**Last Updated:** April 25, 2026  
**Status:** Production-ready  
**Target Rollout Start:** Week of May 1, 2026
