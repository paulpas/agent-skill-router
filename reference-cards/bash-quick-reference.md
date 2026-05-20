---
title: "Bash — Quick Reference"
audience: "Engineers who already write bash occasionally and want one page that covers the moves they always have to look up — language constructs, idioms, scripting discipline, and common foot-guns."
status: "complete"
---

# Bash
### A Quick Reference for Working Engineers

---

> Bash is a Bourne-derived shell with arrays, arithmetic, brace
> expansion, readline, programmable completion, parameter
> expansion that does string manipulation in-process, and a few
> decades of accumulated extension. It is, simultaneously, the
> command-line interpreter you use interactively all day and a
> programming language you write scripts in. Treating it as one or
> the other is fine for short tasks, but it's worth understanding
> the language properly when scripts grow beyond about fifty
> lines — at that point bash starts rewarding rigor and punishing
> sloppiness in equal measure.
>
> This card covers the language: data (variables, parameter
> expansion, arrays, associative arrays), control flow
> (`if`/`case`/`for`/`while`/`until`), functions, redirections,
> pipes, traps, signals, job control, debugging, and the strict-
> mode discipline that turns bash from "fragile glue" into "small
> programming language we can review like any other code."
>
> Where bash fits in the toolbox: it's the right answer for
> short-to-medium scripts that glue together UNIX commands. When
> the work is dominated by data structures, by anything you'd want
> to unit-test, by string parsing of any complexity, or by
> cross-platform requirements, escalate to Python (or Go, or your
> language of choice). Bash is excellent at what it's excellent
> at; it's a poor general-purpose language.

## When to reach for bash

- You're gluing CLI tools together on a Linux/macOS host and the
  whole job fits in a screen or two of code.
- You need a script that any user with a recent shell can run, with
  no toolchain install, no virtualenv, no compiled artifact.
- The work is dominated by file/process plumbing, not data
  structures.
- You want a one-shot wrapper around an external command that
  takes a few flags, applies some defaults, and exits.
- You're writing a `Makefile` recipe, a `Dockerfile` `RUN` line,
  a CI step, a systemd `ExecStart`, or any other place where
  a few lines of glue is exactly the right shape.

## When *not* to reach for bash

- You need rich data types (nested dicts, typed records,
  dataframes). Reach for Python.
- The work is testable enough that you want unit tests with a
  decent ergonomics. `bats` is the bash testing framework, but
  it's nothing close to `pytest` — switch to a real language at
  this point.
- You need cross-platform Windows support. PowerShell is the
  answer there.
- The script needs to handle untrusted input, especially anything
  involving filenames, environment variables, or external command
  output. Bash is hard to write securely; the more user input
  involved, the worse the odds.
- You're starting to hit "if my script were 30% bigger I'd write
  it in Python instead." Just write it in Python.

## Mental model

Hold these seven sentences in your head and the rest of bash
starts making sense:

1. **Bash is a command interpreter that happens to have a
   programming language attached.** Most of what bash "does" is
   parse a line of input, expand variables and globs, and execute
   the resulting command. The language constructs (`if`, `for`,
   functions) are layered on top of that.
2. **Everything is a string until proven otherwise.** Bash has no
   built-in concept of types beyond "string" and "the shell does
   integer arithmetic in `((...))`". Numbers are strings the shell
   coerces during arithmetic. Arrays are arrays of strings.
3. **Words are split by `IFS` after expansion.** When you type
   `cmd $var`, bash expands `$var`, then splits the result on
   whitespace (or whatever `IFS` is set to), and `cmd` receives
   the resulting words as separate arguments. The way to prevent
   splitting is to quote: `cmd "$var"`.
4. **Variables are global by default.** Inside a function, every
   assignment reaches into the parent scope unless you mark it
   `local`. This bites people from other languages constantly.
5. **A pipeline of `cmd1 | cmd2` runs each side in a subshell.**
   Variables set inside the right side don't propagate back to
   the parent shell. Process substitution (`< <(cmd)`) avoids
   this.
6. **The exit status, not the output, is bash's contract.**
   Programs return integers; scripts test those integers. `0` is
   success, anything else is failure (and conventionally has a
   meaning — `man sysexits` shows the table).
7. **Best bash scripts use the language sparingly and let small
   UNIX tools do the heavy lifting.** When you find yourself
   writing more than a few dozen lines of bash logic in a script,
   you've usually crossed the line where a real programming
   language would be a better fit.

The rest of this card is the long form of those seven sentences.

## A note on conventions

Examples in this card use:

- `→` for an interactive shell prompt, so the command is visually
  distinct from its output.
- `#!/usr/bin/env bash` as the canonical shebang for bash scripts
  (more portable than `#!/bin/bash` because it locates `bash`
  through `$PATH`).
- The "strict mode" preamble (`set -Eeuo pipefail; IFS=$'\n\t'`)
  in any non-trivial script — see the [Strict mode](#strict-mode-and-script-discipline) section
  for the full discussion.
- `[[ ... ]]` rather than `[ ... ]` for tests — the double-bracket
  form is a bash keyword that doesn't word-split or glob-expand
  its arguments, eliminating a whole class of bugs.
- `$(...)` rather than backticks for command substitution — the
  modern form nests cleanly.

When something works only in bash 4+ or only in bash 5+, the card
calls it out. The default `bash` on macOS is 3.2 (the last
GPL-2-licensed release), so portability between Linux's
modern bash and macOS's 3.2 bash is a real concern; install a
modern bash via Homebrew (`brew install bash`) if you'll be
writing serious scripts on macOS.

---

## Invoking bash

A bash process can come to exist in several different ways, and
the *kind* of bash determines which startup files it reads, which
features it enables, and how it interprets its arguments. Knowing
the rules saves you from "this works when I type it but not when
I run it as a script" surprises.

### Interactive vs. non-interactive

A bash process is *interactive* if its standard input is a
terminal (or if `-i` was passed). Interactive shells display a
prompt, enable command-line editing (readline), enable job
control by default, and read your interactive startup files.
Non-interactive shells (a script, a `bash -c '...'`, a remote ssh
command) skip almost all of that.

You can detect mode in a script:

```bash
case $- in
  *i*) echo "interactive" ;;
  *)   echo "non-interactive" ;;
esac
```

`$-` is the set of currently-active option flags; `i` is set when
the shell is interactive.

### Login vs. non-login

A bash process is a *login shell* if it was started in one of
several specific ways:

- The first character of `argv[0]` is `-` (which `login(1)` does).
- It was invoked as `bash -l` or `bash --login`.
- It's the shell SSH ran for an interactive session.

Non-login shells are everything else — typically the shells you
get inside a terminal emulator after the first one, or any
sub-shell.

The distinction matters because login and non-login shells read
different startup files. That, in turn, matters because the wrong
file getting your `PATH` change means "but I added it to my
.bashrc!" mysteries.

### Startup files (the canonical order)

For an interactive **login** shell, bash reads:

1. `/etc/profile`
2. The first of `~/.bash_profile`, `~/.bash_login`, `~/.profile`
   that exists.

When the login shell exits, it reads `~/.bash_logout`.

For an interactive **non-login** shell:

1. `/etc/bash.bashrc` (some distributions)
2. `~/.bashrc`

For a **non-interactive** shell (a script):

- Neither, unless `BASH_ENV` is set, in which case bash reads the
  file named by it.

The conventional pattern: put environment variables and `PATH`
modifications in `~/.bash_profile` (so login shells get them);
put shell aliases, functions, completion, and prompt theming in
`~/.bashrc`. Then source `~/.bashrc` from `~/.bash_profile` so the
distinction matters less:

```bash
# in ~/.bash_profile
[[ -f ~/.bashrc ]] && . ~/.bashrc

# environment-only stuff goes here:
export PATH="$HOME/bin:$PATH"
export EDITOR=vim
```

### Invoking the shell — common flags

```
bash                           # interactive non-login shell
bash --login                   # interactive login shell
bash -c 'cmd'                  # run cmd, then exit
bash -c 'cmd' name arg1 arg2   # run cmd with $0=name, $1=arg1, $2=arg2
bash file.sh                   # run a script
bash -x file.sh                # run with xtrace (echo each command before running)
bash -n file.sh                # syntax check; don't run
bash -v file.sh                # verbose; print each line as read
bash -l                        # login mode (--login)
bash -i                        # interactive mode
bash -p                        # privileged mode: don't read $BASH_ENV / $ENV; ignore $SHELLOPTS
bash --noprofile               # skip /etc/profile and ~/.bash_profile etc.
bash --norc                    # skip ~/.bashrc
bash --version                 # show version
bash --help                    # short flag summary
```

Useful in scripts:

- `bash -n script.sh` — syntax check only. The single best thing
  you can run in a pre-commit hook for shell scripts (`shellcheck`
  is the second).
- `bash -x script.sh` — execution trace. Each command is printed
  to stderr before being run, with `+` prefixes indicating the
  nesting depth.

### Shebangs

The first line of a script is the *shebang*; the kernel reads it
to decide which interpreter to invoke. The two reasonable forms:

```
#!/usr/bin/env bash
```

— uses `env` to find `bash` in `$PATH`. More portable, especially
on systems where bash isn't at `/bin/bash` (some BSDs, macOS when
using a Homebrew bash).

```
#!/bin/bash
```

— hard-codes the path. Slightly faster (one less `exec`), and
deterministic. Fine for scripts that you know are running on
systems with bash at the canonical location.

A useful disclaimer: `#!/bin/sh` is **not** the same as
`#!/bin/bash`. On Debian/Ubuntu systems, `/bin/sh` is `dash`, a
much smaller POSIX-only shell. A script written for bash and
shebanged with `/bin/sh` will fail in subtle ways: arrays don't
work, `[[ ]]` doesn't exist, `$'string'` ANSI-C quoting doesn't
exist, parameter expansion is more limited, and so on.

### Exit status and the meaning of zero

Every command returns an integer status to its parent. By
convention:

- `0` — success.
- Non-zero — failure of some kind. Programs sometimes use specific
  numbers to mean specific things (`grep` returns `1` for "no
  matches", `2` for "error"; `diff` returns `0` for "files match",
  `1` for "differ", `2` for "error").
- `126` — command found but not executable.
- `127` — command not found.
- `128 + N` — terminated by signal N (so `Ctrl-C` is `130`,
  `SIGSEGV` is `139`, `SIGTERM` is `143`).

The shell exposes the previous command's exit status in `$?`:

```bash
ls /etc/passwd
echo $?           # 0
ls /no/such/file
echo $?           # 2
```

Inside a pipeline, `$?` is the last command's exit status.
`$PIPESTATUS` is an array of the exit statuses of every command
in the pipeline:

```bash
foo | bar | baz
echo "${PIPESTATUS[@]}"   # exit statuses of foo, bar, and baz
```

