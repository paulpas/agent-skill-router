---
name: bash-tui-menu
description: Implements robust interactive Bash TUI menus with dialog widgets, safe
  selection handling, cancel paths, and non-interactive fallbacks.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: bash tui menu, dialog command, interactive shell script, terminal menu,
    checklist radiolist, how do i make bash menus, ncurses dialog
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
  related-skills: shell-parameter-expansion, shell-command-chaining, shell-process-management,
    output-formatting
---
# Bash TUI Menu Builder

Implements production-ready interactive Bash terminal interfaces using the `dialog` command and the concrete Bash-Dialog example patterns. This skill makes the model design menus that are safe under `set -euo pipefail`, preserve cancel/ESC semantics, clean up the terminal, and remain scriptable through non-interactive fallbacks.

## TL;DR for Code Generation

- [ ] Detect `dialog` and an attached TTY before rendering; provide a CLI/env fallback when either is missing.
- [ ] Under `set -e`, capture widget output inside an `if choice=$(dialog --stdout ...); then status=0; else status=$?; fi` block so Cancel, ESC, Extra, and errors cannot abort before status handling.
- [ ] Treat exit code `0` as OK/Yes, `1` as Cancel/No, `3` as Extra, and `255` as ESC unless the script intentionally remaps `DIALOG_*` variables.
- [ ] Build menu/checklist/radiolist options as Bash arrays and pass them as `"${options[@]}"`; never concatenate untrusted labels into one command string.
- [ ] Use `trap` for `INT`, `TERM`, and `EXIT` cleanup so temp files and alternate-screen artifacts do not survive aborts.
- [ ] Validate selected tags with a `case` statement or allowlist before running commands; menu text is not authorization.
- [ ] Keep UI functions thin: collect choices in TUI functions, execute side effects in testable worker functions.

---

## When to Use

Use this skill when:

- Building an interactive Bash script that guides users through setup, diagnostics, deployment, backups, or local administration tasks.
- Converting a numbered `read` prompt into a richer terminal UI with `--menu`, `--yesno`, `--inputbox`, `--passwordbox`, `--checklist`, or `--radiolist`.
- Adding a `<More Info>` or third action button with `--extra-button` and handling exit code `3`.
- Capturing multi-field input from forms and password prompts while keeping passwords out of logs.
- Supporting both humans at a terminal and automation in CI through flags, environment variables, or defaults.

## When NOT to Use

Avoid this skill for:

- Scripts that must be strictly POSIX `sh`; `dialog` workflows here rely on Bash arrays, `[[ ]]`, and Bash file-descriptor patterns.
- Non-terminal automation where prompts would hang CI; expose flags or environment variables instead of forcing a TUI.
- Full-screen applications needing long-lived state, mouse-heavy interaction, or custom rendering; use a real TUI framework in Python, Go, Rust, or Node.
- Security-sensitive account creation where root privileges, password hashing, or policy enforcement are not already designed and reviewed.
- Systems where `dialog` cannot be installed and no fallback UX is acceptable.

---

## Core Workflow

1. **Prove the Runtime Can Render a TUI** — Check that `dialog` exists, stdin/stdout connect to a terminal, and the script is not running in CI/non-interactive mode. **Checkpoint:** If any check fails, the script must use a deterministic fallback or exit with a clear setup message.

2. **Model Choices as Data** — Store tags, labels, and defaults in arrays before calling `dialog`. For checklist/radiolist widgets, include the required status field (`on`/`off`). **Checkpoint:** The command line must pass array elements with `"${items[@]}"` so spaces and punctuation in labels remain intact.

3. **Render One Widget and Capture Both Result Channels** — Use `--stdout` for simple capture, or `3>&1 1>&2 2>&3` when stdout must remain available for status text. In strict-mode scripts, put the capture assignment in an `if` condition and set `status=0` or `status=$?` inside the corresponding branch. **Checkpoint:** Cancel, ESC, Extra, and error statuses are captured before any `clear`, `echo`, function call, or side effect runs.

4. **Route by Exit Code Before Acting on Data** — First branch on OK/Cancel/Extra/ESC/error, then branch on the selected tag. **Checkpoint:** Cancel and ESC must be intentional paths, not accidental fall-through to the default action.

