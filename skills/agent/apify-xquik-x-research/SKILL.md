---
name: apify-xquik-x-research
description: Orchestrates bounded X post and audience research with Xquik Apify Actors, preserving source context, approval gates, diagnostics, and sampling limits.
license: MIT
compatibility: opencode
metadata:
  version: '1.0.0'
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: xquik x research, x tweet scraper, x follower scraper, apify x data, analyze x conversations, compare x audiences, how do i research x
  archetypes: [orchestration, strategic, tactical]
  anti_triggers:
    - post to x
    - manage an x account
    - scrape an unrelated website
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: apify-audience-analysis, apify-brand-reputation-monitoring, apify-content-analytics, apify-trend-analysis
---

# Apify Xquik X Research

Orchestrate bounded X research with 2 Xquik Apify Actors. Use the X Tweet
Scraper for posts and conversations. Use the X Follower Scraper for audiences,
lists, and communities. Keep every finding traceable to its source record.

## TL;DR Checklist

- [ ] Define the research question, targets, dates, and maximum result count
- [ ] Select only the Actor workflows needed for that question
- [ ] Inspect each default build input schema before preparing a run
- [ ] Review live pricing on each Actor page
- [ ] Show the exact input and get explicit approval before every run
- [ ] Bound the whole run and each target when the mode supports it
- [ ] Keep tokens in the `Authorization` header
- [ ] Separate diagnostics and run reports from research records
- [ ] Preserve source URLs, target metadata, and sampling caveats

## When to Use

Use this skill when:

- Validating a claim against recent or top X posts
- Comparing themes, engagement, or media across search terms
- Reviewing a profile timeline, thread, reply tree, or quote conversation
- Sampling followers or following accounts for a selected profile
- Comparing audience overlap across profiles, lists, or communities
- Adding bounded X evidence to reputation, content, or trend analysis

## When NOT to Use

Avoid this skill when:

- The task posts, likes, follows, messages, or changes an X account
- The task needs private account data or bypasses access controls
- A single known public post URL already answers the question
- The requested sample has no defined scope or result cap
- The source is not X or the workflow does not require an Apify Actor

## Actors