For scripts where you want any failure in a pipeline to count,
`set -o pipefail` makes the pipeline's exit status the leftmost
non-zero. See the [Strict mode](#strict-mode-and-script-discipline)
section.

### Conventional exit codes from sysexits.h

The historical `<sysexits.h>` defines a small vocabulary of exit
codes worth knowing:

| Code | Name | Meaning |
| --- | --- | --- |
| 0 | EX_OK | Success |
| 64 | EX_USAGE | Command-line usage error |
| 65 | EX_DATAERR | Data-format error in user input |
| 66 | EX_NOINPUT | Cannot open input |
| 67 | EX_NOUSER | Addressee unknown |
| 68 | EX_NOHOST | Host name unknown |
| 69 | EX_UNAVAILABLE | Service unavailable |
| 70 | EX_SOFTWARE | Internal software error |
| 71 | EX_OSERR | OS error (e.g. fork failed) |
| 72 | EX_OSFILE | System file missing |
| 73 | EX_CANTCREAT | Cannot create output file |
| 74 | EX_IOERR | I/O error |
| 75 | EX_TEMPFAIL | Temporary failure; retry |
| 76 | EX_PROTOCOL | Remote protocol error |
| 77 | EX_NOPERM | Permission denied |
| 78 | EX_CONFIG | Configuration error |

Most scripts get away with 0/1/2, but for tools that other
scripts will consume, picking specific codes from this table makes
debugging dramatically easier.

---

## Quoting

The shell parses every line you type by walking through it
left-to-right and applying rules about which characters mean
what. Most "weird bash bugs" come down to misunderstanding which
characters need to be quoted in which contexts. The good news is
that the rules are simple and exhaustive: there are exactly three
quoting mechanisms.

### The three quoting mechanisms

#### Backslash

A backslash before a character makes that character literal —
strips its special meaning to the shell.

```bash
echo \$HOME       # prints $HOME literally
echo \"           # prints "
echo a\ b         # echoes "a b" as TWO arguments? No — as ONE: "a b". The space is escaped, not a separator.
echo \\           # prints a single backslash
```

A backslash at the end of a line escapes the newline, continuing
the command on the next line:

```bash
ls -l --color=auto \
   --group-directories-first \
   /etc
```

This is the standard way to wrap a long command across several
lines.

#### Single quotes

Inside `'...'`, every character is literal. **Even backslashes.**
**Even dollar signs.** **Even backticks.** The only character that
can't appear inside single quotes is another single quote — there's
no way to escape it. To include a literal single quote, end the
quoted string, escape a quote, and start a new quoted string:

```bash
echo 'it'\''s a trap'   # prints: it's a trap
```

Single quotes are the safest choice for any string with shell
metacharacters. When you don't need variable interpolation or
command substitution, single-quote.

#### Double quotes

Inside `"..."`, most characters are literal, but the following
remain active:

- `$` — variable expansion (`$VAR`, `${VAR}`), parameter expansion
  (`${VAR:-default}`), command substitution (`$(...)`),
  arithmetic expansion (`$((...))`).
- `\`` — command substitution (legacy form).
- `\` — escape character. Inside double quotes, backslash is
  special **only before** `$`, `\``, `"`, `\`, and newline.
  `"\d"` is the literal two-character sequence `\d`, but `"\$"`
  is a literal `$`.

```bash
echo "Hello, $USER"          # interpolated
echo "Today is $(date +%F)"  # command substitution works
echo "Cost: \$5.00"          # literal dollar sign
echo "Path: $HOME"           # variable expansion
echo "He said \"hi\""        # escaped double quote
```

Double quotes do **not** prevent word splitting *between* quoted
strings:

```bash
var="a b c"
echo "$var"        # one argument: "a b c"
echo $var          # three arguments: "a", "b", "c" — word-split
echo "${arr[@]}"   # one quoted argument per array element (the way you almost always want)
echo "${arr[*]}"   # one argument; elements joined by IFS[0]
```

The "always quote your variables" discipline is real:
`"$VAR"` for a single variable, `"${arr[@]}"` for an array,
`"$@"` for "all positional arguments preserving boundaries".

### ANSI-C quoting (`$'...'`)

A bash extension. `$'...'` is like single-quoting but with
backslash escapes interpreted:

```bash
echo $'hello\tworld'         # tab between
echo $'line1\nline2'         # newline embedded
echo $'\u00e9'               # Unicode é (bash 4.2+)
IFS=$'\n\t'                  # set IFS to newline and tab — strict-mode preamble
```

The supported escapes: `\a`, `\b`, `\e`, `\f`, `\n`, `\r`, `\t`,
`\v`, `\\`, `\'`, `\"`, `\?`, `\nnn` (octal), `\xHH` (hex),
`\uHHHH` (Unicode), `\UHHHHHHHH` (32-bit Unicode), `\cX`
(control-X).

### Locale-aware quoting (`$"..."`)

`$"..."` is like double-quoting but the string is looked up in
the current locale's translation catalog. Used for
internationalisation. You'll almost never need this in
infrastructure code.

### Quoting in scripts (a checklist)

A short procedure for "did I quote this right?":

1. **Variables expanded for use as one argument**: `"$var"`.
2. **Variables expanded for use as a list of arguments** (rarely
   what you want): bare `$var` with `IFS` set appropriately.
3. **Arrays expanded as separate arguments**: `"${arr[@]}"`.
4. **Literal strings with no metacharacters needed**: single
   quotes.
5. **Strings that interpolate variables but don't have shell
   metacharacters**: double quotes around the whole string.
6. **Strings that contain backslash escapes**: `$'...'` (ANSI-C).
7. **Strings that contain both literal `$` and interpolated
   variables**: mix quoted regions:
   ```bash
   echo 'Cost: $5 for '"$USER"
   ```

### Common quoting mistakes

```bash
files=*.log
for f in $files; do ...; done   # WRONG: $files is a string "*.log"; it's the for that does the glob

for f in *.log; do ...; done    # CORRECT: glob expansion happens in the for itself

if [ $var = "value" ]; then     # WRONG-ish: if $var is empty, this becomes [ = value ], a syntax error
if [ "$var" = "value" ]; then   # better: empty $var becomes [ "" = value ], well-formed
if [[ $var = "value" ]]; then   # BEST: [[...]] doesn't word-split, doesn't glob

echo "$(rm -rf /)"              # the $(...) actually runs even though the result will be quoted

ls "$(echo $files)"             # double-evaluation: $files word-splits inside echo, then the result is one arg to ls
```

### Quoting and the command line

When you type interactively, the shell parses your line, expands
everything, and runs the command. When you put a script in a
file, the same parsing happens — but the file's bytes are read by
bash, not your terminal. Bash neither knows nor cares about your
terminal's encoding when reading a script. If you have `\303\251`
in your script source, bash sees it as those two literal bytes
(which form `é` in UTF-8). The terminal just affects how bash
*displays* its output back to you.

The practical implication: your script's behavior is determined
by its source bytes, not by your terminal. If you copy a script
from a webpage and pasting introduces "smart quotes" (`\u201c`
and `\u201d`), bash will see those as literal Unicode characters
that don't have any special meaning, and you'll get cryptic
syntax errors. Always paste through a tool that doesn't do
auto-correct (`vim`, `cat > file <<'EOF'`, etc.) when bringing
shell snippets into a file.

---

## Variables

A variable in bash is a name bound to a string. By default, every
variable is global — accessible from anywhere in the same shell
process. Functions can declare variables `local` to confine them
to the function's scope.

### Assignment

```bash
name=value           # assign — NO spaces around =
name="value"         # quoted; useful when value has whitespace
name='value'         # single-quoted; no expansion in the value
unset name           # remove the variable

readonly name        # make immutable; further assignments fail
declare -r name      # same
```

The "no spaces around `=`" rule is critical. `name = value` parses
as a command named `name` with two arguments — almost never what
you want. The error message is helpful: `name: command not found`.

Multiple assignments on one line:

```bash
a=1 b=2 c=3
```

These are evaluated left-to-right, all at the same shell-prefix
level. They're equivalent to three separate assignment statements.

You can also pass variable assignments as a *prefix* to a command,
which sets them only for the command's environment:

```bash
PATH=/usr/local/bin:$PATH mycommand    # only mycommand sees the modified PATH
LC_ALL=C sort file                      # the canonical "sort in byte order" invocation
NODE_ENV=production npm start
```

### Reading a variable

```bash
echo $var            # expand var
echo ${var}          # same, with explicit braces
echo "$var"          # quoted (recommended)
echo "${var}lovelace"   # braces let you butt text up against the var
```

The braces are optional unless you need to butt the variable
against text that could be confused for part of the name. `$varX`
expands the variable `varX` (an underscore-letter-digit sequence is
a valid name), but `${var}X` expands `var` followed by a literal
`X`.

### Variable scope

By default, every assignment creates or modifies a *shell variable*
visible to the current shell only. To make a variable available
to *child processes* (programs the shell exec's), export it:

```bash
export PATH=/usr/local/bin:$PATH    # commonly seen
PATH=/usr/local/bin:$PATH; export PATH   # same effect
declare -x PATH=/usr/local/bin:$PATH     # same
```

`export -p` shows everything currently exported. `printenv` and
`env` show the same.

To remove a variable from the environment without unsetting it
locally:

```bash
export -n VAR
```

Variables set without `export` are visible only to the current
shell, not to commands it runs:

```bash
local_var=hello
bash -c 'echo $local_var'    # prints empty line — the child shell didn't inherit it
```

### Inside functions: `local`

Inside a function, `local` declares a variable scoped to the
function (and the functions it calls). Without `local`, you'd
modify the parent shell's `i` or `name`, which is almost certainly
a bug.

```bash
greet() {
  local name="$1"            # local to greet
  echo "Hello, $name"
}

count_files() {
  local i count=0
  for ((i=0; i<$#; i++)); do
    [[ -f "${!i}" ]] && ((count++))
  done
  echo "$count"
}
```

`local` is itself a builtin command and can take any of the
declaration flags that `declare` does:

```bash
local -i n=42                 # integer
local -a arr=(a b c)          # indexed array
local -A map=([k1]=v1)        # associative array
local -r CONST=immutable      # readonly within the function
```

`local` only works inside functions; using it at the top level of
a script is a syntax error.

### Predefined and special variables

Bash maintains a set of automatic variables. The most useful:

| Variable | Meaning |
| --- | --- |
| `$0` | Script name (or `bash` for an interactive shell) |
| `$1`, `$2`, … | Positional parameters (script or function arguments) |
| `${10}`, `${11}`, … | Tenth and beyond — must use braces |
| `$#` | Number of positional parameters |
| `$@` | All positional parameters as separate words. Use `"$@"` to preserve word boundaries. |
| `$*` | All positional parameters as one string, joined by IFS[0]. |
| `$?` | Exit status of the last foreground command. |
| `$$` | PID of the current shell. |
| `$!` | PID of the most recent background command. |
| `$_` | Last argument of the previous command (interactive). |
| `$-` | Currently active option flags (e.g. `himBHs`). |
| `$BASH` | Path to the bash binary that's running. |
| `$BASH_VERSION` | Version string. |
| `$BASH_VERSINFO` | Array of version components: `[major, minor, patch, build, release, machine]`. |
| `$BASH_SOURCE` | Array of source filenames; `${BASH_SOURCE[0]}` is the current file. |
| `$LINENO` | Current line number in the script. |
| `$FUNCNAME` | Array; `${FUNCNAME[0]}` is the current function. |
| `$RANDOM` | A random integer 0..32767, fresh each read. |
| `$EPOCHSECONDS`, `$EPOCHREALTIME` | Bash 5+: seconds since epoch / fractional seconds. |
| `$SECONDS` | Number of seconds since the shell started. Assigning to it resets the counter. |
| `$PIPESTATUS` | Array of exit statuses of each command in the most recent pipeline. |
| `$IFS` | Input Field Separator — controls word splitting. Default: space, tab, newline. |
| `$PATH` | Colon-separated directories searched for executables. |
| `$HOME` | Current user's home directory. |
| `$USER`, `$LOGNAME` | Username. |
| `$SHELL` | The user's preferred shell (NOT necessarily the running shell). |
| `$PWD` | Current working directory. |
| `$OLDPWD` | Previous working directory (used by `cd -`). |
| `$HOSTNAME` | Machine hostname. |
| `$HOSTTYPE` | Architecture (e.g. `x86_64`). |
| `$OSTYPE` | OS name (e.g. `linux-gnu`, `darwin22.0`). |
| `$LANG`, `$LC_*` | Locale variables. |
| `$TZ` | Timezone. |
| `$TERM` | Terminal type. |
| `$EDITOR`, `$VISUAL` | Default editors. |
| `$PAGER` | Default pager. |

### The `declare` builtin

`declare` (synonym `typeset`) sets variable attributes:

```bash
declare -i n=42         # integer (arithmetic context for assignments)
declare -a arr          # indexed array
declare -A map          # associative array (bash 4+)
declare -r const=42     # readonly
declare -x VAR=42       # exported
declare -n ref=target   # nameref — alias for another variable (bash 4.3+)
declare -f              # show all defined functions
declare -F              # show function names only
declare -p              # print everything in re-importable form
declare -p VAR          # show one variable's full state
```

`declare` flags can combine: `declare -airx VAR` makes an integer
indexed array, readonly, exported (though such combinations are
rare).

`declare -i` is interesting: it puts the variable in
*integer mode*. Subsequent assignments are evaluated as
arithmetic expressions:

```bash
declare -i n
n="2 + 3"           # n becomes 5
n=5*2                # n becomes 10
n="hello"            # n becomes 0
```

This is occasionally useful but trips people up — declare a
variable as integer for clarity *and* be sure that's what you
want.

### Indirect references (namerefs and `${!var}`)

Sometimes you want one variable to *name* another. Two
mechanisms:

#### Indirect expansion

```bash
target=hello
ref=target
echo "${!ref}"       # prints: hello (the value of $target)
```

`${!var}` expands to the value of the variable whose name is in
`var`. Useful for one-off indirection.

#### Namerefs (bash 4.3+)

```bash
target=hello
declare -n ref=target
echo "$ref"          # prints: hello
ref="goodbye"        # modifies target
echo "$target"       # prints: goodbye
unset -n ref         # removes the nameref (without removing target)
```

A nameref is a permanent alias. Useful inside functions for "pass
a variable by reference":

```bash
populate() {
  local -n out=$1     # out is whatever variable name was passed
  out=("apple" "banana" "cherry")
}

populate fruits
echo "${fruits[@]}"   # apple banana cherry
```

This is the bash way to write functions that "return" arrays —
something you can't do directly through `return` (which is for
exit statuses) or through stdout (which would lose array
boundaries).

### Variable substitution and parameter expansion

This is one of bash's most powerful features. The general form:

```
${parameter}                     # plain expansion
${parameter:-default}            # use parameter if set+non-empty; else use default
${parameter-default}             # use parameter if set; else use default
${parameter:=default}            # assign default to parameter if unset+empty; then expand
${parameter=default}             # assign default if unset; then expand
${parameter:?error_message}      # if unset+empty, print error and exit (script) / abort (interactive)
${parameter?error_message}       # same but only if unset
${parameter:+alt_value}          # if set+non-empty, use alt_value; else empty
${parameter+alt_value}           # if set, use alt_value; else empty
```

Concrete examples:

```bash
echo "${USER:-anonymous}"         # use USER, or "anonymous" if unset/empty
: "${PORT:=8080}"                  # set PORT to 8080 if unset/empty (the leading : is a no-op command)
echo "${MUST:?must be set}"        # error and exit if MUST is unset/empty
echo "${ENABLED:+--enable}"        # if ENABLED is set+non-empty, expand to "--enable", otherwise empty
```

The `:` variants treat empty strings the same as unset. The
non-`:` variants distinguish them — useful when an empty string
is a valid value.

#### Length, substring, search/replace

```bash
${#parameter}                     # length of value
${parameter:offset}               # substring from offset to end
${parameter:offset:length}        # substring of given length
${parameter#pattern}              # strip shortest match of pattern from START
${parameter##pattern}             # strip longest match of pattern from START
${parameter%pattern}              # strip shortest match of pattern from END
${parameter%%pattern}             # strip longest match of pattern from END
${parameter/pattern/replacement}  # replace FIRST match
${parameter//pattern/replacement} # replace ALL matches
${parameter/#pattern/replacement} # match must be at START
${parameter/%pattern/replacement} # match must be at END
${parameter^}                     # uppercase first character (bash 4+)
${parameter^^}                    # uppercase all (bash 4+)
${parameter,}                     # lowercase first character (bash 4+)
${parameter,,}                    # lowercase all (bash 4+)
${parameter@operator}             # bash 4.4+: Q (quote), E (expand escapes), P (prompt expansion), A (assignment), a (attribute)
```

Concrete worked examples on the file `report.tar.gz`:

```bash
f="report.tar.gz"
echo "${#f}"          # 13 — length
echo "${f%.gz}"       # report.tar — strip shortest match of .gz from end
echo "${f%%.*}"       # report — strip longest match of .* from end
echo "${f#*.}"        # tar.gz — strip shortest match of *. from start
echo "${f##*.}"       # gz — strip longest match of *. from start (the file extension)
echo "${f/tar/TGZ}"   # repor.TGZ.gz — replace first match
echo "${f//[aeiou]/_}"# r_p_rt.t_r.gz — replace ALL vowels
echo "${f:0:6}"       # report — substring of length 6 from offset 0
echo "${f:7}"         # tar.gz — from offset 7 to end
echo "${f^^}"         # REPORT.TAR.GZ
```

Patterns inside `${var#pat}` and friends use *globs*, not regex.
The metacharacters are `*`, `?`, `[set]`, `[!set]`. Extended
globs (`@(...)`, `+(...)`, `*(...)`, `?(...)`, `!(...)`) work
when `shopt -s extglob` is set.

#### `basename` and `dirname` in pure bash

```bash
path="/var/log/syslog.1.gz"
filename="${path##*/}"          # syslog.1.gz — same as basename
dir="${path%/*}"                # /var/log — same as dirname
ext="${path##*.}"               # gz — file extension
stem="${filename%.*}"           # syslog.1 — strip last extension
```

Doing this in pure bash avoids the cost of forking `basename` and
`dirname`. For one-offs the cost is negligible; for tight loops
it matters.

#### Indirection through expansion

```bash
${!prefix*}                       # names of variables that start with prefix
${!prefix@}                       # same, with quoting context
```

So if you have `FOO_USER`, `FOO_PASS`, `FOO_PORT`, `${!FOO_*}`
expands to those names.

---

## Arrays

Bash supports two array types: *indexed arrays* (numeric keys
starting from 0) and *associative arrays* (string keys, like a
dict or hashmap). Indexed arrays work in any bash; associative
arrays require bash 4 or later. macOS ships bash 3.2, so a script
that relies on associative arrays will fail there unless you
install a modern bash via Homebrew.

### Indexed arrays

#### Creating

```bash
arr=(a b c)                       # literal
arr=("first" "second" "third")    # with quoted elements
arr=()                            # empty array
declare -a arr                    # declare without assigning
arr=([0]=a [3]=d [5]=f)           # explicit indices — sparse array
arr+=("d")                         # append
arr+=("e" "f" "g")                 # append several
mapfile -t lines < file            # bash 4+: read each line into arr (no trailing \n)
readarray -t lines < file          # synonym
```

`mapfile` (also called `readarray`) is the cleanest way to slurp a
file into an array, one line per element.

#### Accessing

```bash
echo "${arr[0]}"       # first element
echo "${arr[1]}"       # second element
echo "${arr[-1]}"      # last element (bash 4.3+)
echo "${arr[@]}"       # all elements as separate words
echo "${arr[*]}"       # all elements as one string, joined by IFS[0]
echo "${#arr[@]}"      # count
echo "${!arr[@]}"      # all defined indices
echo "${arr[@]:1:2}"   # slice: 2 elements starting at index 1
```

The crucial distinction: `"${arr[@]}"` (quoted) expands each
element as a separate quoted word — this is almost always what
you want. `"${arr[*]}"` joins everything with the first character
of `IFS` (a space by default) into one word.

Compare:

```bash
arr=("one" "two with space" "three")
for x in "${arr[@]}"; do echo "<$x>"; done
# <one>
# <two with space>
# <three>

for x in "${arr[*]}"; do echo "<$x>"; done
# <one two with space three>
```

#### Modifying

```bash
arr[1]="new value"        # replace element 1
arr[20]="far away"        # create a sparse element
unset arr[2]              # delete element 2 (leaves a hole; the array is sparse now)
arr=("${arr[@]}")         # collapse holes by re-creating
```

#### Iteration

```bash
for x in "${arr[@]}"; do
  echo "$x"
done

for i in "${!arr[@]}"; do
  echo "$i: ${arr[$i]}"
done

for ((i=0; i<${#arr[@]}; i++)); do
  echo "$i: ${arr[$i]}"
done
```

The first form iterates values; the second iterates indices and
gives you both index and value; the third uses C-style `for` and
is dense if you really need numeric iteration with arithmetic.

#### Common operations

```bash
# join with a delimiter (printf trick)
printf -v joined '%s,' "${arr[@]}"
joined="${joined%,}"     # strip trailing comma

# alternative join via IFS
IFS=, joined="${arr[*]}"

# split a string into an array on a delimiter
IFS=':' read -ra parts <<< "$PATH"
for p in "${parts[@]}"; do echo "$p"; done

# does the array contain a value?
contains() {
  local needle=$1; shift
  for x; do [[ $x == "$needle" ]] && return 0; done
  return 1
}
contains "two" "${arr[@]}" && echo found

# remove duplicates while preserving order
declare -A seen
unique=()
for x in "${arr[@]}"; do
  if [[ -z ${seen[$x]:-} ]]; then
    seen[$x]=1
    unique+=("$x")
  fi
done
```

### Associative arrays (bash 4+)

```bash
declare -A map                    # MUST declare first; can't auto-create
map=([key1]=value1 [key2]=value2)
map[name]="alice"
map[count]=42

echo "${map[name]}"               # access by key
echo "${map[@]}"                  # all values
echo "${!map[@]}"                 # all keys
echo "${#map[@]}"                 # number of entries

unset 'map[key1]'                 # remove (must quote — globbing happens)
unset map                         # remove the whole array

# iterate keys
for k in "${!map[@]}"; do
  echo "$k -> ${map[$k]}"
done

# test existence
if [[ -v map[name] ]]; then ...   # bash 4.2+
if [[ -n ${map[name]+set} ]]; then ...   # portable variant
```

Notes:

- `declare -A` is required. Auto-creating an associative array via
  `arr[key]=value` doesn't work — bash will treat it as an indexed
  array with a key of 0 (because the string `key` evaluates to 0
  in arithmetic context).
- Keys are arbitrary strings, including the empty string.
- Iteration order is unspecified. Sort the keys explicitly if you
  need ordered output.
- `unset 'map[key]'` — the quotes matter. Without them, if `key`
  contains a `*`, the shell will glob-expand it.

### Common array recipes

```bash
# read a CSV-like file into associative arrays keyed by id
declare -A user_email user_role
while IFS=, read -r id email role; do
  user_email[$id]=$email
  user_role[$id]=$role
done < users.csv

# sum a column from a file
total=0
while IFS=, read -r _ amount _; do
  total=$((total + amount))
done < orders.csv
echo "$total"

# count occurrences
declare -A counts
for word in "$@"; do
  counts[$word]=$(( ${counts[$word]:-0} + 1 ))
done
for k in "${!counts[@]}"; do
  printf '%5d  %s\n' "${counts[$k]}" "$k"
done | sort -rn
```

---

## Tests, conditions, and `[[ ... ]]`

A *condition* in bash is anything with an exit status. The shell
treats exit `0` as true and any non-zero as false. So `if cmd;
then ...` runs the `then` body if `cmd` exits zero. The `[[
... ]]` construct (and the older `[ ... ]` and `test`) are just
commands that exit with the appropriate status.

### `[[ ... ]]` is the modern form

`[[ ... ]]` is a bash-specific keyword (not a regular command).
Compared to the older `[ ... ]` (which is `/usr/bin/test`):

- It does **not** word-split unquoted variables, so
  `[[ $var = string ]]` works even if `$var` is empty.
- It does **not** glob-expand unquoted patterns on the right side
  of `=` and `==`.
- It supports `&&`, `||`, `<`, `>` directly without escaping.
- It has additional operators that `[ ]` doesn't: `=~` (regex
  match), `<` and `>` for string comparison.