5. **Execute Side Effects Outside the UI Layer** — TUI functions return tags or normalized values; worker functions perform installation, file changes, or command execution. **Checkpoint:** Worker functions can be tested without `dialog` by passing arguments directly.

6. **Clean Up and Restore the Terminal** — Use `mktemp`, `trap`, `clear`, and local variables. **Checkpoint:** Temporary files are deleted on normal exit, Cancel, ESC, Ctrl+C, and command failure.

---

## Implementation Patterns

### Pattern 1: Dependency Detection, Safe Capture, and Non-Interactive Fallback

Use this pattern for scripts that should be pleasant for humans but still safe in CI, cron, SSH commands without TTY allocation, or automation. It uses `--stdout`, as shown in Bash-Dialog's advanced example, because that is easier to read than saving output to a fixed file.

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly APP_TITLE="Server Maintenance"

has_interactive_tty() {
    [[ -t 0 && -t 1 ]]
}

require_dialog_or_fallback() {
    if [[ "${NONINTERACTIVE:-0}" == "1" ]]; then
        return 1
    fi

    if ! has_interactive_tty; then
        return 1
    fi

    command -v dialog >/dev/null 2>&1
}

choose_maintenance_action() {
    local default_action="${MAINTENANCE_ACTION:-status}"

    if ! require_dialog_or_fallback; then
        printf '%s\n' "$default_action"
        return 0
    fi

    local options=(
        status  "Show service status"
        logs    "Open recent logs"
        restart "Restart service"
        exit    "Exit without changes"
    )

    local choice
    local status
    if choice=$(dialog --clear \
        --backtitle "$APP_TITLE" \
        --title "Main Menu" \
        --cancel-label "Exit" \
        --stdout \
        --menu "Choose a maintenance action:" 0 0 4 \
        "${options[@]}"); then
        status=0
    else
        status=$?
    fi

    case "$status" in
        0) printf '%s\n' "$choice" ;;
        1|255) printf '%s\n' "exit" ;;
        *) printf 'ERROR: dialog failed with exit code %s\n' "$status" >&2; return 1 ;;
    esac
}

run_maintenance_action() {
    local action="$1"

    case "$action" in
        status)  systemctl status my-app.service --no-pager ;;
        logs)    journalctl -u my-app.service -n 100 --no-pager ;;
        restart) systemctl restart my-app.service ;;
        exit)    return 0 ;;
        *)       printf 'ERROR: unsupported action: %s\n' "$action" >&2; return 64 ;;
    esac
}

main() {
    local action
    action=$(choose_maintenance_action)
    run_maintenance_action "$action"
}

main "$@"
```

**Why this works:** UI capability is parsed at the boundary. Internal logic receives one trusted action string and can fail fast if an impossible tag appears.

### Pattern 2: BAD vs GOOD Selection Handling

The Bash-Dialog examples show two capture styles: `2>&1 >/dev/tty` and `--stdout`. Both are valid, but they become unsafe when the script ignores exit codes, writes to fixed temp files, or runs selected text as code.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ❌ BAD — fixed temp file, ignores cancel, unquoted read, and fall-through action.
dialog --menu "Choose:" 15 50 4 \
    1 "Restart service" \
    2 "Delete cache" \
    2>/tmp/menu-choice
choice=$(</tmp/menu-choice)
if [[ $choice == 1 ]]; then
    systemctl restart my-app.service
else
    rm -rf /var/cache/my-app/*
fi

# ✅ GOOD — result and status captured atomically, all branches explicit.
choose_action() {
    local choice
    local status
    if choice=$(dialog --stdout --menu "Choose:" 15 50 4 \
        restart "Restart service" \
        purge-cache "Delete cache" \
        back "Return to previous menu"); then
        status=0
    else
        status=$?
    fi

    case "$status" in
        0) printf '%s\n' "$choice" ;;
        1) printf '%s\n' "back" ;;
        255) printf '%s\n' "back" ;;
        *) printf 'ERROR: dialog failed: %s\n' "$status" >&2; return 1 ;;
    esac
}

dispatch_action() {
    local choice="$1"

    case "$choice" in
        restart)     systemctl restart my-app.service ;;
        purge-cache) find /var/cache/my-app -mindepth 1 -maxdepth 1 -delete ;;
        back)        return 0 ;;
        *)           printf 'ERROR: invalid menu choice: %s\n' "$choice" >&2; return 64 ;;
    esac
}

dispatch_action "$(choose_action)"
```

