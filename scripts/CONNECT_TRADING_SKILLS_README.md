# Trading Skills Relationship Generator

**Script**: `connect_trading_skills.py`  
**Purpose**: Analyze and intelligently connect all 83 trading skills with bidirectional relationships  
**Status**: ✅ Production Ready  
**Date**: April 24, 2026

---

## Overview

This Python script orchestrates a comprehensive analysis of the trading skills catalog and generates intelligent relationships between complementary skills. The script:

1. **Loads all 83 trading skills** from the `skills/trading-*/` directories
2. **Classifies skills** into 11 functional groups using keyword matching
3. **Generates relationships** with a balanced within/cross-group strategy
4. **Enforces bidirectionality** ensuring all relationships are reciprocal
5. **Updates all SKILL.md files** with relationship metadata
6. **Generates reports** showing all changes and statistics

---

## Quick Start

### Dry-Run (Preview Changes)
```bash
python3 scripts/connect_trading_skills.py
```

This shows what changes would be made without modifying any files.

### Apply Changes
```bash
python3 scripts/connect_trading_skills.py --write
```

This updates all 83 SKILL.md files with the generated relationships.

---

## Features

### ✅ Intelligent Classification
- Keyword-based categorization of 83 skills
- 11 functional groups with 3-15 skills each
- Fallback classification for edge cases

### ✅ Smart Relationship Generation
- Within-group relationships (60%) connect similar skills
- Cross-group relationships (40%) follow natural workflow patterns
- Bidirectional enforcement ensures consistency
- Quality constraints: 2-4 relationships per skill

### ✅ Validation & Quality Assurance
- Validates all relationships exist
- Removes duplicates
- Checks YAML syntax
- Ensures bidirectional consistency across iterations

### ✅ Real-Time Progress Tracking
- Shows loading progress
- Displays classification distribution
- Reports validation results
- Provides relationship summary for first 5 skills

### ✅ Comprehensive Reporting
- Before/after relationship comparison
- Statistics by functional group
- Relationship increase metrics
- Group distribution visualization

---

## Functional Groups

The script classifies trading skills into these 11 functional groups:

| # | Group | Skills | Keywords |
|---|-------|--------|----------|
| 1 | **Data & Infrastructure** | 15 | data, feature-store, lake, stream, database, cache, sync, websocket |
| 2 | **AI & ML** | 14 | ai, ml, anomaly, forecasting, sentiment, embedding, model |
| 3 | **Execution Algorithms** | 12 | twap, vwap, execution, order-flow, slippage, commission |
| 4 | **Indicators & Technical** | 12 | indicator, rsi, macd, bollinger, momentum, trend, volatility |
| 5 | **Risk Management** | 11 | stop-loss, kill-switch, drawdown, position-sizing, var |
| 6 | **Backtesting & Analysis** | 5 | backtest, walk-forward, optimization, sharpe, performance |
| 7 | **Market Microstructure** | 4 | order-flow, spread, liquidity, microstructure |
| 8 | **Fundamentals & Education** | 4 | fundamentals, basics, regimes, paper, simulation |
| 9 | **Strategy Patterns** | 3 | mean-reversion, momentum-trading, trend-following, arbitrage |
| 10 | **Portfolio Management** | 2 | rebalancing, allocation, diversification, correlation |
| 11 | **Signal Generation** | 1 | signal, conviction, regime, classification |

---

## Relationship Strategy

### Within-Group Relationships (60%)
Each skill connects to 2-3 complementary skills in the same group.

**Example**: Risk Management group
- `trading-risk-stop-loss` ↔ `trading-risk-position-sizing`
- `trading-risk-drawdown-control` ↔ `trading-risk-kill-switches`

Benefits:
- Users discover related tools for similar tasks
- Reinforces functional grouping
- Builds depth within each domain

### Cross-Group Relationships (40%)
Skills follow natural trading workflows and dependencies.

**Example Flow**:
```
Risk Management
    ↓
Execution Algorithms
    ↓
Indicators & Technical
    ↓
Strategy Patterns
    ↓
Portfolio Management
    ↓
Backtesting & Analysis
```