- Inside `[[ ... ]]`, the right side of `==` and `=` is a *glob
  pattern* (unless quoted), and `=~` is a *regex*.

The general rule: use `[[ ... ]]` in bash scripts. Use `[ ... ]`
or `test` only if you need POSIX portability (e.g. a script that
needs to work in `dash`).

### File tests

```bash
[[ -e path ]]     # path exists (any type)
[[ -f path ]]     # exists and is a regular file
[[ -d path ]]     # exists and is a directory
[[ -L path ]]     # exists and is a symbolic link (alternative: -h)
[[ -h path ]]     # same as -L
[[ -p path ]]     # named pipe (FIFO)
[[ -S path ]]     # socket
[[ -b path ]]     # block device
[[ -c path ]]     # character device

[[ -r path ]]     # readable by the current user
[[ -w path ]]     # writable
[[ -x path ]]     # executable
[[ -s path ]]     # exists and is non-empty
[[ -O path ]]     # owned by the current user
[[ -G path ]]     # group ownership matches the current user's effective group
[[ -k path ]]     # has the sticky bit
[[ -u path ]]     # has the setuid bit
[[ -g path ]]     # has the setgid bit
[[ -N path ]]     # has been modified since last read
[[ -t fd ]]       # file descriptor fd refers to a terminal

[[ a -nt b ]]     # file a is newer than b
[[ a -ot b ]]     # file a is older than b
[[ a -ef b ]]     # a and b refer to the same inode (same file)
```