### Pattern 3: Prompt, Password, and Confirmation Flow

Use input widgets for data collection, then parse and validate before executing. Bash-Dialog's user-creation example captures `--form` output with `3>&1 1>&2 2>&3 3>&-` and uses `--passwordbox --insecure`; production code should avoid echoing secrets and should validate every field before continuing.

```bash
#!/usr/bin/env bash
set -euo pipefail

prompt_required_text() {
    local title="$1"
    local prompt="$2"
    local value
    local status

    if value=$(dialog --clear --stdout \
        --title "$title" \
        --inputbox "$prompt" 10 60 ""); then
        status=0
    else
        status=$?
    fi

    case "$status" in
        0) [[ -n "$value" ]] || { printf 'ERROR: value cannot be empty\n' >&2; return 64; }
           printf '%s\n' "$value" ;;
        1|255) return 130 ;;
        *) printf 'ERROR: input dialog failed: %s\n' "$status" >&2; return 1 ;;
    esac
}

prompt_secret() {
    local secret
    local status

    if secret=$(dialog --clear --stdout \
        --title "Credentials" \
        --passwordbox "Enter the API token:" 10 60); then
        status=0
    else
        status=$?
    fi

    case "$status" in
        0) [[ -n "$secret" ]] || { printf 'ERROR: token cannot be empty\n' >&2; return 64; }
           printf '%s\n' "$secret" ;;
        1|255) return 130 ;;
        *) printf 'ERROR: password dialog failed: %s\n' "$status" >&2; return 1 ;;
    esac
}

confirm_write() {
    local username="$1"

    dialog --clear \
        --title "Confirm" \
        --yes-label "Write" \
        --no-label "Cancel" \
        --yesno "Write configuration for ${username}?" 8 60
}

main() {
    local username token
    username=$(prompt_required_text "Profile" "Enter the username:") || exit $?
    token=$(prompt_secret) || exit $?

    if confirm_write "$username"; then
        install -m 600 /dev/null "$HOME/.my-app-token"
        printf '%s\n' "$token" > "$HOME/.my-app-token"
        dialog --msgbox "Configuration saved for ${username}." 7 50
    else
        dialog --msgbox "No files were changed." 7 40
    fi
}

main "$@"
```

### Pattern 4: Checklist and Radiolist Builders

`dialog --checklist` and `dialog --radiolist` require triples: tag, item text, and `on`/`off` status. Keep those triples in arrays. Checklists return selected tags, commonly quoted and separated by spaces, so only use stable tags without spaces or normalize with `--separate-output` when processing multiple selections.

```bash
#!/usr/bin/env bash
set -euo pipefail

select_components() {
    local items=(
        nginx      "Install nginx reverse proxy" on
        certbot    "Install certbot TLS tooling" off
        logrotate  "Install log rotation config" on
        firewall   "Enable firewall profile" off
    )

    local selected
    local status
    if selected=$(dialog --clear --stdout \
        --separate-output \
        --title "Components" \
        --checklist "Select components to install:" 18 72 8 \
        "${items[@]}"); then
        status=0
    else
        status=$?
    fi

    case "$status" in
        0) printf '%s\n' "$selected" ;;
        1|255) return 130 ;;
        *) printf 'ERROR: checklist failed: %s\n' "$status" >&2; return 1 ;;
    esac
}

select_environment() {
    local choices=(
        dev     "Developer workstation" on
        staging "Shared staging server" off
        prod    "Production server" off
    )

    local environment
    local status
    if environment=$(dialog --clear --stdout \
        --title "Environment" \
        --radiolist "Choose exactly one target:" 15 64 4 \
        "${choices[@]}"); then
        status=0
    else
        status=$?
    fi

    case "$status" in
        0) printf '%s\n' "$environment" ;;
        1|255) return 130 ;;
        *) printf 'ERROR: radiolist failed: %s\n' "$status" >&2; return 1 ;;
    esac
}

main() {
    local environment
    environment=$(select_environment) || exit $?
    printf 'Environment: %s\n' "$environment"

    local components_output
    local components_status
    if components_output=$(select_components); then
        components_status=0
    else
        components_status=$?
    fi

    case "$components_status" in
        0)
            while IFS= read -r component; do
                case "$component" in
                    nginx|certbot|logrotate|firewall) printf 'Selected component: %s\n' "$component" ;;
                    "") ;;
                    *) printf 'ERROR: unknown component: %s\n' "$component" >&2; exit 64 ;;
                esac
            done <<< "$components_output"
            ;;
        130) exit 130 ;;
        *) printf 'ERROR: checklist failed: %s\n' "$components_status" >&2; exit 1 ;;
    esac
}

main "$@"
```

