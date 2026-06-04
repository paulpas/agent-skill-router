---
name: just-task-runner
description: Implements the Just task runner as a modern alternative to GNU Make with named arguments, subcommands, runsets, environment file support, and cross-platform portability for developer workflow automation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: justfile, just task runner, casey just, named arguments, runsets, recipe variables, dotenv, cross-platform make alternative
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
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
    - do-dont
    - examples
  related-skills: makefile, linux-make-build-system, coding-mage-build-tool
---

# Just Task Runner — Modern Build Orchestration

Acts as a senior developer who designs clean, portable build scripts using Just's full feature set. When this skill is active, the model creates structured `justfile` files with named arguments, subcommands, dotenv integration, and platform-agnostic recipe execution for developer workflow automation.

## TL;DR Checklist

- [ ] Place `justfile` at project root — never nest it in subdirectories
- [ ] Use named arguments with defaults for every user-facing parameter (e.g., `target := "debug"`)
- [ ] Declare `.private:` before internal recipes to hide them from `just --list`
- [ ] Enable `dotenv-load` at the top of recipe blocks that need environment variables
- [ ] Use backtick variables (`var := `backtick expression`backtick`) for computed values like timestamps or git info
- [ ] Group related recipes into subcommands using `subcommand:` syntax (e.g., `db:`, `docker:`)
- [ ] Always include a `help:` recipe as the first entry in the justfile

---

## When to Use

Use this skill when:

- Replacing a Makefile that's hard to read due to tab/space confusion or complex variable scoping
- Need named arguments with defaults so team members run `just deploy --env staging` without memorizing flag order
- Team works across Linux, macOS, and Windows needing identical recipe execution without platform-specific shells
- Want `.env` file support baked in without external tools like direnv or custom shell wrappers
- Building CLI tooling or developer experience scripts that benefit from subcommands (e.g., `just docker build`, `just db migrate`)

---

## When NOT to Use

Avoid this skill for:

- Need incremental build tracking with file dependency graphs → use Make or Bazel instead
- Maintaining a C/C++ project requiring Make's pattern rules (`%.o: %.c`) and automatic dependency generation
- CI/CD system has no Just binary available and cannot install dependencies
- Project already uses Gradle, Maven, or Nx for its build pipeline — don't layer a second tool
- Recipes require complex shell pipelines with `&&`, `||`, or process substitution — Just's shell integration handles these but native Make rules are more idiomatic

---

## Core Workflow

1. **Project Setup and Installation** — Install `just` from your system package manager. Verify version 1.20+ for full feature support including runsets, subcommands, and `.env` loading. Check existing project root for a Makefile or shell script that Just can replace.
   **Checkpoint:** Run `just --version` and confirm ≥ 1.20.0 before proceeding.

2. **Create Justfile with Settings** — Start the justfile with global settings block: `dotenv-load`, `export-vars`, and `shell`. Define backtick variables for computed values. Add a `help:` recipe as the first entry. This becomes the contract all team members follow.
   **Checkpoint:** Run `just --list` to verify help output is readable and complete before adding more recipes.

3. **Define Recipes with Named Arguments** — Translate existing build/deploy/test commands into Just recipes using named arguments with defaults instead of positional flags or hardcoded values. Use `set dotenv-load` at the top of any recipe that reads from `.env`. Group related recipes under subcommands using `subcommand:` syntax.
   **Checkpoint:** Every public recipe must have a `##` comment describing its purpose and accepted arguments.

4. **Deploy and Release Workflows** — Implement environment-specific deploy recipes with rollback support. Use conditional logic based on argument values (e.g., `env ?= "production"` with `@if env == "staging" { ... }`). Add release tagging and changelog generation as a separate subcommand.
   **Checkpoint:** Deploy recipe must validate required variables exist before executing any remote commands.

5. **Maintenance and Quality Recipes** — Add cleanup, formatting, linting, and auditing recipes. These should be idempotent (safe to run multiple times) and fast. Group them under a `.maintenance:` private subcommand or `quality:` public subcommand.
   **Checkpoint:** Format recipe must run successfully on a clean checkout before committing the justfile.

---

## Implementation Patterns