### String tests

```bash
[[ -z "$s" ]]     # string is empty
[[ -n "$s" ]]     # string is non-empty
[[ "$a" = "$b" ]] # equal (= and == are equivalent in [[ ]])
[[ "$a" != "$b" ]]# not equal
[[ "$a" < "$b" ]] # lexicographic less-than (only inside [[ ]])
[[ "$a" > "$b" ]] # lexicographic greater-than

[[ "$file" = *.log ]]     # GLOB MATCH (right side is a glob pattern)
[[ "$file" == *.log ]]    # same
[[ "$file" != *.tmp ]]    # negated glob match
[[ "$line" =~ ^[0-9]+$ ]] # REGEX MATCH (extended regex)

# variable existence (bash 4.2+)
[[ -v VAR ]]              # VAR is set (even if empty)
[[ ! -v VAR ]]            # VAR is unset
```

A subtle gotcha: in `[[ "$file" == *.log ]]`, the right side must
be **unquoted** for glob behaviour. Quote it and the `=` becomes
literal-string equality:

```bash
[[ "$file" == *.log ]]    # glob: matches anything ending in .log
[[ "$file" == "*.log" ]]  # literal: matches the exact string "*.log"
```

The `=~` operator does extended regex matching. Capture groups
end up in `$BASH_REMATCH`:

```bash
if [[ $line =~ ^([A-Z]+):([0-9]+)$ ]]; then
  echo "tag:    ${BASH_REMATCH[1]}"
  echo "number: ${BASH_REMATCH[2]}"
fi
```

`BASH_REMATCH[0]` is the whole match, `[1]` is the first capture
group, and so on.

### Numeric tests

Two equivalent options:

```bash
# inside [[ ]], use the dash-letter operators
[[ "$n" -eq 5 ]]   # equal
[[ "$n" -ne 5 ]]   # not equal
[[ "$n" -lt 5 ]]   # less than
[[ "$n" -le 5 ]]   # less than or equal
[[ "$n" -gt 5 ]]   # greater than
[[ "$n" -ge 5 ]]   # greater than or equal

# inside (( )), use familiar operators
(( n == 5 ))       # equal
(( n != 5 ))       # not equal
(( n < 5 ))        # less than
(( n <= 5 ))       # less than or equal
(( n > 5 ))        # greater than
(( n >= 5 ))       # greater than or equal
(( n > 0 && n < 100 ))  # combined
```

`(( ... ))` is *arithmetic context* — its contents are an
arithmetic expression. Variable expansion happens automatically
without `$`. Exit status is 0 if the expression is non-zero, 1
otherwise (yes, "non-zero is true" is reversed from the usual
shell convention — because in arithmetic, non-zero is the
mathematical "true").

### Boolean composition

```bash
[[ -f file && -r file ]]              # both
[[ -f file || -L file ]]              # either
[[ ! -f file ]]                        # negation
[[ -f a && ( -r a || -w a ) ]]        # grouping with ()
```

These work inside `[[ ]]` and `(( ))`. Outside, you can chain
commands with `&&` and `||`:

```bash
[[ -f file ]] && cmd1                  # run cmd1 only if file exists
[[ ! -f file ]] || cmd1                # equivalent: run cmd1 if file exists
[[ -f file ]] && echo found || echo missing
```

The last form is the bash equivalent of a ternary, but with a
trap: if `echo found` itself fails (which it almost never does
but theoretically can), the `else` branch runs too. Prefer an
explicit `if/else` for non-trivial cases.

### Old-style `[ ... ]` and `test`

The older form, equivalent to invoking `test` (which is also
available as `/usr/bin/[`):

```bash
if [ "$var" = "value" ]; then ...
if test "$var" = "value"; then ...
[ -f file ] && cmd
```

Differences from `[[ ... ]]`:

- Word-splits and glob-expands unquoted variables — quoting is
  mandatory: `[ "$var" = "value" ]`, never `[ $var = "value" ]`.
- No `&&` / `||` (use `-a` and `-o`, but they're awkward and
  fragile — better to chain with shell `&&` and `||`).
- No `=~` regex.
- No `<` / `>` string comparison without escaping (`[ "$a"
  \< "$b" ]`).

In modern bash, `[[ ... ]]` is universally better. Use `[ ... ]`
only for portability with non-bash shells.

### Common patterns

```bash
# is variable empty?
[[ -z "$var" ]] && echo empty
[[ -n "$var" ]] && echo not empty

# is variable defined at all?
[[ -v var ]] && echo set

# does file exist and is readable?
[[ -r "$file" ]] || { echo "cannot read $file" >&2; exit 1; }

# does the program exist on PATH?
command -v mycmd &>/dev/null || { echo "mycmd not installed" >&2; exit 127; }
hash mycmd 2>/dev/null || { echo "mycmd not installed" >&2; exit 127; }

# is this a tty (interactive)?
[[ -t 1 ]] && echo "stdout is a terminal"
[[ -t 0 ]] && echo "stdin is a terminal"

# match against multiple patterns
case "$value" in
  pattern1) ... ;;
  pattern2) ... ;;
esac
# or with regex:
[[ "$value" =~ ^(pattern1|pattern2)$ ]] && ...

# numeric range check
(( 0 < n && n < 100 )) && echo in range

# string contains substring
[[ "$haystack" == *needle* ]]      # glob form
[[ "$haystack" =~ needle ]]        # regex form
```

---

## Flow control

### `if` / `elif` / `else`

```bash
if cmd; then
  ...
fi

if cmd1; then
  ...
elif cmd2; then
  ...
else
  ...
fi

# tests with [[ ]]
if [[ -f "$file" ]]; then
  ...
elif [[ -d "$file" ]]; then
  ...
else
  ...
fi

# numeric arithmetic
if (( n > 0 )); then
  ...
fi

# multiple conditions
if [[ -f "$file" ]] && [[ -r "$file" ]]; then
  ...
fi
if [[ -f "$file" && -r "$file" ]]; then    # equivalent
  ...
fi
```

The condition after `if` is just any command; its exit status
determines whether the `then` branch runs. So `if cmd; then ...`
runs the `then` body iff `cmd` exits zero. `if [[ ... ]]; then`
is the special case where the "command" is a test.

The semicolon before `then` can be a newline instead:

```bash
if [[ -f "$file" ]]
then
  cmd
fi
```

Style is up to you. The semicolon-`then` form is more compact and
saves a line.

### `case`

`case` matches a value against a series of glob patterns:

```bash
case "$action" in
  start | up)
    start_service
    ;;
  stop | down)
    stop_service
    ;;
  status)
    show_status
    ;;
  *)
    echo "unknown action: $action" >&2
    exit 64
    ;;
esac
```

Notes:

- Patterns are *globs*, not regex. `*` matches any string, `?`
  matches one character, `[abc]` matches one of `a`/`b`/`c`,
  `[!abc]` (or `[^abc]`) is negated.