| Actor                                                            | Identifier                 | Use                                                                                                        |
| ---------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [X Tweet Scraper](https://apify.com/xquik/x-tweet-scraper)       | `xquik~x-tweet-scraper`    | Posts, search, profiles, lists, articles, replies, quotes, threads, retweeters, and best-effort favoriters |
| [X Follower Scraper](https://apify.com/xquik/x-follower-scraper) | `xquik~x-follower-scraper` | Followers, following, verified followers, list members, list followers, and community members              |

Read current pricing from each Actor page. Never hardcode a price. An Apify run
can incur charges, so every POST request requires explicit user approval.

## Orchestration Flow

```text
Research question
       |
       v
Define targets, dates, and caps
       |
       v
Inspect live schemas and pricing
       |
       v
Show exact input and request approval
       |
       +--------------------+
       |                    |
       v                    v
Tweet Actor needed?    Follower Actor needed?
       |                    |
       +---------+----------+
                 |
                 v
Separate research and control records
                 |
                 v
Analyze with source links and caveats
```

## Core Workflow

### 1. Bound the Question

Write one question that the output must answer. Then define:

- Approved search terms, profiles, post IDs, list IDs, or community IDs
- Inclusive date boundaries when time matters
- A whole-run maximum
- A per-target maximum
- Required post, profile, source, and diagnostic fields

Prefer the smallest sample that can answer the question. Never describe a
bounded sample as a complete population.

### 2. Inspect the Current Input Schemas

The default build schemas are the source of truth. These GET requests do not
start Actor runs:

```bash
curl -sS \
  "https://api.apify.com/v2/actors/xquik~x-tweet-scraper/builds/default" \
  | jq -r '.data.inputSchema' \
  | jq .

curl -sS \
  "https://api.apify.com/v2/actors/xquik~x-follower-scraper/builds/default" \
  | jq -r '.data.inputSchema' \
  | jq .
```

Confirm every proposed key against the returned schema. Recheck the schema
after a validation error. Do not infer renamed fields from an old example.

### 3. Prepare a Bounded Post Run

Use the Tweet Actor only when posts or conversations answer the question.
Replace example terms with approved targets. Show this complete payload before
requesting approval:

```bash
apify_actors_api="https://api.apify.com/v2/actors"
tweet_actor="xquik~x-tweet-scraper"
sync_path="run-sync-get-dataset-items"

curl -sS -X POST \
  "${apify_actors_api}/${tweet_actor}/${sync_path}?timeout=120" \
  -H "Authorization: Bearer ${APIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "mode": "search",
    "searchTerms": ["product launch", "from:example AI"],
    "queryType": "Latest + Top",
    "includeSearchTerms": true,
    "outputVariant": "rich",
    "fieldStyle": "camelCase",
    "outputPreset": "nested",
    "maxItems": 50,
    "maxItemsPerTarget": 25
  }'
```

`maxItems` caps the entire run across all search terms. It is not a per-term
limit. Use `maxItemsPerTarget` only for supported multi-target modes.

Supported modes are `legacy`, `tweet`, `tweets`, `search`, `profileTweets`,
`profileReplies`, `profileMedia`, `profileLikes`, `listTweets`, `article`,
`replies`, `quotes`, `thread`, `retweeters`, and `favoriters`. Choose only the
mode required by the question. Keep the source URL and matched term attached
to every retained post.

### 4. Prepare a Bounded Audience Run

Use the Follower Actor only when audience context changes the conclusion. Show
the exact payload before requesting approval:

```bash
apify_actors_api="https://api.apify.com/v2/actors"
follower_actor="xquik~x-follower-scraper"
sync_path="run-sync-get-dataset-items"

curl -sS -X POST \
  "${apify_actors_api}/${follower_actor}/${sync_path}?timeout=120" \
  -H "Authorization: Bearer ${APIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "twitterHandles": ["example", "competitor"],
    "relation": "followers",
    "outputMode": "compact",
    "includeTargetMetadata": true,
    "dedupeMode": "merge",
    "maxItems": 50,
    "maxItemsPerTarget": 25
  }'
```

Supported relations include `followers`, `following`, `verified_followers`,
`list_members`, `list_followers`, and `community_members`. Use
`dedupeMode: "merge"` when comparing targets. Preserve the source target,
relation, overlap context, profile URL, and user ID.

### 5. Route Control Records

Parse the result boundary before analysis:

1. Separate post or profile records from diagnostics and run reports.
2. Retain control records for troubleshooting.
3. Exclude control records from post and profile totals.
4. Mark unavailable, partial, or filtered targets.
5. Stop if the result cannot answer the stated question.

This applies the `code-philosophy` laws: parse at the external boundary, fail
fast on invalid state, and exit early when the evidence is insufficient.

### 6. Analyze Traceable Evidence

For post research, retain:

- Post URL and ID
- Author identity
- Creation time
- Matching term or source target
- Text, media, and quoted-post context
- Public engagement fields used in the analysis

For audience research, retain:

- Profile URL and user ID
- Source target and selected relation
- Target metadata
- Dedupe and overlap context
- Public profile fields used in the analysis

State which observations come directly from records. Label every interpretation
as an inference. Keep source links beside the findings they support. A follow
does not prove endorsement, intent, or a sensitive trait.

## Fallback and Error Routing

- **Missing `APIFY_TOKEN`**: Stop and ask the user to configure it. Never
  print or persist it.
- **Schema endpoint unavailable**: Stop payload construction. Retry later or
  inspect the current Actor page. Never guess fields.
- **HTTP 402**: Stop. Recheck live pricing and Apify billing before requesting
  new approval.
- **Synchronous timeout**: Reduce scope first. Offer an asynchronous run only
  with fresh approval.
- **Empty dataset**: Recheck target spelling, date bounds, relation, filters,
  and schema keys.
- **Partial target failure**: Continue only if the remaining data answers the
  question. Label the result partial.
- **One Actor is unnecessary**: Exit that branch early. Do not collect
  unrelated post or audience data.
- **Control-only dataset**: Stop analysis and report the diagnostics. Do not
  invent findings.

## Constraints

### MUST DO

- Inspect live schemas before constructing each payload
- Review live pricing before requesting run approval
- Require explicit approval for every POST request
- Set a whole-run cap and a per-target cap when supported
- Send `APIFY_TOKEN` only through the `Authorization` header
- Keep diagnostic records and source context
- Report sample boundaries and partial results
- Use only public data returned through the approved Actor workflow

### MUST NOT DO

- Start a paid Actor run without explicit approval
- Put an Apify token in a URL, file, chat response, or log
- Hardcode Actor pricing
- Guess schema fields or silently ignore validation errors
- Treat `maxItems` as a per-search-term limit
- Count diagnostics as posts or profiles
- Claim a bounded sample represents a full audience
- Use these Actors to change an X account

## Output Template

Return:

1. **Question**: The research question and decision it supports
2. **Scope**: Targets, dates, relations, and exclusions
3. **Run Plan**: Actor identifiers, exact inputs, and caps
4. **Approval**: Pricing reviewed and run approval status
5. **Data Quality**: Record types, diagnostics, missing targets, and caveats
6. **Findings**: Evidence with source links
7. **Audience Context**: Dedupe and overlap findings when requested
8. **Limitations**: Sampling, availability, and inference boundaries
9. **Reproduction**: Secret-free input JSON

## Related Skills

| Skill                                                                                | Purpose                                 |
| ------------------------------------------------------------------------------------ | --------------------------------------- |
| [`apify-audience-analysis`](../apify-audience-analysis/SKILL.md)                     | Frame audience segments and comparisons |
| [`apify-brand-reputation-monitoring`](../apify-brand-reputation-monitoring/SKILL.md) | Route reputation monitoring workflows   |
| [`apify-content-analytics`](../apify-content-analytics/SKILL.md)                     | Structure post and content analysis     |
| [`apify-trend-analysis`](../apify-trend-analysis/SKILL.md)                           | Compare time-bound conversation trends  |

Xquik is an independent third-party service. Not affiliated with X Corp.
"Twitter" and "X" are trademarks of X Corp.
