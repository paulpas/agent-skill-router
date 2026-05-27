#!/usr/bin/env bash
# =============================================================================
# skill-generate.sh — Generate new skills via Opencode
# =============================================================================
#
# Usage:
#   ./scripts/skill-generate.sh "Create a skill about X" [OPTIONS]
#
# Options:
#   -d, --domain DOMAIN   Target domain (cncf, coding, go, linux, etc.)
#   -n, --name NAME       Override the generated skill name
#   --help                Show help
#
# The prompt tells Opencode to:
#   - Read SKILL_FORMAT_SPEC.md for skill format requirements
#   - Read AGENTS.md for naming conventions and best practices
#   - Create a complete SKILL.md file
#   - Update supporting files (skills-index.json, README.md, etc.)
#   - Handle git operations (commit and push to origin main)
#
# Examples:
#   ./scripts/skill-generate.sh "Create a skill about Kubernetes networking"
#   ./scripts/skill-generate.sh "Add a Go rate limiting pattern" -d go -n rate-limiting
#   ./scripts/skill-generate.sh "Create a VWAP trading strategy"
# =============================================================================

set -euo pipefail

MODEL="openai/gpt-4o-mini"
# MODEL="anthropic/claude-haiku-4-5"
# MODEL="llamacpp/anomaly-llama-cpp-model"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

show_help() {
    cat <<'HELP'
Usage: ./scripts/skill-generate.sh "Task description" [OPTIONS]

Generate new skills via Opencode. The prompt instructs Opencode to read
SKILL_FORMAT_SPEC.md and AGENTS.md, understand the requirements, create
a skill, validate it, and push to git.

ARGUMENTS:
  "Task description"    Describe the skill you want to create

OPTIONS:
  -d, --domain DOMAIN   Target domain: agent, cncf, coding, go, linux,
                        programming, trading, or writing
  -n, --name NAME       Override the generated skill name (kebab-case)
  --help                Show this help message

EXAMPLES:
  ./scripts/skill-generate.sh "Create a skill about Kubernetes networking"
  ./scripts/skill-generate.sh "Add a Go rate limiting pattern" -d go -n rate-limiting
  ./scripts/skill-generate.sh "Create a VWAP trading strategy"
HELP
}

main() {
    local DOMAIN=""
    local NAME=""
    local TASK=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -d|--domain) DOMAIN="$2"; shift 2 ;;
            -n|--name) NAME="$2"; shift 2 ;;
            --help|-h) show_help; exit 0 ;;
            *) TASK="$1"; shift ;;
        esac
    done

    if [[ -z "$TASK" ]]; then
        log_error "No task description provided"
        echo ""
        show_help
        exit 1
    fi

    # Build the prompt
    local prompt="let's make a new skill, look at SKILL_FORMAT_SPEC.md as well as AGENTS.md to learn how to make a skill and how to name it and all the other requirements. after you understand, create a skill based upon the phrase: $TASK, utilizing your newly learned framework requirements. If you see the opportunity to make multiple skills from the phrase, then do so. Search the web to ensure your information is current and modern. Each skill must be atomic and have no overlap. If overlap exists, then convert to smaller atomic tasks with proper key words optimized for semantic search."

    # CRITICAL: Add validation requirements so generated skills will pass the pre-commit validator
    prompt+="\n\nIMPORTANT VALIDATION REQUIREMENTS — the skill MUST meet ALL of the following to pass ./scripts/validate_skill.sh:"
    prompt+="\n1. MINIMUM 3000 bytes of content (not counting YAML frontmatter) — write substantive, detailed content"
    prompt+="\n2. At least 2 fenced code blocks (triple-backticks) with REAL code for implementation/role skills"
    prompt+="\n3. NO stub sentinel phrases — do NOT write 'Implementing this specific pattern or feature' or similar placeholder text"
    prompt+="\n4. NO generic workflow patterns — do NOT use steps like 'Identify the specific use case', 'Apply the pattern or technique', 'Validate and test the implementation', 'Iterate based on results' — use specific, domain-expert steps instead"
    prompt+="\n5. After generating the SKILL.md file, run: ./scripts/validate_skill.sh <path-to-created-file>"
    prompt+="\n6. If validation FAILS, fix the issues immediately and re-run validate_skill.sh until it PASSES before finishing"
    prompt+="\n7. Do NOT commit or finish until the skill passes validation"

    # Add comprehensive git handling instructions
    prompt+="\n\nGIT HANDLING INSTRUCTIONS — after creating the skill and confirming it passes validation, you MUST handle git operations:"
    prompt+="\n1. Check git status: run 'git status' to see what files were created/modified"
    prompt+="\n2. Stage changes: run 'git add -A' to stage all new and modified files"
    prompt+="\n3. Handle any git issues:"
    prompt+="\n   - If pre-commit hook fails: use 'SKIP_SKILL_VALIDATE=1 git commit' to bypass OR fix validation issues first"
    prompt+="\n   - If git user not configured: set with 'git config user.email \"opencode@local\"' and 'git config user.name \"OpenCode\"'"
    prompt+="\n   - If there are merge conflicts: resolve them by editing conflicted files, then 'git add' and 'git commit'"
    prompt+="\n   - If push fails (e.g., non-fast-forward): first 'git pull --rebase origin main', resolve any conflicts, then push again"
    prompt+="\n   - If rebasing in progress: abort with 'git rebase --abort' before continuing"
    prompt+="\n4. Create a commit with message: 'feat: add new skill - [skill-name]' (use actual skill name)"
    prompt+="\n5. Push to origin main: run 'git push origin main'"
    prompt+="\n6. If push fails for any reason, retry with appropriate fix until it succeeds"
    prompt+="\n7. Verify push succeeded by checking 'git log' shows your commit"
    prompt+="\n\nIMPORTANT: You have full access to bash and git. Use it proactively to handle any issues. Do not give up until push succeeds or it's clearly impossible (e.g., no remote configured)."

    if [[ -n "$DOMAIN" ]]; then
        prompt+="\n\nPlace this skill in the '$DOMAIN' domain."
    fi

    if [[ -n "$NAME" ]]; then
        prompt+="\n\nName the skill: $NAME"
    fi

    cd "$PROJECT_ROOT"

    log_info "Generating skill with Opencode..."
    log_info "Task: $TASK"
    [[ -n "$DOMAIN" ]] && log_info "Domain: $DOMAIN"
    [[ -n "$NAME" ]] && log_info "Name: $NAME"
    echo ""

    # Run opencode with the prompt and attach the spec files
    opencode run "$prompt" \
        -m ${MODEL} \
        --file SKILL_FORMAT_SPEC.md \
        --file AGENTS.md \
        --dangerously-skip-permissions

    # Check what files were created
    echo ""
    log_ok "Done!"

    # Check for new skill files
    local new_skills
    new_skills=$(git status --porcelain 2>/dev/null | grep "^??" | grep "SKILL.md" || true)
    if [[ -n "$new_skills" ]]; then
        echo ""
        log_ok "New skill files created:"
        echo "$new_skills" | sed 's/^/  /'
    fi

    # Check for updated files
    local modified_files
    modified_files=$(git status --porcelain 2>/dev/null | grep "^ M" | grep -v "SKILL.md" || true)
    if [[ -n "$modified_files" ]]; then
        echo ""
        log_info "Updated supporting files:"
        echo "$modified_files" | sed 's/^/  /'
    fi
}

main "$@"