- Multiple patterns separated by `|` are alternatives.
- The catch-all `*)` is conventionally the last pattern.
- The terminator is `;;` for "match this pattern and stop". Bash
  also supports `;&` (fall through to the next pattern's body)
  and `;;&` (continue testing further patterns) — both are bash
  extensions, both rare.
- Each branch's body is a list of commands.

A few useful patterns:

```bash
case "$file" in
  *.log)         compress_log "$file" ;;
  *.tar.gz | *.tgz)  extract_tarball "$file" ;;
  *)             echo "unsupported: $file" ;;
esac

# match by character class
case "$char" in
  [0-9])    echo "digit" ;;
  [a-zA-Z]) echo "letter" ;;
  *)        echo "symbol" ;;
esac

# distribution detection
case "$(uname -s)" in
  Linux*)   platform=linux ;;
  Darwin*)  platform=mac ;;
  CYGWIN*|MINGW*|MSYS*) platform=windows ;;
  *)        platform=unknown ;;
esac
```

### `for` loops

Three forms.

#### `for var in LIST`

```bash
for f in *.log; do
  gzip "$f"
done

for word in apple banana cherry; do
  echo "$word"
done

for n in {1..10}; do
  echo "$n"
done

# iterate command-line arguments
for arg in "$@"; do
  echo "$arg"
done

# iterate all positional parameters (the bare `for var` form)
for arg; do                # equivalent to: for arg in "$@"
  echo "$arg"
done

# read lines of a file (preserves whitespace)
while IFS= read -r line; do
  echo "$line"
done < input.txt

# iterate output of a command (BUT see process substitution below)
for line in $(cat file); do      # word-splits — usually wrong for lines
  echo "$line"
done
```

The last `for line in $(cat file)` form is a common bug — it
splits on whitespace, not on newlines, so any file with spaces
inside lines gets corrupted. Use `while read` instead.

#### C-style `for`

```bash
for ((i = 0; i < 10; i++)); do
  echo "$i"
done

for ((i = ${#arr[@]} - 1; i >= 0; i--)); do
  echo "${arr[$i]}"
done
```

Inside `((...))`, no `$` is needed for variable references, and
the syntax is C-like.

#### `for` with brace expansion

```bash
for n in {1..100..2}; do echo "$n"; done    # 1, 3, 5, ..., 99
for x in {a..e}; do echo "$x"; done          # a, b, c, d, e
for ip in 192.168.1.{1..254}; do ping -c1 -W1 "$ip" &>/dev/null && echo up: $ip; done
```

Brace expansion happens before the loop runs, producing a literal
list of values. With variable bounds, it doesn't work — you need
`{$start..$end}` to actually fail; use `seq` or the C-style form
instead:

```bash
start=1
end=10
for n in $(seq "$start" "$end"); do echo "$n"; done
for ((n=start; n<=end; n++)); do echo "$n"; done
```

### `while` and `until`

```bash
while cmd; do
  ...
done

# until is just while-not
until cmd; do
  ...
done

# read lines safely
while IFS= read -r line; do
  process "$line"
done < input.txt

# wait for a service to come up
until curl -fsS http://localhost:8080/health &>/dev/null; do
  sleep 1
done

# infinite loop
while true; do
  do_thing
  sleep 60
done

# loop with a counter
i=0
while (( i < 10 )); do
  echo "$i"
  ((i++))
done
```

The canonical `while IFS= read -r line` pattern is worth
memorising. Breaking it down:

- `IFS=` (empty) prevents `read` from trimming leading/trailing
  whitespace.
- `-r` prevents `read` from interpreting backslashes.
- `read line` reads the next line into `$line`.
- `done < input.txt` redirects the loop's stdin to the file.

### Reading from a pipe — and the subshell trap

```bash
cmd | while read -r line; do
  count=$((count + 1))   # this `count` is in a subshell!
done
echo "$count"            # prints empty / unchanged
```

A pipeline runs each side in a *subshell*. Variables you set
inside the right side don't propagate back. The fix: process
substitution.

```bash
while read -r line; do
  count=$((count + 1))
done < <(cmd)
echo "$count"            # works
```

`<(cmd)` is process substitution — bash creates a named pipe
running `cmd` and substitutes its path. The `<` then redirects
that pipe to the loop's stdin. The loop runs in the *current*
shell, so variable updates stick.

Alternative on bash 4.2+: `shopt -s lastpipe`. With that option
set in a non-interactive shell, the last command of a pipeline
runs in the parent shell. This is the only reliable fix for
"variable set in a pipeline" issues.

### `break` and `continue`

```bash
for x in *.log; do
  [[ -s "$x" ]] || continue       # skip empty files
  process "$x"
done

while true; do
  read -r line || break           # exit on EOF
  process "$line"
done

# break out of nested loops (bash extension)
for outer in 1 2 3; do
  for inner in a b c; do
    [[ $inner = b ]] && break 2   # break out of TWO levels
  done
done
```

The numeric argument to `break` and `continue` is the number of
loop levels to break or continue. Useful but rare.

### Pipes and short-circuit evaluation

```bash
cmd1 | cmd2                  # cmd1's stdout becomes cmd2's stdin
cmd1 |& cmd2                  # bash 4+: cmd1's stdout AND stderr both pipe into cmd2
cmd1 2>&1 | cmd2              # POSIX-portable equivalent of |&

cmd1 && cmd2                  # cmd2 runs only if cmd1 succeeded
cmd1 || cmd2                  # cmd2 runs only if cmd1 FAILED

cmd1 && cmd2 || cmd3           # be careful: this is NOT a true ternary; if cmd2 fails, cmd3 runs
                              # safer:
if cmd1; then cmd2; else cmd3; fi
```

The `&&`/`||` chains are the most common bash idiom for
"conditional execution". They're left-associative and have equal
precedence — read them left-to-right, never assume "&& binds
tighter than ||" from C.

```bash
[[ -d "$DIR" ]] && cd "$DIR" || exit 1     # idiomatic but watch out
```

If `cd "$DIR"` fails, this exits — fine. But if `cd` succeeds
*and* succeeds at running, then if anything inside the function
that contains this line later fails, you'll exit, not the cd
itself. Use `if/then/else/fi` for anything non-trivial.

---

## Functions

A function is a named group of commands. Calling it runs the
group with new positional parameters. Functions are the unit of
reuse and abstraction in bash.

### Defining a function

Two equivalent forms:

```bash
# POSIX form — works in any sh-compatible shell
greet() {
  echo "Hello, $1"
}

# bash-extended form — synonymous
function greet {
  echo "Hello, $1"
}

# both — also legal but combining is unusual
function greet() {
  echo "Hello, $1"
}
```

Use the first form unless you have a specific reason; it's
universally supported.

The body must be a *compound command*. The conventional choice is
braces, but parentheses (subshell), arithmetic blocks, etc. all
work — they're just less common.

### Calling a function

You call a function the same way you call a command. Arguments are
positional parameters inside the function:

```bash
greet "Alice"          # $1 inside greet is "Alice"
greet "Bob" 42         # $1=Bob, $2=42

# return status
if greet "Alice"; then
  ...
fi

# capture output
result=$(greet "Alice")
```

### Inside the function

```bash
my_function() {
  local var1=$1               # always declare locals
  local var2=${2:-default}    # with a default
  
  echo "$var1 $var2"          # output to stdout
  return 0                    # exit status (default if omitted)
}
```

Position parameters work just as in scripts:

| Variable | Meaning |
| --- | --- |
| `$0` | The script's name (not the function's — that's `${FUNCNAME[0]}`) |
| `$1`, `$2`, … | Arguments to this function call |
| `$#` | Number of arguments passed to this call |
| `$@`, `$*` | All arguments |
| `${FUNCNAME[0]}` | The function name |

### Local variables

```bash
counter() {
  local i count=0           # both i and count are local
  for ((i=0; i<$#; i++)); do
    [[ -n "${!i}" ]] && ((count++))
  done
  echo "$count"
}
```

Without `local`, every assignment in a function modifies the
parent shell's variables. This bites people from other languages
constantly. Discipline yourself: every variable you assign in a
function should be `local` unless you specifically want it to
escape.

`local` accepts the declaration flags from `declare`:

```bash
local -i n=42                 # integer
local -a arr=(a b c)          # indexed array
local -A map                  # associative (bash 4+)
local -r CONST=immutable      # readonly within the function
local -n ref=$1               # nameref: alias for the variable named in $1 (bash 4.3+)
```

### Returning values

Bash functions don't return strings or arrays. They return an
*exit status* — an integer 0–255. Anything else, you have to do
through one of:

- **stdout, captured by the caller**: the standard pattern.
  ```bash
  full_name() {
    echo "$1 $2"
  }
  name=$(full_name "Ada" "Lovelace")
  ```
- **Setting a global variable**: workable but unhygienic.
  ```bash
  result=""
  full_name() {
    result="$1 $2"
  }
  full_name "Ada" "Lovelace"
  echo "$result"
  ```
- **Setting a variable through a nameref** (bash 4.3+): the cleanest
  way to return non-string data.
  ```bash
  populate() {
    local -n out=$1
    out=("apple" "banana" "cherry")
  }
  populate fruits
  echo "${fruits[@]}"
  ```

`return N` sets the exit status. Without an explicit `return`,
the function's exit status is the exit status of its last
command.

### Don't `exit` from a function

A common mistake:

```bash
check_input() {
  [[ -z "$1" ]] && { echo "missing input" >&2; exit 1; }
}
```

If `check_input` is called from a script, the `exit` exits the
whole script — which might be what you want. But if it's called
inside a `$(check_input "$x")` substitution or in a subshell,
`exit` only kills the subshell, not the parent. The function
silently returns a "success" to the caller and the bug is
invisible.

The right idiom: `return` from the function with an error code,
and let the caller decide:

```bash
check_input() {
  [[ -z "$1" ]] && { echo "missing input" >&2; return 1; }
  return 0
}

# at the call site:
check_input "$arg" || exit 1
```

### Function declarations: composition and chaining

Functions can call functions. Recursion works:

```bash
factorial() {
  local n=$1
  if (( n <= 1 )); then
    echo 1
  else
    echo $(( n * $(factorial $((n - 1))) ))
  fi
}
factorial 5    # prints 120
```

But every recursive call forks a subshell for the `$()`
substitution, which is expensive — bash recursion is fine for
demonstrations and toy use cases, but for anything
performance-sensitive use a different language.

### Listing and inspecting functions

```bash
declare -F               # list function names
declare -f               # show full definitions
declare -f greet          # show one function's definition
type greet                # tell you it's a function (or alias, or builtin, or executable)
```

### Aliases vs. functions

```bash
alias ll='ls -l'           # alias: text substitution at the start of a command line
greet() { echo "hi"; }     # function: a real callable
```

Aliases are a leftover from the Bourne shell. They work only at
the start of a simple command, they don't take arguments
naturally, and they don't work inside scripts (only in
interactive shells, unless you turn `expand_aliases` on). Modern
guidance: prefer functions over aliases for anything beyond the
simplest "rename a command with default flags" case.

```bash
# alias: only useful for the first word of the command
alias ll='ls -l'

# function: takes arguments, can be used anywhere a command can
ll() { ls -l "$@"; }
```

### Sourcing scripts (and dot-scripts)

```bash
./script.sh             # run as a separate process
bash script.sh          # run with explicit interpreter
source script.sh        # run in the current shell — variable assignments stick
. script.sh             # POSIX equivalent of source
```

Sourced scripts run inside the current shell. Use this for:

- Library files that define functions you want the parent shell
  to have access to.
- Configuration files that set environment variables.
- "Module" patterns where one script imports another.

A common idiom:

```bash
# at the top of your_script.sh
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/lib/common.sh"
```

This finds the directory of the running script regardless of how
it was invoked, then sources a sibling library. `${BASH_SOURCE[0]}`
is the path to the *current source file*, which is what you want
in libraries that may themselves be sourced.

---

## I/O redirection in detail

The Linux CLI Quick Reference covers redirection for the
classical UNIX tools; this section is the bash-specific
treatment, with all the wrinkles that arise once you start
combining redirections.

### File descriptors

Every process starts with three open file descriptors:

| FD | Conventional use |
| --- | --- |
| 0 | stdin |
| 1 | stdout |
| 2 | stderr |

Bash lets you open more (3..9 are conventional) and redirect
between them.

### Basic redirection

```bash
cmd > file              # stdout to file (truncate)
cmd >> file             # stdout to file (append)
cmd 2> file             # stderr to file
cmd 2>> file            # stderr to file (append)
cmd > file 2>&1         # stdout AND stderr to file (note the order!)
cmd &> file             # bash shorthand for the above
cmd &>> file            # bash append shorthand
cmd > /dev/null 2>&1    # discard everything
cmd > out 2> err        # split: stdout to one file, stderr to another
cmd < file              # stdin from file
cmd <<< "string"        # stdin from a here-string
cmd <<EOF               # stdin from a here-doc
content
EOF
```

The order of `>` and `2>&1` matters and reads left-to-right:

- `cmd > file 2>&1` — stdout goes to `file`, *then* stderr is
  duplicated to whatever stdout currently points to (now `file`).
  Both end up in `file`. ✓
- `cmd 2>&1 > file` — stderr is duplicated to whatever stdout
  currently points to (the terminal), *then* stdout is redirected
  to `file`. stderr still goes to the terminal. ✗

If you remember "redirections happen left-to-right and `2>&1` is
literally 'duplicate fd 2 to whatever fd 1 currently points
at'", you'll never get this wrong again.

### `&>` shorthand (bash-only)

```bash
cmd &> file         # equivalent to: cmd > file 2>&1
cmd &>> file        # equivalent to: cmd >> file 2>&1
```

Skips the order trap. POSIX-portable scripts should use the
explicit `> file 2>&1` form instead.

### Here-documents and here-strings

```bash
cat <<EOF
This is line 1.
This is line 2.
EOF
```

The here-doc is everything between `<<EOF` and a line containing
exactly `EOF`. Inside the body:

- Variables are expanded: `$VAR`, `$(cmd)`, `$((arith))`.
- Backslashes escape special characters.