### Pattern 1: Variable Interpolation and Computed Values

Just supports backtick variables that execute shell commands and capture output at parse time. Use these for computed values like timestamps, git commit hashes, and platform detection. Conditional expressions (`expr ?= default`) provide fallback defaults.

```just
# Platform detection using backtick variable
os := `uname -s`
arch := `uname -m`
timestamp := `date +%Y%m%d-%H%M%S`
git_branch := `git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main"`

# Conditional default with fallback chain
app_name ?= "myapp"
config_file := "config/{{ app_name }}.yaml"

# Computed version from git tags
version ?= `git describe --tags --always 2>/dev/null || echo "0.0.0"`

build:
    @echo "Building {{ app_name }} v{{ version }}"
    @echo "Platform: {{ os }}/{{ arch }}"
    @echo "Branch: {{ git_branch }}"
    # Use the computed values in your actual build command
    ./scripts/build.sh --version "{{ version }}" --output "dist/{{ app_name }}-{{ version }}"
```

### Pattern 2: Environment File Management and Secret Validation

Just natively loads `.env` files when `dotenv-load` is set. Validate secrets are present before any deployment or sensitive operation. Use `.private:` to hide internal validation recipes from the public listing.

```just
set dotenv-load
set export-vars

# Load these variables from .env with defaults for non-sensitive values
DB_HOST ?= "localhost"
DB_PORT := 5432
AWS_REGION ?= "us-east-1"

# Validation recipe - hidden from --list
.private: validate-env
    # Ensure all required secrets are present before proceeding
    @if [ -z "$DATABASE_URL" ]; then \
        echo "ERROR: DATABASE_URL not set in .env file" >&2; \
        exit 1; \
    fi
    @if [ -z "$AWS_ACCESS_KEY_ID" ]; then \
        echo "ERROR: AWS_ACCESS_KEY_ID not set in .env file" >&2; \
        exit 1; \
    fi
    @echo "Environment validation passed ✓"

# Database connection check using validated environment
private validate-db: validate-env
    @echo "Checking database connectivity..."
    pg_isready -h "$DB_HOST" -p "{{ DB_PORT }}" -U "$DB_USER" || { \
        echo "Database unreachable at {{ DB_HOST }}:{{ DB_PORT }}" >&2; \
        exit 1; \
    }

# Production deployment with secret validation
deploy: .private validate-env
    @echo "Deploying to $ENV region $AWS_REGION"
    AWS_REGION="{{ AWS_REGION }}" \
    DATABASE_URL="$DATABASE_URL" \
    ./scripts/deploy.sh --env "$ENV"
```

### Pattern 3: Subcommand Organization and Runsets

Group related recipes into named subcommands for clean CLI organization. Use runsets (multiple recipes that share the same recipe name with different arguments) for platform-specific or environment-specific variants.

```just
# ── Database Management Subcommand ───────────────────────────
database migrate:
    "Running database migrations..."
    docker compose exec postgres alembic upgrade head

database rollback: steps := 1:
    "Rolling back {{ steps }} migration(s)..."
    docker compose exec postgres alembic downgrade -{{ steps }}

database seed:
    "Seeding database with initial data..."
    docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -f fixtures/initial_data.sql

database reset:
    "Dropping and recreating all tables..."
    docker compose exec postgres dropdb --if-exists "$DB_NAME" || true
    docker compose exec postgres createdb -U "$DB_USER" "$DB_NAME"
    just database migrate

# ── Docker Subcommand with Runsets ───────────────────────────
docker image_name := "myapp"

docker build: tag := "latest"
    @echo "Building {{ image_name }}:{{ tag }}"
    docker build -t "{{ image_name }}:{{ tag }}" .

docker push:
    just docker build
    docker push "{{ image_name }}:latest"

# Runset — same recipe name, different arguments for dev vs prod
.docker-run env := "production": args := "--rm":
    @echo "Running container in {{ env }} mode..."
    docker run \
        --env-file ".env.{{ env }}" \
        -p 8080:8080 \
        "{{ args }}" \
        "{{ image_name }}:latest"

docker logs: lines := 100:
    "Showing last {{ lines }} log lines..."
    docker logs --tail "{{ lines }}" "$(docker compose ps -q myapp | head -1)"
