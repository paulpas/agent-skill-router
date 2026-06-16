# Attribution Footer Test Suite

## Overview

The **Attribution Footer Test Suite** (`test-attribution-footer.sh`) is a comprehensive end-to-end testing framework that validates the attribution footer functionality across all layers of the agent-skill-router system.

The suite ensures that:
- ✅ API layer correctly returns `attributionFooter` field
- ✅ Footer content structure is valid and complete
- ✅ Skill counts are accurate and consistent
- ✅ Markdown formatting is correct
- ✅ Content quality meets standards
- ✅ Multiple requests show consistent behavior
- ✅ Skills index alignment is valid

## Quick Start

### Run the Tests

```bash
bash /home/paulpas/git/agent-skill-router/test-attribution-footer.sh
```

### View Results

Test results are automatically saved to:
```
/home/paulpas/git/agent-skill-router/FOOTER_TEST_RESULTS.md
```

## Test Suite Details

### Test 1: API Layer - Footer Presence

**What it tests:** Verifies that the `/route` endpoint returns an `attributionFooter` field.

**Steps:**
1. Makes a POST request to `http://localhost:3000/route`
2. Checks for `attributionFooter` key in JSON response
3. Reports footer length in bytes

**Pass criteria:** Response includes `attributionFooter` field with content

**Sample output:**
```
[PASS] API returns attributionFooter field
[INFO] Footer length: 1352 bytes
```

---

### Test 2: Footer Structure & Content

**What it tests:** Validates that the footer contains all required sections and proper formatting.

**Checks:**
- Contains `agent-skill-router` reference
- Contains `Skills Used` section header
- Contains properly formatted skill entries (bullet points with bold names)
- Contains timestamp

**Pass criteria:** All 4 sub-checks pass

**Sample output:**
```
[PASS] Footer contains agent-skill-router reference
[PASS] Footer contains 'Skills Used' section
[PASS] Footer contains skill entries with proper formatting
[PASS] Footer contains timestamp
```

---

### Test 3: Skill Count Verification

**What it tests:** Ensures the skill count in the footer header matches the actual number of skill entries listed.

**Steps:**
1. Extracts count from `Skills Used (N):` header
2. Counts actual skill entries (lines starting with `- **`)
3. Compares the two numbers

**Pass criteria:** Skill count header matches actual entries

**Sample output:**
```
[INFO] Skill count in footer header: 5
[INFO] Actual skill entries in footer: 5
[PASS] Skill count matches actual entries (5)
```

---

### Test 4: Markdown Format Validation

**What it tests:** Verifies the footer uses valid Markdown syntax.

**Checks:**
- Balanced markdown code blocks (backticks)
- Properly formatted markdown links
- No trailing whitespace issues
- YAML frontmatter (if present) is properly delimited

**Pass criteria:** All 4 sub-checks pass

**Sample output:**
```
[PASS] Markdown code blocks are balanced
[PASS] Markdown links are present and formatted
[PASS] No trailing whitespace in skill entries
[PASS] YAML frontmatter delimiter is present (count: 1)
```

---

### Test 5: Footer Content Quality

**What it tests:** Ensures the footer content is substantial and complete.

**Checks:**
- Minimum content length (>200 bytes)
- Each skill entry includes domain/category indicator (emoji)
- Each skill entry includes a description (separated by ` — `)
- GitHub repository URL is present

**Pass criteria:** All 4 sub-checks pass

**Sample output:**
```
[PASS] Footer has sufficient content length (1352 bytes)
[PASS] Skill entries include domain/category indicators
[PASS] Skill entries include descriptions
[PASS] GitHub repository URL is present
```

---

### Test 6: Multiple Requests - Consistency Check

**What it tests:** Verifies that the footer is consistently returned across different queries.

**Steps:**
1. Makes requests with different task descriptions: "kubernetes", "testing", "database"
2. Checks each response for `attributionFooter` field
3. Reports presence for each query

**Pass criteria:** All requests return footer

**Sample output:**
```
[INFO] Query 'kubernetes': Footer present ✓
[INFO] Query 'testing': Footer present ✓
[INFO] Query 'database': Footer present ✓
[PASS] All requests consistently include attribution footer
```

---

### Test 7: Skills Index Alignment

**What it tests:** Validates that footer skill selections are valid subsets of the total skills in the index.

**Steps:**
1. Retrieves total skill count from API stats endpoint
2. Counts skills in the footer
3. Verifies footer skills ≤ total skills in index

**Pass criteria:** Footer skill count is ≤ total skills in index

**Sample output:**
```
[PASS] API reports 1295 skills in index
[PASS] Footer skill selection (5) is valid subset of total (1295)
```

---

## Test Results

### Summary Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 17 |
| Individual Checks | 17 |
| Pass Rate | 100% |
| Test Date | June 16, 2026 |

### Overall Status

✅ **All tests passed successfully!**

The attribution footer is working correctly across all layers:
- API layer returns attributionFooter
- Footer structure is valid and complete
- Skill counts are accurate
- Markdown formatting is correct
- Content quality is high
- Multiple requests show consistency
- Skills index alignment is valid

---