To prevent expansion (treat the body as literal):

```bash
cat <<'EOF'
This $variable is literal, not expanded.
EOF
```

Quoting any character of the delimiter (`'EOF'`, `"EOF"`, or
`\EOF`) disables expansion. The classic Python-into-bash use case:

```bash
python3 <<'PYTHON'
import os, sys
print("PYTHONPATH=" + os.environ.get("PYTHONPATH", "<unset>"))
PYTHON
```

`<<-EOF` (with the dash) strips leading **tabs** (not spaces) from
each line, which lets you indent the here-doc with the surrounding
code:

```bash
function describe {
    cat <<-EOF
        This is line 1.
        This is line 2.
        EOF
}
```

The leading indent must be tabs, not spaces.

#### Here-strings

```bash
cmd <<< "string"
```

— equivalent to `echo "string" | cmd` but slightly more
efficient (no fork). Useful for feeding short input into a
command without a temp file.

```bash
read -r year month day <<< "2024 12 31"
echo "$year-$month-$day"
```

### File descriptor manipulation

```bash
exec 3< /etc/passwd      # open file as fd 3 for reading
exec 4> /tmp/out         # open file as fd 4 for writing
exec 5<> /tmp/io         # open as fd 5 for both reading and writing
exec 3<&-                # close fd 3
exec 4>&-                # close fd 4

# read from fd 3
while IFS=: read -r -u 3 user pw uid gid info home shell; do
  echo "$user has UID $uid"
done

# write to fd 4
echo "log entry" >&4

# duplicate fd 1 to fd 6 so we can put stdout back later
exec 6>&1
exec 1> /tmp/log         # redirect stdout to a file for the rest of the script
echo "this goes to the log"
exec 1>&6                # restore stdout
exec 6>&-                # close the saved descriptor
echo "this goes to stdout"
```

Reading and writing through explicit file descriptors lets you
keep multiple I/O channels open without using temporary files.
Useful for scripts that need to interleave reading and writing
to the same external resource.

### Redirection inside compound commands

You can redirect a `{ ... }` block, a function definition, a
loop, or any compound command:

```bash
{
  echo "started"
  do_thing
  echo "done"
} > /tmp/log 2>&1

while read -r line; do
  echo "got: $line"
done < input.txt > output.txt

# functions can have permanent redirections
audit_log() {
  ...
} >> /var/log/audit.log
```

### Process substitution

Bash extension. `<(cmd)` and `>(cmd)` create file-like things
that read from a command's output or write to a command's input.
The mechanism is a named pipe (or `/dev/fd/N`).

```bash
diff <(sort a.txt) <(sort b.txt)         # compare two pipelines
comm -23 <(sort a) <(sort b)              # set difference
paste <(seq 1 5) <(seq 10 14)             # join two sequences

# read a command's output without the subshell trap
while read -r line; do
  count=$((count + 1))
done < <(command-that-emits-lines)
echo "$count"

# split a stream
cmd > >(filter1 > out1) 2> >(filter2 > out2)
```

The "the loop runs in the parent shell" trick is one of the most
useful patterns in bash. Whenever you've been bitten by `cmd |
while ... done` not propagating variables, switch to `while ...
done < <(cmd)`.

### `tee`

`tee` is a separate command but worth mentioning here for
completeness:

```bash
make 2>&1 | tee build.log               # see and save
make 2>&1 | tee -a build.log             # append
sudo cmd | sudo tee /etc/something > /dev/null
                                         # write to a root-owned file from a user shell
```

### Redirect stderr to stdout in pipelines

To pipe both stdout and stderr through the next command:

```bash
cmd 2>&1 | next                          # POSIX
cmd |& next                               # bash 4+
```

---

## Argument parsing

Scripts and functions take positional parameters from the
caller. Real scripts also need to support flags
(`-v`, `--verbose`), with values (`-o filename`,
`--output=filename`), and validate them. Bash has builtin support
through `getopts` for short flags; for long flags you usually
roll your own loop.

### Positional parameters

```bash
$0          # script name (or function name in some contexts)
$1          # first argument
$2          # second argument
$#          # number of arguments
$@          # all arguments — use "$@" to preserve word boundaries
$*          # all arguments as one string

shift       # discard $1; $2 becomes $1, etc.; $# decrements
shift 2     # discard the first two
```

A few patterns:

```bash
# require at least one argument
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <input>" >&2
  exit 64
fi

# iterate
for arg in "$@"; do
  echo "$arg"
done

# bare `for arg` is shorthand for "for arg in \"$@\""
for arg; do
  echo "$arg"
done

# while-shift loop, often paired with case
while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--verbose) verbose=1; shift ;;
    -o|--output)  output=$2; shift 2 ;;
    --output=*)   output=${1#--output=}; shift ;;
    --)           shift; break ;;
    -*)           echo "unknown option: $1" >&2; exit 64 ;;
    *)            files+=("$1"); shift ;;
  esac
done
```

### `getopts` — POSIX argument parsing

`getopts` is a shell builtin that parses *short* flags. It
doesn't handle long flags (`--verbose`) — those you have to
parse yourself.

```bash
verbose=0
output=""
files=()

while getopts "vo:" opt; do
  case $opt in
    v) verbose=1 ;;
    o) output=$OPTARG ;;
    \?) echo "Usage: $0 [-v] [-o file] files..." >&2; exit 64 ;;
  esac
done
shift $((OPTIND - 1))      # remove parsed options from $@

# remaining args
files=("$@")

# show what we parsed
echo "verbose=$verbose"
echo "output=$output"
echo "files=${files[@]}"
```

The `getopts` argument string `"vo:"` declares two flags:

- `v` — boolean (no argument)
- `o:` — takes an argument (the colon)

Inside the loop:

- `$opt` is the letter of the flag just parsed.
- `$OPTARG` is the argument (when the flag takes one).
- `$OPTIND` is the index of the next argument to be processed.
- `?` is set when an unknown flag is seen.

After the loop, `shift $((OPTIND - 1))` removes the parsed options
from `$@`, leaving only the non-option arguments.

A leading colon in the argument string (`":vo:"`) puts `getopts`
into "silent error" mode — it doesn't print error messages
itself, and uses `:` and `?` to indicate "missing argument" and
"unknown option" respectively. Useful when you want to provide
your own error messages.

### Long flags (DIY)

bash has no builtin for long flags. Hand-roll a loop:

```bash
verbose=0
output=""
input_files=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -h | --help)
      cat <<EOF
Usage: $0 [OPTIONS] FILES...

Options:
  -h, --help          show this help
  -v, --verbose       increase verbosity
  -o, --output=FILE   write to FILE
EOF
      exit 0
      ;;
    -v | --verbose)
      verbose=1
      shift
      ;;
    -o | --output)
      [[ -z $2 ]] && { echo "$1 requires a value" >&2; exit 64; }
      output=$2
      shift 2
      ;;
    --output=*)
      output=${1#--output=}
      shift
      ;;
    --)
      shift
      input_files+=("$@")
      break
      ;;
    -*)
      echo "$0: unknown option: $1" >&2
      exit 64
      ;;
    *)
      input_files+=("$1")
      shift
      ;;
  esac
done
```

This handles:

- Short flags (`-v`, `-o file`).
- Long flags (`--verbose`, `--output file`, `--output=file`).
- The `--` end-of-options marker (everything after is treated as
  a positional argument, even if it starts with `-`).
- A `--help` flag that prints usage.

### `getopt(1)` — the external alternative

The external `/usr/bin/getopt` (note: a separate binary, not the
shell's `getopts`) does parse long flags. The "enhanced" GNU
getopt is what's installed on most Linux systems.

```bash
TEMP=$(getopt -o 'vo:h' --long 'verbose,output:,help' -n "$0" -- "$@") || exit 64
eval set -- "$TEMP"
unset TEMP

while true; do
  case $1 in
    -v|--verbose) verbose=1; shift ;;
    -o|--output)  output=$2; shift 2 ;;
    -h|--help)    print_help; exit 0 ;;
    --)           shift; break ;;
    *)            echo "internal error" >&2; exit 70 ;;
  esac
done

input_files=("$@")
```

The `eval set -- "$TEMP"` is unfortunate but necessary — `getopt`
emits a properly-quoted argument list and `eval` parses it back
into `$@`. macOS doesn't ship the GNU enhanced getopt by default;
the BSD version doesn't support long options. For portability,
the hand-rolled loop above is safer.

### Reading user input

`read` is the basic input mechanism:

```bash
read -r line                       # read a line into $line
read -r first second rest          # split on IFS into multiple variables
read -p "Continue? [y/N] " ans     # prompt
read -s -p "Password: " pass       # silent (no echo)
echo
read -t 30 ans                     # timeout after 30 seconds
read -n 1 -s ans                   # read exactly 1 character, no echo
read -a arr                        # read into an array

while IFS= read -r line; do        # read every line of a file
  echo "$line"
done < input.txt
```

The `-r` flag is almost always wanted — it disables backslash
processing, so backslashes are preserved literally. Without `-r`,
a line ending in `\` continues onto the next line, which is
rarely the intent.

A useful confirmation pattern:

```bash
read -r -p "Are you sure? [y/N] " ans
case "${ans,,}" in
  y|yes) echo "proceeding" ;;
  *)     echo "aborted"; exit 0 ;;
esac
```

The `${ans,,}` (lowercase) is bash 4+; for older bash you'd
write `case "$(echo "$ans" | tr A-Z a-z)" in ...`.

### `select` — simple menus

`select` builds a numbered menu and reads the user's choice:

```bash
select option in red green blue quit; do
  case $option in
    red|green|blue) echo "you picked $option"; break ;;
    quit) break ;;
    *)   echo "invalid choice" ;;
  esac
done
```

`PS3="> "` sets the menu's prompt. `select` keeps looping until
you `break` or the user sends EOF.

---

## Arithmetic

Bash has integer arithmetic built in. There's no native floating-
point — for that you need an external tool like `bc`, `awk`, or
`python`.

### Arithmetic context: `(( ))` and `$(( ))`

Bash recognises an *arithmetic context* in two forms:

- `(( expr ))` — evaluate `expr`; exit status 0 if non-zero, 1 if
  zero. Used as a condition or statement.
- `$(( expr ))` — evaluate `expr`; expand to its value as a
  string. Used to compute a number you want to use elsewhere.

Inside arithmetic context:

- Variables don't need a `$`. Just write `n`, not `$n`.
- All values are 64-bit signed integers (on most modern systems).
- Most C operators work: `+`, `-`, `*`, `/`, `%`, `**`
  (exponentiation), `++`, `--`, `==`, `!=`, `<`, `<=`, `>`, `>=`,
  `&`, `|`, `^`, `~`, `<<`, `>>`, `&&`, `||`, `!`, `?:`.
- The assignment operators (`=`, `+=`, `-=`, `*=`, `/=`, `%=`)
  work too.

```bash
((x = 5))                  # set x to 5
((x++))                    # increment
((x += 3))                 # x = x + 3
((y = (x + 5) * 2))        # parens, multiplication
((z = x ** 10))            # exponentiation
((mask = 0xff & 0x0f))     # bitwise AND
((flag = x > 0 && x < 100))# boolean (1 or 0)

n=$((3 + 4))               # n becomes "7"
n=$((10 % 3))              # n becomes "1"
n=$((2 ** 10))             # n becomes "1024"
echo $((100 / 7))          # 14 (integer division)
echo $(((x + y) * z))      # arbitrary expression
```

You can mix arithmetic with the rest of the language:

```bash
for ((i = 1; i <= 10; i++)); do
  echo "$i squared is $((i * i))"
