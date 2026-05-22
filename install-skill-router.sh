#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# ANSI color codes and utility functions
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
RESET='\033[0m'

# Styling functions
ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; }
err()  { echo -e "  ${RED}✗${RESET} $*" >&2; }
info() { echo -e "  ${CYAN}→${RESET} $*"; }
prompt() { echo -e "${MAGENTA}?${RESET} $*"; }

# ─────────────────────────────────────────────────────────────────────────────
# Global variables (will be populated interactively)
# ─────────────────────────────────────────────────────────────────────────────
declare \
  OPENAI_API_KEY \
  PORT \
  LLM_PROVIDER \
  LLM_MODEL \
  EMBEDDING_MODEL \
  ANTHROPIC_API_KEY \
  LLAMACPP_URL \
  EMBEDDING_PROVIDER \
  GITHUB_ENABLED \
  GITHUB_TOKEN \
  SSH_KEY_PATH \
  SSH_AGENT_SOCKET \
  SSH_KNOWN_HOSTS \
  AUTO_SKILL_ENABLED \
  AUTO_SKILL_CONTRIBUTE \
  AUTO_SKILL_MODEL \
  OPENAI_BASE_URL \
  GITHUB_RAW_BASE_URL \
  GITHUB_SKILLS_REPO \
  SYNC_INTERVAL \
  LINK_FOLLOWING_ENABLED \
  ALLOW_EXTERNAL_LINKS \
  MAX_LINK_DEPTH \
  MAX_EXTERNAL_SIZE_KB \
  EXTERNAL_COMPRESSION_MODE \
  JS_RENDERING_ENABLED \
  JS_RENDER_TIMEOUT_MS \
  JS_RENDER_FALLBACK \
  LINK_RESOLUTION_MODE \
  SEMANTIC_TOP_K \
  SEMANTIC_SIMILARITY_THRESHOLD