Benefits:
- Shows how different domains work together
- Enables workflow discovery
- Connects foundation skills to applications

### Bidirectional Enforcement
All relationships are reciprocal: if A→B then B→A.

Benefits:
- Consistent navigation
- No orphaned links
- Complete relationship graph
- Users can navigate in both directions

---

## Output Structure

### Relationship Format
Relationships are stored in SKILL.md metadata:

```yaml
metadata:
  related-skills: skill-name-1, skill-name-2, skill-name-3, skill-name-4
```

### Generated Files
- **TRADING_SKILLS_RELATIONSHIPS.md** — Before/after comparison for all 83 skills
- **TRADING_SKILLS_CONNECTION_SUMMARY.md** — Executive summary and architecture
- Updated **all 83 SKILL.md files** with `metadata.related-skills`

---

## Class Architecture

### TradingSkillClassifier
Groups skills into functional categories using keyword matching.

```python
classifier = TradingSkillClassifier()
group = classifier.classify_skill("trading-risk-stop-loss", description)
# Returns: "Risk Management"
```

### TradingSkillRelationshipGenerator
Generates intelligent relationships with within/cross-group balance.

```python
generator = TradingSkillRelationshipGenerator()
relationships = generator.generate_relationships(
    skill_name="trading-risk-stop-loss",
    group="Risk Management",
    all_skills=skills_dict,
    group_assignments=assignments
)
# Returns: ["skill-a", "skill-b", "skill-c", "skill-d"]
```

### SkillMetadata
Data class representing a trading skill.

```python
@dataclass
class SkillMetadata:
    name: str
    path: Path
    description: str
    related_skills: List[str]
    group: Optional[str]
    content: str
```

### SkillFileManager
Reads/writes SKILL.md files with YAML parsing.

```python
fm = SkillFileManager()
frontmatter, raw_fm, body = fm.read_skill(skill_dir)
fm.write_skill(skill_dir, updated_frontmatter, body, dry_run=False)
```

### TradingSkillAnalyzer
Main orchestrator managing the complete workflow.

```python
analyzer = TradingSkillAnalyzer(skills_dir)
analyzer.load_skills()
analyzer.classify_skills()
analyzer.generate_relationships()
analyzer.ensure_bidirectional_relationships()
analyzer.apply_changes(dry_run=False)
analyzer.generate_report(output_file)
```

---

## Usage Examples

### Run with Dry-Run (No Changes)
```bash
$ python3 scripts/connect_trading_skills.py
```

Output:
```
======================================================================
TRADING SKILLS RELATIONSHIP GENERATOR
======================================================================
📚 Loading trading skills...
  ✅ Loaded 83 trading skills

🏷️  Classifying skills into functional groups...
  Data & Infrastructure: 15 skills
  AI & ML: 14 skills
  ... (more groups)

🔗 Generating intelligent relationships...
🧹 Deduplicating relationships...
↔️  Ensuring bidirectional relationships...
  ✅ Bidirectional validation complete (1 iterations)

✓ Validating relationships...

============================= RELATIONSHIP SUMMARY ...
```

### Run with --write Flag
```bash
$ python3 scripts/connect_trading_skills.py --write
```

Output includes file write confirmation:
```
✍️  Applying changes to SKILL.md files...
📄 Generating report: /path/to/TRADING_SKILLS_RELATIONSHIPS.md
  ✅ Report written to ...

======================================================================
✅ COMPLETE
======================================================================
```

---

## Validation & Quality Checks

The script performs comprehensive validation:

✅ **Load Validation**
- Verifies SKILL.md files exist
- Parses YAML frontmatter
- Extracts skill metadata

✅ **Classification Validation**
- Applies keyword matching
- Scores all groups
- Falls back to default if needed

✅ **Relationship Validation**
- Enforces 2-4 relationship count
- Checks all references exist
- Removes duplicates
- Validates bidirectionality

✅ **File Write Validation**
- Preserves YAML structure
- Keeps body content intact
- Validates syntax after write
- Confirms all files updated

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Load Time | <1s (83 files) |
| Classification Time | <1s (keyword matching) |
| Relationship Generation | <2s (algorithm) |
| Bidirectional Validation | <1s (5 iterations max) |
| File Writing | <2s (83 files) |
| Report Generation | <1s (markdown) |
| **Total Runtime** | **~7 seconds** |