done

while ((counter < limit)); do
  do_thing
  ((counter++))
done

if (( x > 0 && y > 0 )); then
  ...
fi
```

### Conditional expression in arithmetic

```bash
result=$(( x > 0 ? x : -x ))                # absolute value
max=$(( a > b ? a : b ))
clamped=$(( v < 0 ? 0 : v > 100 ? 100 : v ))
```

### Number bases

```bash
echo $((0xff))             # 255 (hexadecimal input)
echo $((0177))             # 127 (octal — leading zero)
echo $((2#1010))           # 10 (binary — base prefix N#)
echo $((16#ff))            # 255
echo $((36#z))             # 35

# format output in another base — bash doesn't, but printf does:
printf '%d\n' 0xff         # 255
printf '0x%x\n' 255        # 0xff
printf '%o\n' 255          # 377
```

bash's arithmetic input understands the `0x` and `0` (octal)
prefixes plus the `N#` general form (where N is 2..64). Output
is always decimal; for hex/octal output use `printf`.

### `let` and `expr` (the older alternatives)

```bash
let x=5+3                  # legacy; works but use (( )) instead
let x++

expr 5 + 3                 # external command — slower (forks)
expr 5 \* 3                # * needs to be escaped because it's a glob
expr length "$str"         # string length
```

`let` is a builtin that evaluates a single arithmetic expression.
`expr` is an external command. Both are pre-bash-arithmetic and
are mostly historical now. Use `(( ))` and `$(( ))` instead.

### Floating-point

Not built in. Three workarounds:

#### `bc` — arbitrary-precision calculator

```bash
result=$(echo "scale=4; 22 / 7" | bc)
echo "$result"             # 3.1428

# math library (-l) gives you sin, cos, sqrt, atan, etc.
result=$(echo "scale=10; 4 * a(1)" | bc -l)   # pi

# heredoc form
result=$(bc -l <<EOF
scale = 4
a = 1.5
b = 2.7
a * b
EOF
)
```

#### `awk` — also has floats

```bash
result=$(awk "BEGIN{print 22 / 7}")
result=$(awk -v a=1.5 -v b=2.7 'BEGIN{print a + b}')
```

`awk` is often easier than `bc` for one-liners because it has
familiar syntax and doesn't need a `scale=` directive.

#### `python` (or `python3`) — for one-offs

```bash
result=$(python3 -c "print(22 / 7)")
result=$(python3 -c "import math; print(math.sin(1.5))")
```

### `printf` and number formatting

```bash
printf "%d\n" 42                    # 42
printf "%5d\n" 42                   # "   42" (5-wide, right-justified)
printf "%-5d|\n" 42                 # "42   |" (left-justified)
printf "%05d\n" 42                  # "00042" (zero-padded)
printf "%x\n" 255                   # ff
printf "%X\n" 255                   # FF
printf "%#x\n" 255                  # 0xff (with the # flag)
printf "%o\n" 255                   # 377
printf "%e\n" 12345.678             # 1.234568e+04
printf "%.2f\n" 12345.678           # 12345.68
printf "%g\n" 0.0001234             # 0.0001234

# multiple values are reused
printf "%s=%d\n" key1 1 key2 2 key3 3   # cycles through

# %q — print value as a re-importable shell-quoted string
printf "%q\n" 'string with $special chars'  # 'string with $special chars'

# -v VAR sets a variable instead of printing
printf -v ts '%(%Y-%m-%d %H:%M:%S)T' -1   # current time, no fork
echo "$ts"
```

`printf` is much faster than spawning external commands when you
need a formatted string. The `-v VAR` form is a hidden gem —
"print into a variable".

---

## Strict mode and script discipline

Bash's defaults date from a different era. They're forgiving in
ways that hide bugs. Modern bash scripts of any complexity should
opt in to a stricter set of behaviors at the top of the file.

### The strict-mode preamble

The canonical opening for a non-trivial bash script:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
trap 'echo "[$0:$LINENO] error" >&2' ERR
```

Each piece earns its place; let's unpack them.

#### `set -e` — exit on the first failure

`set -e` (also written `set -o errexit`) makes the shell exit as
soon as any command exits non-zero. Without it, a script that
fails halfway through silently keeps going, possibly doing damage.

```bash
set -e
mkdir /tmp/work
cd /tmp/work        # if mkdir failed, we never get here, the script exits
do_thing
```

The caveats:

- A failure inside `if cmd; then`, `while cmd; do`, `until cmd; do`,
  `cmd1 && cmd2`, `cmd1 || cmd2`, or `! cmd` does NOT trigger
  exit — the failure is "tested" by the surrounding construct.
- A failure of any command except the last in a pipeline does NOT
  trigger exit (because `set -e` looks at the pipeline's overall
  exit status, which is the last command's). Use `set -o
  pipefail` to fix this.
- A failure in a function called from a context that suppresses
  errors (`if`, `&&`, etc.) does NOT propagate. Use `set -E` so
  ERR traps are inherited into functions.

When you *want* a command to be allowed to fail, append `|| true`:

```bash
maybe_failing_cmd || true        # the failure is intentional
```

Or use `if`:

```bash
if maybe_failing_cmd; then ...; fi
```

#### `set -u` — error on unset variables

`set -u` (also `set -o nounset`) makes the shell error if you
expand a variable that's never been set:

```bash
set -u
echo "$UNSET_VAR"        # bash: UNSET_VAR: unbound variable
```

This catches typos:

```bash
set -u
filename="report.csv"
echo "$filenname"        # typo — without -u, prints empty string; with -u, errors
```

To safely expand an optional variable with a default:

```bash
echo "${VAR:-}"          # empty if unset
echo "${VAR:-default}"   # "default" if unset/empty
```

Special arrays need a bit of care: `"$@"` is fine even when
empty, but `"${arr[@]}"` errors under `-u` if the array was
declared but never had any elements assigned. The bash 4.4+ fix
is `"${arr[@]:+${arr[@]}}"` — clunky. The simpler discipline:
ensure your arrays always exist (`declare -a arr=()`) and don't
worry.

#### `set -o pipefail` — fail on any pipeline failure

By default, a pipeline's exit status is the last command's. So
`failing | sort` exits 0 if `sort` succeeds, even though `failing`
failed. `set -o pipefail` makes the pipeline's exit status the
*leftmost non-zero* — any failure anywhere in the pipeline is
visible.

```bash
set -o pipefail
gunzip -c input.gz | grep -c pattern
                          # without pipefail: exit status is grep's
                          # with pipefail:    if gunzip failed, that's the exit
```

The exit status of each pipeline command is also available in
`${PIPESTATUS[@]}` whether or not pipefail is set.

#### `set -E` — inherit ERR traps

```bash
set -E
trap 'echo error on line $LINENO' ERR
```

Without `-E`, the ERR trap is not active inside shell functions
or subshells. With `-E`, it is. Combined with `-e`, this gives
you a single point of error reporting for any non-zero exit
anywhere in the script.

#### `IFS=$'\n\t'`

Sets the Input Field Separator to newline-and-tab only,
removing the space that's normally there. This makes word-
splitting on filenames containing spaces stop happening
unexpectedly.

A worked example: with default `IFS=$' \t\n'`,

```bash
files="report 1.csv
report 2.csv"
for f in $files; do
  ls "$f"
done
```

— iterates over four words: `report`, `1.csv`, `report`,
`2.csv`. With `IFS=$'\n\t'`, it iterates over two lines:
`report 1.csv` and `report 2.csv`. Many fewer "filename with
spaces" bugs.

The cost: spaces are no longer separators in unquoted variable
expansion. If you depend on space-separated lists in unquoted
variables, this will surprise you. The discipline of always
quoting expansions makes this safe.

#### `trap '...' ERR`

Run an arbitrary command on any error. Useful for logging where
the script died:

```bash
trap 'echo "[$(date +%FT%T)] $0 line $LINENO: command '\''$BASH_COMMAND'\'' failed (exit $?)" >&2' ERR
```

`$BASH_COMMAND` is the command that failed; `$LINENO` is the
line; `$?` is the exit status.

### Other useful `set` options

```bash
set -x      # print each command before running it (xtrace)
set +x      # turn it off
set -n      # syntax check; don't run
set -v      # print each line as read

set -o noclobber       # > can't overwrite; use >| to force
set -o noglob          # disable glob expansion (sometimes useful in restricted contexts)
set -o functrace       # DEBUG and RETURN traps inherited by functions

# inspect what's currently set
set -o                  # show all options' states
echo $-                 # the active short flags
```

You can also use `shopt`:

```bash
shopt -s nullglob       # unmatched globs expand to nothing (instead of staying literal)
shopt -s globstar       # ** matches recursively
shopt -s extglob        # @(...) +(...) etc. extended globs
shopt -s nocaseglob     # globs are case-insensitive
shopt -s nocasematch    # [[ ]] string matching is case-insensitive
shopt -s lastpipe       # last command of a pipeline runs in the parent shell (non-interactive)
shopt -s inherit_errexit  # subshells inherit -e (bash 4.4+)
shopt -s shift_verbose  # error messages from `shift` past end of args
shopt -s checkjobs      # warn before exiting if there are stopped jobs
shopt -s checkwinsize   # update LINES/COLUMNS after each command (interactive default)
```

### A defensive script template

```bash
#!/usr/bin/env bash
# Description: <one-line summary>
# Usage:       <how to run>

set -Eeuo pipefail
IFS=$'\n\t'
shopt -s nullglob inherit_errexit

# --- helpers ----------------------------------------------------------
log()  { printf '[%(%Y-%m-%dT%H:%M:%S)T] %s\n' -1 "$*" >&2; }
die()  { log "ERROR: $*"; exit 1; }
on_err() { log "FAILED at $0:${BASH_LINENO[0]} (cmd: $BASH_COMMAND, exit: $?)"; }
trap on_err ERR

# --- temp directory cleanup -------------------------------------------
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
log "working in $WORK"

# --- argument parsing -------------------------------------------------
verbose=0
output=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)    sed -n '2,3p' "$0"; exit 0 ;;
    -v|--verbose) verbose=1; shift ;;
    -o|--output)  output=$2; shift 2 ;;
    --output=*)   output=${1#--output=}; shift ;;
    --) shift; break ;;
    -*) die "unknown option: $1" ;;
    *) break ;;
  esac
done

[[ -z $output ]] && die "missing required --output"

# --- main -------------------------------------------------------------
log "starting"
do_main_work
log "done"
```

This template handles errors uniformly, cleans up temp files
always, parses both short and long flags, and prints structured
log messages. The `trap '...' EXIT` is particularly important —
it runs no matter how the script exits (success, error, or
signal), so cleanup happens deterministically.

### `shellcheck` — lint your scripts

`shellcheck` is the universal bash linter. It catches: unquoted
variable expansions, `[ "$x" = "$y" ]` versus `[[ ]]` issues,
SC2086 (word splitting on unquoted variables), SC2155 (declare
and assign separately), unreachable code, and dozens of other
classes of bug. Install it (`apt install shellcheck`,
`brew install shellcheck`) and add it to your CI:

```bash
shellcheck script.sh                   # lint one script
find . -name '*.sh' -exec shellcheck {} +
                                       # lint all scripts in a tree