```

### Pattern 4: Runsets for Cross-Platform Execution

Runsets let you define recipes with different argument defaults under the same name. This is ideal for running tests or builds across multiple platforms from a single command pattern.

```just
# Test runset — iterate over test suites
test suite := "unit": features := "": nocapture := false:
    @echo "Running {{ suite }} tests..."
    @if [ -n "{{ features }}" ]; then \
        cargo test --features "{{ features }}" --test "{{ suite }}" \
            $$(if [ "{{ nocapture }}" = "true" ]; then echo "--nocapture"; fi); \
    else \
        cargo test --test "{{ suite }}" \
            $$(if [ "{{ nocapture }}" = "true" ]; then echo "--nocapture"; fi); \
    fi

# Run all test suites as a single recipe
all-tests:
    just test suite=unit
    just test suite=integration features="ci"
    just test suite=e2e features="live,ci"

# Lint and format runset with dry-run support
lint fix := false: path := ".":
    @echo "Linting {{ path }}..."
    @if [ "{{ fix }}" = "true" ]; then \
        cargo clippy --fix --allow-staged --path "{{ path }}" || true; \
    else \
        cargo clippy -- -D warnings --path "{{ path }}"; \
    fi

format: dry_run := false:
    @echo "Formatting {{ path }}..."
    @if [ "{{ dry_run }}" = "true" ]; then \
        cargo fmt --check; \
    else \
        cargo fmt; \
    fi
```

---

## Constraints

### MUST DO
- Always provide a `help:` recipe as the first entry so team members discover available commands
- Use named arguments with defaults for every user-facing parameter (e.g., `env := "staging"`) to make recipes self-documenting
- Document every public recipe with `## comment` lines above its definition — these appear in `just --list` output
- Start recipes that need environment variables with `set dotenv-load` so `.env` files are loaded automatically
- Group related recipes under subcommands using `subcommand:` syntax (e.g., `docker:`, `database:`, `deploy:`)

### MUST NOT DO
- Don't use tabs in the recipe body — Just uses tab-indented lines as command execution, and mixing spaces/tabs breaks parsing
- Don't put secrets directly in the Justfile — always load sensitive values from `.env` files via `dotenv-load`
- Don't nest subcommands more than 2 levels deep (e.g., `docker compose exec` is fine; `docker compose exec db psql` should be a separate recipe)
- Don't use Make-specific features like pattern rules (`%.o: %.c`) or automatic variables (`$@`, `$<`) — Just has no equivalent syntax
- Don't create circular dependencies between recipes (e.g., A depends on B depends on A)

---

## Output Template

When this skill is active, produce the following output structure:

1. **Project Analysis** — Identify existing build scripts, CI configuration, and team platform mix (Linux/macOS/Windows)
2. **Justfile Draft** — Complete `justfile` with settings, variables, subcommands, and at least 5 public recipes
3. **Migration Plan** (from Makefile if applicable) — Side-by-side mapping of existing Make targets to Just recipes with command translation notes
4. **Team Setup Instructions** — Installation commands per platform (`brew`, `apt`, `pacman`, `nix`), `.env` template, and first-run instructions
5. **CI/CD Integration** — Add Justfile to CI pipeline configuration, include `just --list` verification step before running recipe targets

---

## Related Skills

| Skill | Purpose |
|---|---|
| `makefile` | GNU Make for C/C++ projects needing pattern rules and dependency graphs |
| `mage-build-tool` | Go-based build tool using actual Go code as build scripts |
| `linux-make-build-system` | GNU Make with cross-compilation support and complex dependency resolution |

---

## Live References

> Authoritative documentation links for the Just task runner. The model follows markdown links at load time to resolve external references and inline content.

- [Just Official Documentation](https://just.systems/man/en/)
- [Just GitHub Repository](https://github.com/casey/just)
- [Just Recipes Book — Real-World Examples](https://github.com/casey/just/tree/main/recipes)
- [Just Changelog and Release Notes](https://github.com/casey/just/releases)
- [Awesome Just — Curated Collection of Justfiles](https://github.com/okdnet/awesome-just)