### Pattern 5: Extra Button, Help Path, Cleanup, and Testability

Bash-Dialog's Extra Button examples verify that `--extra-button --extra-label` returns exit code `3`. Use that code for contextual help or details; do not overload Cancel or force users to select an item just to learn what it does.

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly TMP_DIR="$(mktemp -d)"

cleanup() {
    rm -rf "$TMP_DIR"
    if [[ -t 1 ]]; then
        clear
    fi
}
trap cleanup EXIT INT TERM

show_plan_help() {
    local selected="${1:-}"

    case "$selected" in
        quick) dialog --msgbox "Quick runs only cheap checks." 7 50 ;;
        full)  dialog --msgbox "Full runs every diagnostic and may take several minutes." 8 60 ;;
        *)     dialog --msgbox "Highlight a plan, then choose More Info." 7 55 ;;
    esac
}

choose_plan() {
    local choice status

    while true; do
        if choice=$(dialog --clear \
            --backtitle "Diagnostics" \
            --title "Run Plan" \
            --extra-button --extra-label "More Info" \
            --cancel-label "Exit" \
            --stdout \
            --menu "Choose a diagnostic plan:" 14 68 4 \
            quick "Fast status checks" \
            full  "Complete diagnostics" \
            exit  "Leave without running checks"); then
            status=0
        else
            status=$?
        fi

        case "$status" in
            0) printf '%s\n' "$choice"; return 0 ;;
            3) show_plan_help "$choice" ;;
            1|255) printf '%s\n' "exit"; return 0 ;;
            *) printf 'ERROR: dialog failed: %s\n' "$status" >&2; return 1 ;;
        esac
    done
}

run_plan() {
    local plan="$1"

    case "$plan" in
        quick) printf 'Running quick diagnostics\n' ;;
        full)  printf 'Running full diagnostics\n' ;;
        exit)  return 0 ;;
        *)     printf 'ERROR: invalid plan: %s\n' "$plan" >&2; return 64 ;;
    esac
}

run_plan "$(choose_plan)"
```

---

## Constraints

### MUST DO

- Use `#!/usr/bin/env bash` and `set -euo pipefail` unless integrating into an existing script with a different established shell policy.
- Check `command -v dialog` before rendering and provide install guidance or a non-interactive fallback.
- Capture dialog output and status separately; branch on status first, selected value second.
- Quote every variable expansion and pass menu data through arrays.
- Use stable machine tags (`restart`, `logs`, `prod`) rather than user-facing labels as the values executed by `case` statements.
- Handle `Cancel`, `ESC`, and `Extra` intentionally; every exit code path must be explicit.
- Use `mktemp` for any file capture and remove temp files with `trap`.
- Keep secrets out of `echo`, debug output, process arguments, and dialog summary boxes.

### MUST NOT DO

- Do not source a remote Bash-Dialog file or assume Bash-Dialog provides a library API; the verified repository is a guide and examples for the `dialog` binary.
- Do not save selections to fixed paths such as `/tmp/drinkChoice` in production scripts.
- Do not run menu labels, user input, or selected text with `eval`, unquoted command substitution, or shell interpolation.
- Do not ignore the exit status of `dialog`; Cancel must never trigger the first or default destructive action.
- Do not force interactive dialogs in CI, cron, systemd units, or scripts called with redirected stdin/stdout.
- Do not put more than roughly 7-10 choices in one menu without grouping or adding search/filter behavior.
- Do not use recursive menu calls for long-running loops; prefer `while true` with clear exit paths.

---

## Output Template

When generating or reviewing a Bash TUI menu script, return:

1. **Runtime assumptions** — Bash version needs, `dialog` dependency, TTY/non-interactive behavior.
2. **Menu map** — Each widget, its stable tags, and the action for OK/Cancel/ESC/Extra.
3. **Implementation** — Bash code with strict mode, dependency detection, arrays, traps, and worker functions.
4. **Fallback behavior** — Flags or environment variables that bypass the TUI for automation.
5. **Verification steps** — Commands to run with and without a TTY, plus a ShellCheck command when available.