shellcheck -x script.sh                # follow `source`d files
```

There are inline directives to suppress warnings on specific
lines:

```bash
# shellcheck disable=SC2086
echo $unquoted_on_purpose
```

Treat shellcheck warnings the same way you treat compiler
warnings in any other language: fix them or document why you're
ignoring them.

---

## Signals and traps

A *signal* is a kernel-mediated message to a process. A *trap*
is a bash construct that registers a handler for a signal (or for
one of bash's pseudo-signals like `EXIT` and `ERR`). Traps are
the primary mechanism for cleanup-on-exit, error reporting, and
graceful shutdown.

### Common signals

| Signal | Number | Default action | Common use |
| --- | --- | --- | --- |
| `SIGHUP` | 1 | terminate | Ask daemons to reload config |
| `SIGINT` | 2 | terminate | What `Ctrl-C` sends |
| `SIGQUIT` | 3 | terminate + dump core | What `Ctrl-\` sends |
| `SIGKILL` | 9 | terminate | Cannot be caught or ignored |
| `SIGUSR1` | 10 | terminate | User-defined |
| `SIGUSR2` | 12 | terminate | User-defined |
| `SIGPIPE` | 13 | terminate | Wrote to a closed pipe |
| `SIGTERM` | 15 | terminate | The default `kill` signal |
| `SIGCHLD` | 17 | ignore | Child changed state |
| `SIGSTOP` | 17/19/23 | stop | Pause; cannot be caught |
| `SIGTSTP` | 18/20/24 | stop | What `Ctrl-Z` sends |
| `SIGCONT` | 18/19/25 | resume | Resume after stop |
| `SIGWINCH` | 28 | ignore | Terminal resize |

`kill -l` lists every signal name and its number on the running
system.

### `trap` — install a handler

```bash
trap 'COMMANDS' SIGNAL...
```

Registers `COMMANDS` to run when any of the named signals
arrive. The commands are a single string — usually with single
quotes so variables aren't expanded until trap-time, not
trap-installation-time.

```bash
trap 'echo got SIGINT; exit 130' INT
trap 'echo "got TERM; cleaning up"; rm -f "$lockfile"; exit 143' TERM

# trap multiple signals to one handler
trap 'cleanup' INT TERM HUP

# remove a trap
trap - INT                           # restore default for INT
trap '' INT                          # ignore INT (empty handler)

# show currently-installed traps
trap -p
trap -l                              # list all signal names
```

Bash defines a few pseudo-signals on top of the kernel ones:

- `EXIT` — runs when the shell exits, regardless of cause.
- `ERR` — runs when any command exits non-zero (with caveats; see
  the strict-mode section).
- `DEBUG` — runs *before* every simple command. Almost never
  useful in production scripts, but invaluable for tracing.
- `RETURN` — runs when a function or sourced script returns.

### The `EXIT` trap — the most useful one

The `EXIT` trap runs no matter how the script exits — success,
explicit `exit`, error under `set -e`, signal, anything. Use it
for cleanup that must happen:

```bash
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# ... rest of script uses $WORK ...
```

Every script that creates temp files, locks, or other resources
should have an `EXIT` trap that cleans them up. Without it, a
script that fails mid-way leaves debris.

### The `ERR` trap

```bash
trap 'echo "error on line $LINENO: $BASH_COMMAND" >&2' ERR
```

Combined with `set -E`, this fires on any command failure that
would have caused `set -e` to exit. Useful for logging *where*
the script died:

```bash
set -Eeuo pipefail
trap 'echo "[$(date +%FT%T)] $0:${BASH_LINENO[0]} (cmd: $BASH_COMMAND, exit: $?)" >&2' ERR
```

Variables you'll find handy in error traps:

- `$LINENO` — the line that just failed.
- `$BASH_LINENO[]` — the call-stack of line numbers.
- `$BASH_COMMAND` — the command that just failed.
- `$?` — its exit status.
- `${FUNCNAME[@]}` — the function call stack.

### Cleanup in functions

When a function manages a resource that needs cleanup, install a
local trap:

```bash
process_file() {
  local tmp
  tmp=$(mktemp)
  trap 'rm -f "$tmp"' RETURN     # cleans up when function returns
  
  # ... use $tmp ...
}
```

The `RETURN` pseudo-signal fires when the function returns. The
trap is local to the function (with `set -E` plus suitable
shopt; without those, it may leak — `RETURN` traps are subtle).

A simpler pattern that doesn't depend on RETURN:

```bash
process_file() {
  local tmp
  tmp=$(mktemp)
  
  # actual work in a subshell so we can clean up regardless
  (
    trap 'rm -f "$tmp"' EXIT
    # ... use $tmp ...
  )
}
```

The subshell's `EXIT` trap fires when the subshell exits (whether
from completion, error, or signal), and the subshell's exit
doesn't terminate the script.

### Ignoring signals

```bash
trap '' HUP                          # ignore SIGHUP — script becomes immune to terminal disconnects
trap '' INT TERM                     # ignore Ctrl-C and SIGTERM
```

This is also what `nohup` does to a child process. Useful for
scripts that should run to completion even if the user
disconnects.

### Sending signals from inside the script

```bash
kill $$                              # send default (TERM) to self
kill -USR1 $$                        # send USR1 to self
kill -INT 12345                      # send INT to a specific PID
pkill -USR1 mydaemon                 # send USR1 to all processes named mydaemon
```

A common pattern: a script with a long-running loop that responds
to signals:

```bash
running=1
trap 'running=0' INT TERM

while ((running)); do
  do_one_iteration
  sleep 1
done

echo "exited cleanly"
```

The trap sets a flag; the loop checks it. This avoids the danger
of doing real work inside a signal handler.

### Job control

```bash
sleep 100 &                          # run in background
jobs                                 # list jobs
fg                                   # bring most recent job to foreground
fg %1                                # bring job 1
bg                                   # resume current job in background (after Ctrl-Z)
bg %1                                # job 1 in background
wait                                 # wait for all background jobs to finish
wait -n                              # wait for any single job (bash 4.3+)
wait %1                              # wait for job 1
wait $PID                            # wait for a specific PID
disown %1                            # detach from shell's job control (survives shell exit)
disown -h %1                         # don't kill on shell exit, but stay listed

# Inside scripts:
$!                                   # PID of the most recently backgrounded job
```

Practical patterns:

```bash
# parallel: launch several jobs, wait for all
for url in "${urls[@]}"; do
  download "$url" &
done
wait                                 # block until everyone finishes

# parallel with a cap
for url in "${urls[@]}"; do
  download "$url" &
  while (($(jobs -r | wc -l) >= 4)); do
    wait -n                          # block until something finishes
  done
done
wait

# run, then time out after N seconds
slow_command &
PID=$!
sleep 30 && kill $PID 2>/dev/null &
TIMEOUT_PID=$!
wait $PID
kill $TIMEOUT_PID 2>/dev/null

# better: use the timeout command
timeout 30 slow_command
```

For real parallel job control, `xargs -P N` or GNU `parallel`
beats hand-written bash.

---

## Debugging

When a bash script does the wrong thing, you have several
mechanisms for inspecting what's actually happening.

### `set -x` — execution trace

`set -x` (also written `set -o xtrace`) makes bash print every
command before running it, prefixed with `+` to indicate
nesting depth.

```bash
#!/usr/bin/env bash
set -x

x=5
y=10
echo "$((x + y))"
```

```
+ x=5
+ y=10
+ echo 15
15
```

Run an existing script with xtrace from the outside:

```bash
bash -x script.sh
```

— without modifying the script.

### `PS4` — make xtrace pretty

`PS4` is the prompt prefix used in xtrace output. The default is
`+ `. A more useful one:

```bash
export PS4='+ ${BASH_SOURCE}:${LINENO}: ${FUNCNAME[0]:+${FUNCNAME[0]}(): }'
```

Now xtrace output looks like:

```
+ script.sh:5: x=5
+ script.sh:6: y=10
+ script.sh:7: my_func(): echo 15
```

— with file, line, and function name.

### Targeted xtrace

You don't have to trace the whole script. Turn xtrace on around
the suspicious section:

```bash
set -x
mystery_function "$1"
set +x
```

Or use a function that wraps it:

```bash
trace() {
  local cmd
  cmd=("$@")
  set -x
  "${cmd[@]}"
  { set +x; } 2>/dev/null
}

trace mystery_function "$1"
```

### The `DEBUG` trap

`trap 'echo before $BASH_COMMAND' DEBUG` runs the trap before
every simple command. More verbose than `set -x` but lets you do
arbitrary work — log to a file, sleep, whatever:

```bash
trap 'echo "step: $BASH_COMMAND" >> /tmp/trace.log' DEBUG
```

Combined with `${BASH_LINENO[0]}`, you can record the current
line:

```bash
trap 'printf "%s:%d: %s\n" "${BASH_SOURCE[0]}" "$LINENO" "$BASH_COMMAND" >&2' DEBUG
```

### Conditional debug logging

A standard pattern for "verbose mode":

```bash
verbose=0
log() {
  ((verbose)) && echo "[$(date +%T)] $*" >&2
}

# inside arg parsing:
case $1 in
  -v|--verbose) verbose=1; shift ;;
esac

# elsewhere:
log "starting work"
do_work
log "done"
```

This costs nothing when not in verbose mode (the `log` function
returns immediately) and gives you fine-grained control.

### Dumping variable state

Bash makes it easy to dump variables for inspection:

```bash
declare -p VAR                # show one variable (and its attributes)
declare -p                    # show ALL variables in re-importable form
declare -F                    # list function names
declare -f                    # list function definitions
declare -F greet              # check if a function exists
type -a name                  # what is `name` — alias, function, builtin, executable

# array dump
declare -p arr                # full re-importable form
echo "${arr[@]@A}"            # bash 4.4+: same idea

# print all variables defined in this function (poor-man's locals)
( set -o posix; set ) | head -20
```

A useful debugging snippet — print the current call stack:

```bash
print_stack() {
  local i
  for ((i=1; i<${#BASH_SOURCE[@]}; i++)); do
    printf '  at %s (%s:%d)\n' "${FUNCNAME[$i]:-MAIN}" "${BASH_SOURCE[$i]}" "${BASH_LINENO[$i-1]}"
  done
}

trap 'print_stack' ERR
```

When an error fires, you see the chain of function calls that led
there.

### Step-by-step execution: `bashdb`

`bashdb` is a separate debugger for bash, with breakpoints and
step-execution. It's available as a package on most distros
(`apt install bashdb`). The CLI:

```bash
bashdb script.sh                       # start debugger
# inside:
break 42                               # set breakpoint
condition 1 $verbose                   # conditional
run                                    # start
step                                   # step into
next                                   # step over
continue                               # continue to next breakpoint
print VAR                              # show a variable's value
quit
```

For most bash debugging, `set -x` and a few `echo` statements
suffice. `bashdb` is overkill for short scripts but useful when
you've inherited a 2000-line monstrosity.

### Static analysis: `shellcheck`

Already covered in the strict-mode section. For debugging, run
`shellcheck` first — it catches a substantial fraction of bugs
(unquoted variables, wrong test syntax, dead code, mistakes in
parameter expansion) statically. Many "weird behavior" reports
become "shellcheck told us about this two weeks ago".

### A debugging checklist

When a script misbehaves:

1. Run `bash -n script.sh` — syntax check.
2. Run `shellcheck script.sh` — static linting.
3. Run `bash -x script.sh ARGS` — execution trace.
4. Add `set -x` near the suspected section.
5. Print variables with `declare -p VAR`.
6. Check `${PIPESTATUS[@]}` if a pipeline is involved.
7. Use `caller` inside a function to print the caller's location:
   `caller` prints `LINE FILE` of where the function was called.
8. Add an `ERR` trap that logs `$BASH_COMMAND` and `$LINENO`.
9. If the script uses `set -e` and "stops working" silently, check
   for the `set -e` exemptions (`if`, `||`, `&&`, pipelines).