# ─────────────────────────────────────────────────────────────────────────────
# Helper function to check if stdin is a terminal (interactive mode)
# ─────────────────────────────────────────────────────────────────────────────
is_interactive() {
  if [[ -t 0 ]]; then
    return 0  # Terminal is available, interactive mode
  else
    return 1  # Terminal not available, non-interactive mode
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Usage function for CLI arguments
# ─────────────────────────────────────────────────────────────────────────────

show_usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Configure and install the Skill Router Docker container.

OPTIONS:
  -h, --help            Show this help message and exit
  -i, --interactive     Force interactive mode (default behavior)
  -c, --config FILE     Non-interactive mode using config file
  -n, --no-interactive  Non-interactive mode with default config file (install-skill-router.conf)

  Integration flags (can be combined):
      --integrate-opencode          Add skill-router to OpenCode IDE config (opencode.json)
      --opencode-config FILE        Path to opencode.json (default: auto-detect)
      --integrate-claude            Add skill-router to Claude Desktop config (claude.json)
      --claude-config FILE          Path to claude.json (default: auto-detect)
      --skills-dir DIR              Path to agent-skill-routing-system (default: auto-detect)

CONFIG FILE FORMAT:
  The config file should contain key=value pairs, one per line.
  Comments are allowed (lines starting with #).

  Example config file (install-skill-router.conf):
    # Required API Configuration
    OPENAI_API_KEY=sk-...
    
    # LLM Provider Selection
    LLM_PROVIDER=openai          # Options: openai, anthropic, llamacpp
    LLM_MODEL=gpt-4o             # Model ID (defaults to provider default)
    
    # Optional: Custom LLM Endpoint (LiteLLM, ollama, vLLM, etc.)
    OPENAI_BASE_URL=https://api.openai.com/v1
    OPENAI_API_KEY=sk-...  # Use OPENAI_API_KEY for all endpoints (OpenAI, LiteLLM, ollama, etc.)
    
    # Embedding Configuration
    EMBEDDING_PROVIDER=openai    # Options: openai, anthropic, llamacpp
    EMBEDDING_MODEL=text-embedding-3-small
    
    # Networking
    PORT=3000                    # Host port to bind container
    
    # GitHub Integration
    GITHUB_ENABLED=true          # Enable remote skill loading
    GITHUB_TOKEN=ghp_...         # Optional: GitHub token for private repos
    
    # SSH Configuration (optional)
    SSH_KEY_PATH=/path/to/id_rsa
    SSH_AGENT_SOCKET=/path/to/socket
    SSH_KNOWN_HOSTS=/path/to/known_hosts
    
    # Auto-Skill Configuration
    AUTO_SKILL_ENABLED=true
    AUTO_SKILL_CONTRIBUTE=true
    AUTO_SKILL_MODEL=gpt-4o-mini

    # Link Following Configuration (Optional)
    LINK_FOLLOWING_ENABLED=false
    ALLOW_EXTERNAL_LINKS=false
    MAX_LINK_DEPTH=2
    MAX_EXTERNAL_SIZE_KB=10
    EXTERNAL_COMPRESSION_MODE=brief
    JS_RENDERING_ENABLED=false
    JS_RENDER_TIMEOUT_MS=5000
    JS_RENDER_FALLBACK=true
    LINK_RESOLUTION_MODE=inline
    SEMANTIC_TOP_K=3
    SEMANTIC_SIMILARITY_THRESHOLD=0.3

  Required: OPENAI_API_KEY
  Optional: All other settings have sensible defaults

EXAMPLES:
  Interactive mode (default):
    $0

  Non-interactive with config file:
    $0 --config install-skill-router.conf
    $0 -c /path/to/config

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# Portable SHA-256 checksum helper
# ─────────────────────────────────────────────────────────────────────────────

compute_sha256() {
  if command -v sha256sum &>/dev/null; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CLI argument parsing
# ─────────────────────────────────────────────────────────────────────────────

# Parse CLI arguments
MODE="interactive"  # Default to interactive
CONFIG_FILE=""
show_help_flag=false
MODE_INTEGRATE_OPENCODE="false"
MODE_INTEGRATE_CLAUDE="false"
MODE_OPENCODE_CONFIG=""
MODE_CLAUDE_CONFIG=""
MODE_SKILLS_DIR=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help_flag=true
      shift
      ;;
    -i|--interactive)
      MODE="interactive"
      shift
      ;;
    -c|--config)
      if [[ $# -lt 2 || "$2" == --* ]]; then
        echo "Error: --config requires a file path"
        exit 1
      fi
      CONFIG_FILE="$2"
      MODE="noninteractive"
      shift 2
      ;;
    -n|--no-interactive)
      # Make it a toggle flag - defaults to "install-skill-router.conf" if no argument
      if [[ $# -ge 2 && "$2" != --* ]]; then
        CONFIG_FILE="$2"
      else
        CONFIG_FILE="install-skill-router.conf"
      fi
      MODE="noninteractive"
      shift
      ;;
    --integrate-opencode)
      MODE_INTEGRATE_OPENCODE="true"
      shift
      ;;
    --opencode-config)
      if [[ $# -lt 2 || "$2" == --* ]]; then
        echo "Error: --opencode-config requires a file path"
        exit 1
      fi
      MODE_OPENCODE_CONFIG="$2"
      shift 2
      ;;
    --integrate-claude)
      MODE_INTEGRATE_CLAUDE="true"
      shift
      ;;
    --claude-config)
      if [[ $# -lt 2 || "$2" == --* ]]; then
        echo "Error: --claude-config requires a file path"
        exit 1
      fi
      MODE_CLAUDE_CONFIG="$2"
      shift 2
      ;;
    --skills-dir)
      if [[ $# -lt 2 || "$2" == --* ]]; then
        echo "Error: --skills-dir requires a directory path"
        exit 1
      fi
      MODE_SKILLS_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Show help if requested
if [[ "$show_help_flag" == "true" ]]; then
  show_usage
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# Validation functions
# ─────────────────────────────────────────────────────────────────────────────

validate_api_key() {
  local key="$1"
  local name="$2"
  if [[ -z "$key" ]]; then
    err "$name is required"
    return 1
  fi
  if [[ ${#key} -lt 10 ]]; then
    err "$name appears too short (are you sure it's valid?)"
    return 1
  fi
  # Check for common patterns
  if [[ "$key" == sk-* ]] || [[ "$key" == sk-ant-* ]] || [[ "$key" == sk-proj-* ]]; then
    ok "$name format looks valid"
    return 0
  fi
  warn "$name format is unusual - verify it's correct"
  return 0
}

validate_port() {
  local port="$1"
  if [[ ! "$port" =~ ^[0-9]+$ ]]; then
    err "Port must be a number"
    return 1
  fi
  if [[ "$port" -lt 1 || "$port" -gt 65535 ]]; then
    err "Port must be between 1 and 65535"
    return 1
  fi
  return 0
}

validate_provider() {
  local provider="$1"
  case "$provider" in
    openai|anthropic|llamacpp) return 0 ;;
    *) err "Provider must be: openai, anthropic, or llamacpp"; return 1 ;;
  esac
}

validate_file_exists() {
  local path="$1"
  local name="$2"
  if [[ -n "$path" && ! -e "$path" ]]; then
    err "$name not found: $path"
    return 1
  fi
  return 0
}

validate_url() {
  local url="$1"
  local name="$2"
  
  # Check if URL starts with http:// or https://
  if [[ ! "$url" =~ ^https?:// ]]; then
    err "$name must start with http:// or https://"
    return 1
  fi
  
  # Basic length validation
  if [[ ${#url} -lt 10 ]]; then
    err "$name appears too short (are you sure it's valid?)"
    return 1
  fi
  
  ok "$name format looks valid"
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Config file parser for non-interactive mode
# ─────────────────────────────────────────────────────────────────────────────

parse_config_file() {
  local config_file="$1"
  
  if [[ ! -f "$config_file" ]]; then
    err "Config file not found: $config_file"
    return 1
  fi
  
  info "Reading configuration from: $config_file"
  
  # Track known variables for validation
  declare -A known_vars=()
  for var in OPENAI_API_KEY PORT LLM_PROVIDER LLM_MODEL EMBEDDING_MODEL ANTHROPIC_API_KEY LLAMACPP_URL EMBEDDING_PROVIDER GITHUB_ENABLED GITHUB_TOKEN SSH_KEY_PATH SSH_AGENT_SOCKET SSH_KNOWN_HOSTS AUTO_SKILL_ENABLED AUTO_SKILL_CONTRIBUTE AUTO_SKILL_MODEL OPENAI_BASE_URL GITHUB_RAW_BASE_URL GITHUB_SKILLS_REPO SYNC_INTERVAL MAX_SKILLS LINK_FOLLOWING_ENABLED ALLOW_EXTERNAL_LINKS MAX_LINK_DEPTH MAX_EXTERNAL_SIZE_KB EXTERNAL_COMPRESSION_MODE JS_RENDERING_ENABLED JS_RENDER_TIMEOUT_MS JS_RENDER_FALLBACK LINK_RESOLUTION_MODE SEMANTIC_TOP_K SEMANTIC_SIMILARITY_THRESHOLD; do
    known_vars[$var]=1
  done
  
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    
    # Skip lines without = sign
    [[ "$line" != *"="* ]] && continue
    
    # Extract key and value
    local key="${line%%=*}"
    local value="${line#*=}"
    
    # Trim whitespace from key
    key="$(echo "$key" | xargs)"
    # Preserve quoted values, only trim unquoted whitespace
    if [[ "$value" =~ ^\".*\"$ ]] || [[ "$value" =~ ^\'.*\'$ ]]; then
      # Quoted value - preserve content but trim outer quotes if they exist
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
    else
      # Unquoted value - trim whitespace
      value="$(echo "$value" | xargs)"
    fi
    
    # Skip if key is empty
    [[ -z "$key" ]] && continue
    
    # Warn about unknown variables
    if [[ -z "${known_vars[$key]:-}" ]]; then
      warn "Unknown configuration variable: $key"
    fi
    
    # NOTE: Do not mangle the value with backslash-escapes here.
    # Values flow only into `declare -g "$key=$value"` (no shell expansion)
    # and into a `docker run -e KEY=VAL` array (also no shell expansion).
    # Escaping $/`/" here corrupts API keys and base URLs.
    
    # Set the variable (only if it exists in our global vars)
    # Use -g to ensure we set global variables, not local ones
    if declare -p "$key" &>/dev/null; then
      declare -g "$key=$value"
      info "  Loaded: $key"
    fi
  done < "$config_file"
  
  ok "Configuration loaded successfully"
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Model fetching functions for interactive selection
# ─────────────────────────────────────────────────────────────────────────────

# Fetch available OpenAI models
get_openai_models() {
  local api_key="${OPENAI_API_KEY:-}"
  if [[ -z "$api_key" ]]; then
    return 1
  fi
  
  local response http_code
  # Use -H header directly to avoid API key exposure in temp files
  # Add timeout flags to prevent hanging
  http_code=$(curl -s -f --connect-timeout 10 --max-time 60 -X GET \
    -H "Authorization: Bearer $api_key" \
    "https://api.openai.com/v1/models" \
    -w "\n%{http_code}" 2>/dev/null) || return 1
  # Zero out API key after use
  api_key=""
  
  # Extract response and HTTP code
  response=$(echo "$http_code" | head -n -1)
  http_code=$(echo "$http_code" | tail -n 1)
  
  # Validate HTTP status code before parsing (accept 2xx codes)
  if ! [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "OpenAI API returned HTTP $http_code" >&2
    return 1
  fi
  
  # Validate JSON format before extracting model IDs
   if ! echo "$response" | jq empty 2>/dev/null; then
     echo "OpenAI API returned invalid JSON" >&2
     return 1
   fi
   
   # Validate response structure has expected .data array
   if ! echo "$response" | jq -e '.data | type == "array"' >/dev/null 2>&1; then
     echo "OpenAI API returned unexpected response structure (missing .data array)" >&2
     return 1
   fi
   
   echo "$response" | jq -r '.data[].id' 2>/dev/null || return 1
}

# Fetch available Anthropic models
get_anthropic_models() {
  local api_key="${ANTHROPIC_API_KEY:-}"
  if [[ -z "$api_key" ]]; then
    return 1
  fi
  
  local response http_code
  # Use -H header directly to avoid API key exposure in temp files
  # Add timeout flags to prevent hanging
  http_code=$(curl -s -f --connect-timeout 10 --max-time 60 -X GET \
    -H "x-api-key: $api_key" \
    -H "anthropic-version: 2023-06-01" \
    "https://api.anthropic.com/v1/models" \
    -w "\n%{http_code}" 2>/dev/null) || return 1
  # Zero out API key after use
  api_key=""
  
  # Extract response and HTTP code
  response=$(echo "$http_code" | head -n -1)
  http_code=$(echo "$http_code" | tail -n 1)
  
  # Validate HTTP status code before parsing (accept 2xx codes)
  if ! [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "Anthropic API returned HTTP $http_code" >&2
    return 1
  fi
  
 # Validate JSON format before extracting model IDs
   if ! echo "$response" | jq empty 2>/dev/null; then
     echo "Anthropic API returned invalid JSON" >&2
     return 1
   fi
   
   # Validate response structure has expected .data array
   if ! echo "$response" | jq -e '.data | type == "array"' >/dev/null 2>&1; then
     echo "Anthropic API returned unexpected response structure (missing .data array)" >&2
     return 1
   fi
   
   echo "$response" | jq -r '.data[].id' 2>/dev/null || return 1
}

# Display interactive model selection menu
# Arguments: $1 = model type (llm|embedding), $2 = provider (openai|anthropic), $3 = default model
# Returns: selected model via echo
select_model_interactive() {
  local model_type="$1"
  local provider="$2"
  local default_model="$3"
  local models=()
  local selected_model=""
  local model_source=""
  
  echo -e "${BLUE}[DEBUG] select_model_interactive started: type=$model_type provider=$provider default=$default_model${RESET}" >&2
  echo -e "${BLUE}[DEBUG] is_interactive: $(is_interactive && echo 'true' || echo 'false')${RESET}" >&2
  
  # Non-interactive mode: use default model immediately (Fail Fast)
  if ! is_interactive; then
    echo "$default_model"
    echo -e "${BLUE}[DEBUG] Non-interactive: returning default model '$default_model'${RESET}" >&2
    return 0
  fi
  
  # Try to fetch models from API
  if [[ "$provider" == "openai" ]]; then
    echo -e "${BLUE}[DEBUG] Fetching OpenAI models...${RESET}" >&2
    mapfile -t models < <(get_openai_models 2>/dev/null) || true
    model_source="OpenAI"
  elif [[ "$provider" == "anthropic" ]]; then
    echo -e "${BLUE}[DEBUG] Fetching Anthropic models...${RESET}" >&2
    mapfile -t models < <(get_anthropic_models 2>/dev/null) || true
    model_source="Anthropic"
  fi
  echo -e "${BLUE}[DEBUG] Retrieved ${#models[@]} models from API${RESET}" >&2
  
  print_header
  
  if [[ ${#models[@]} -gt 0 ]]; then
    echo -e "${BOLD}Step: ${model_type^} Model Configuration${RESET}"
    echo ""
    echo -e "Available ${model_source} models for ${model_type} configuration:"
    echo ""
    
    # Display models in numbered list
    local display_count=0
    for i in "${!models[@]}"; do
      local model="${models[$i]}"
      # Only show relevant models based on type
      if [[ "$model_type" == "llm" ]]; then
        # Show LLM models (chat models)
        if [[ "$model" == *"gpt-"* ]] || [[ "$model" == *"claude-"* ]]; then
          echo "  $((i+1)). $model"
          ((display_count++))
        fi
      else
        # Show embedding models
        if [[ "$model" == *"embedding"* ]] || [[ "$model" == *"text-embedding"* ]]; then
          echo "  $((i+1)). $model"
          ((display_count++))
        fi
      fi
    done
    
    echo ""
    
    # Get user selection
     prompt "Select a model by number (or 0 to enter custom): "
     read -r choice || choice=""
     
     if [[ "$choice" =~ ^[0-9]+$ ]]; then
       if [[ "$choice" -eq 0 ]]; then
         # Custom model entry
         prompt "Enter custom ${model_type} model name (default: $default_model): "
         read -r custom_model || custom_model=""
         echo "${custom_model:-$default_model}"
         return 0
       elif [[ "$choice" -ge 1 && "$choice" -le ${#models[@]} ]]; then
         selected_model="${models[$((choice-1))]}"
         
         # Verify selection
         echo ""
         echo -e "  ${CYAN}Selected:${RESET} $selected_model"
         prompt "Confirm this selection? (Y/n)"
         read -r response || response=""
         response="${response:-Y}"
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
          echo "$selected_model"
          return 0
        fi
        # Note: No recursive call - handled iteratively in main loop
      fi
    fi
  fi
  
  # Fallback if API failed or no valid models found
  echo -e "${BLUE}[DEBUG] Fallback path: no valid models found in interactive mode${RESET}" >&2
  echo ""
  warn "Could not fetch models from ${provider^} API (or no matching models found)"
  echo -e "  ${YELLOW}Note:${RESET} Network errors or API authentication failures may have occurred."
  echo -e "  ${YELLOW}Ensure your API key is valid and you have internet connectivity.${RESET}"
  echo ""
  prompt "Enter ${model_type} model name (default: $default_model): "
   read -r custom_model || custom_model=""
   local result="${custom_model:-$default_model}"
  echo "$result"
  echo -e "${BLUE}[DEBUG] select_model_interactive returning: '$result'${RESET}" >&2
}

# ─────────────────────────────────────────────────────────────────────────────
# Display functions
# ─────────────────────────────────────────────────────────────────────────────

print_header() {
  clear
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${CYAN}║     Skill Router Interactive Installer           ║${RESET}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
}

show_intro() {
  local mode="${1:-interactive}"
  
  print_header
  echo ""
  echo "Welcome to the Skill Router installation script!"
  echo "This script will:"
  echo "  1. Ask you to configure your API keys and settings"
  echo "  2. Build and start the Skill Router Docker container"
  echo "  3. Optionally integrate with OpenCode or Claude"
  echo ""
  
  if ! is_interactive; then
    err "Non-interactive mode detected (no stdin terminal)."
    err "Skipping intro — proceeding with defaults. Use --config or -c for fully automated setup."
    sleep 1
    return 0
  fi
  
  echo -e "${CYAN}Press Enter to begin...${RESET}"
  read -r || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Variable configuration functions
# ─────────────────────────────────────────────────────────────────────────────

# Function to display a variable with current value and get user confirmation
configure_variable() {
  local var_name="$1"
  local description="$2"
  local default_value="${3:-}"
  local example_value="${4:-}"
  local is_required="${5:-false}"
  local validation_func="${6:-}"
  
  echo -e "${BLUE}[DEBUG] configure_variable called for $var_name${RESET}" >&2
  echo -e "${BLUE}[DEBUG] is_interactive: $(is_interactive && echo 'true' || echo 'false')${RESET}" >&2
  
  # Non-interactive mode: use current value if set, otherwise use default (Fail Fast)
  if ! is_interactive; then
    echo -e "${BLUE}[DEBUG] Non-interactive mode - using default${RESET}" >&2
    local current_value="${!var_name:-$default_value}"
    if [[ -z "$current_value" ]]; then
      current_value="Not set"
    fi
    # Display current value for logging purposes
    if [[ "$current_value" == "Not set" ]]; then
      echo -e "  ${YELLOW}Current:${RESET} ${YELLOW}Not set${RESET}"
    else
      # Mask sensitive values
      if [[ "$var_name" == *"API_KEY"* ]] || [[ "$var_name" == *"TOKEN"* ]]; then
        local masked
        # Length validation before masking (Bounds Check)
        if [[ ${#current_value} -lt 12 ]]; then
          masked="***"
        else
          masked="${current_value:0:8}...${current_value: -4}"
        fi
        echo -e "  ${YELLOW}Current:${RESET} ${masked}"
      else
        echo -e "  ${YELLOW}Current:${RESET} ${current_value}"
      fi
    fi
    echo -e "  ${CYAN}Description:${RESET} $description"
    if [[ -n "$example_value" ]]; then
      echo -e "  ${CYAN}Example:${RESET} $example_value"
    fi
    if [[ "$is_required" == "true" ]]; then
      echo -e "  ${RED}Required:${RESET} Yes"
    fi
    echo ""
    echo -e "  ${CYAN}Non-interactive mode: keeping current value or default${RESET}"
    # Set the variable if not already set (using declare)
    if [[ -z "${!var_name:-}" && -n "$default_value" ]]; then
      declare -g "$var_name=$default_value"
    fi
    echo -e "${BLUE}[DEBUG] configure_variable exiting non-interactive${RESET}" >&2
    return 0
  fi
  
  # Use indirect expansion to read variable safely (no eval)
  local current_value="${!var_name:-$default_value}"
  
  if [[ -z "$current_value" ]]; then
    current_value="Not set"
  fi
  
  # Display current value
   if [[ "$current_value" == "Not set" ]]; then
     echo -e "  ${YELLOW}Current:${RESET} ${YELLOW}Not set${RESET}"
   else
     # Mask sensitive values
     if [[ "$var_name" == *"API_KEY"* ]] || [[ "$var_name" == *"TOKEN"* ]]; then
       local masked
       # Length validation before masking (Bounds Check)
       if [[ ${#current_value} -lt 12 ]]; then
         masked="***"
       else
         masked="${current_value:0:8}...${current_value: -4}"
       fi
       echo -e "  ${YELLOW}Current:${RESET} ${masked}"
     else
       echo -e "  ${YELLOW}Current:${RESET} ${current_value}"
     fi
   fi
  
  echo -e "  ${CYAN}Description:${RESET} $description"
  if [[ -n "$example_value" ]]; then
    echo -e "  ${CYAN}Example:${RESET} $example_value"
  fi
  if [[ "$is_required" == "true" ]]; then
    echo -e "  ${RED}Required:${RESET} Yes"
  fi
  echo ""
  
 # Ask user
   prompt "Keep current value? (Y/n)"
   read -r response || response=""
   response="${response:-Y}"
   
   if [[ "$response" =~ ^[Yy]$ ]]; then
     # Keep current value (already set, no eval needed)
     return 0
   fi
   
   # User wants to change the value
   if [[ -n "$default_value" && "$current_value" == "Not set" ]]; then
     prompt "Enter new value (default: $default_value):"
   else
     prompt "Enter new value:"
   fi
   
   read -r new_value || new_value=""
   new_value="${new_value:-$default_value}"
  
  # NOTE: Do not escape $/`/" here. Values flow into `declare -g` (no expansion)
  # and into the `docker run -e KEY=VAL` array (no shell expansion). Escaping
  # corrupts API keys and base URLs.
  
  # Validate if validation function provided
  if [[ -n "$validation_func" ]]; then
    if ! "$validation_func" "$new_value"; then
      err "Invalid value. Keeping previous value."
      return 1
    fi
  fi
  
  # Use declare -g instead of eval to set variable safely (global scope)
  declare -g "$var_name=$new_value"
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Interactive configuration sections
# ─────────────────────────────────────────────────────────────────────────────

configure_required_api() {
  print_header
  echo -e "${BOLD}Step 1: Required API Configuration${RESET}"
  echo ""
  echo -e "The Skill Router requires API access to generate embeddings and power the LLM."
  echo "OpenAI is the default provider, but you can use other providers as well."
  echo ""
  
  configure_variable "OPENAI_API_KEY" \
    "Your OpenAI API key for embeddings and LLM access" \
    "" \
    "sk-..." \
    "true" \
    "validate_api_key"
}

configure_provider_selection() {
  echo -e "${BLUE}[DEBUG] configure_provider_selection started${RESET}" >&2
  print_header
  echo -e "${BOLD}Step 2: LLM Provider Selection${RESET}"
  echo ""
  echo -e "Choose your preferred LLM provider for the Skill Router."
  echo ""
  
  configure_variable "LLM_PROVIDER" \
    "LLM provider (openai, anthropic, or llamacpp for local)" \
    "openai" \
    "openai" \
    "false" \
    "validate_provider"
  
  echo -e "${BLUE}[DEBUG] LLM_PROVIDER set to: $LLM_PROVIDER${RESET}" >&2
}

configure_llm_model() {
  local provider="${LLM_PROVIDER:-openai}"
  
  # Debug: Log function entry
  echo -e "${BLUE}[DEBUG] configure_llm_model started${RESET}" >&2
  echo -e "${BLUE}[DEBUG] Provider: $provider${RESET}" >&2
  
  # Skip for llamacpp (uses local endpoint)
  if [[ "$provider" == "llamacpp" ]]; then
    echo -e "${CYAN}Skipping LLM model configuration (llamacpp uses local endpoint)${RESET}"
    sleep 2
    return 0
  fi
  
  print_header
  echo -e "${BOLD}Step 3: LLM Model Configuration${RESET}"
  echo ""
  echo -e "Select the model to use for skill routing and analysis."
  echo ""
  
  local default_model=""
  case "$provider" in
    openai) default_model="gpt-4o-mini" ;;
    anthropic) default_model="claude-3-5-haiku-20241022" ;;
  esac
  
  echo -e "${BLUE}[DEBUG] Default model for $provider: $default_model${RESET}" >&2
  
  # Iterative model selection with retry limit (max 5 attempts)
  local max_attempts=5
  local attempt=0
  local selected_model=""
  local user_confirmed=false
  
  while [[ $attempt -lt $max_attempts && "$user_confirmed" != "true" ]]; do
    ((attempt++))
    
    # Exponential backoff for retry attempts (only in interactive mode)
    if [[ $attempt -gt 1 ]]; then
      if is_interactive; then
        sleep $((attempt * 2))
      fi
    fi
    
    # Interactive model selection
    echo -e "${BLUE}[DEBUG] Calling select_model_interactive (attempt $attempt)${RESET}" >&2
    selected_model=$(select_model_interactive "llm" "$provider" "$default_model")
    echo -e "${BLUE}[DEBUG] Returned selected_model: '$selected_model'${RESET}" >&2
    
    if [[ -n "$selected_model" && "$selected_model" != "$default_model" ]]; then
      LLM_MODEL="$selected_model"
      echo ""
      ok "Selected model: $LLM_MODEL"
      user_confirmed=true
    elif [[ -n "$selected_model" && "$selected_model" == "$default_model" ]]; then
      # User confirmed the default model
      LLM_MODEL="$selected_model"
      echo ""
      echo -e "  ${CYAN}Using default:${RESET} $LLM_MODEL"
      user_confirmed=true
    else
      # User didn't confirm, prompt to try again
      echo ""
      warn "Model selection cancelled or invalid."
     prompt "Try again? (Y/n) "
       if ! is_interactive; then
         err "[DEBUG] Non-interactive mode detected in retry loop - exiting"
         err "Cannot read input in non-interactive mode"
         exit 1
       fi
       read -r retry_response || retry_response=""
       retry_response="${retry_response:-Y}"
      
      if [[ ! "$retry_response" =~ ^[Yy]$ ]]; then
        user_confirmed=true
      fi
    fi
  done
  
  # Fallback if all attempts failed
  if [[ -z "$LLM_MODEL" ]]; then
    LLM_MODEL="$default_model"
    echo ""
    echo -e "  ${YELLOW}Using default after $attempt attempts:${RESET} $LLM_MODEL"
  fi
  
  echo -e "${BLUE}[DEBUG] Final LLM_MODEL: $LLM_MODEL${RESET}" >&2
}

configure_embedding_provider() {
  print_header
  echo -e "${BOLD}Step 4: Embedding Provider Selection${RESET}"
  echo ""
  echo -e "Choose your embedding provider for skill search and routing."
  echo ""
  
  configure_variable "EMBEDDING_PROVIDER" \
    "Embedding provider (openai or llamacpp for local)" \
    "openai" \
    "openai" \
    "false" \
    "validate_provider"
}

configure_embedding_model() {
  local provider="${EMBEDDING_PROVIDER:-openai}"
  
  # Skip for llamacpp (uses local endpoint)
  if [[ "$provider" == "llamacpp" ]]; then
    echo -e "${CYAN}Skipping embedding model configuration (llamacpp uses local endpoint)${RESET}"
    sleep 2
    return 0
  fi
  
  print_header
  echo -e "${BOLD}Step 5: Embedding Model Configuration${RESET}"
  echo ""
  echo -e "Select the embedding model for skill vector search."
  echo ""
  
  local default_model="text-embedding-3-small"
  
  # Iterative model selection with retry limit (max 5 attempts)
  local max_attempts=5
  local attempt=0
  local selected_model=""
  local user_confirmed=false
  
  while [[ $attempt -lt $max_attempts && "$user_confirmed" != "true" ]]; do
    ((attempt++))
    
    # Exponential backoff for retry attempts (only in interactive mode)
    if [[ $attempt -gt 1 ]]; then
      if is_interactive; then
        sleep $((attempt * 2))
      fi
    fi
    
    # Interactive model selection
    selected_model=$(select_model_interactive "embedding" "$provider" "$default_model")
    
    if [[ -n "$selected_model" && "$selected_model" != "$default_model" ]]; then
      EMBEDDING_MODEL="$selected_model"
      echo ""
      ok "Selected model: $EMBEDDING_MODEL"
      user_confirmed=true
    elif [[ -n "$selected_model" && "$selected_model" == "$default_model" ]]; then
      # User confirmed the default model
      EMBEDDING_MODEL="$selected_model"
      echo ""
      echo -e "  ${CYAN}Using default:${RESET} $EMBEDDING_MODEL"
      user_confirmed=true
    else
      # User didn't confirm, prompt to try again
      echo ""
     warn "Model selection cancelled or invalid."
       prompt "Try again? (Y/n) "
       if ! is_interactive; then
         err "Cannot read input in non-interactive mode"
         exit 1
       fi
       read -r retry_response || retry_response=""
       retry_response="${retry_response:-Y}"
      
      if [[ ! "$retry_response" =~ ^[Yy]$ ]]; then
        user_confirmed=true
      fi
    fi
  done
  
  # Fallback if all attempts failed
  if [[ -z "$EMBEDDING_MODEL" ]]; then
    EMBEDDING_MODEL="$default_model"
    echo ""
    echo -e "  ${YELLOW}Using default after $attempt attempts:${RESET} $EMBEDDING_MODEL"
  fi
}

configure_anthropic_key() {
  local provider="${LLM_PROVIDER:-openai}"
  
  # Only ask if anthropic is selected
  if [[ "$provider" != "anthropic" ]]; then
    echo -e "${CYAN}Skipping Anthropic key (provider is $provider)${RESET}"
    sleep 1
    return 0
  fi
  
  print_header
  echo -e "${BOLD}Step 6: Anthropic API Key${RESET}"
  echo ""
  echo -e "Anthropic API key is required when using anthropic as the LLM provider."
  echo ""
  
  configure_variable "ANTHROPIC_API_KEY" \
    "Your Anthropic API key" \
    "" \
    "sk-ant-..." \
    "true" \
    "validate_api_key"
}

configure_llamacpp_url() {
  local provider="${LLM_PROVIDER:-openai}"
  
  # Only ask if llamacpp is selected
  if [[ "$provider" != "llamacpp" ]]; then
    echo -e "${CYAN}Skipping llamacpp URL (provider is $provider)${RESET}"
    sleep 1
    return 0
  fi
  
  print_header
  echo -e "${BOLD}Step 7: llamacpp URL Configuration${RESET}"
  echo ""
  echo -e "Enter the base URL for your local llama.cpp server."
  echo ""
  
  configure_variable "LLAMACPP_URL" \
    "URL for your local llama.cpp server" \
    "http://host.docker.internal:8080" \
    "http://localhost:8080" \
    "false"
}

configure_networking() {
  print_header
  echo -e "${BOLD}Step 8: Networking Configuration${RESET}"
  echo ""
  echo -e "Configure how the Skill Router will be accessible on your network."
  echo ""
  
  configure_variable "PORT" \
    "Host port to bind the container to" \
    "3000" \
    "3000" \
    "false" \
    "validate_port"
}

configure_github() {
  print_header
  echo -e "${BOLD}Step 9: GitHub Integration${RESET}"
  echo ""
  echo -e "Configure GitHub access for automatic skill updates and remote skill loading."
  echo ""
  
  configure_variable "GITHUB_ENABLED" \
    "Enable GitHub remote skill loading" \
    "true" \
    "true" \
    "false"
}

configure_github_token() {
  local enabled="${GITHUB_ENABLED:-true}"
  
  # Only ask if GitHub is enabled
  if [[ "$enabled" != "true" ]]; then
    echo -e "${CYAN}Skipping GitHub token (GitHub is disabled)${RESET}"
    sleep 1
    return 0
  fi
  
  print_header
  echo -e "${BOLD}Step 10: GitHub Token${RESET}"
  echo ""
  echo -e "Provide a GitHub personal access token for higher API rate limits."
  echo "This is optional but recommended for production use."
  echo ""
  
  configure_variable "GITHUB_TOKEN" \
    "GitHub personal access token (optional)" \
    "" \
    "ghp_..." \
    "false"
}

configure_ssh() {
  print_header
  echo -e "${BOLD}Step 11: SSH Configuration (Optional)${RESET}"
  echo ""
  echo -e "Configure SSH keys if you want the container to access private repositories."
  echo ""
  
  configure_variable "SSH_KEY_PATH" \
    "Path to SSH private key for git authentication" \
    "" \
    "~/.ssh/id_rsa" \
    "false" \
    "validate_file_exists"
  
  configure_variable "SSH_AGENT_SOCKET" \
    "Path to SSH agent socket for agent forwarding" \
    "" \
    "~/.ssh/agent.sock" \
    "false"
  
  configure_variable "SSH_KNOWN_HOSTS" \
    "Path to known_hosts file (optional)" \
    "" \
    "~/.ssh/known_hosts" \
    "false"
}

configure_auto_skill() {
  print_header
  echo -e "${BOLD}Step 12: Auto-Skill Generation${RESET}"
  echo ""
  echo -e "Configure automatic skill generation and contribution."
  echo ""
  
  configure_variable "AUTO_SKILL_ENABLED" \
    "Enable/disable auto-skill generation" \
    "true" \
    "true" \
    "false"
  
  configure_variable "AUTO_SKILL_CONTRIBUTE" \
    "Enable/disable contribution to git" \
    "true" \
    "true" \
    "false"
  
  configure_variable "AUTO_SKILL_MODEL" \
    "LLM model for skill generation" \
    "gpt-4o-mini" \
    "gpt-4o-mini" \
    "false"
}

configure_link_following() {
  print_header
  echo -e "${BOLD}Step 13: Link Following Configuration${RESET}"
  echo ""
  echo -e "Configure how external links in skill definitions are resolved."
  echo ""

  configure_variable "LINK_FOLLOWING_ENABLED" \
    "Enable markdown link following in skills" \
    "false" \
    "false" \
    "false"

  configure_variable "ALLOW_EXTERNAL_LINKS" \
    "Allow fetching external URLs (HTTPS only)" \
    "false" \
    "false" \
    "false"

  configure_variable "MAX_EXTERNAL_SIZE_KB" \
    "Max external content size in KB before compression/skip" \
    "10" \
    "10" \
    "false"

  configure_variable "EXTERNAL_COMPRESSION_MODE" \
    "Compression mode for oversized external content (brief, moderate, detailed)" \
    "brief" \
    "brief" \
    "false"

  configure_variable "JS_RENDERING_ENABLED" \
    "Enable JavaScript rendering for dynamic pages (requires Puppeteer)" \
    "false" \
    "false" \
    "false"

  configure_variable "LINK_RESOLUTION_MODE" \
    "How resolved content is embedded (inline, semantic, compressed)" \
    "inline" \
    "inline" \
    "false"

  configure_variable "SEMANTIC_TOP_K" \
    "Number of top semantic chunks to return (when mode=semantic)" \
    "3" \
    "3" \
    "false"
}

# ─────────────────────────────────────────────────────────────────────────────
# Summary and final confirmation
# ─────────────────────────────────────────────────────────────────────────────

print_summary() {
  print_header
  echo -e "${BOLD}Configuration Summary${RESET}"
  echo ""
  
  # Mask sensitive values
  local openai_masked="${OPENAI_API_KEY:0:8}...${OPENAI_API_KEY: -4}"
  echo -e "  ${BOLD}OpenAI API Key:${RESET} $openai_masked"
  echo -e "  ${BOLD}Port:${RESET} $PORT"
  echo -e "  ${BOLD}LLM Provider:${RESET} $LLM_PROVIDER"
  echo -e "  ${BOLD}LLM Model:${RESET} ${LLM_MODEL:-provider default}"
  echo -e "  ${BOLD}Embedding Provider:${RESET} $EMBEDDING_PROVIDER"
  echo -e "  ${BOLD}Embedding Model:${RESET} ${EMBEDDING_MODEL:-provider default}"
  
  if [[ "$LLM_PROVIDER" == "anthropic" ]]; then
    local anthropic_masked="${ANTHROPIC_API_KEY:0:8}...${ANTHROPIC_API_KEY: -4}"
    echo -e "  ${BOLD}Anthropic API Key:${RESET} $anthropic_masked"
  fi
  
  if [[ "$LLM_PROVIDER" == "llamacpp" ]]; then
    echo -e "  ${BOLD}llamacpp URL:${RESET} $LLAMACPP_URL"
  fi
  
  echo -e "  ${BOLD}GitHub Enabled:${RESET} $GITHUB_ENABLED"
  if [[ "$GITHUB_ENABLED" == "true" && -n "$GITHUB_TOKEN" ]]; then
    local github_masked="${GITHUB_TOKEN:0:8}...${GITHUB_TOKEN: -4}"
    echo -e "  ${BOLD}GitHub Token:${RESET} $github_masked"
  else
    echo -e "  ${BOLD}GitHub Token:${RESET} Not set"
  fi
  
  if [[ -n "$SSH_KEY_PATH" ]]; then
    echo -e "  ${BOLD}SSH Key:${RESET} $SSH_KEY_PATH"
  fi
  if [[ -n "$SSH_AGENT_SOCKET" ]]; then
    echo -e "  ${BOLD}SSH Agent:${RESET} $SSH_AGENT_SOCKET"
  fi
  if [[ -n "$SSH_KNOWN_HOSTS" ]]; then
    echo -e "  ${BOLD}SSH Known Hosts:${RESET} $SSH_KNOWN_HOSTS"
  fi
  
  echo -e "  ${BOLD}Auto-Skill:${RESET} enabled=$AUTO_SKILL_ENABLED, contribute=$AUTO_SKILL_CONTRIBUTE"
  echo -e "  ${BOLD}Auto-Skill Model:${RESET} $AUTO_SKILL_MODEL"

  echo -e "  ${BOLD}Link Following:${RESET} enabled=$LINK_FOLLOWING_ENABLED, external=$ALLOW_EXTERNAL_LINKS"
  echo -e "  ${BOLD}Link Resolution:${RESET} mode=$LINK_RESOLUTION_MODE, max_size=${MAX_EXTERNAL_SIZE_KB}KB"
  if [[ "$LINK_RESOLUTION_MODE" == "semantic" ]]; then
    echo -e "  ${BOLD}Semantic:${RESET} top_k=$SEMANTIC_TOP_K"
  fi
  echo -e "  ${BOLD}JS Rendering:${RESET} enabled=$JS_RENDERING_ENABLED"

  echo ""
  echo "─────────────────────────────────────────────────────────────────────────────"
  echo ""
}

get_final_confirmation() {
   print_summary
 prompt "Do you want to proceed with this configuration?"
    echo "  (Y)es - Start installation"
    echo "  (N)o - Go back and modify settings"
    echo ""
    if ! is_interactive; then
      err "Cannot read input in non-interactive mode"
      exit 1
    fi
    read -r response || response=""
    response="${response:-Y}"
  
  if [[ "$response" =~ ^[Yy]$ ]]; then
    return 0
  else
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Main installation functions (preserving original functionality)
# ─────────────────────────────────────────────────────────────────────────────

detect_opencode_config() {
  local config_arg="${1:-}"
  
  if [[ -n "$config_arg" ]]; then
    if [[ -f "$config_arg" ]]; then
      echo "$config_arg"
      return 0
    else
      echo "ERROR"
      return 1
    fi
  elif [[ -f "$HOME/.config/opencode/opencode.json" ]]; then
    echo "$HOME/.config/opencode/opencode.json"
    return 0
  elif [[ -f "$PWD/.opencode/opencode.json" ]]; then
    echo "$PWD/.opencode/opencode.json"
    return 0
  else
    echo "ERROR"
    return 1
  fi
}

detect_router_dir() {
  local skills_dir_arg="${1:-}"
  
  _check_router_dir() {
    local candidate="$1"
    if [[ -d "$candidate" && -f "$candidate/Dockerfile" ]]; then
      echo "$candidate"
      return 0
    fi
    return 1
  }
  
  if [[ -n "$skills_dir_arg" ]]; then
    local result
    result=$(_check_router_dir "$skills_dir_arg")
    if [[ $? -eq 0 ]]; then
      echo "$result"
      return 0
    else
      echo "ERROR"
      return 1
    fi
  elif result=$(_check_router_dir "$PWD/agent-skill-routing-system"); then
    echo "$result"
    return 0
  elif result=$(_check_router_dir "$HOME/git/skills/agent-skill-routing-system"); then
    echo "$result"
    return 0
  elif result=$(_check_router_dir "$HOME/.config/opencode/skills/agent-skill-routing-system"); then
    echo "$result"
    return 0
  else
    echo "ERROR"
    return 1
  fi
}

run_installation() {
  local int_opencode="${1:-false}"
  local int_claude="${2:-false}"
  local config_arg="${3:-}"
  local claude_config_arg="${4:-}"
  local no_service="${5:-false}"
  local skills_dir_arg="${6:-}"
  
  # Detect OpenCode config
  OPENCODE_CONFIG=""
  if [[ "$int_opencode" == "true" ]]; then
    info "Detecting OpenCode config..."
    
    OPENCODE_CONFIG=$(detect_opencode_config "$config_arg")
    if [[ "$OPENCODE_CONFIG" == "ERROR" ]]; then
      err "Could not find opencode.json. Searched:"
      err "  1. $HOME/.config/opencode/opencode.json"
      err "  2. $PWD/.opencode/opencode.json"
      err "Use --config PATH to specify its location, or omit --integrate-opencode."
      exit 1
    fi
    ok "Found config at: $OPENCODE_CONFIG"
  else
    info "Skipping OpenCode config detection"
  fi
  
  # Detect router directory
  info "Detecting routing system directory..."
  
  ROUTER_DIR=$(detect_router_dir "$skills_dir_arg")
  if [[ "$ROUTER_DIR" == "ERROR" ]]; then
    err "Could not find agent-skill-routing-system with a Dockerfile. Searched:"
    err "  1. $PWD/agent-skill-routing-system"
    err "  2. $HOME/git/skills/agent-skill-routing-system"
    err "  3. $HOME/.config/opencode/skills/agent-skill-routing-system"
    err "Use --skills-dir PATH to specify its location."
    exit 1
  fi
  ok "Found routing system at: $ROUTER_DIR"
  
  # Prerequisite checks
  info "Checking prerequisites..."
  
  if ! command -v docker &>/dev/null; then
    err "docker is not installed. Install it from https://docs.docker.com/get-docker/"
    exit 1
  fi
  ok "docker found: $(docker --version)"
  
  if ! docker info &>/dev/null; then
    err "Docker daemon is not running. Start it with: sudo systemctl start docker"
    exit 1
  fi
  ok "Docker daemon is running"
  
  if ! command -v curl &>/dev/null; then
    err "curl is not installed. Install it with: apt-get install curl  OR  brew install curl"
    exit 1
  fi
  ok "curl found: $(curl --version | head -1)"
  
  # Validate API keys
  info "Validating API keys..."
  
  local use_openai=false
  local use_embedding_openai=false
  
  if [[ "$LLM_PROVIDER" != "llamacpp" ]]; then
    use_openai=true
  fi
  if [[ "$EMBEDDING_PROVIDER" != "llamacpp" ]]; then
    use_embedding_openai=true
  fi
  
  if [[ "$use_openai" == "true" || "$use_embedding_openai" == "true" ]]; then
    if [[ -z "$OPENAI_API_KEY" ]]; then
      err "OPENAI_API_KEY is required when using openai provider for LLM or embeddings."
      err "Set it with:  --openai-key sk-...   OR   export OPENAI_API_KEY=sk-..."
      exit 1
    fi
    ok "OPENAI_API_KEY is set"
  fi
  
  if [[ "$LLM_PROVIDER" == "anthropic" && -z "$ANTHROPIC_API_KEY" ]]; then
    err "--provider anthropic requires --anthropic-key or ANTHROPIC_API_KEY env var"
    exit 1
  fi
  [[ -n "$ANTHROPIC_API_KEY" ]] && ok "ANTHROPIC_API_KEY is set"
  
  # Validate SSH configuration
  info "Validating SSH configuration..."
  
  if [[ -n "$SSH_KEY_PATH" ]]; then
    if [[ -f "$SSH_KEY_PATH" ]]; then
      ok "SSH key found: $SSH_KEY_PATH"
    else
      err "SSH key not found: $SSH_KEY_PATH"
      exit 1
    fi
  else
    info "SSH key not configured (optional)"
  fi
  
  if [[ -n "$SSH_AGENT_SOCKET" ]]; then
    if [[ -S "$SSH_AGENT_SOCKET" ]]; then
      ok "SSH agent socket found: $SSH_AGENT_SOCKET"
    else
      err "SSH agent socket not found: $SSH_AGENT_SOCKET"
      exit 1
    fi
  else
    info "SSH agent socket not configured (optional)"
  fi
  
  if [[ -n "$SSH_KNOWN_HOSTS" ]]; then
    if [[ -f "$SSH_KNOWN_HOSTS" ]]; then
      ok "SSH known_hosts found: $SSH_KNOWN_HOSTS"
    else
      err "SSH known_hosts not found: $SSH_KNOWN_HOSTS"
      exit 1
    fi
  else
    info "SSH known_hosts not configured (optional)"
  fi
  
  # Build Docker image
  info "Building Docker image..."
  info "Building skill-router:latest from $ROUTER_DIR"
  
  if ! docker build -t skill-router:latest "$ROUTER_DIR"; then
    err "Docker build failed. Check the output above for details."
    exit 1
  fi
  ok "Docker image built successfully: skill-router:latest"
  
  # Stop/remove existing container
  info "Removing existing container (if any)..."
  docker stop skill-router 2>/dev/null && ok "Stopped existing skill-router container" || true
  docker rm   skill-router 2>/dev/null && ok "Removed existing skill-router container" || true
  
  # Build SSH volume mounts
   SSH_VOLUMES=""
   if [[ -n "$SSH_KEY_PATH" ]]; then
     # Resolve symlink safely using realpath -m (Fail Fast)
     local resolved_path
     resolved_path=$(realpath -m "$SSH_KEY_PATH" 2>/dev/null) || {
       err "Invalid path: $SSH_KEY_PATH"
       return 1
     }
     if [[ -L "$SSH_KEY_PATH" ]]; then
       err "SSH key path is a symlink (not allowed for security): $SSH_KEY_PATH"
       exit 1
     fi
     if [[ -f "$SSH_KEY_PATH" && -r "$SSH_KEY_PATH" ]]; then
       SSH_VOLUMES="$SSH_VOLUMES -v $(realpath "$SSH_KEY_PATH"):/home/appuser/.ssh/id_rsa:ro"
     else
       err "SSH key path is not a regular file or not readable: $SSH_KEY_PATH"
       exit 1
     fi
   fi
   if [[ -n "$SSH_AGENT_SOCKET" ]]; then
     # Resolve symlink safely using realpath -m (Fail Fast)
     resolved_path=$(realpath -m "$SSH_AGENT_SOCKET" 2>/dev/null) || {
       err "Invalid path: $SSH_AGENT_SOCKET"
       return 1
     }
     if [[ -L "$SSH_AGENT_SOCKET" ]]; then
       err "SSH agent socket is a symlink (not allowed for security): $SSH_AGENT_SOCKET"
       exit 1
     fi
     if [[ -S "$SSH_AGENT_SOCKET" && -r "$SSH_AGENT_SOCKET" ]]; then
       SSH_VOLUMES="$SSH_VOLUMES -v $(realpath "$SSH_AGENT_SOCKET"):/tmp/ssh-agent.sock:ro"
     else
       err "SSH agent socket is not a socket or not readable: $SSH_AGENT_SOCKET"
       exit 1
     fi
   fi
   if [[ -n "$SSH_KNOWN_HOSTS" ]]; then
     SSH_VOLUMES="$SSH_VOLUMES -v $(realpath "$SSH_KNOWN_HOSTS"):/home/appuser/.ssh/known_hosts:ro"
   fi
  
  # Build environment variables as an array (each value passes through cleanly,
  # no literal quote characters, no shell escaping artifacts)
  ENV_ARGS=()
  ENV_ARGS+=(-e "OPENAI_API_KEY=${OPENAI_API_KEY:-}")
  [[ -n "${OPENAI_BASE_URL:-}" ]] && ENV_ARGS+=(-e "OPENAI_BASE_URL=$OPENAI_BASE_URL")
  ENV_ARGS+=(-e "LLM_PROVIDER=${LLM_PROVIDER:-openai}")
  # For llamacpp, use local-model; otherwise use configured model
  if [[ "$LLM_PROVIDER" == "llamacpp" ]]; then
    ENV_ARGS+=(-e "LLM_MODEL=local-model")
  elif [[ -n "${LLM_MODEL:-}" ]]; then
    ENV_ARGS+=(-e "LLM_MODEL=$LLM_MODEL")
  fi
  [[ -n "${EMBEDDING_MODEL:-}" ]]      && ENV_ARGS+=(-e "EMBEDDING_MODEL=$EMBEDDING_MODEL")
  [[ -n "${ANTHROPIC_API_KEY:-}" ]]    && ENV_ARGS+=(-e "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY")
  [[ -n "${LLAMACPP_URL:-}" ]]         && ENV_ARGS+=(-e "LLAMACPP_BASE_URL=$LLAMACPP_URL")
  ENV_ARGS+=(-e "EMBEDDING_PROVIDER=${EMBEDDING_PROVIDER:-openai}")
  ENV_ARGS+=(-e "GITHUB_SKILLS_ENABLED=${GITHUB_ENABLED:-true}")
  ENV_ARGS+=(-e "SKILL_SYNC_INTERVAL=${SYNC_INTERVAL:-3600}")
  [[ -n "${GITHUB_TOKEN:-}" ]]         && ENV_ARGS+=(-e "GITHUB_TOKEN=$GITHUB_TOKEN")
  [[ -n "${GITHUB_RAW_BASE_URL:-}" ]]  && ENV_ARGS+=(-e "GITHUB_RAW_BASE_URL=$GITHUB_RAW_BASE_URL")
  [[ -n "${GITHUB_SKILLS_REPO:-}" ]]   && ENV_ARGS+=(-e "GITHUB_SKILLS_REPO=$GITHUB_SKILLS_REPO")
  
  if [[ -n "$SSH_AGENT_SOCKET" ]]; then
    ENV_ARGS+=(-e "SSH_AUTH_SOCK=/tmp/ssh-agent.sock")
  fi
  
  ENV_ARGS+=(-e "AUTO_SKILL_ENABLED=${AUTO_SKILL_ENABLED}")
  ENV_ARGS+=(-e "AUTO_SKILL_CONTRIBUTE=${AUTO_SKILL_CONTRIBUTE}")
  ENV_ARGS+=(-e "AUTO_SKILL_MODEL=${AUTO_SKILL_MODEL}")
  ENV_ARGS+=(-e "SKILL_CACHE_DIR=${SKILL_CACHE_DIR:-/cache/skills}")

  # Link Following Configuration
  ENV_ARGS+=(-e "LINK_FOLLOWING_ENABLED=${LINK_FOLLOWING_ENABLED:-false}")
  ENV_ARGS+=(-e "ALLOW_EXTERNAL_LINKS=${ALLOW_EXTERNAL_LINKS:-false}")
  ENV_ARGS+=(-e "MAX_LINK_DEPTH=${MAX_LINK_DEPTH:-2}")
  ENV_ARGS+=(-e "MAX_EXTERNAL_SIZE_KB=${MAX_EXTERNAL_SIZE_KB:-10}")
  ENV_ARGS+=(-e "EXTERNAL_COMPRESSION_MODE=${EXTERNAL_COMPRESSION_MODE:-brief}")
  ENV_ARGS+=(-e "JS_RENDERING_ENABLED=${JS_RENDERING_ENABLED:-false}")
  ENV_ARGS+=(-e "JS_RENDER_TIMEOUT_MS=${JS_RENDER_TIMEOUT_MS:-5000}")
  ENV_ARGS+=(-e "JS_RENDER_FALLBACK=${JS_RENDER_FALLBACK:-true}")
  ENV_ARGS+=(-e "LINK_RESOLUTION_MODE=${LINK_RESOLUTION_MODE:-inline}")
  ENV_ARGS+=(-e "SEMANTIC_TOP_K=${SEMANTIC_TOP_K:-3}")
  ENV_ARGS+=(-e "SEMANTIC_SIMILARITY_THRESHOLD=${SEMANTIC_SIMILARITY_THRESHOLD:-0.3}")
  
  # Validate skills directory
  if [[ ! -d "${ROUTER_DIR%/agent-skill-routing-system}/skills" ]]; then
    err "Skills directory not found: ${ROUTER_DIR%/agent-skill-routing-system}/skills"
    exit 1
  fi
  SKILLS_PATH="${ROUTER_DIR%/agent-skill-routing-system}/skills"
  VOLUMES=(-v "$SKILLS_PATH:/app/skills:ro")
  VOLUMES+=(-v "skill-router-cache:/cache")
  if [[ -n "$SSH_VOLUMES" ]]; then
    VOLUMES+=($SSH_VOLUMES)
  fi
  
  # Run container
  info "Starting container..."
  
  docker run -d \
    --name skill-router \
    --restart unless-stopped \
    -p "${PORT}:3000" \
    "${ENV_ARGS[@]}" \
    "${VOLUMES[@]}" \
    skill-router:latest
  
  ok "Container started: skill-router on port $PORT"
  
# Health check
   info "Waiting for health check..."
   info "Note: skills load in the background — server responds immediately, ready:true appears once loading completes"
   info "Polling http://localhost:${PORT}/health (up to 60 attempts, 5s apart = 5min max)"
   
   HEALTH_RESPONSE=""
   HEALTHY=false
   
  for attempt in $(seq 1 60); do
     printf "  ."
     sleep 5
     # Use mktemp for health check temp file (Atomic Predictability)
     local health_file
     health_file=$(mktemp /tmp/skill-router-health.XXXXXX.json)
     HTTP_CODE=$(curl -s -o "$health_file" -w "%{http_code}" \
       "http://localhost:$PORT/health" 2>/dev/null || echo "000")
     
     if [[ "$HTTP_CODE" == "200" ]]; then
       HEALTH_RESPONSE=$(cat "$health_file")
       # Clean up temp file immediately (Fail Fast)
       rm -f "$health_file"
      if echo "$HEALTH_RESPONSE" | grep -q '"healthy"'; then
        HEALTHY=true
        break
      fi
    fi
  done
  
  echo ""
  
  if [[ "$HEALTHY" != "true" ]]; then
    err "Health check failed after 60 attempts."
    err "Container logs:"
    docker logs skill-router --tail 20 >&2
    exit 1
  fi
  
  READY=$(echo "$HEALTH_RESPONSE" | grep -o '"ready:[a-z]*' | cut -d: -f2 || echo "unknown")
  
  ok "Health check passed on attempt $attempt"
  echo ""
  echo -e "  ${GREEN}→ Server is up (ready: $READY)${RESET}"
  if [[ "$READY" != "true" ]]; then
    echo -e "  ${YELLOW}→ Skills are still loading in background. Check readiness with:${RESET}"
    echo -e "      curl http://localhost:${PORT}/health | jq .ready"
  fi
  echo ""
  echo -e "  ${GREEN}Health response:${RESET}"
  if command -v jq &>/dev/null; then
    echo "$HEALTH_RESPONSE" | jq .
  elif command -v python3 &>/dev/null; then
    echo "$HEALTH_RESPONSE" | python3 -m json.tool
  else
    echo "$HEALTH_RESPONSE"
  fi
  
  # Show stats
  info "Skill Router stats:"
  STATS_RESPONSE=$(curl -s "http://localhost:$PORT/stats")
  if command -v jq &>/dev/null; then
    echo "$STATS_RESPONSE" | jq . || warn "Stats response could not be parsed as JSON"
  elif command -v python3 &>/dev/null; then
    echo "$STATS_RESPONSE" | python3 -m json.tool || warn "Stats response could not be parsed as JSON"
  else
    echo "$STATS_RESPONSE"
  fi
  
  # OpenCode integration
  if [[ "$int_opencode" == "true" ]]; then
    info "Fetching skill-router-api.md from GitHub..."
    
    API_DOC_PATH="$HOME/.config/opencode/skill-router-api.md"
    RAW_URL="https://raw.githubusercontent.com/paulpas/skills/main/agent-skill-routing-system/skill-router-api.md"
    mkdir -p "$HOME/.config/opencode"
    
    if command -v curl &>/dev/null; then
      curl -fsSL "$RAW_URL" -o "$API_DOC_PATH" && ok "Written: $API_DOC_PATH" || warn "curl fetch failed, skipping"
    elif command -v wget &>/dev/null; then
      wget -q "$RAW_URL" -O "$API_DOC_PATH" && ok "Written: $API_DOC_PATH" || warn "wget fetch failed, skipping"
    else
      warn "Neither curl nor wget found — skipping skill-router-api.md fetch"
    fi
    
    info "Updating opencode.json instructions array..."
    
    if command -v jq &>/dev/null; then
      if jq -e --arg p "$API_DOC_PATH" \
        '(.instructions // []) | index($p) != null' \
        "$OPENCODE_CONFIG" > /dev/null 2>&1; then
        ok "Already in instructions array, skipping"
      else
        jq --arg p "$API_DOC_PATH" '
          if .instructions then
            .instructions += [$p]
          else
            .instructions = [$p]
          end
        ' "$OPENCODE_CONFIG" > "$OPENCODE_CONFIG.tmp" && mv "$OPENCODE_CONFIG.tmp" "$OPENCODE_CONFIG"
        ok "Added $API_DOC_PATH to instructions array"
      fi
    elif command -v python3 &>/dev/null; then
      python3 - "$OPENCODE_CONFIG" "$API_DOC_PATH" <<'PYEOF'
import json, sys
config_path = sys.argv[1]
instr_path = sys.argv[2]
with open(config_path) as f:
    cfg = json.load(f)
if 'instructions' not in cfg:
    cfg['instructions'] = []
if instr_path not in cfg['instructions']:
    cfg['instructions'].append(instr_path)
    with open(config_path, 'w') as f:
        json.dump(cfg, f, indent=2)
    print('Added to instructions array')
else:
    print('Already in instructions array, skipping')
PYEOF
    fi
    
    # Install MCP bridge script
    info "Installing skill-router-mcp.js bridge script..."
    
    MCP_NODE_CMD="$(which node)"
    MCP_SCRIPT_PATH="$HOME/.config/opencode/skill-router-mcp.js"
    BRIDGE_SRC="$ROUTER_DIR/skill-router-mcp.js"
    
    if [[ ! -f "$BRIDGE_SRC" ]]; then
      err "Bridge script source not found: $BRIDGE_SRC"
      err "Expected it shipped alongside the Dockerfile in $ROUTER_DIR"
      exit 1
    fi
    
    mkdir -p "$(dirname "$MCP_SCRIPT_PATH")"
    
    # Compare SHA-256 checksums to detect drift
    local src_checksum
    src_checksum=$(compute_sha256 "$BRIDGE_SRC")
    
    if [[ -f "$MCP_SCRIPT_PATH" ]]; then
      local installed_checksum
      installed_checksum=$(compute_sha256 "$MCP_SCRIPT_PATH")
      if [[ "$src_checksum" == "$installed_checksum" ]]; then
        ok "Bridge script already up to date: $MCP_SCRIPT_PATH"
      else
        cp "$BRIDGE_SRC" "$MCP_SCRIPT_PATH"
        ok "Bridge script updated (checksum mismatch)"
      fi
    else
      cp "$BRIDGE_SRC" "$MCP_SCRIPT_PATH"
      ok "Bridge script installed: $MCP_SCRIPT_PATH"
    fi
    
    info "Bridge script checksum: ${src_checksum:0:16}..."
    
    # Sanity-check the copy with `node --check` if node is available.
    if node --check "$MCP_SCRIPT_PATH" 2>/dev/null; then
      ok "Bridge script syntax valid"
    else
      warn "node --check failed on $MCP_SCRIPT_PATH — review manually"
    fi
    
    info "Injecting skill-router MCP server into $OPENCODE_CONFIG..."
    
    if command -v jq &>/dev/null; then
      if jq -e '.mcp["skill-router"]' "$OPENCODE_CONFIG" > /dev/null 2>&1; then
        ok "skill-router already in mcp section, skipping"
      else
        jq --arg cmd "$MCP_NODE_CMD" --arg script "$MCP_SCRIPT_PATH" '
          .mcp["skill-router"] = {
            "type": "local",
            "command": [$cmd, $script],
            "enabled": true
          }
        ' "$OPENCODE_CONFIG" > "$OPENCODE_CONFIG.tmp" && mv "$OPENCODE_CONFIG.tmp" "$OPENCODE_CONFIG"
        ok "Added skill-router to mcp section"
      fi
    elif command -v python3 &>/dev/null; then
      python3 - "$OPENCODE_CONFIG" "$MCP_NODE_CMD" "$MCP_SCRIPT_PATH" <<'PYEOF'
import sys, json
cfg_path, node_cmd, script_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(cfg_path) as f:
    cfg = json.load(f)
if 'mcp' not in cfg:
    cfg['mcp'] = {}
if 'skill-router' not in cfg['mcp']:
    cfg['mcp']['skill-router'] = {
        "type": "local",
        "command": [node_cmd, script_path],
        "enabled": True
    }
    with open(cfg_path, 'w') as f:
        json.dump(cfg, f, indent=2)
    print("Added skill-router to mcp section")
else:
    print("skill-router already in mcp section, skipping")
PYEOF
    fi
    
    # Validate opencode.json
    info "Validating opencode.json..."
    
    if command -v jq &>/dev/null; then
      if jq empty "$OPENCODE_CONFIG" 2>/dev/null; then
        ok "opencode.json is valid JSON"
      else
        warn "opencode.json may have JSON errors — review manually: $OPENCODE_CONFIG"
      fi
    elif command -v python3 &>/dev/null; then
      if python3 -c "import json; json.load(open('$OPENCODE_CONFIG'))" 2>/dev/null; then
        ok "opencode.json is valid JSON"
      else
        warn "opencode.json may have JSON errors — review manually: $OPENCODE_CONFIG"
      fi
    fi
  else
    info "Skipping OpenCode integration"
  fi
  
  # Claude integration
  if [[ "$int_claude" == "true" ]]; then
    info "Detecting Claude config..."
    
    CLAUDE_CONFIG=""
    if [[ -n "$claude_config_arg" ]]; then
      if [[ -f "$claude_config_arg" ]]; then
        CLAUDE_CONFIG="$claude_config_arg"
        ok "Using config from --claude-config arg: $CLAUDE_CONFIG"
      else
        err "--claude-config path does not exist: $claude_config_arg"
        exit 1
      fi
    elif [[ -f "$HOME/.claude.json" ]]; then
      CLAUDE_CONFIG="$HOME/.claude.json"
      ok "Found config at: $CLAUDE_CONFIG"
    elif [[ -f "$HOME/.config/claude/claude.json" ]]; then
      CLAUDE_CONFIG="$HOME/.config/claude/claude.json"
      ok "Found config at: $CLAUDE_CONFIG"
    elif [[ -f "$HOME/Library/Application Support/Claude/claude.json" ]]; then
      CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude.json"
      ok "Found config at: $CLAUDE_CONFIG"
    else
      err "Could not find claude.json. Searched:"
      err "  1. $HOME/.claude.json"
      err "  2. $HOME/.config/claude/claude.json"
      err "  3. $HOME/Library/Application Support/Claude/claude.json"
      err "Use --claude-config PATH to specify its location, or omit --integrate-claude."
      exit 1
    fi
    
    info "Injecting skill-router MCP server into $CLAUDE_CONFIG..."
    
    MCP_NODE_CMD="$(which node)"
    MCP_SCRIPT_PATH="$HOME/.config/claude/skill-router-mcp.js"
    CLAUDE_BRIDGE_SRC="$ROUTER_DIR/skill-router-claude-mcp.js"
    
    mkdir -p "$(dirname "$MCP_SCRIPT_PATH")"
    
    if [[ ! -f "$CLAUDE_BRIDGE_SRC" ]]; then
      err "Claude MCP bridge source not found: $CLAUDE_BRIDGE_SRC"
      exit 1
    fi
    
    # Compare SHA-256 checksums to detect drift
    local src_checksum
    src_checksum=$(compute_sha256 "$CLAUDE_BRIDGE_SRC")
    
    if [[ -f "$MCP_SCRIPT_PATH" ]]; then
      local installed_checksum
      installed_checksum=$(compute_sha256 "$MCP_SCRIPT_PATH")
      if [[ "$src_checksum" == "$installed_checksum" ]]; then
        ok "Claude MCP script already up to date: $MCP_SCRIPT_PATH"
      else
        cp "$CLAUDE_BRIDGE_SRC" "$MCP_SCRIPT_PATH"
        ok "Claude MCP script updated (checksum mismatch)"
      fi
    else
      cp "$CLAUDE_BRIDGE_SRC" "$MCP_SCRIPT_PATH"
      ok "Claude MCP script installed: $MCP_SCRIPT_PATH"
    fi
    
    info "Claude bridge script checksum: ${src_checksum:0:16}..."
    
    if command -v jq &>/dev/null; then
      if jq -e '.mcpServers["skill-router"]' "$CLAUDE_CONFIG" > /dev/null 2>&1; then
        ok "skill-router already in mcpServers section, skipping"
      else
        jq --arg cmd "$MCP_NODE_CMD" --arg script "$MCP_SCRIPT_PATH" '
          .mcpServers["skill-router"] = {
            "command": $cmd,
            "args": [$script],
            "env": {}
          }
        ' "$CLAUDE_CONFIG" > "$CLAUDE_CONFIG.tmp" && mv "$CLAUDE_CONFIG.tmp" "$CLAUDE_CONFIG"
        ok "Added skill-router to mcpServers section"
      fi
    elif command -v python3 &>/dev/null; then
      python3 - "$CLAUDE_CONFIG" "$MCP_NODE_CMD" "$MCP_SCRIPT_PATH" <<'PYEOF'
import sys, json
cfg_path, node_cmd, script_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(cfg_path) as f:
    cfg = json.load(f)
if 'mcpServers' not in cfg:
    cfg['mcpServers'] = {}
if 'skill-router' not in cfg['mcpServers']:
    cfg['mcpServers']['skill-router'] = {
        "command": node_cmd,
        "args": [script_path],
        "env": {}
    }
    with open(cfg_path, 'w') as f:
        json.dump(cfg, f, indent=2)
    print("Added skill-router to mcpServers section")
else:
    print("skill-router already in mcpServers section, skipping")
PYEOF
    fi
    
    # Validate JSON
    info "Validating claude.json..."
    
    if command -v jq &>/dev/null; then
      if jq empty "$CLAUDE_CONFIG" 2>/dev/null; then
        ok "claude.json is valid JSON"
      else
        warn "claude.json may have JSON errors — review manually: $CLAUDE_CONFIG"
      fi
    elif command -v python3 &>/dev/null; then
      if python3 -c "import json; json.load(open('$CLAUDE_CONFIG'))" 2>/dev/null; then
        ok "claude.json is valid JSON"
      else
        warn "claude.json may have JSON errors — review manually: $CLAUDE_CONFIG"
      fi
    fi
  else
    info "Skipping Claude MCP injection"
  fi
  
  # Systemd service
  info "Setting up systemd user service..."
  
  SERVICE_STATUS="skipped (--no-service)"
  
  if [[ "$no_service" == "true" ]]; then
    info "Skipping systemd setup (--no-service flag set)"
  elif ! command -v systemctl &>/dev/null; then
    warn "systemctl not found — skipping systemd user service setup"
    SERVICE_STATUS="skipped (no systemctl)"
  else
    SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SYSTEMD_USER_DIR"
    
    if [[ -f "$SYSTEMD_USER_DIR/skill-router.service" ]]; then
      ok "Systemd service file already exists, skipping"
    else
      cat > "$SYSTEMD_USER_DIR/skill-router.service" <<'UNIT'
[Unit]
Description=Skill Router (Docker)
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start skill-router
ExecStop=/usr/bin/docker stop skill-router
Restart=no

[Install]
WantedBy=default.target
UNIT

      ok "Written: $SYSTEMD_USER_DIR/skill-router.service"

      systemctl --user daemon-reload
      ok "Reloaded systemd user daemon"

      systemctl --user enable skill-router
      ok "Enabled skill-router user service"
    fi
    
    SERVICE_STATUS="systemd user service enabled ✓"
  fi
  
  # Final summary
  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║         Skill Router Installation Complete        ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
  local _model_display="${LLM_MODEL:-provider default}"
  local _embedding_model_display="${EMBEDDING_MODEL:-provider default}"
  echo -e "  ${BOLD}Container:${RESET}    skill-router (running on port $PORT)"
  echo -e "  ${BOLD}Image:${RESET}        skill-router:latest"
  echo -e "  ${BOLD}Health:${RESET}       http://localhost:$PORT/health ${GREEN}✓${RESET}"
  echo -e "  ${BOLD}LLM Provider:${RESET} $LLM_PROVIDER ($_model_display)"
  echo -e "  ${BOLD}Embeddings:${RESET}   $EMBEDDING_PROVIDER ($_embedding_model_display)"
  echo -e "  ${BOLD}Service:${RESET}      $SERVICE_STATUS"
  if [[ "$GITHUB_ENABLED" == "true" ]]; then
    echo -e "  ${BOLD}GitHub Sync:${RESET}  enabled (https://github.com/paulpas/skills)"
    echo -e "  ${BOLD}Sync Interval:${RESET} every ${SYNC_INTERVAL:-3600}s (new skills auto-discovered without restart)"
  else
    echo -e "  ${BOLD}GitHub Sync:${RESET}  disabled"
  fi
  
  if [[ -n "$SSH_KEY_PATH" ]]; then
    echo -e "  ${BOLD}SSH Key:${RESET}      $SSH_KEY_PATH ${GREEN}✓${RESET}"
  fi
  if [[ -n "$SSH_AGENT_SOCKET" ]]; then
    echo -e "  ${BOLD}SSH Agent:${RESET}    $SSH_AGENT_SOCKET ${GREEN}✓${RESET}"
  fi
  if [[ -n "$SSH_KNOWN_HOSTS" ]]; then
    echo -e "  ${BOLD}SSH Known Hosts:${RESET} $SSH_KNOWN_HOSTS ${GREEN}✓${RESET}"
  fi
  
  echo -e "  ${BOLD}Auto-Skill:${RESET}     enabled: $AUTO_SKILL_ENABLED, contribute: $AUTO_SKILL_CONTRIBUTE"
  echo -e "  ${BOLD}Auto-Skill Model:${RESET} $AUTO_SKILL_MODEL"
  echo -e "  ${BOLD}Skill Cache:${RESET}  /cache/skills"
  
  if [[ "$int_opencode" == "true" ]]; then
    echo -e "  ${BOLD}OpenCode:${RESET}     $OPENCODE_CONFIG ${GREEN}✓${RESET}"
    echo -e "  ${BOLD}Instructions:${RESET} $API_DOC_PATH ${GREEN}✓${RESET}"
  fi
  
  if [[ "$int_claude" == "true" ]]; then
    echo -e "  ${BOLD}Claude:${RESET}       $CLAUDE_CONFIG ${GREEN}✓${RESET}"
    echo -e "  ${BOLD}MCP Script:${RESET}   $HOME/.config/claude/skill-router-mcp.js ${GREEN}✓${RESET}"
    echo -e "  ${BOLD}MCP Section:${RESET}  mcpServers.skill-router ${GREEN}✓${RESET}"
  fi
  
  echo ""
  echo -e "  ${BOLD}Useful commands:${RESET}"
  echo -e "    docker logs skill-router --tail 50 -f"
  echo -e "    docker restart skill-router"
  echo -e "    curl http://localhost:$PORT/health"
  
  if [[ "$int_claude" == "true" ]]; then
    echo -e "    cat $CLAUDE_CONFIG | jq '.mcpServers[\"skill-router\"]'"
  fi
  
  if [[ "$int_opencode" != "true" && "$int_claude" != "true" ]]; then
    echo ""
    echo -e "  ${YELLOW}Tip:${RESET} Re-run with ${BOLD}--integrate-opencode${RESET} or ${BOLD}--integrate-claude${RESET} to add this service to your IDE config."
  elif [[ "$int_opencode" != "true" ]]; then
    echo ""
    echo -e "  ${YELLOW}Tip:${RESET} Re-run with ${BOLD}--integrate-opencode${RESET} to add this service to your OpenCode config."
  elif [[ "$int_claude" != "true" ]]; then
    echo ""
    echo -e "  ${YELLOW}Tip:${RESET} Re-run with ${BOLD}--integrate-claude${RESET} to add this service to your Claude config."
  fi
  
  echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Mode selection (Interactive vs Non-interactive)
# ─────────────────────────────────────────────────────────────────────────────

# Mode selection
if [[ "$MODE" == "noninteractive" ]]; then
  # Non-interactive mode
  print_header
  echo -e "${BOLD}Non-Interactive Installation Mode${RESET}"
  echo ""
  
  if [[ -z "$CONFIG_FILE" ]]; then
    err "Config file path required for non-interactive mode"
    show_usage
    exit 1
  fi
  
  if [[ ! -f "$CONFIG_FILE" ]]; then
    err "Config file not found: $CONFIG_FILE"
    exit 1
  fi
  
  if ! parse_config_file "$CONFIG_FILE"; then
    err "Failed to parse config file"
    exit 1
  fi
  
  # Validate required settings for non-interactive mode
  if [[ -z "$OPENAI_API_KEY" && -z "${OPENAI_BASE_URL:-}" ]]; then
    err "OPENAI_API_KEY or OPENAI_BASE_URL is required in non-interactive mode"
    echo "See: $0 --help"
    exit 1
  fi
  if [[ -n "${OPENAI_BASE_URL:-}" ]]; then
    if ! validate_url "$OPENAI_BASE_URL" "OPENAI_BASE_URL"; then
      echo "See: $0 --help"
      exit 1
    fi
  fi
  
  # Skip interactive configuration, go straight to installation
  print_header
  echo -e "${BOLD}Starting installation...${RESET}"
  echo ""
  
  # Default values for non-interactive mode (must be set before run_installation
  # because set -euo pipefail requires all variables to be bound)
  OPENAI_API_KEY="${OPENAI_API_KEY:-}"
  OPENAI_BASE_URL="${OPENAI_BASE_URL:-}"
  PORT="${PORT:-3000}"
  LLM_PROVIDER="${LLM_PROVIDER:-openai}"
  LLM_MODEL="${LLM_MODEL:-}"
  EMBEDDING_MODEL="${EMBEDDING_MODEL:-}"
  ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
  LLAMACPP_URL="${LLAMACPP_URL:-http://host.docker.internal:8080}"
  EMBEDDING_PROVIDER="${EMBEDDING_PROVIDER:-openai}"
  GITHUB_ENABLED="${GITHUB_ENABLED:-true}"
  GITHUB_TOKEN="${GITHUB_TOKEN:-}"
  GITHUB_RAW_BASE_URL="${GITHUB_RAW_BASE_URL:-https://raw.githubusercontent.com/paulpas/skills/main}"
  GITHUB_SKILLS_REPO="${GITHUB_SKILLS_REPO:-https://github.com/paulpas/skills}"
  SYNC_INTERVAL="${SYNC_INTERVAL:-3600}"
  SSH_KEY_PATH="${SSH_KEY_PATH:-}"
  SSH_AGENT_SOCKET="${SSH_AGENT_SOCKET:-}"
  SSH_KNOWN_HOSTS="${SSH_KNOWN_HOSTS:-}"
  AUTO_SKILL_ENABLED="${AUTO_SKILL_ENABLED:-true}"
  AUTO_SKILL_CONTRIBUTE="${AUTO_SKILL_CONTRIBUTE:-true}"
  AUTO_SKILL_MODEL="${AUTO_SKILL_MODEL:-gpt-4o-mini}"
  LINK_FOLLOWING_ENABLED="${LINK_FOLLOWING_ENABLED:-false}"
  ALLOW_EXTERNAL_LINKS="${ALLOW_EXTERNAL_LINKS:-false}"
  MAX_LINK_DEPTH="${MAX_LINK_DEPTH:-2}"
  MAX_EXTERNAL_SIZE_KB="${MAX_EXTERNAL_SIZE_KB:-10}"
  EXTERNAL_COMPRESSION_MODE="${EXTERNAL_COMPRESSION_MODE:-brief}"
  JS_RENDERING_ENABLED="${JS_RENDERING_ENABLED:-false}"
  JS_RENDER_TIMEOUT_MS="${JS_RENDER_TIMEOUT_MS:-5000}"
  JS_RENDER_FALLBACK="${JS_RENDER_FALLBACK:-true}"
  LINK_RESOLUTION_MODE="${LINK_RESOLUTION_MODE:-inline}"
  SEMANTIC_TOP_K="${SEMANTIC_TOP_K:-3}"
  SEMANTIC_SIMILARITY_THRESHOLD="${SEMANTIC_SIMILARITY_THRESHOLD:-0.3}"

  run_installation "$MODE_INTEGRATE_OPENCODE" "$MODE_INTEGRATE_CLAUDE" "$MODE_OPENCODE_CONFIG" "$MODE_CLAUDE_CONFIG" "false" "$MODE_SKILLS_DIR"
else
  # Interactive mode (existing behavior)
  show_intro
  
  # Default values for interactive mode
  OPENAI_API_KEY="${OPENAI_API_KEY:-}"
  OPENAI_BASE_URL="${OPENAI_BASE_URL:-}"
  PORT="${PORT:-3000}"
  LLM_PROVIDER="${LLM_PROVIDER:-openai}"
  LLM_MODEL="${LLM_MODEL:-}"
  EMBEDDING_MODEL="${EMBEDDING_MODEL:-}"
  ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
  LLAMACPP_URL="${LLAMACPP_URL:-http://host.docker.internal:8080}"
  EMBEDDING_PROVIDER="${EMBEDDING_PROVIDER:-openai}"
  GITHUB_ENABLED="${GITHUB_ENABLED:-true}"
  GITHUB_TOKEN="${GITHUB_TOKEN:-}"
  GITHUB_RAW_BASE_URL="${GITHUB_RAW_BASE_URL:-https://raw.githubusercontent.com/paulpas/skills/main}"
  GITHUB_SKILLS_REPO="${GITHUB_SKILLS_REPO:-https://github.com/paulpas/skills}"
  SYNC_INTERVAL="${SYNC_INTERVAL:-3600}"
  SSH_KEY_PATH="${SSH_KEY_PATH:-}"
  SSH_AGENT_SOCKET="${SSH_AGENT_SOCKET:-}"
  SSH_KNOWN_HOSTS="${SSH_KNOWN_HOSTS:-}"
  AUTO_SKILL_ENABLED="${AUTO_SKILL_ENABLED:-true}"
  AUTO_SKILL_CONTRIBUTE="${AUTO_SKILL_CONTRIBUTE:-true}"
  AUTO_SKILL_MODEL="${AUTO_SKILL_MODEL:-gpt-4o-mini}"
  LINK_FOLLOWING_ENABLED="${LINK_FOLLOWING_ENABLED:-false}"
  ALLOW_EXTERNAL_LINKS="${ALLOW_EXTERNAL_LINKS:-false}"
  MAX_LINK_DEPTH="${MAX_LINK_DEPTH:-2}"
  MAX_EXTERNAL_SIZE_KB="${MAX_EXTERNAL_SIZE_KB:-10}"
  EXTERNAL_COMPRESSION_MODE="${EXTERNAL_COMPRESSION_MODE:-brief}"
  JS_RENDERING_ENABLED="${JS_RENDERING_ENABLED:-false}"
  JS_RENDER_TIMEOUT_MS="${JS_RENDER_TIMEOUT_MS:-5000}"
  JS_RENDER_FALLBACK="${JS_RENDER_FALLBACK:-true}"
  LINK_RESOLUTION_MODE="${LINK_RESOLUTION_MODE:-inline}"
  SEMANTIC_TOP_K="${SEMANTIC_TOP_K:-3}"
  SEMANTIC_SIMILARITY_THRESHOLD="${SEMANTIC_SIMILARITY_THRESHOLD:-0.3}"

  # Interactive configuration
  configure_required_api
  configure_provider_selection
  configure_llm_model
  configure_embedding_provider
  configure_embedding_model
  configure_anthropic_key
  configure_llamacpp_url
  configure_networking
  configure_github
  configure_github_token
  configure_ssh
  configure_auto_skill
  configure_link_following

  # Final confirmation loop
  while true; do
    if get_final_confirmation; then
      break
    fi
    
    # User wants to go back - which section to modify?
    echo ""
    echo "Which setting would you like to modify?"
    echo "  1. OpenAI API Key"
    echo "  2. LLM Provider"
    echo "  3. LLM Model"
    echo "  4. Embedding Provider"
    echo "  5. Embedding Model"
    echo "  6. Anthropic API Key"
    echo "  7. llamacpp URL"
    echo "  8. Port"
    echo "  9. GitHub Integration"
    echo "  10. GitHub Token"
    echo "  11. SSH Configuration"
    echo "  12. Auto-Skill Settings"
    echo "  13. Link Following Configuration"
     echo ""

    prompt "Enter your choice (1-13) or 'q' to quit:"
      if ! is_interactive; then
        err "Cannot read input in non-interactive mode"
        exit 1
      fi
      read -r choice || choice=""
     
     case "$choice" in
      1) configure_required_api ;;
      2) configure_provider_selection ;;
      3) configure_llm_model ;;
      4) configure_embedding_provider ;;
      5) configure_embedding_model ;;
      6) configure_anthropic_key ;;
      7) configure_llamacpp_url ;;
      8) configure_networking ;;
      9) configure_github ;;
      10) configure_github_token ;;
      11) configure_ssh ;;
      12) configure_auto_skill ;;
      13) configure_link_following ;;
      q|Q) 
        echo "Installation cancelled."
        exit 1
        ;;
      *) 
        err "Invalid choice. Please try again."
        sleep 1
        ;;
    esac
  done
  
  # Run the actual installation
  print_header
  echo -e "${BOLD}Starting installation...${RESET}"
  echo ""
  
  run_installation "$MODE_INTEGRATE_OPENCODE" "$MODE_INTEGRATE_CLAUDE" "$MODE_OPENCODE_CONFIG" "$MODE_CLAUDE_CONFIG" "false" "$MODE_SKILLS_DIR"
fi