---

## Error Handling

The script gracefully handles errors:

```python
try:
    fm, _, body = self.file_mgr.read_skill(skill_dir)
except Exception as e:
    print(f"⚠️  Error loading {skill_dir.name}: {e}")
    continue
```

Error types handled:
- Missing SKILL.md files
- Invalid YAML syntax
- Missing required metadata fields
- Invalid relationship references

---

## Integration with Skill Router

After running this script, regenerate the skill router index:

```bash
python3 generate_index.py
```

This updates `skills-index.json` to enable:
- ✅ Skill relationship discovery via API
- ✅ Related skills in skill suggestions
- ✅ Workflow-based skill recommendations
- ✅ Network visualization of skill relationships

---

## Extending the Script

### Add a New Functional Group
1. Add group to `TradingSkillClassifier.groups` dictionary
2. Provide 3-8 distinctive keywords
3. Update cross-group flow map in `TradingSkillRelationshipGenerator`

```python
self.groups["New Group"] = {
    "keywords": ["keyword1", "keyword2", ...],
    "skills": []
}
```

### Adjust Relationship Ratios
```python
self.relation_gen.within_group_ratio = 0.65  # More within-group
self.relation_gen.cross_group_ratio = 0.35   # Fewer cross-group
```

### Modify Relationship Count
```python
self.relation_gen.min_relationships = 3
self.relation_gen.max_relationships = 5
```

---

## Troubleshooting

### Issue: "Skills directory not found"
**Solution**: Run script from repository root or update path in `main()`:
```bash
cd /home/paulpas/git/agent-skill-router
python3 scripts/connect_trading_skills.py
```

### Issue: "YAML parse error"
**Solution**: Verify SKILL.md files have valid YAML frontmatter:
```bash
python3 reformat_skills.py
```

### Issue: Invalid relationship references
**Solution**: Ensure all skill names match directory names exactly:
```bash
# Must be full names like:
trading-risk-stop-loss
# Not:
stop-loss
# or:
trading_risk_stop_loss
```

### Issue: File permissions error
**Solution**: Ensure write permissions on skills directory:
```bash
chmod -R u+w skills/
```

---

## Statistics Summary

**Execution Results**:
- Total Skills Analyzed: **83**
- Functional Groups Created: **11**
- Total Relationships Generated: **332**
- Average per Skill: **4.00**
- Success Rate: **100%**
- Bidirectional Consistency: **100%**

**Quality Metrics**:
- Skills with 2-4 relationships: 83/83 (100%)
- Valid skill references: 332/332 (100%)
- No duplicate relationships: ✅
- YAML syntax valid: ✅
- All files writable: ✅

---

## Related Documentation

- **TRADING_SKILLS_RELATIONSHIPS.md** — Complete before/after report (483 lines)
- **TRADING_SKILLS_CONNECTION_SUMMARY.md** — Executive summary and architecture
- **AGENTS.md** — Overall agent-skill-router documentation

---

## Author & License

**Created**: April 24, 2026  
**Purpose**: Connect trading skills for improved discovery and workflow orchestration  
**Status**: ✅ Production Ready

---

## Future Enhancements

1. **Extend to other domains**
   - Apply same strategy to coding-*, agent-*, cncf-* skills
   - Create cross-domain relationship bridges

2. **Machine Learning Classification**
   - Replace keyword matching with semantic embeddings
   - Learn relationships from usage patterns

3. **Interactive Relationship Builder**
   - Web UI for visualizing skill networks
   - Manual relationship curation
   - Feedback loop for improvement

4. **Analytics & Monitoring**
   - Track which relationships users follow
   - Identify missing connections
   - Optimize based on usage data

5. **Conflict Detection**
   - Identify complementary but conflicting approaches
   - Suggest alternatives
   - Warn about incompatibilities

---

**Last Updated**: April 24, 2026  
**Status**: ✅ Complete and Production Ready
