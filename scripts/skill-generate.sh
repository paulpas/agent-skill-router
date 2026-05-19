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
#   --no-push             Don't commit/push to git (save locally only)
#   --help                Show help
#
# The prompt tells Opencode to:
#   - Read SKILL_FORMAT_SPEC.md for skill format requirements
#   - Read AGENTS.md for naming conventions and best practices
#   - Create a complete SKILL.md file
#   - Update supporting files (skills-index.json, README.md, etc.)
#   - Push changes to git (unless --no-push)
#
# Examples:
#   ./scripts/skill-generate.sh "Create a skill about Kubernetes networking"
#   ./scripts/skill-generate.sh "Add a Go rate limiting pattern" -d go -n rate-limiting
#   ./scripts/skill-generate.sh "Create a VWAP trading strategy" --no-push
# =============================================================================

set -euo pipefail

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
SKILL_FORMAT_SPEC.md and AGENTS.md, understand the requirements, and
create a complete skill — including updating all supporting files.

ARGUMENTS:
  "Task description"    Describe the skill you want to create

OPTIONS:
  -d, --domain DOMAIN   Target domain: agent, cncf, coding, go, linux,
                        programming, trading, or writing
  -n, --name NAME       Override the generated skill name (kebab-case)
  --no-push             Save locally only, do not commit/push to git
  --help                Show this help message

EXAMPLES:
  ./scripts/skill-generate.sh "Create a skill about Kubernetes networking"
  ./scripts/skill-generate.sh "Add a Go rate limiting pattern" -d go -n rate-limiting
  ./scripts/skill-generate.sh "Create a VWAP trading strategy" --no-push
HELP
}

check_push_permission() {
    local NO_PUSH="$1"

    if [[ "$NO_PUSH" == "true" ]]; then
        log_warn "Push disabled (--no-push flag)"
        return 1
    fi

    local contribute="true"
    if [[ -f "$PROJECT_ROOT/install-skill-router.conf" ]]; then
        contribute=$(grep "^AUTO_SKILL_CONTRIBUTE" "$PROJECT_ROOT/install-skill-router.conf" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo "true")
    fi

    if [[ "$contribute" != "true" ]]; then
        log_warn "Push disabled by config (AUTO_SKILL_CONTRIBUTE=false)"
        return 1
    fi

    if ! git -C "$PROJECT_ROOT" remote get-url origin &>/dev/null; then
        log_warn "No git remote 'origin' configured"
        return 1
    fi

    return 0
}

main() {
    local DOMAIN=""
    local NAME=""
    local NO_PUSH=false
    local TASK=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -d|--domain) DOMAIN="$2"; shift 2 ;;
            -n|--name) NAME="$2"; shift 2 ;;
            --no-push) NO_PUSH=true; shift ;;
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
    local prompt="let's make a new skill, look at SKILL_FORMAT_SPEC.md as well as AGENTS.md to learn how to make a skill and how to name it and all the other requirements. after you understand, create a skill based upon the phrase: $TASK, utilizing your newly learned framework requirements. If you see the opportunity to make multiple skills from the phrase, then do so."

    # CRITICAL: Add validation requirements so generated skills will pass the pre-commit validator
    prompt+="\n\nIMPORTANT VALIDATION REQUIREMENTS — the skill MUST meet ALL of the following to pass ./scripts/validate_skill.sh:"
    prompt+="\n1. MINIMUM 3000 bytes of content (not counting YAML frontmatter) — write substantive, detailed content"
    prompt+="\n2. At least 2 fenced code blocks (triple-backticks) with REAL code for implementation/role skills"
    prompt+="\n3. NO stub sentinel phrases — do NOT write 'Implementing this specific pattern or feature' or similar placeholder text"
    prompt+="\n4. NO generic workflow patterns — do NOT use steps like 'Identify the specific use case', 'Apply the pattern or technique', 'Validate and test the implementation', 'Iterate based on results' — use specific, domain-expert steps instead"
    prompt+="\n5. After generating the SKILL.md file, run: ./scripts/validate_skill.sh <path-to-created-file>"
    prompt+="\n6. If validation FAILS, fix the issues immediately and re-run validate_skill.sh until it PASSES before finishing"
    prompt+="\n7. Do NOT commit or finish until the skill passes validation"

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
        -m llamacpp/anomaly-llama-cpp-model \
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

    # Commit and push if configured
    if check_push_permission "$NO_PUSH"; then
        # Check for ongoing rebase - skip commit/push if rebasing
        if [[ -d "$PROJECT_ROOT/.git/rebase-merge" ]] || [[ -d "$PROJECT_ROOT/.git/rebase-apply" ]]; then
            log_warn "Interactive rebase in progress - skipping commit/push"
            log_info "Run 'git rebase --abort' to restore normal operation"
        else
            # Check if there are any changes to commit
            local changes
            changes=$(git status --porcelain 2>/dev/null)
            if [[ -z "$changes" ]]; then
                log_info "No changes to commit"
            else
                # Use timestamp-based message to distinguish commits in a loop
                local timestamp
                timestamp=$(date +%Y%m%d-%H%M%S)
                local commit_msg="feat: generate new skill(s) via opencode ($timestamp)"
                
                # Skip pre-commit hook validation for auto-generated commits
                # Set SKIP_SKILL_VALIDATE to explicitly mark this as an auto-generated commit
                export SKIP_SKILL_VALIDATE=1
                
                git add -A
                
                # Set git user temporarily if not configured (required for commits)
                if git commit \
                    -c user.email="opencode@local" \
                    -c user.name="OpenCode" \
                    --no-verify \
                    -m "$commit_msg" 2>&1; then
                    
                    log_ok "Committed with message: $commit_msg"
                    
                    if git push origin main 2>&1; then
                        log_ok "Pushed to origin/main"
                    else
                        log_error "Push failed — commit saved locally"
                        log_info "To push manually, run: git push origin main"
                    fi
                else
                    log_error "Commit failed"
                    log_info "To troubleshoot, run: git status"
                    log_info "Note: Pre-commit hooks are skipped (--no-verify)"
                fi
            fi
        fi
    fi
}

main "$@"
