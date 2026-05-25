---
name: shell-parameter-expansion
description: Applies bash parameter expansion operators (default values, error messages,
  substitution, pattern matching, case modification) to write robust shell scripts
  that safely handle unset variables and edge cases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  triggers: bash parameter expansion, ${VAR:-default}, variable default value, shell
    variable substitution, pattern matching shell, case modification, how do i handle
    unset variables, bash safe defaults, ${##pattern}, ${VAR:?error}, shell scripting
    safety
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: linux-services, coding-output-sanitization, linux-shell-process-management
------
# Shell Parameter Expansion Patterns

Applies bash parameter expansion operators to write robust shell scripts that safely handle unset variables, provide defaults, detect errors early, perform pattern matching and substitution, and modify case — all without spawning subprocesses. These built-in expansions execute in the current shell process with zero external command overhead, making them faster than alternatives like `sed`, `awk`, or `[ -z "$VAR" ]` conditional checks. This skill covers every expansion operator (`:-`, `:=`, `:?`, `:+`, `#`, `##`, `%`, `%%`, `//`, `~`, `${!prefix*}`), their precedence, and practical patterns for configuration loading, path manipulation, string processing, and defensive scripting idioms.

## TL;DR Checklist

- [ ] Use `${VAR:-default}` (not `${VAR-default}`) to substitute when the variable is empty OR unset — empty strings are a common source of bugs in shell scripts
- [ ] Use `${VAR:?error message}` at script entry points to fail fast on missing required arguments instead of continuing with undefined behavior downstream
- [ ] Use `${##pattern}` (greedy) and `${%pattern}` (non-greedy suffix) for path manipulation — never use `basename`/`dirname` subprocesses when parameter expansion suffices
- [ ] Use `${VAR,,}` / `${VAR^^}` for case modification instead of `tr '[:upper:]' '[:lower:]'` — single builtin, zero subprocess overhead
- [ ] Always quote expansion results (`"${VAR:-default}"`) to prevent word splitting and globbing on values containing spaces or wildcards
- [ ] Combine multiple expansions in a single variable reference where appropriate (e.g., `${VAR^^:-UNKNOWN}` is NOT valid — expand inner first: `"${VAR^^}"` then apply default)

---

## When to Use

Use this skill when:

- Writing shell scripts that need safe defaults for configuration variables, environment values, or function arguments
- Validating required inputs at the top of a script with descriptive error messages before any downstream logic executes
- Manipulating file paths (extracting directory, filename, extension, or stripping prefixes/suffixes) without spawning `dirname`, `basename`, or `sed` subprocesses
- Converting variable values between upper and lowercase for case-insensitive comparisons or normalization
- Processing strings from environment variables, command output, or user input where the shell must transform values before use

## When NOT to Use

Avoid this skill for:

- Complex text transformations requiring regex with backreferences — bash parameter expansion patterns are glob-style only; use `sed`, `awk`, or `perl` for true regular expressions
- Arithmetic operations — bash arithmetic uses `$(( ))` syntax, not parameter expansion operators
- Multi-line string manipulation where line-by-line processing is needed — use `while read` loops with process substitution instead
- When the variable might contain embedded newlines and you need to preserve them through a transformation that splits on whitespace

---

## Core Workflow

1. **Classify the Variable's Role** — Determine whether the variable represents an optional configuration value (use `:-` or `:=`), a required parameter with error signaling (`:?`), a string needing pattern extraction (`#`, `##`, `%`, `%%`), or data that requires case normalization (`,`, `^^`).
   **Checkpoint:** Required variables should use `:?` to fail early. Optional variables should use `:-` to provide defaults silently.

2. **Construct the Expansion** — Write the expansion using the correct operator. For defaults: `${VAR:-default_value}` substitutes when unset OR empty. For assignment with default: `${VAR:=default_value}` assigns AND returns. For error-on-empty: `${VAR:?error message}` aborts the script.
   **Checkpoint:** Verify that the pattern or default value is itself properly quoted if it contains spaces, special characters, or glob metacharacters.

3. **Apply Pattern Matching for Transformation** — When extracting parts of a string (path segments, filename extensions, prefix stripping), use the appropriate expansion: `#` removes shortest leading match, `##` removes longest leading match, `%` removes shortest trailing match, `%%` removes longest trailing match.
   **Checkpoint:** Choose between greedy (`##`, `%%`) and non-greedy (`#`, `%`) based on whether multiple delimiters exist — `##` strips the LAST occurrence of the pattern from the beginning.

4. **Handle Multiple Variables or Prefix Matching** — When you need to enumerate all variables matching a prefix (e.g., all environment variables starting with `DB_`), use `${!prefix*}` or `${!prefix@}` for expansion.
   **Checkpoint:** Use `${!prefix@}` when iterating in a `for` loop to get properly quoted word-split variable names.

5. **Quote Every Expansion** — Wrap every parameter expansion in double quotes to prevent word splitting and glob expansion on the result, unless intentional splitting is required (rare).
   **Checkpoint:** Run the script through `shellcheck` after writing — unquoted expansions are the single most common shell script bug pattern.

---

## Implementation Patterns

### Pattern 1: Default Value Substitution

Use `${VAR:-default}` to provide a fallback when a variable is unset or empty. This is the foundation of defensive shell scripting and prevents "unbound variable" errors in `set -u` environments.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ❌ BAD — unquoted expansion with no default fails on missing variables
# When LOG_LEVEL is unset: "bash: LOG_LEVEL: unbound variable" (under set -u)
# When LOG_LEVEL is empty string: the script silently uses an empty log level
log_level=$LOG_LEVEL                    # Unset → crash under set -u; empty → silent bug
timeout=$TIMEOUT                        # Same problem

process_request() {
    local duration=${1}                 # No default — fails if caller omits argument
    echo "Processing took ${duration}s"
}

process_request                          # Crashes: no argument provided to function

# ✅ GOOD — every variable has a safe expansion with explicit defaults
log_level="${LOG_LEVEL:-info}"          # Defaults to "info" when unset or empty
timeout="${TIMEOUT:-30}"                # 30-second default for request timeouts
retries="${RETRIES:-3}"                 # Integer default, used in loop below

process_request() {
    local duration="${1:-5}"            # Default 5 seconds if no argument given
    echo "Processing took ${duration}s"
}

# Safe even with empty string input — defaults activate for both unset AND empty
log_level=""                            # Empty string
echo "${log_level:-warn}"               # Outputs: warn (not empty)
```

### Pattern 2: Error-on-Empty with Descriptive Messages

Use `${VAR:?error message}` to abort immediately when a required variable is missing. This provides much better error diagnostics than letting the script fail downstream with an obscure error about an undefined value.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ❌ BAD — cryptic failure far from the source of the problem
api_key="${API_KEY}"                    # Fails with: "API_KEY: unbound variable"
curl -H "Authorization: Bearer ${api_key}" https://api.example.com/data   # Never reached, but error message is generic

# ✅ GOOD — explicit validation at entry point with actionable error messages
validate_required_vars() {
    local var_name="$1"
    local var_value="$2"
    
    [[ -n "${var_value}" ]] || {
        echo "ERROR: Required variable '${var_name}' is not set or empty." >&2
        echo "  Usage: export ${var_name}='your-value-here'" >&2
        return 1
    }
}

# Even better — use built-in :-? expansion which does the same thing natively
api_key="${API_KEY:?ERROR: API_KEY is not set. Export your API key before running this script.}"
endpoint="${ENDPOINT:?ERROR: ENDPOINT is not set. Example: https://api.example.com/v1}"

echo "Connected to ${endpoint} with key prefix: ${api_key:0:8}****"

# Validation function for multiple required variables at once
validate_required_vars() {
    local failures=0
    
    for var_name in API_KEY ENDPOINT DATABASE_URL; do
        local value="${!var_name:-}"
        if [[ -z "$value" ]]; then
            echo "ERROR: Required environment variable '${var_name}' is not set." >&2
            echo "  Set it with: export ${var_name}='<your-value>'" >&2
            failures=$((failures + 1))
        fi
    done
    
    if [[ $failures -gt 0 ]]; then
        echo "" >&2
        echo "Aborting: ${failures} required variable(s) missing." >&2
        return 1
    fi
}

validate_required_vars || exit 1
```

### Pattern 3: Path Manipulation with Greedy and Non-Greedy Patterns

Parameter expansion can extract path components, strip prefixes and suffixes, and perform string substitution without any external commands. This is significantly faster than spawning `dirname`, `basename`, or `sed` subprocesses.

```bash
#!/usr/bin/env bash
set -euo pipefail

file_path="/home/user/documents/reports/quarterly-summary-2024.pdf"

# ❌ BAD — spawns three subprocesses (dirname, basename, and a subshell for suffix extraction)
directory=$(dirname "$file_path")           # Subprocess: fork + exec dirname
filename=$(basename "$file_path")           # Subprocess: fork + exec basename
name_without_ext="${filename%.*}"            # This one IS parameter expansion — but only the last part
extension="${filename##*.}"                  # Extension extraction (this is fine)

# ✅ GOOD — all path operations in pure shell with zero subprocess overhead
# Extract directory using %% (greedy suffix removal — removes everything up to LAST /)
directory="${file_path%%/*}"                # WRONG — this is greedy PREFIX removal

# Correct approach:
directory="${file_path%/*}"                  # Remove shortest trailing slash + after: "/home/user/documents/reports"
filename="${file_path##*/}"                  # Remove longest leading pattern through last /: "quarterly-summary-2024.pdf"
name_without_ext="${filename%.*}"            # Remove shortest trailing .extension: "quarterly-summary-2024"
extension="${filename##*.}"                  # Remove longest leading *.: "pdf"

echo "Directory : ${directory}"
echo "Filename   : ${filename}"
echo "Base name  : ${name_without_ext}"
echo "Extension  : ${extension}"

# Greedy vs non-greedy distinction is critical:
path="/var/log/app/my-app-2024-01-15.log"

# %% removes longest trailing match of /*/ — strips everything from FIRST /
stripped="${path%%/*/}"                     # Removes "/var" (longest trailing glob matching /*/)

# % removes shortest trailing match of /*  — strips only the last directory component
last_component_removed="${path%/*}"         # Results in: "/var/log/app/my-app-2024-01-15"

# ## removes longest leading match of */ — strips everything up to LAST /
just_filename="${path##*/}"                 # "my-app-2024-01-15.log"

# # removes shortest leading match of */ — strips only the first directory component
short_prefix="${path#*/}"                   # "/log/app/my-app-2024-01-15.log"

echo "Longest trailing strip: ${stripped}"
echo "Shortest trailing strip: ${last_component_removed}"
echo "Just filename (greedy prefix): ${just_filename}"
echo "Short prefix strip: ${short_prefix}"

# String substitution with // (replace all occurrences)
config_string="host=db-prod-1,port=5432,host=db-prod-2,port=5433"
replaced="${config_string//db-prod/db-staging}"   # Replace ALL db-prod → db-staging
echo "${replaced}"          # host=db-staging-1,port=5432,host=db-staging-2,port=5433

# Substitute with context — only replace specific key=value pairs
config_string="database_host=localhost database_port=5432"
updated="${config_string/database_host=/database_host=prod-server}"
echo "${updated}"           # database_host=prod-server database_port=5432
```

### Pattern 4: Case Modification and String Transformation

Bash provides built-in case modification operators that convert strings to lowercase (`,`) or uppercase (`^^`) without spawning any external processes. These are essential for case-insensitive comparisons, input normalization, and generating consistent identifiers.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ❌ BAD — spawns subprocesses for case conversion
normalized_env=$(echo "$ENVIRONMENT" | tr '[:upper:]' '[:lower:]')   # fork + exec echo + exec tr
upper_name=$(echo "$SERVICE_NAME" | tr '[:lower:]' '[:upper:]')     # fork + exec echo + exec tr

# ✅ GOOD — pure shell parameter expansion, zero subprocess overhead
normalized_env="${ENVIRONMENT,,}"      # Lowercase: "production" → "production" (already lowercase)
upper_name="${SERVICE_NAME^^}"         # Uppercase: "my-service" → "MY-SERVICE"
title_case="${WORD,,}"                 # If WORD="hello", result: "hello"

# Practical usage: normalize environment names for comparison
normalize_env() {
    local env="${1:-unknown}"
    echo "${env,,}"                    # Always lowercase, with safe default
}

echo "Current env: $(normalize_env "${DEPLOY_ENVIRONMENT:-}")"

# Case modification combined with parameter expansion for full pipeline
extract_and_normalize() {
    local filename="$1"
    local base="${filename##*/}"        # Extract just the filename
    local ext="${base##*.}"             # Extract extension
    local name_without_ext="${base%.*}" # Remove extension
    
    echo "${name_without_ext,,}"        # Convert to lowercase for consistent naming
}

echo "$(extract_and_normalize "MyApplication_Config_v2.JSON")"  # Outputs: myapplication_config_v2

# Generate predictable identifiers from user input
generate_service_name() {
    local raw_name="${1:?ERROR: Service name required. Usage: generate_service_name 'my-service'}"
    local cleaned="${raw_name//[^a-z0-9-]/-}"   # Replace non-alphanumeric (except -) with hyphens
    echo "${cleaned,,}"                          # Normalize to lowercase
}

echo "$(generate_service_name "My App!@#$ Config")"  # Outputs: my-app----config → further cleanup needed
```

---

## Constraints

### MUST DO
- Always quote parameter expansions in double quotes (`"${VAR:-default}"`) to prevent word splitting on values containing spaces and glob expansion on values containing wildcards — unquoted expansions are the single most common source of shell script bugs
- Use `:?` with descriptive error messages for required variables that the script cannot function without — fail fast at the point of validation, not deep in downstream logic where the root cause is opaque
- Prefer parameter expansion over subprocess calls for simple string operations — `${VAR##*/}` is faster and safer than `basename "$VAR"`, and `${VAR%,*}` is faster than extracting fields with `cut` or `awk`
- Test expansions against both empty strings (`""`) and unset variables (`unset VAR`) — `:-` handles both, while `-` (without colon) only handles unset, which is a common source of subtle bugs

### MUST NOT DO
- Use `${VAR-default}` instead of `${VAR:-default}` when you want to treat empty strings the same as unset — the version without a colon considers an empty string to be "set" and will not substitute the default, leading to downstream failures
- Nest multiple operators in a single expansion (e.g., `${VAR,,:-default}` is NOT valid bash syntax) — perform transformations first, then apply defaults in a separate step
- Use parameter expansion for arithmetic operations — use `$(( ))` arithmetic expansion for math; mixing them causes silent type coercion bugs that are extremely difficult to debug
- Rely on `${!prefix*}` to enumerate environment variables as a replacement for proper configuration management — while useful for debugging, it does not guarantee order and may expose sensitive values accidentally

---

## Output Template

When implementing shell scripts with parameter expansion patterns, produce:

1. **Variable Classification** — For each variable: required (uses `:?`), optional-with-default (uses `:-`), or transformation-only
2. **Expansion Expressions** — The exact `${OPERATOR}` syntax used for each variable with a comment explaining why that operator was chosen
3. **Path Manipulation Map** — For any path strings: which expansion (`#`, `##`, `%`, `%%`) extracts each component and why that level of greediness was selected
4. **Subprocess Audit** — A list of all external commands the script spawns, with a note on whether each could be replaced by parameter expansion
5. **ShellCheck Verification** — Output from running `shellcheck` on the script, confirming zero warnings

---

## Related Skills

| Skill | Purpose |
|---|---|
| `linux-services` | Uses these parameter expansion patterns when configuring systemd unit files with variable substitution |
| `coding-output-sanitization` | Complements shell escaping safety; together they cover all data transformation before output |
| `linux-shell-process-management` | Works alongside job control and background process handling for complete shell scripting workflows |