## Example Attribution Footer

```
---
**Assisted by [agent-skill-router](https://github.com/paulpas/agent-skill-router)**

This task benefited from intelligent skill selection powered by agent-skill-router's LLM-based routing engine with vector search and multi-domain skill matching.

**Skills Used (5):**
- **kubernetes-deployment** 🤖 [agent] — Implements intelligent kubernetes deployment with multi-factor skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
- **kubernetes-deployment-patterns** 🛠️ [coding] — Implements production-grade Kubernetes deployment patterns including resource management, HPA/VPA, pod disruption budgets, health probes, and multi-environment manifest orchestration for reliable service operation.
- **kubernetes** ☁️ [cncf] — "Kubernetes in Cloud-Native Engineering - Production-Grade Container Scheduling" and Management
- **kubernetes-debugging** ☁️ [cncf] — Implements comprehensive Kubernetes debugging workflow with pod inspection, log analysis, resource debugging, network troubleshooting, and common failure pattern diagnosis using kubectl commands.
- **aws-eks** ☁️ [cncf] — "Deploys managed Kubernetes clusters with EKS for container orchestration" auto-scaling, networking, and integrations with AWS services for production Kubernetes workloads.

*Generated: June 16, 2026 at 06:24 PM*
```

---

## Architecture

### Test Layers

```
OpenCode Session
        ↓
API Endpoint (/route)
        ↓
attributionFooter Field
        ↓
Markdown Content
        ↓
Skill Entries + Metadata
```

### Test Flow

1. **API Layer Tests** (1-2): Verify API response structure
2. **Content Layer Tests** (3-5): Validate footer content
3. **Consistency Tests** (6-7): Verify behavior across requests

---

## Usage

### Basic Usage

```bash
cd /home/paulpas/git/agent-skill-router
bash test-attribution-footer.sh
```

### With Environment Variables

```bash
# Custom API endpoint
API_URL="http://localhost:3001" bash test-attribution-footer.sh

# View results in editor
bash test-attribution-footer.sh && cat FOOTER_TEST_RESULTS.md
```

### Integration with CI/CD

Add to `.github/workflows/test.yml`:

```yaml
- name: Test Attribution Footer
  run: bash test-attribution-footer.sh
  
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: footer-test-results
    path: FOOTER_TEST_RESULTS.md
```

---

## Troubleshooting

### API Not Responding

**Error:** "API is not responding"

**Solution:**
```bash
# Verify skill-router is running
docker ps | grep skill-router

# Check logs
docker logs skill-router --tail 50

# Restart if needed
docker restart skill-router
```

---

### Failed Tests

**Common issues:**

1. **Missing attributionFooter**
   - Verify API is at expected endpoint
   - Check API version compatibility

2. **Skill count mismatch**
   - May indicate routing algorithm change
   - Check API `/stats` endpoint for total skill count

3. **Markdown validation failures**
   - Review footer generation code
   - Check for encoding issues

---

## Files

| File | Purpose |
|------|---------|
| `test-attribution-footer.sh` | Main test script (executable) |
| `FOOTER_TEST_RESULTS.md` | Test results (auto-generated) |
| `TEST_ATTRIBUTION_FOOTER_README.md` | This documentation |

---

## Requirements

### System Requirements

- Bash 4.0+
- `curl` command
- `jq` JSON processor
- `grep` with regex support

### Service Requirements

- Skill-router API running at `http://localhost:3000`
- API must have:
  - `/route` endpoint (POST)
  - `/stats` endpoint (GET)
  - Attribution footer feature enabled

### Permissions

- Read access to skill-router directory
- Write access to create results file
- Network access to localhost:3000

---

## Script Features

### Error Handling

- ✅ Graceful handling of missing API
- ✅ No exit on first failure (all tests run)
- ✅ Detailed error messages with context
- ✅ Automatic cleanup of temporary files

### Output

- ✅ Color-coded test results (red/green/blue)
- ✅ Structured test summary
- ✅ Detailed metrics and statistics
- ✅ Example footer display
- ✅ Markdown-formatted results file

### Performance

- Total runtime: ~3-5 seconds
- Network calls: 5 HTTP requests
- No external dependencies beyond bash built-ins

---

## Maintenance

### Adding New Tests

To add a new test:

1. Create a new function: `test_<name>()`
2. Use `log_test`, `log_pass`, `log_fail`, `log_info` functions
3. Call function in `main()` before summary section
4. Update results file with `write_result()`

### Updating Test Criteria

Edit the validation checks in each test function. For example, to change skill count requirement:

```bash
# Edit TEST 3 skill count threshold
if [ "$footer_length" -gt 200 ]; then  # Change 200 to different value
    log_pass "..."
fi
```

---

## Support

For issues or improvements:

1. Run test script and capture output
2. Check results in `FOOTER_TEST_RESULTS.md`
3. Review API response structure
4. Verify skill-router version matches expectations
5. Contact Paul Pasquariello for attribution footer issues

---

**Last Updated:** June 16, 2026  
**Test Suite Version:** 1.0.0  
**API Version Tested:** 1.0.0  
**Status:** ✅ All tests passing