---

## Live References

> Repository-standard links checked against the local `SKILL_FORMAT_SPEC.md`; these links preserve the Bash-Dialog research trail without treating Bash-Dialog as a sourceable library.

- [Bash-Dialog repository](https://github.com/RileyMeta/Bash-Dialog)
- [Bash-Dialog README](https://github.com/RileyMeta/Bash-Dialog/blob/main/README.md)
- [All Menus example](https://github.com/RileyMeta/Bash-Dialog/blob/main/Examples/All_Menus/All_Menus.sh)
- [Advanced menu example](https://github.com/RileyMeta/Bash-Dialog/blob/main/Examples/Advanced_Examples/Advanced_Example.sh)
- [Advanced Extra Button example](https://github.com/RileyMeta/Bash-Dialog/blob/main/Examples/Extra_Button/Advanced_Extra_Button.sh)
- [Dynamic Extra Button example](https://github.com/RileyMeta/Bash-Dialog/blob/main/Examples/Extra_Button/Dynamic_Extra.sh)
- [User Creation form example](https://github.com/RileyMeta/Bash-Dialog/blob/main/Examples/Advanced_Examples/User_Creation.sh)

---

## Reference Notes

### Verified from `https://github.com/RileyMeta/Bash-Dialog`

- The repository is a tutorial/example collection for Bash scripts using the `dialog` command; the cloned tree contains `README.md` and example scripts under `Examples/`, not a sourceable Bash library module.
- The main README documents installation commands for Arch (`pacman`), Debian/Ubuntu (`apt`), and Fedora (`dnf`), then demonstrates the minimal widget `dialog --msgbox "Hello World" 0 0`.
- Documented common options include `--backtitle`, `--title`, `--colors`, `--clear`, `--cr-wrap`, `--msgbox`, `--infobox`, `--menu`, `--programbox`, `--pause`, `--yesno`, `--inputbox`, `--passwordbox`, `--help-button`, and `--extra-button`.
- The README describes advanced styling sequences such as `\Zb`/`\ZB` for bold and `\Z0`-`\Z7` for ANSI colors when `--colors` is enabled.
- The README records default dialog-related exit-code variables: OK `0`, Cancel `1`, Help `2`, Extra `3`, ESC `255`, and Error `-1` through `DIALOG_*` environment variables.
- `Examples/All_Menus/All_Menus.sh` demonstrates `--menu`, `--msgbox`, `--yesno`, `--inputbox`, `--passwordbox`, `--infobox`, `--textbox`, `--checklist`, `--radiolist`, `--gauge`, `--calendar`, `--timebox`, `--fselect`, `--dselect`, and `--form`.
- `Examples/Advanced_Examples/Advanced_Example.sh` demonstrates a `while true` main menu, `--stdout`, `--cancel-label`, `trap 'aborted' INT`, and routing selected tags through nested `case` statements.
- `Examples/Extra_Button/Advanced_Extra_Button.sh` and `Examples/Extra_Button/Dynamic_Extra.sh` demonstrate `--extra-button --extra-label` and route exit code `3` separately from OK and Cancel.
- `Examples/Advanced_Examples/User_Creation.sh` demonstrates `--form` capture with file descriptor swapping and `--passwordbox` for hidden input.

### Generic terminal-dialog patterns applied here

- Prefer `--stdout` for simple capture because it is readable and avoids fixed temporary files.
- Prefer `--separate-output` for checklists so each selected tag can be processed line-by-line.
- Prefer dependency and TTY detection at startup because `dialog` blocks or fails in automation contexts.
- Prefer allowlisted tags and worker functions because terminal menus are user input, not trusted execution plans.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `shell-parameter-expansion` | Use safe defaults and fail-fast required variables in Bash scripts that feed menu labels and fallback values. |
| `shell-command-chaining` | Build reliable validation gates, fallback chains, and explicit error paths around dialog-driven actions. |
| `shell-process-management` | Add traps, cleanup, background process handling, and signal-aware termination to long-running TUI scripts. |
| `output-formatting` | Shape generated script output and user-facing summaries consistently after interactive choices are made. |
