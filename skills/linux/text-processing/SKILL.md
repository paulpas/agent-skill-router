---





name: "text-processing"
description: Reference for regex, grep, sed, awk, and the UNIX filter toolbox — the stream-oriented text transformation tools designed to be composed in pipelines.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  triggers: grep, sed, awk, regex, text processing, regular expressions, how do i process text on the command line, pipeline filters
  role: reference
  scope: infrastructure
  output-format: code
  related-skills: bash-quick-reference,linux-cli-reference
  archetypes: educational
  anti_triggers: implement from scratch, architect a system, build infrastructure, design patterns
  response_profile:
    verbosity: high
    directive_strength: low
    abstraction_level: operational





---






# Text Processing — Quick Reference

Reference for regex, grep, sed, awk, and the UNIX filter toolbox — the stream-oriented text transformation tools designed to be composed in pipelines. Covers regular expressions, grep patterns, sed substitutions, awk field processing, and common recipes.

## When to Use

- Finding lines that match a pattern; printing them, counting them, or listing which files contain them
- Making line-by-line edits to a stream: substitution, deletion, insertion, simple address-based transformations
- Treating input as records broken into fields, computing on those fields, accumulating state across the stream, producing reports
- Translating, deleting, or squeezing individual characters in a byte stream
- Picking out columns by character offset or delimiter, re-ordering lines, projecting, or counting

## When NOT to Use

- For data types that aren't text streams (nested dicts, typed records) — use Python
- For regex-heavy work that exceeds sed/awk capabilities — use a general-purpose language with a proper regex library
- On Windows without WSL/Cygwin — use PowerShell or the appropriate native toolchain

## Mental model

UNIX text-processing tools assume your input is a stream of *records*
separated by *separators*. The default record is a line — that is, a
sequence of bytes terminated by a newline character. The default
separator is the newline. `awk` extends the model with the notion of
*fields* inside a record (the words of the line, normally), and with
input/output separators you can change. The other tools mostly take
the record-and-separator model as fixed.

Regex is the matching language all of the tools share, but each tool
makes different choices about which characters need escaping, which
metacharacters exist, and which dialect of regex is the default.
Knowing the dialect differences saves you from writing a pattern that
"works" in one tool and silently does nothing in another.

The other shared idea is composition. Pipelines (`|`) glue tools
together. The output of each stage becomes the input of the next.
A surprisingly large set of problems collapses into a five-stage
pipeline once you have the toolkit in your fingers. Most of this card
is about teaching that toolkit; the recipes section at the end shows
how the pieces combine.

A few conventions used throughout this card:

- Examples that read from a file write the filename literally; you
  can almost always replace the file argument with stdin from a pipe.
- Where a tool has a GNU vs. BSD difference (Linux vs. macOS), I'll
  call it out. macOS ships BSD versions of most of these utilities;
  installing GNU coreutils via Homebrew gives you the GNU variants
  prefixed with `g` (`gsed`, `gawk`, `gsort`, etc.).
- Where the locale matters (and it almost always does for character
  classes), I'll call that out too. Setting `LC_ALL=C` in a script
  is a standard discipline for getting byte-level, ASCII-only
  behaviour you can predict.
- I use `→` to mark the prompt in interactive examples, to keep the
  command and its output visually distinct.

---

## Regular expressions

A regular expression is a small language for describing patterns of
text. You don't write code; you write a pattern, and a tool somewhere
inside the program walks the pattern against your input and tells the
caller what matched. The patterns are made of two kinds of building
blocks: *literal characters* — letters, digits, punctuation that
match themselves — and *metacharacters* — special characters with a
non-literal meaning. The pattern `cat` literally matches the three
characters `c`, `a`, `t` in sequence; the pattern `c.t` uses the
metacharacter `.` to match any single character between `c` and `t`,
so it matches `cat`, `cot`, `c@t`, `c1t`, and so on.

The flexibility comes from the metacharacters. The cost is that you
have to know which metacharacters exist in your dialect, which need
escaping with a backslash, and which behave the same way across all
the tools.

### Why "regular expression" sometimes feels haunted

Regex was invented by mathematicians long before any of these tools
existed. The classical theory describes a small set of operations —
concatenation, alternation, and Kleene-star repetition. Real
implementations have accumulated extensions: bounded repetition,
character classes, anchors, backreferences, lookarounds, named
groups. Each tool decided independently which extensions to support
and which metacharacters to require backslash-escaping for. The
result is a family of dialects that mostly agree but disagree in
ways that hurt at exactly the wrong moments.

The dialects you'll meet on a typical Linux box, in roughly
chronological order:

- **BRE** — *Basic Regular Expressions*. The oldest dialect. The
  default for `grep`, `sed`, classical `ed`/`ex`/`vi`. Many of the
  metacharacters that other dialects make available with bare
  punctuation require a backslash here: `\(...\)` for grouping,
  `\{n,m\}` for bounded repetition, `\|` (in GNU only) for
  alternation, `\+` and `\?` (also GNU extensions) for "one or more"
  and "zero or one".
- **ERE** — *Extended Regular Expressions*. The dialect of `egrep`
  (or `grep -E`), `awk`, `sed -E` (or GNU `sed -r`). The grouping
  operator `(...)`, the alternation operator `|`, the quantifiers
  `+` and `?`, and the bounded repetition `{n,m}` work without
  backslashes. To match a literal grouping character or pipe, you
  backslash it.
- **PCRE** — *Perl-Compatible Regular Expressions*. The dialect of
  `grep -P`, `pcregrep`, ripgrep with `-P`/`--pcre2`, and most modern
  programming languages. Adds shortcuts (`\d`, `\w`, `\s`, and their
  uppercase complements), lookaround assertions (`(?=...)`,
  `(?!...)`, `(?<=...)`, `(?<!...)`), non-greedy quantifiers
  (`*?`, `+?`, `??`), named capture groups (`(?<name>...)`), inline
  options like case-insensitive `(?i)`, and a handful of features no
  other dialect has.
- **POSIX** — a standardised subset of BRE/ERE. Most of what works
  in POSIX works in everything; the POSIX *character classes* in
  particular (e.g. `[[:alpha:]]`) work in every modern tool and are
  the locale-correct way to write `[a-zA-Z]`.
- The **`awk` regex** is essentially ERE with a few extensions; it's
  a separate dialect only in the sense that `awk` decides how
  patterns are interpreted in the script-language context.

If you find yourself writing regex with a lot of backslashes (`\(`,
`\{`, `\|`, `\+`), switch to extended mode (`grep -E`, `sed -E`) and
the same pattern reads twice as cleanly. If your pattern needs
features the basic and extended dialects don't have — non-greedy,
lookarounds, `\d`/`\w` — switch to PCRE (`grep -P`, `pcregrep`, or
`rg -P`).

### The metacharacters in full

The list below is the union of the dialects, with notes on which
metacharacters are bare in which dialects and where escaping is
needed.

#### Match a single character

- `.` (dot) — match any single character. Matches a newline only in
  some implementations (BSD `awk` doesn't; GNU `awk` with `RS=""`
  does in some modes; `grep -P` with the `s`/`PCRE_DOTALL` flag
  does). Otherwise, the dot stops at the line boundary.
- `[abc]` — *character class*. Match any one of the listed
  characters. So `[abc]` matches `a`, `b`, or `c`.
- `[a-z]` — character class with a *range*. Match any character whose
  byte value falls between `a` and `z` inclusive. Combine ranges and
  literal characters: `[a-fA-F0-9_-]`. The hyphen is literal if it's
  the first character (`[-abc]`), the last character (`[abc-]`), or
  escaped (`[a\-c]`).
- `[^abc]` — *negated character class*. Match any one character that
  is **not** `a`, `b`, or `c`. The caret has to be the first
  character inside the brackets to do this; elsewhere it is literal.
- `[[:class:]]` — *POSIX character class*. The classes are
  `alnum`, `alpha`, `blank`, `cntrl`, `digit`, `graph`, `lower`,
  `print`, `punct`, `space`, `upper`, and `xdigit`. They live inside
  a bracketed expression: `[[:alpha:][:digit:]_]` matches one
  alphanumeric character or underscore. POSIX classes respect the
  locale, which in practice means `[[:alpha:]]` correctly includes
  accented characters in a UTF-8 locale where `[a-zA-Z]` does not.
- `\char` — *escape sequence*. Turn off the special meaning of
  `char`. So `\.` matches a literal dot, `\\` matches a literal
  backslash, `\$` matches a literal dollar sign.
- In PCRE only: `\d`, `\w`, `\s` and their negations `\D`, `\W`,
  `\S` are shortcuts for `[0-9]`, `[A-Za-z0-9_]`, and whitespace
  classes respectively. PCRE also has `\h` (horizontal whitespace),
  `\v` (vertical whitespace), and a long list of less common ones.

#### Match a position

- `^` — *start of line*. Match the position before the first
  character of a line. With multiline mode (PCRE `(?m)`) it matches
  at the start of each line within the input.
- `$` — *end of line*. Match the position before the line's
  newline. As with `^`, multiline mode makes it match at every
  line's end. Confusingly, in some `sed` implementations and inside
  `awk`'s string operations, `$` means end of string rather than
  end of line.
- `\<` — start of a word (GNU extension; not POSIX). Matches at the
  position immediately before a word character that is not preceded
  by a word character.
- `\>` — end of a word.
- `\b` — *word boundary*. Matches at the position between a word
  character and a non-word character (or at the beginning or end
  of the input). Available in PCRE and most modern regex engines.
- `\B` — *non-word-boundary*. The complement of `\b`.
- `\A`, `\Z`, `\z` (PCRE) — start of subject, end of subject /
  immediately before final newline, end of subject. These are
  useful when working on multi-line input where `^` and `$` would
  otherwise match at every line.

#### Quantifiers — repeat the previous atom

- `*` — match zero or more of the previous atom. Greedy: matches as
  much as possible.
- `+` — match one or more. (Bare in ERE/PCRE; backslash-escaped
  in BRE: `\+`.)
- `?` — match zero or one. (Bare in ERE/PCRE; `\?` in BRE.) Note
  that `?` in regex is *not* the same as `?` in shell globs — in
  globs, `?` means exactly one character. The regex equivalent
  for "any single character" is `.`.
- `{n}` — match exactly `n` times.
- `{n,}` — match `n` or more.
- `{n,m}` — match between `n` and `m` times. Note: `{,m}` (no lower
  bound) is **not** valid in standard regex; you must write `{0,m}`.
- In PCRE: append `?` to any quantifier to make it *non-greedy* —
  match as few as possible. So `<.*?>` matches the shortest run of
  characters between `<` and `>`, where `<.*>` greedily extends to
  the last `>` on the line.

#### Combine and group

- `|` — *alternation*. Match either of two patterns. (Bare in
  ERE/PCRE; `\|` in GNU BRE only.) Alternation has the lowest
  precedence of any operator, so `red|blue plate` matches either
  `red` or `blue plate`, not "either red or blue followed by plate";
  use parentheses for that.
- `(...)` — *group*. Treat the contained pattern as one atom for the
  purposes of quantifiers and alternation, and capture the matched
  text for backreferences and replacement. (Bare in ERE/PCRE; `\(`
  and `\)` in BRE.)
- `(?:...)` — *non-capturing group* (PCRE). Group without saving
  the match for later. Useful when you need grouping for precedence
  but don't need the captured text.
- `\1`, `\2`, … `\9` — *backreference*. Inside the same regex,
  match exactly the text that was captured by the corresponding
  `(...)`. Useful for "find a line where two of the same word
  appear", for matching balanced delimiters at a fixed depth, and
  for finding repeated tokens. POSIX limits backreferences to
  `\1`–`\9`; PCRE allows more.

#### Replacement-side metacharacters (sed and friends)

When you write a replacement pattern (the right-hand side of `s/.../.../`
in `sed`, ex/vi, and similar tools), a different set of metacharacters
applies:

- `&` — substitute the entire match. Useful for adding a wrapper:
  `s/.*/( & )/` puts every line in parentheses.
- `\1`, `\2`, … — substitute capture group N. So
  `s/(\w+) (\w+)/\2 \1/` swaps the first two words on a line.
- `\u`, `\l` — uppercase/lowercase the next character.
- `\U`, `\L` — uppercase/lowercase until `\E`.
- `\E` — end the case-translation mode.

The replacement side is **not** a regex — `.` and `*` and `(` are all
literal there. The only specials are `&`, `\1`–`\9`, the
case-translation escapes, and `\&` to write a literal `&`.

### Dialect comparison table

A practical tabular summary, since dialect surprises are the largest
single source of regex bugs.

| Feature | BRE (default `grep`, `sed`) | ERE (`grep -E`, `sed -E`, `awk`) | PCRE (`grep -P`, `pcregrep`, `rg -P`) |
| --- | --- | --- | --- |
| `.` (any char) | Yes | Yes | Yes |
| `*` | Yes | Yes | Yes |
| `+` | `\+` (GNU only) | Yes | Yes |
| `?` | `\?` (GNU only) | Yes | Yes |
| `{n,m}` | `\{n,m\}` | `{n,m}` | `{n,m}` |
| Grouping | `\( \)` | `( )` | `( )` |
| Alternation | `\|` (GNU only) | `\|` | `\|` |
| Backreferences | `\1`–`\9` | `\1`–`\9` | full PCRE |
| `\b` word boundary | `\<` `\>` (GNU) | `\<` `\>` (some) | `\b` |
| `\d` `\w` `\s` shortcuts | No | No | Yes |
| Lookaround `(?=…)` etc. | No | No | Yes |
| Non-greedy `*?` `+?` | No | No | Yes |
| Named groups | No | No | Yes |
| POSIX classes `[[:alpha:]]` | Yes | Yes | Yes |

A useful working rule: write your pattern in ERE first (with `-E`) so
the operators read cleanly; reach for PCRE only when you need
something ERE doesn't have.

### Worked examples for each metacharacter

The patterns below are the kind of small, immediately recognizable
examples that build intuition. They'll work in any of `grep -E`,
`egrep`, or as `awk`/`sed -E` patterns unless noted.

| Pattern | Matches |
| --- | --- |
| `bag` | the literal string `bag` anywhere on a line |
| `^bag` | `bag` at the start of a line |
| `bag$` | `bag` at the end of a line |
| `^bag$` | a line consisting of exactly `bag` |
| `[Bb]ag` | `Bag` or `bag` |
| `b[aeiou]g` | three-letter word with a vowel in the middle |
| `b[^aeiou]g` | three-letter word with a non-vowel in the middle (consonant, digit, symbol, uppercase, …) |
| `b.g` | three-letter word with any second character |
| `^...$` | any line that contains exactly three characters |
| `^\.` | any line that begins with a literal dot |
| `^\.[a-z][a-z]` | a leading dot followed by two lowercase letters (the historical `troff` request convention) |
| `^[^.]` | any line that doesn't begin with a dot |
| `bugs*` | `bug`, `bugs`, `bugss`, … (the `s` repeats zero or more times) |
| `[A-Z]+` | one or more uppercase letters (ERE) |
| `[[:upper:]]+` | same, locale-aware |
| `[A-Z].*` | uppercase letter followed by anything |
| `[A-Z]*` | zero or more uppercase letters (matches the empty string at the start of every line — usually a bug) |
| `[a-zA-Z]` | any letter |
| `[^0-9A-Za-z]` | any non-alphanumeric (a sloppy "punctuation or whitespace" filter) |
| `[^[:alnum:]]` | the same with POSIX classes |
| `[567]` | one of the digits 5, 6, or 7 |
| `five\|six\|seven` | one of the words five, six, seven (ERE) |
| `80[2-4]?86` | 8086, 80286, 80386, or 80486 |
| `compan(y\|ies)` | company or companies (ERE) |
| `\<the` | a word starting with `the` — `theatre`, `there`, `thespian`, `the` |
| `the\>` | a word ending with `the` — `breathe`, `seethe`, `the` |
| `\<the\>` | the standalone word `the` |
| `0\{5,\}` | five or more zeros in a row (BRE) |
| `0{5,}` | same, ERE |
| `[0-9]\{3\}-[0-9]\{2\}-[0-9]\{4\}` | a US Social Security number `nnn-nn-nnnn` (BRE) |
| `\(why\).*\1` | a line containing two occurrences of `why` (BRE) — backreference |
| `(why).*\1` | same, ERE |

A pattern like `[A-Z]*` matches the empty string at the start of every
line, so `grep -E '[A-Z]*' file` prints every line. That's almost
never what you want; use `[A-Z]+` instead.

### Quoting regex on the command line

The shell sees your command line first. Unquoted, the shell will
expand `*`, `?`, `[…]` as filename globs and substitute `$VAR`,
`` `cmd` ``, `$(cmd)` for environment variables and command
substitution. Almost every regex character that isn't a literal
letter is a shell metacharacter too. So **always** quote regex on
the command line, with one of these two strategies:

- **Single quotes** `'…'` are the safest choice. Inside single
  quotes, every character is literal (you cannot write a single
  quote inside single quotes; concatenate strings if you need to:
  `'it'\''s'`). Use single quotes whenever your pattern contains
  any metacharacter.
- **Double quotes** `"…"` allow the shell to expand `$VAR`, `` `cmd` ``,
  and `$(cmd)` inside the pattern. Use double quotes when you
  *want* an environment variable expanded into the pattern, and
  single quotes otherwise.

```bash
grep 'pattern with $literal dollar' file       # safe
grep "pattern with literal $USER's home" file  # interpolated
grep `whoami` file                              # bad: backticks run a command
```

If your pattern contains a literal single quote and a literal dollar
sign and an interpolated variable all at once, build it with mixed
quoting:

```bash
grep 'username:'"$USER"' has logged in' /var/log/auth.log
```

Each chunk is its own quoted string, the shell concatenates them at
parse time, and `grep` sees one well-formed pattern argument.

### Regex precedence

Regex operators have a precedence order, like arithmetic operators.
Highest first:

1. **Repetition** (`*`, `+`, `?`, `{n,m}`).
2. **Concatenation** (atoms placed adjacent to one another, with no
   visible operator).
3. **Alternation** (`|`).

So `pat{2}ern|red` reads as `(pat){0}` — wait, let me write that
correctly: it reads as `(pat[t]{2}ern) | red`, i.e. "the string
`pattern`" or "the string `red`". Repetition binds first to the
preceding atom (the second `t`), then the result is concatenated with
`pat` and `ern`, then alternation is applied between that whole and
`red`.

Use parentheses to override the precedence:

- `(pat){2}ern|red` matches `patpatern` or `red`. Grouping forces
  the repetition to apply to the whole word `pat`.
- `pat{2}(ern|red)` matches `pattern` or `pattred`. Grouping forces
  the alternation to apply only to the suffix.

Even when you don't strictly need the parens, they often help
readability. The cost is one capture group per parenthesised
sub-pattern, which can affect backreference numbering — use a
non-capturing group `(?:...)` (PCRE only) if the captures are
distracting.

### Long patterns over multiple lines

The shell does not insist on the regex fitting on one input line. As
long as your opening quote isn't closed, you can press Enter and the
shell will give you a continuation prompt:

```
$ grep 'patt
> ern' file
```

You can also use multiple adjacent quoted strings to break up a long
pattern:

```bash
grep 'first-half-'"$VAR"'-second-half' file
```

Both are legitimate. For genuinely long patterns, store the pattern
in a file and use `grep -f patterns.txt` (one pattern per line);
this is by far the cleanest approach for production scripts.

---

## grep — find lines that match

`grep` is the simplest of the big three text tools. It reads input,
applies a regex to each line, and either prints lines that match or
prints lines that don't, depending on the flags. Almost everything
else `grep` does is a control over how the output looks — adding
filenames, line numbers, byte offsets, surrounding context, color,
and so on.

The name `grep` is an acronym for *Global Regular Expression Print*.
Its lineage is the `g/re/p` command of the line editor `ed`: do this
operation `g`lobally, on every line that matches a `re`gular
expression, and `p`rint the result. The standalone command was
invented at Bell Labs in 1973 and has been in continuous use longer
than most people working today have been alive. The behaviour you
type into a terminal in 2025 is in the same spiritual family as the
behaviour Brian Kernighan typed into a PDP-11 fifty years ago.

### The four flavors of grep

GNU `grep` is, internally, four different pattern-matching engines
selected by command-line flags:

| Invocation | Aliases | Engine | Default? |
| --- | --- | --- | --- |
| `grep` | `grep -G` | Basic regular expressions (BRE) | Yes |
| `grep -E` | `egrep` | Extended regular expressions (ERE) | |
| `grep -F` | `fgrep` | Fixed strings, no regex | |
| `grep -P` | (no alias) | Perl-Compatible Regular Expressions (PCRE) | |

The "BRE" default is historical and stays for compatibility. In
practice you almost always want either `grep -E` (the modern
default-of-choice for command-line work) or `grep -F` (when you have
a literal substring and don't want any character to be special).
`grep -P` exists when you need PCRE features like lookaround or
non-greedy quantifiers; on systems where `grep` was built without
PCRE support, `pcregrep` is the equivalent.

The four flavors share their command-line options. The only thing
that changes between them is how the *pattern argument* is
interpreted. Most of the rest of this section talks about flags
that work with any of them.

### The two ways to invoke grep

```bash
grep pattern file
cat file | grep pattern
```

The first form scans `file` for the pattern and prints matching
lines. The second form reads stdin (the output of `cat`, in this
example) and does the same. The two are equivalent here because
`cat` is just a passthrough — most of the time, you want the form
that pipes a non-trivial command's output into `grep`:

```bash
ps -ef | grep nginx
journalctl -u sshd | grep -i 'failed password'
```

`grep` with no file arguments and no piped input will sit and read
from your terminal, repeating any line back to you that matches.
Press Ctrl-D to send EOF and exit. This is occasionally useful for
testing a pattern interactively.

If `grep` has no matches at all in any of its inputs, it exits with
status 1. If it had a problem (a missing file, a permission error),
it exits with status 2. Otherwise it exits 0. This makes `grep -q`
useful in conditionals:

```bash
if grep -q '^WARNING' /var/log/app.log; then
  alert_oncall
fi
```

### Match-control flags (which lines match)

These flags change which lines `grep` considers a match. They work
identically across `grep`, `grep -E`, `grep -F`, and `grep -P`.

- `-e PATTERN`, `--regexp=PATTERN` — explicitly mark an argument as
  the pattern. Useful in two cases: when the pattern starts with
  `-` (which would otherwise look like an option), and when you want
  to supply multiple patterns. Each `-e` adds one pattern; matches
  for any of them are kept.

  ```bash
  grep -e -style doc.txt          # search for the literal "-style"
  grep -e error -e warning log    # find error OR warning
  ```

- `-f FILE`, `--file=FILE` — read patterns from a file, one per
  line. Patterns are additive; a line is kept if any pattern in
  the file matches.

  ```bash
  grep -f bad-tokens.txt access.log
  ```

  This is the right way to maintain a long, version-controlled
  list of patterns. An empty patterns file matches nothing.

- `-i`, `--ignore-case` — match without regard to case. Affects
  bracket classes too (`[A]` and `[a]` become equivalent). The old
  synonym `-y` exists but is deprecated.

- `-v`, `--invert-match` — invert the sense of matching. Print the
  lines that don't match. Combine with `-c` to count
  non-matching lines, with `-l` to list files that contain no
  matches, and so on.

- `-w`, `--word-regexp` — match only when the pattern matches a
  whole word. Letters, digits, and `_` are word characters; any
  other character or end-of-line is a word boundary. Equivalent to
  surrounding the pattern with `\b`.

  ```bash
  grep -w 'is' poem.txt   # matches "is" but not "this" or "island"
  ```

- `-x`, `--line-regexp` — match only when the pattern matches an
  entire line. Useful for line-by-line set operations and for log
  records you want to anchor exactly.

- `-m N`, `--max-count=N` — stop reading a file after `N` matching
  lines. Especially useful for "is this thing in there?" probes on
  large files. With `-c`, you get at most `N` reported as the count.

### Output-control flags (what gets printed)

- `-c`, `--count` — instead of matching lines, print the count.
  With multiple input files, prints `filename:count` per file.
  With `-v`, counts non-matching lines.

- `-l`, `--files-with-matches` — print only the names of files that
  contain a match. Stops scanning each file at the first match
  ("lazy matching"), which makes it fast over large trees.

- `-L`, `--files-without-match` — the opposite: print only the names
  of files with **no** match.

- `-o`, `--only-matching` — print only the matching part of each
  line, not the whole line. Combine with `-E` and a careful pattern
  to extract just the data you want:

  ```bash
  grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' access.log   # IPs
  grep -oE '\b[A-Z][a-zA-Z]+\b' notes.txt              # capitalised words
  ```

  Because `-o` prints each match on its own line, it's the natural
  feeder into `sort | uniq -c | sort -rn` for frequency counts.

- `-q`, `--quiet`, `--silent` — print nothing; convey the answer
  through the exit status. The right tool for `if`-conditions in
  scripts.

- `-s`, `--no-messages` — suppress error messages about missing or
  unreadable files. Tempting in scripts, but it suppresses real
  problems too — use sparingly.

- `--color[=WHEN]`, `--colour[=WHEN]` — colourise the matching part
  of each line. `WHEN` is `auto` (default when used as an alias),
  `always`, or `never`. The colour is configurable through the
  `GREP_COLORS` environment variable. Most distributions alias
  `grep` to `grep --color=auto` so colour just works for
  interactive use and disappears in pipelines.

### Output-prefix flags (filename, line number, byte offset)

- `-n`, `--line-number` — prefix each printed line with its
  one-indexed line number. Indispensable when you'll want to jump
  to that line in an editor.

- `-H`, `--with-filename` — prefix each printed line with the file's
  relative path. Default when more than one file is being scanned.
- `-h`, `--no-filename` — suppress the filename prefix even when
  multiple files are being scanned.

- `-b`, `--byte-offset` — print the byte offset (zero-indexed) of
  each match. Combined with `-o`, prints the offset of the matching
  text rather than the start of the line. Useful for binary
  scanning and patch construction; less so for everyday use.

- `--label=LABEL` — when reading stdin, prefix lines with `LABEL`
  instead of `(standard input)`. Useful when piping decompressed
  files into `grep` and you want the original filename to show up.

  ```bash
  zcat access.log.gz | grep --label=access.log -nH 'POST /admin'
  ```

- `-T`, `--initial-tab` — insert a tab between the prefix and the
  matching line, so columns align nicely.

- `-Z`, `--null` — write a NUL byte after each filename instead of
  a newline. Pair with `xargs -0` to safely handle filenames with
  newlines or other oddities.

### Context-control flags (lines around the match)

- `-A N`, `--after-context=N` — print N lines following each match.
- `-B N`, `--before-context=N` — print N lines preceding each match.
- `-C N`, `-N`, `--context=N` — print N lines on either side. The
  bare `-N` form (e.g. `-3`) is a synonym.

A `--` separator is inserted between non-overlapping context groups,
so you can tell where one cluster of matches ends and the next
begins. These flags are invaluable for log analysis and for reading
matches in their natural neighbourhood:

```bash
grep -B3 -A5 'panic:' kernel.log
grep -C2 'TODO' src/**/*.go
```

### File and directory flags

- `-r`, `-R`, `--recursive` — descend into directories. The two
  flags are subtly different in some implementations (one follows
  symlinks, one doesn't); the GNU version makes them aliases. Use
  this for "search a tree".

- `--include=GLOB` — when recursive, only consider files whose
  basename matches `GLOB`. Multiple `--include` options are
  additive.

- `--exclude=GLOB` — the opposite. Skip files whose basename
  matches.

- `--exclude-from=FILE` — read exclusion globs from a file, one per
  line. The right way to maintain a long ignore-list.

- `--exclude-dir=DIR` — skip directories whose name matches `DIR`.
  Standard incantation for "search the project, skip generated and
  vendored code":

  ```bash
  grep -rE --exclude-dir='{node_modules,.git,build,dist}' \
       'TODO|FIXME|XXX' .
  ```

- `-d ACTION`, `--directories=ACTION` — when `grep` is given a
  directory as a non-recursive argument, what should it do? `read`
  treats the directory like a file (typically nonsense), `recurse`
  makes it act like `-r`, `skip` quietly skips the directory.

- `-D ACTION`, `--devices=ACTION` — what to do with FIFOs, sockets,
  device nodes. `read` reads them (default); `skip` skips. The
  default-read behaviour can hang `grep` on a special file that
  doesn't EOF, so `--devices=skip` is sometimes prudent for
  filesystem-wide scans.

- `-a`, `--text` — treat binary files as text. Equivalent to
  `--binary-files=text`. By default, `grep` detects binary files
  and prints `Binary file FOO matches` instead of the matching
  lines. With `-a`, you get the matching bytes regardless. Be
  prepared for the terminal to misbehave if non-printable bytes
  reach it; `tput reset` will rescue you.

- `--binary-files=TYPE` — explicit control. `binary` is the
  detection-and-summary default; `text` is `-a`; `without-match`
  treats binary files as if they had no matches, which is sometimes
  what you want when scanning a tree of mixed content.

- `-I` (capital i) — shorthand for `--binary-files=without-match`.

- `--include` / `--exclude` together compose well: include `*.py`,
  exclude `*.pb.py`, exclude-dir `tests`, and you've defined a
  scope.

### Other useful flags

- `-z`, `--null-data` — treat input as NUL-separated rather than
  newline-separated. Pairs with `find -print0`.

- `--line-buffered` — flush output after every line. Default
  behaviour buffers in larger chunks for throughput; line buffering
  costs throughput but makes `tail -f LOG | grep` give you
  match-by-match output instead of waiting for the buffer to fill.

- `-V`, `--version` — print version and exit.

- `--help` — print a flag summary and exit.

### A short atlas of common grep recipes

```bash
# count matches in a file
grep -c 'pattern' file

# count files (not lines) that match
grep -lr 'pattern' src | wc -l

# only print the matching part
grep -oE '[0-9]+' notes.txt

# match in any of three files
grep -E 'foo|bar|baz' file1 file2 file3

# search a tree, only Python, exclude tests and venv
grep -rnE --include='*.py' --exclude-dir='tests' --exclude-dir='.venv' \
     'TODO|FIXME' .

# follow a log file, highlight your service's errors
tail -F /var/log/syslog | grep --line-buffered -E 'sshd.*Failed|sudo.*FAIL'

# files that contain BOTH foo AND bar
grep -lZ foo *.txt | xargs -0 grep -l bar

# show three lines of context
grep -C3 'panic:' kernel.log

# IPv4 addresses anywhere in a logfile
grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' access.log | sort -u

# strip comments and blank lines from a config
grep -Ev '^\s*(#|$)' /etc/ssh/sshd_config

# find files that DO NOT contain a marker
grep -L 'Copyright' src/**/*.c

# how many of my commits mention 'fix'
git log --format='%s' | grep -c -iE 'fix|bug|issue'
```

### grep -F (fgrep): fixed strings

`grep -F` (or its alias `fgrep`) interprets the pattern as a literal
string with no metacharacter interpretation. This has three
practical consequences:

1. You don't have to escape regex metacharacters. `grep -F '$0.99'`
   matches the literal price tag without any thought.
2. Multiple patterns are common: with `-F`, you can use `-e
   pattern1 -e pattern2` or supply patterns one per line via `-f`.
   The match is "any of these literal strings".
3. It's faster than the regex engines because it can use a string
   matching algorithm (typically Aho-Corasick) instead of a
   pattern-matching state machine.

Use `-F` whenever your pattern is genuinely a literal string. It's
the right choice for log-watching scripts that look for known marker
strings, for searching by exact identifiers (UUIDs, message-IDs,
URLs), and for anywhere user input would otherwise be parsed as
regex.

```bash
fgrep -lr 'AKIA0123456789EXAMPLE' /home              # leaked AWS key audit
fgrep -f known-bad-tokens.txt access.log
fgrep -F MESSAGE-ID-1234@example.com /var/mail
```

The flags listed earlier mostly all work with `-F`. The ones that
don't make sense (anything that interprets a regex pattern, like
`-w`'s "word" definition) still apply; in `-F` mode they apply to
the literal pattern.

### grep -E (egrep): extended

`grep -E` and the alias `egrep` are the same command. The pattern is
interpreted as ERE — `?`, `+`, `(...)`, `{n,m}`, and `|` are bare
metacharacters. This is the dialect almost everyone wants for
day-to-day use: it reads more naturally than BRE, supports the
features programmers expect, and works on every Unix.

```bash
grep -E 'colou?r' marketing.txt           # color or colour
grep -E 'p(at|et)tern' file               # pattern or pettern
grep -E '^[A-Z][a-z]+ [A-Z][a-z]+$' names # "First Last"
grep -E '^[0-9]{3}-[0-9]{2}-[0-9]{4}$' ssns
grep -E 'pattern1+'                       # pattern1, pattern11, …
```

### grep -P: PCRE-flavoured grep

`grep -P` is the most powerful and the most complicated. It uses
the `libpcre` (or `libpcre2`) library, which gives you the full
PCRE feature set:

- Shortcuts for common character classes: `\d` (digit), `\D` (non-digit),
  `\w` (word char), `\W` (non-word char), `\s` (whitespace),
  `\S` (non-whitespace), and a long tail of less common ones.
- Lookarounds: `(?=...)` (positive lookahead — the position is
  followed by ...), `(?!...)` (negative lookahead), `(?<=...)`
  (positive lookbehind), `(?<!...)` (negative lookbehind). These
  let you match positions defined by surrounding context without
  consuming the context.
- Non-greedy quantifiers: `*?`, `+?`, `??`, `{n,m}?`.
- Inline option flags: `(?i)` makes the rest of the pattern
  case-insensitive; `(?m)` enables multiline mode (so `^` and `$`
  match at every embedded newline); `(?s)` makes `.` match newline;
  `(?x)` enables verbose mode (whitespace ignored, `#` introduces
  comments).
- Named capture groups: `(?<year>\d{4})-(?<month>\d{2})`.
- Octal `\nnn` and hex `\xnn` byte literals; `\x{...}` for multi-byte
  hex.
- Character properties: `\p{L}` matches any letter,
  `\p{Greek}` matches any Greek character, `\P{N}` matches anything
  that is not a number. Requires that PCRE was built with Unicode
  property support.

```bash
# match a date with named groups, print only the year
grep -oP '(?<year>\d{4})-\d{2}-\d{2}' log

# IP addresses, but only when they appear at the start of a line
grep -P '(?m)^\d{1,3}(\.\d{1,3}){3}' log

# words that appear twice in a row
grep -P '\b(\w+)\b\s+\1\b' notes.txt

# match a comment-style "TODO:" but not within a string literal
grep -P '(?<!")TODO:' src/**/*.py

# multiline match across two lines
grep -Pzo '(?s)BEGIN.*?END' file
```

The `-Pz` combination above (with `(?s)` to make `.` match newlines)
is the canonical PCRE recipe for matching across line boundaries.

`grep -P` is more expensive than the other engines and can have
catastrophic backtracking on pathological patterns. For large
log-scanning, `grep -E` or `grep -F` is usually the right call;
reach for `-P` when you genuinely need PCRE features.

### Some grep is not GNU grep: the BSD/macOS gotchas

- macOS ships BSD `grep`. It supports `-E`, `-F`, and `-G`, plus
  most of the GNU output-control flags, but not `-P`. For PCRE on
  macOS, install `pcre2` (or `pcregrep`) via Homebrew, or
  `brew install grep` and use `ggrep`.
- BSD `grep` is slower than GNU `grep` on large inputs. On a busy
  Mac with a multi-gigabyte log, the speedup from GNU `grep` is
  meaningful.
- A handful of long options differ in name. When in doubt, prefer
  the short forms (`-l`, `-r`, `-i`, etc.) which are universal.

### ripgrep (`rg`): the modern alternative

For tree-wide searches, `ripgrep` (binary `rg`) is significantly
faster than `grep -r`, has saner defaults (recursive by default,
respects `.gitignore`, skips binary files, colourises hits), and
supports PCRE2 with `-P`. Most flags are recognisable: `rg -i
'pattern'`, `rg -F 'literal'`, `rg -tpy 'pattern'` (Python only),
`rg -A2 -B2 'pat'`. It is not POSIX-standard but is in every modern
distribution's package archive and on every developer's machine you
will share a project with.

### grep environment variables

A handful of environment variables affect `grep`'s behaviour. They
are convenient for scripting and for personal customisation.

- `GREP_OPTIONS` — historically, you could set default flags here.
  Modern GNU `grep` deprecates this and prints a warning when it
  sees the variable. Don't use it; alias `grep` in your shell rc
  instead.
- `GREP_COLORS` — controls the colours used by `--color`. The
  default looks like:

  ```
  GREP_COLORS='ms=01;31:mc=01;31:sl=:cx=:fn=35:ln=32:bn=32:se=36'
  ```

  Each two-letter token is a category, and the digits are ANSI SGR
  parameters: `ms` (matching string), `mc` (matching context),
  `sl` (selected line), `cx` (selected context), `fn` (filename),
  `ln` (line number), `bn` (byte number), `se` (separator).

- `LC_ALL`, `LC_COLLATE`, `LC_CTYPE`, `LC_MESSAGES`, `LANG` — the
  standard locale variables. They affect what `[a-z]` matches,
  what `[[:alpha:]]` matches, and what language `grep`'s own error
  messages appear in. For predictable byte-level matching in
  scripts, `LC_ALL=C` is the standard discipline.

- `POSIXLY_CORRECT` — when set, `grep` follows POSIX.2 strictly,
  which mostly affects how it parses options that come after
  filenames. Off by default.

---

## sed — the stream editor

`sed` reads input one line at a time, applies a script of editing
commands to each line, and writes the result to standard output. The
"stream" in stream editor is the key idea: `sed` is meant to sit
between two pipes, transforming text as it flows by, never holding
the whole file in memory.

This makes `sed` ideal for non-interactive bulk edits — fixing
configuration files in a script, applying the same find-and-replace
across many files, normalising data on its way to another tool.
Anywhere you'd open a file in an editor, hit `:%s/foo/bar/g`, and
save, you can put `sed -i 's/foo/bar/g' file` in a script and have
the edit happen the same way every time.

### How sed actually works

Internally, `sed` maintains two buffers: a **pattern space**, which
is normally one input line, and a **hold space**, an empty buffer
you can use as scratch storage. The basic loop looks like this:

1. Read the next line of input into the pattern space (replacing
   what was there).
2. Walk through the script. For each command:
   - Check whether the command's address matches the current line.
     If not, skip the command.
   - If it matches, apply the command. Some commands modify the
     pattern space; others read more input, write to the hold space,
     write to a file, or branch elsewhere in the script.
3. Once the script is done with this line, print the pattern space
   to standard output (unless `-n` was given) and go to step 1.

That's it. The fact that `sed` keeps a separate hold space and
allows branching gives it surprising power for a tool that mostly
looks like a `s/old/new/` substitution helper, but the
substitution-helper view is the right starting point.

### Command-line invocation

```bash
sed [-n] [-E] [-i[ext]] [-e 'cmd'] [-e 'cmd'] [-f scriptfile] [files...]
```

- With no `file` argument, `sed` reads from stdin. With one or more
  files, it reads them in order.
- `-e CMD` adds one command to the script. You can repeat `-e` to
  build up a multi-command script. With a single command, `-e` is
  optional: `sed 's/foo/bar/' file` and `sed -e 's/foo/bar/' file`
  are equivalent.
- `-f SCRIPT` reads commands from a file, one per line. Useful for
  long, version-controlled scripts.
- `-n` suppresses the automatic print step. With `-n`, only lines
  explicitly printed by a `p` command (or the `p` flag of `s`) end
  up in the output. This is the way to write `sed` "filter" scripts
  that emit only what they choose.
- `-E` (some implementations: `-r`) selects ERE for pattern matching.
  This is hugely worth using; it removes most of `sed`'s backslash
  noise. GNU `sed` supports both `-E` and `-r`; macOS BSD `sed`
  supports `-E`.
- `-i` edits files in place. With `sed -i 's/.../.../' file`, the
  file is modified directly. GNU `sed` accepts an optional backup
  suffix as the next character: `sed -i.bak 's/foo/bar/' file`
  saves a backup at `file.bak`. BSD `sed` (macOS) **requires** the
  suffix argument: `sed -i '' 's/foo/bar/' file` to edit without a
  backup. The portable form `sed -i.bak ...` works on both.

### Anatomy of a sed command

```
[address1[,address2]][!]command [arguments]
```

- The optional `address` (or paired `address1,address2`) restricts
  the command to certain lines.
- `!` after the address inverts: "apply on lines that do *not*
  match this address".
- `command` is one of `sed`'s small set of single-letter commands.
- `arguments` are command-specific.

Commands without an address apply to every line.

### Addresses

An address can be:

- A **line number**: `5d` deletes line 5.
- The end-of-input symbol `$`: `$d` deletes the last line.
- A **regex** between slashes: `/^#/d` deletes lines that start with
  `#`. The slash delimiters can be replaced with any character if
  you put a backslash before the first one: `\|^|d` is the same.
  Useful when your pattern itself contains slashes.
- Two of the above, comma-separated, for a range: `5,10d` deletes
  lines 5 through 10. `/begin/,/end/d` deletes from the first line
  matching `/begin/` through the next line matching `/end/`,
  inclusive. The end address is checked starting at the line after
  the start matched, so `/foo/,/foo/` sweeps the file in chunks.
- GNU `sed` extends this with `0~step`, `addr~step` (every Nth
  line), and `addr,+N` (from `addr` and the next N lines).

The address-matching rule is the source of `sed`'s expressive power.
With `0,/pattern/` you can target "everything up to the first
match"; with `/pattern/,$` you can target "from the first match to
the end".

### The substitute command

`s` is the workhorse. The syntax is:

```
[address]s/pattern/replacement/flags
```

- The delimiter is normally `/`, but any character works:
  `s|http://|https://|g` lets you avoid backslashing slashes inside
  URLs. The delimiter cannot appear unescaped in either the pattern
  or the replacement.
- `pattern` is a regex (BRE by default, ERE with `-E`).
- `replacement` is a literal string with three special tokens: `&`
  is replaced by whatever the pattern matched, `\1`–`\9` are
  replaced by the corresponding capture groups, and `\n` is a
  literal newline (in some implementations only).
- `flags` modify behaviour:
  - `g` — replace **all** occurrences on the line, not just the
    first.
  - A number `N` — replace only the Nth occurrence on the line.
  - `gN` — replace the Nth and all subsequent occurrences.
  - `p` — if the substitution succeeds, print the resulting line.
    Pair with `-n` to print only modified lines.
  - `i` (GNU) — case-insensitive matching.
  - `w FILE` — if the substitution succeeds, write the line to
    FILE.
  - `e` (GNU) — execute the resulting line as a shell command.

```bash
sed 's/old/new/' file              # first match per line
sed 's/old/new/g' file             # every match
sed 's/old/new/2' file             # second match per line
sed -i 's/old/new/g' *.conf        # in-place across files
sed -i.bak 's/old/new/g' file      # in-place + backup (portable)
sed -E 's/foo|bar/X/g' file        # ERE: alternation without \|
sed 's|http://|https://|g' file    # change delimiter to avoid escaping
```

Common substitution idioms:

```bash
sed 's/.*/( & )/'                          # wrap each line in parens
sed 's/.*/mv & &.old/'                     # turn a list of files into a script
sed -E 's/(\w+) (\w+)/\2 \1/'              # swap first two words
sed 's/[[:space:]]*$//'                    # strip trailing whitespace
sed -E 's/^[[:space:]]+//'                 # strip leading whitespace
sed -E 's/[[:space:]]+/ /g'                # collapse runs of whitespace
sed 's|/var/log|/srv/logs|g' /etc/rsyslog.conf
sed -E 's/^([0-9]+) /Item \1: /'           # turn a leading number into a label
sed 's/^/    /' file                       # indent every line by four spaces
sed -E 's/<[^>]+>//g'                      # strip HTML tags (naive)
sed -E 's/\s+#.*$//'                       # strip end-of-line shell comments
```

The case-translation escapes `\u`, `\U`, `\l`, `\L`, `\E` are
available in GNU `sed`:

```bash
echo hello | sed 's/.*/\U&/'                       # HELLO
echo "hi there" | sed -E 's/(\w+) (\w+)/\u\1 \u\2/' # Hi There
echo HELLO | sed 's/.*/\L&/'                        # hello
```

### Other sed commands worth knowing

`s` will be 90% of your `sed` use. The rest of the command set is
worth learning for the remaining 10%.

#### Print and quit

- `p` — print the pattern space. Combined with `-n`, this is how
  you make `sed` act like a programmable `head`: `sed -n '5,10p'`
  prints lines 5 through 10.
- `q [N]` — quit. With an optional numeric argument, sets the
  exit status. `sed '/pattern/q'` prints up to and including the
  first match, then exits.
- `Q [N]` (GNU) — quit without printing the current line.
- `=` — print the line number on its own line, before the line
  itself.

```bash
sed -n '5p' file                  # print just line 5
sed -n '5,10p' file               # lines 5 through 10
sed -n '/start/,/end/p' file      # everything between start and end
sed -n '/foo/=' file              # line numbers of lines containing foo
sed '/^DONE$/q' file              # print up to and including DONE
sed '100q' file                   # like head -100, with a tiny twist
```

#### Delete and skip

- `d` — delete the pattern space. Skip the rest of the script and
  start over with the next input line.
- `D` — delete up to the first embedded newline in the pattern
  space; restart the script *without* reading new input. Mostly
  useful in combination with `N` for multi-line work.
- `n` — print the pattern space (unless `-n`), then read the next
  input line into it and continue with the next command.
- `N` — append the next input line to the pattern space, separated
  by an embedded newline.

```bash
sed '/^#/d' file                # remove comment lines
sed '/^$/d' file                # remove blank lines
sed '1,5d' file                 # remove the first five lines
sed '1d' file                   # remove the header
sed '$d' file                   # remove the last line
sed '/foo/,/bar/d' file         # remove the foo..bar block, inclusive
sed '/^DONE$/,$d' file          # remove from "DONE" to end of file
sed '/foo/,/bar/!d' file        # KEEP only the foo..bar block
```

#### Insert, append, change

- `a\` — append text after the current line. Followed by the text
  on the next line; if the text spans more than one line, escape
  intervening newlines with backslash.
- `i\` — insert text before the current line.
- `c\` — replace the current line (or address range, treated as a
  block) with text.

GNU `sed` accepts the shorter `a TEXT`, `i TEXT`, `c TEXT` forms
without the trailing backslash, but the portable form is the
backslash-followed-by-newline syntax.

```bash
# add a header
sed '1i\
# generated, do not edit by hand' file

# add a trailing line
sed '$a\
# end of file' file

# replace the first line with a new header
sed '1c\
new header here' file

# add CSV header before processing
sed '1i\
id,name,email' data.csv
```

#### Hold space

The hold space is a separate buffer, initially empty. Five commands
move data between pattern space and hold space:

- `h` — copy pattern space to hold space (overwriting).
- `H` — append pattern space to hold space (with a newline
  separator).
- `g` — copy hold space to pattern space (overwriting).
- `G` — append hold space to pattern space (with a newline
  separator).
- `x` — swap pattern space and hold space.

The classic example is reversing a file (a pure-`sed` `tac`):

```bash
sed -n '1!G;h;$p' file
```

Read it as: for every line except the first, append the hold space
to the pattern space (`G`), copy the result to the hold space
(`h`), and at the last line print the hold space (`p`). This
accumulates the file in reverse order.

You will rarely write hold-space `sed` from scratch. When you find
yourself reaching for it, that's usually the signal to switch to
`awk` or a small Python script — they are easier to write, easier
to read, and easier to modify a year later. The exception is when
you need a one-liner inside a `Makefile` or `Dockerfile` and
spawning a `python` interpreter would be overkill.

#### Branching

`sed` is technically Turing-complete because of its branching
commands:

- `:label` — define a label.
- `b [label]` — jump unconditionally to `label`, or to the end of
  the script if no label.
- `t [label]` — jump if the most recent `s` command on this line
  successfully made a substitution.
- `T [label]` (GNU) — jump if the most recent `s` did not
  substitute.

You can build small loops and case-statement-like structures with
these. Realistic examples:

```bash
# remove all leading whitespace, but preserve indentation in continuation lines
sed -E ':loop; s/^[[:space:]]+//; t loop' file

# wrap long lines at 80 chars (naive)
sed -E ':loop; s/^(.{80})(.+)$/\1\n\2/; t loop' file
```

Like the hold space, the branching commands are an escape hatch you
should know exists. Don't reach for them as a first resort.

#### Read and write files

- `r FILE` — read the contents of FILE and append after the
  pattern space when it's printed.
- `R FILE` (GNU) — read **one line** of FILE per invocation.
- `w FILE` — append the pattern space to FILE (creating or
  truncating on first write within the script invocation).
- `W FILE` (GNU) — write only up to the first embedded newline.

```bash
# splice a footer onto every file
sed '$r footer.txt' input > output

# extract lines that match into a separate file while keeping output
sed '/error/w errors.log' file > all.log
```

#### List with non-printables visible

- `l [N]` — print the pattern space with non-printable characters
  rendered as escapes, like `\t` for tab and `\n` for newline. The
  optional `N` is a wrap width. Useful for debugging "the file
  doesn't behave the way I think it does":

  ```bash
  sed -n 'l' file | head
  ```

#### Translate (`y`)

`y/SOURCE/DEST/` works like `tr`: every occurrence of `SOURCE[i]`
in the pattern space becomes `DEST[i]`. The two strings must be the
same length.

```bash
sed 'y/abcdef/ABCDEF/' file
```

For most cases, `tr` is simpler. The `y` command is occasionally
useful when you want to combine a translation with `sed`'s
addressing.

### Multiple commands and scripts

You can pass several commands in a few ways:

```bash
sed -e 's/foo/FOO/g' -e 's/bar/BAR/g' file
```

```bash
sed '
s/foo/FOO/g
s/bar/BAR/g
/^DEBUG/d
' file
```

```bash
cat > cleanup.sed <<'EOF'
s/foo/FOO/g
s/bar/BAR/g
/^DEBUG/d
EOF
sed -f cleanup.sed file
```

Inside a single multi-line script, semicolons can also separate
commands: `sed 's/foo/FOO/g; s/bar/BAR/g; /^DEBUG/d' file`.

### Address ranges with multiple commands

To apply several commands to the same range, group them with `{}`:

```bash
sed '/^BEGIN/,/^END/{
  s/foo/FOO/g
  s/bar/BAR/g
}' file
```

The opening `{` must end a line; the closing `}` must be on a line
by itself. (Some implementations are more forgiving, but the
strict form is portable.)

### sed gotchas

- **BSD vs GNU `-i`**. The portable form is `sed -i.bak`; the
  GNU-only `sed -i` and the BSD-only `sed -i ''` both fail on
  the wrong platform. Use `-i.bak` (or even `-i.bak.$$` and clean
  up later) in scripts that need to run on both.
- **Address ordering matters with `s`**. If you delete lines first
  and then substitute, your substitution can never see the deleted
  lines. The order of commands in the script is the order of
  evaluation per line.
- **`sed` is line-oriented**. By default, `.` does not match a
  newline because the newline is the boundary, not part of the
  pattern space. To match across lines, you need to bring multiple
  lines into the pattern space first (`N`) and then write a
  pattern that handles embedded newlines. This is the moment to
  consider `awk` or `python` instead.
- **Greedy by default**. `s/<.*>//g` will eat from the first `<`
  to the last `>` on a line — usually not what you want for HTML.
  Use `s/<[^>]*>//g` or switch to `grep -P` / `perl` for non-greedy
  matching.
- **Backslashes in shell scripts**. Single-quote your `sed`
  expressions so the shell doesn't interpret backslashes before
  `sed` sees them.
- **Locale-sensitive ranges**. `[a-z]` may not mean ASCII a-z in a
  non-C locale. Use `LC_ALL=C` or POSIX classes like
  `[[:lower:]]`.
- **Replacement is not regex**. Inside `s/.../.../`, the
  replacement side does not interpret `.`, `*`, `(`, or `?` as
  metacharacters. The only specials are `&`, `\1`–`\9`, and the
  case-translation escapes.
- **Newlines in the replacement**. To insert a newline, use a
  literal newline (escaped to the shell with backslash):

  ```bash
  sed 's/old/new\
  more new/' file
  ```

  GNU `sed` understands `\n` in the replacement; BSD `sed` does
  not.

---

## awk — the small data language

`awk` is a small programming language pretending to be a filter.
Its specialty is treating each input line as a *record* split into
*fields*, applying actions conditionally based on regex or
expression matching, and producing arbitrary output. Where `sed`
is "find and replace, with addresses", `awk` is "find and replace,
with addresses, plus arithmetic, plus state, plus a real
programming model".

The name is the initials of its creators — Alfred **A**ho, Peter
**W**einberger, Brian **K**ernighan — who built the original at
Bell Labs in 1977 and shipped a substantially expanded version with
System V Release 3.1 in 1987. That second version is what people
mean today when they say `awk`. There are several concrete
implementations:

- **`awk`** — on most modern systems, this is either `nawk` (the
  "new" 1987 version, now ancient but still standard) or a
  derivative.
- **`gawk`** — GNU `awk`. Adds regex record separators, named
  files, dynamic loading, internationalisation hooks, profiling,
  and many other extensions. The default `awk` on Linux.
- **`mawk`** — Mike Brennan's fast implementation. Often faster
  than `gawk` on simple scripts. Standard on Debian-derived
  distributions when `gawk` isn't installed.
- **`bwk awk`** — Brian Kernighan's reference implementation, also
  known as "one true awk".

For scripting purposes, target the POSIX intersection plus the
extensions you know your team has. For interactive command-line use
on Linux, you can rely on `gawk`'s extensions; on macOS, you'll get
either BSD `awk` (a derivative of `nawk`) or whichever `awk` you
installed via Homebrew.

### What you can do with awk

- Treat a text file as a textual database of records and fields.
- Perform arithmetic and string operations on those fields.
- Use loops, conditionals, and arrays.
- Produce formatted reports.
- (`nawk` and later) Define your own functions, run shell
  commands, process command-line arguments, work with multiple
  input streams, manage open files and pipes.
- (`gawk`-only) Use regex record separators, jump to the next
  file mid-stream, do more powerful string substitution, sort
  arrays, format times, do bit manipulation, internationalise,
  do two-way I/O to coprocesses, open TCP sockets, dynamically
  load extensions, profile programs.

### Command-line invocation

```
awk [OPTIONS] 'PROGRAM' VAR=VALUE FILE...
awk [OPTIONS] -f SCRIPT VAR=VALUE FILE...
```

You can write the program directly on the command line, surrounded
by single quotes, or store it in a file and select it with `-f`.
With `nawk` and later, multiple `-f` options can be supplied; the
scripts are concatenated. Variables can be assigned on the command
line with `VAR=VALUE` arguments, but those assignments only take
effect *after* the `BEGIN` block runs.

The recognised options:

- `-F FS` — set the input field separator. By default, fields are
  separated by runs of whitespace. With `-F:`, the separator is
  literally a colon. With `nawk` and later, `-F` accepts a regex:
  `-F'[ \t]+|,'` splits on commas or runs of whitespace.
- `-v VAR=VALUE` — assign a variable before `BEGIN` runs. This is
  the right way to inject shell variables into an `awk` script:

  ```bash
  awk -v threshold="$THRESHOLD" '{ if ($3 > threshold) print }' file
  ```

- `-f FILE` — read the program from FILE.
- `--` — end of options.

`gawk` supports many additional options:

- `--posix` — strict POSIX mode.
- `--traditional` — disable `gawk` extensions but allow common
  `nawk`-era extensions.
- `--lint` — warn about non-portable or dubious constructs.
- `--profile[=FILE]` — write a "prettyprinted" version of the
  program with execution counts to `awkprof.out` (or FILE).
  Useful for finding the hot path in a non-trivial `awk` script.
- `--gen-po` — extract translatable strings for internationalisation.
- `--non-decimal-data` — recognise octal (`0NNN`) and hexadecimal
  (`0xNN`) literals in input. Discouraged; use the `strtonum()`
  function instead.
- `--source='code'` — supply a chunk of program text. Useful with
  `-f` for combining a library file with a small command-line
  program.

### Patterns and procedures

The fundamental shape of an `awk` program is a sequence of pattern
+ procedure pairs:

```
pattern { procedure }
pattern { procedure }
...
```

Both halves are optional:

- A pattern with no procedure means "print the line if the pattern
  matches". So `awk '/error/' file` prints lines matching `/error/`,
  much like `grep`.
- A procedure with no pattern means "do this for every line". So
  `awk '{ print $1 }' file` prints the first field of every line.
- Both together mean "do this for matching lines".

Two special patterns name particular execution points:

- `BEGIN { ... }` — runs once, before any input is read. Used for
  initialisation: setting `FS`, `OFS`, table headers, default
  values.
- `END { ... }` — runs once, after all input has been read. Used
  for summaries: totals, averages, sorted output.

Multiple `BEGIN` and `END` blocks are allowed in `nawk` and later;
they execute in textual order as if they were one block each.

### Patterns

A pattern can be:

- A `/regex/` literal: `/error/` matches lines containing `error`.
- A relational expression: `$3 > 100` matches lines whose third
  field is greater than 100. Comparison can be string or numeric;
  `awk` decides based on the data, which is occasionally
  surprising.
- A pattern-matching expression with `~` (matches) or `!~` (does
  not match): `$1 ~ /^[A-Z]/` matches lines whose first field
  begins with an uppercase letter.
- `BEGIN` or `END`.
- Two patterns separated by a comma — a *range* — selects from the
  first match through the next line matching the second pattern,
  inclusive: `/begin/,/end/`.
- Boolean combinations with `&&`, `||`, `!`: `NF > 5 && $1 ~ /^DEBUG/`.

### Built-in variables

`awk` exposes a small set of automatic variables. Knowing them
turns `awk` from "I can write one-liners" into "I can write the
right one-liner".

| Var | Meaning |
| --- | --- |
| `$0` | The entire current line (record). |
| `$1`, `$2`, … | The Nth field of the current record. `$NF` is the last field. Setting `$N` rebuilds `$0` from the fields with `OFS`. |
| `NF` | Number of fields in the current record. |
| `NR` | The number-of-record counter. After reading the Nth line of input across all files, `NR` is N. |
| `FNR` | Like `NR`, but reset between files. The 5th line of the second file has `NR=` (5 + length of file 1) and `FNR=5`. |
| `FILENAME` | Name of the current input file (or empty when reading stdin). |
| `FS` | Field separator for input. Default: a single space, which means "whitespace". With `FS="\t"`, a single tab. With `FS="[,;]"`, regex. |
| `OFS` | Output field separator. Default is a single space. Used between arguments to `print`. |
| `ORS` | Output record separator. Default is `\n`. Appended to every `print`. |
| `RS` | Input record separator. Default `\n`. With `RS=""`, paragraph mode (records are blank-separated blocks). |
| `OFMT` | Default format for numbers when printed (`%.6g`). |
| `CONVFMT` | Format for numbers when converted to string (`%.6g`). |
| `SUBSEP` | Separator used internally for multi-dimensional array subscripts (`"\034"`). |
| `ARGC`, `ARGV` | Argument count and array; `ARGV[0]` is `awk`. |
| `ENVIRON` | Associative array of environment variables. `ENVIRON["HOME"]` is the value of `$HOME` at start. |
| `RLENGTH`, `RSTART` | After a successful `match()`, the length and 1-based start position of the match. |

`gawk` adds:

| Var | Meaning |
| --- | --- |
| `ARGIND` | Index in ARGV of the current input file. |
| `BINMODE` | Controls binary I/O on systems that distinguish. |
| `ERRNO` | After a failed redirection, a string describing the error. |
| `FIELDWIDTHS` | Space-separated list of field widths, used instead of FS for fixed-width input. |
| `IGNORECASE` | When non-zero, regex and string comparisons ignore case. |
| `LINT` | Dynamically controls lint warnings. |
| `PROCINFO` | An associative array of process info: real and effective UID, GID, PID, command-line argv, etc. |
| `RT` | The actual text matched by `RS` when `RS` is a regex. |
| `TEXTDOMAIN` | Application name for internationalised messages. |

A few of these are worth a closer look.

#### NR, FNR, NF

`NR` is your line counter. Use it for line addressing in patterns:

```bash
awk 'NR==1'                    # first line (like head -1)
awk 'NR==5'                    # the 5th line
awk 'NR>=10 && NR<=20'          # the 10th through 20th lines
awk 'END{print NR}'             # total line count (like wc -l)
awk '{print NR, $0}'            # number every line
```

`FNR` is `NR`-per-file: useful when reading several files and you
want to act on the first line of each one (like skipping each
file's header):

```bash
awk 'FNR==1{print "==", FILENAME, "=="} {print}' a.txt b.txt
awk 'FNR>1' *.csv               # skip the header of every CSV
```

`NF` is the number of fields. `$NF` is the last field. `$(NF-1)`
is the second-to-last:

```bash
awk '{print $NF}' file              # last column
awk 'NF > 0'                         # skip blank lines
awk 'NF == 7'                        # only lines with exactly 7 fields
awk '{print NF, $0}' file            # number of fields, then line
```

#### FS and OFS — input and output separators

```bash
awk -F:    '{print $1, $7}' /etc/passwd
awk 'BEGIN{FS=":"} {print $1, $7}' /etc/passwd
awk -F'\t' '{print $2}' file.tsv
awk 'BEGIN{FS="[,;]"} {print $3}' messy.csv

awk 'BEGIN{FS=":"; OFS="|"} {print $1, $7}' /etc/passwd
awk 'BEGIN{OFS="\t"} {$1=$1; print}' file.csv  # rebuild $0 with OFS
```

The `$1=$1` trick is the canonical way to force `awk` to rebuild
`$0` from its fields using `OFS`. Until you assign to a field,
`$0` is the original input line, and changing only `OFS` doesn't
affect it.

#### RS — record separator

The default record separator is the newline. Two cases come up
often:

- `RS=""` — paragraph mode. Records are separated by one or more
  blank lines. The newline within a record becomes the field
  separator (so each line of a paragraph is one field). Useful for
  files like `Mailbox` where messages are separated by blank lines.
- `RS="..."` (regex, `gawk` only) — split records by a regex. So
  `RS="\n+"` collapses runs of blank lines into single record
  separators.

```bash
awk 'BEGIN{RS=""; FS="\n"} {print "Para", NR, "has", NF, "lines"}' file
awk 'BEGIN{RS=";"; ORS=";\n"} {gsub(/^[ \t]+|[ \t]+$/, ""); print}' sql.txt
```

### Operators

`awk` borrows most of its operator set from C. In rough order of
precedence (highest first):

| Operator | Meaning |
| --- | --- |
| `(...)` | Grouping |
| `$` | Field reference |
| `++` `--` | Increment, decrement (prefix or postfix) |
| `^` `**` | Exponentiation (`**` is a common extension) |
| `!` `+` `-` (unary) | Logical not, unary plus, unary minus |
| `*` `/` `%` | Multiplication, division, modulus |
| `+` `-` | Addition, subtraction |
| (blank) | String concatenation |
| `<` `<=` `>` `>=` `!=` `==` | Relational |
| `~` `!~` | Regex match, regex not-match |
| `in` | Array membership: `key in array` |
| `&&` | Logical AND, short-circuit |
| `\|\|` | Logical OR, short-circuit |
| `?:` | Ternary conditional |
| `=` `+=` `-=` `*=` `/=` `%=` `^=` `**=` | Assignment |

Concatenation is invisible: two strings adjacent to one another
are concatenated. So `print "x is " x` prints `x is ` followed by
the value of `x`.

### Variables and arrays

Variables are dynamically typed and don't need to be declared.
Their initial value is the empty string when used as strings or
zero when used as numbers. There's a single global namespace plus
local-to-function variables (declared as extra parameters; see
"User-defined functions" below).

Arrays are *associative* — every array is a string-keyed
hashtable. Numeric subscripts are converted to strings before
being used as keys; this means `a[1]` and `a["1"]` refer to the
same element. This is one of `awk`'s most powerful features:
counting, grouping, and lookup tables are immediate.

```awk
{ count[$1]++ }                # frequency of first column
END { for (k in count) print count[k], k }

{ total[$1] += $3 }            # group sum
END { for (k in total) print k, total[k] }

{ seen[$0]++; if (seen[$0]==1) print }  # de-dupe in stream order
```

The `for (key in array)` loop iterates the keys, in unspecified
order in standard `awk` (`gawk`'s `--lint` will warn you about
relying on order). To get sorted output, pipe to `sort`, or use
`gawk`'s `asort()` / `asorti()` / `PROCINFO["sorted_in"]`.

`delete array[key]` removes a single element. `delete array`
(`nawk` extension, very widely supported) removes everything.

The `in` operator tests existence without creating an entry:

```awk
if ("widget" in count) ...   # safe, doesn't create count["widget"]
```

Multidimensional arrays use a comma-separated subscript:
`matrix[i,j] = ...`. Internally, `awk` joins the parts with
`SUBSEP` (default `"\034"`); for most purposes you can treat the
multi-dim form as a 2-D array.

### Output: print and printf

`print` is the basic statement. With no arguments, it prints `$0`
followed by `ORS`. With multiple comma-separated arguments, it
prints them with `OFS` between them and `ORS` at the end:

```awk
print               # $0 followed by newline
print "hello"       # the literal string
print $1, $3        # first and third fields, separated by OFS
```

Without a comma between arguments, you get string concatenation
without `OFS`:

```awk
print "x=" x        # no separator between "x=" and the value of x
```

`printf` is C-style formatted output. It does **not** append `ORS`,
so include `\n` if you want a newline:

```awk
printf "%-20s %6d\n", $1, $2
printf "%5.2f%% complete\n", 100*done/total
```

The format conversions you'll use:

| Specifier | Meaning |
| --- | --- |
| `%c` | ASCII character |
| `%d`, `%i` | Decimal integer |
| `%e`, `%E` | Scientific notation |
| `%f` | Floating-point |
| `%g`, `%G` | `%e` or `%f`, whichever is shorter, trailing zeros trimmed |
| `%o` | Octal |
| `%s` | String |
| `%u` | Unsigned decimal |
| `%x`, `%X` | Hex (lowercase / uppercase) |
| `%%` | Literal `%` |

Modifiers:

- `-` — left-justify within the field.
- ` ` (space) — prefix positive numbers with a space.
- `+` — prefix positive numbers with a `+`.
- `#` — alternate form (`%o` prefixed with `0`, `%x` with `0x`,
  `%g`/`%G` keeps trailing zeros).
- `0` — pad with zeros instead of spaces.
- a width: minimum field width.
- `.precision`: digits after the decimal point for `%f`/`%e`,
  significant digits for `%g`, max chars for `%s`.

`gawk` supports positional specifiers: `printf "%2$s %1$s\n", "world", "hello"`
prints `hello world`. Used mostly in internationalisation.

### Output redirection

`print` and `printf` can redirect their output:

- `print "hi" > "FILE"` — write to FILE, truncating on first
  open.
- `print "hi" >> "FILE"` — append to FILE, no truncation.
- `print "hi" | "CMD"` — pipe through a shell command.

The right-hand side is an expression; in practice it's almost
always a string literal. `awk` keeps each unique destination open
for the lifetime of the program, so don't mix `>` and `>>` to the
same file (the first wins).

`close("FILE")` or `close("CMD")` flushes and closes a redirection
target. Close it when you're done writing — there's a system limit
on simultaneously open files (often 10 in old `awk`, more in
modern implementations).

### Control flow

`awk`'s control structures look like C:

```awk
if (cond) statement
if (cond) statement1; else statement2

while (cond) statement
do statement while (cond)
for (init; cond; incr) statement
for (key in array) statement

break          # exit the nearest enclosing loop
continue       # next iteration of the loop
next           # done with this record; read next, restart script
nextfile       # done with this file; restart with the next file (gawk, nawk-E)
exit [N]       # done with this run; END still runs; exit status N
```

Statement blocks use `{}` braces. Trailing semicolons are
optional except where the parse otherwise becomes ambiguous (e.g.
between two statements on the same line).

```awk
# print first 10 matching lines, then stop
/error/ { print; if (++n == 10) exit }

# skip the first 5 lines of every file
FNR <= 5 { next }

# stop processing this file as soon as a marker is seen
/^STOP$/ { nextfile }
```

### User-defined functions

Available in `nawk` and later (which is essentially every modern
`awk`).

```awk
function name(parameter, list, ...,    local1, local2) {
  body
  return value
}
```

Parameters are passed by value for scalars, by reference for
arrays. There's no syntactic distinction between parameters and
local variables — a convention is to leave a few extra spaces and
list the locals after the "real" parameters:

```awk
function capitalize(s,    parts, n, i, out) {
  n = split(s, parts, " ")
  out = ""
  for (i = 1; i <= n; i++) {
    if (i > 1) out = out " "
    out = out toupper(substr(parts[i], 1, 1)) substr(parts[i], 2)
  }
  return out
}
```

The trailing locals are unset on entry — a function-local
"variable declaration" trick that the language enforces by being
quirky. There is no way to mark a parameter as local except by
listing it after the real parameters and by convention not passing
extra arguments at the call site. (`gawk --lint` warns about
parameter mismatches.)

A function call looks like `name(args)` with **no space** between
the name and the open paren — a parser quirk. Calling
`capitalize ($0)` (with a space) is a parse error.

### Built-in functions

`awk` ships with a useful library. The list below is a reference;
most you'll use repeatedly.

#### Arithmetic

- `int(x)` — truncate to integer.
- `sqrt(x)` — square root.
- `exp(x)`, `log(x)` — natural exponential and logarithm.
- `sin(x)`, `cos(x)`, `atan2(y,x)` — trigonometric.
- `rand()` — random in `[0, 1)`. Same sequence every run unless
  seeded.
- `srand([seed])` — seed the generator. With no argument, uses the
  current time.

#### String

- `length([s])` — length of `s`, or of `$0` if no argument.
- `substr(s, i, [n])` — extract a substring of `s` starting at
  1-based position `i`, of length `n`. Without `n`, to the end.
- `index(s, t)` — 1-based position of `t` in `s`, or 0 if not
  found.
- `split(s, array, [sep])` — split `s` into `array[1]`,
  `array[2]`, …; return the count. `sep` defaults to `FS`. With
  three arguments, `sep` is a regex (`nawk` and later) or a
  single character (older `awk`).
- `sub(regex, repl, [target])` — substitute the first match of
  `regex` with `repl` in `target` (default `$0`). Return 1 on
  success, 0 otherwise. `repl` can contain `&` for the matched
  text; this is a side-effect, not a return-value-style call.
- `gsub(regex, repl, [target])` — substitute every match. Return
  the number of substitutions.
- `gensub(regex, repl, how, [target])` (`gawk`) — non-destructive
  general substitution. Return the new string, leave `target`
  alone. `how` is a number (replace the Nth match) or `"g"`/`"G"`
  for global. Unlike `sub`/`gsub`, `gensub` understands `\1`,
  `\2`, …, in the replacement.
- `match(s, regex, [array])` — find a match; set `RSTART` and
  `RLENGTH`. Return the start position or 0. With three args
  (`gawk`), `array` gets the captured groups: `array[0]` is the
  whole match, `array[1]` the first group, etc.
- `sprintf(fmt, args...)` — format like `printf` but return the
  result instead of printing it.
- `toupper(s)`, `tolower(s)` — case conversion.
- `strtonum(s)` (`gawk`) — convert a string to a number, honouring
  C-style octal (`0...`) and hexadecimal (`0x...`) prefixes.

#### I/O

- `print`, `printf` — described above.
- `getline` — read the next record. Several forms:
  - `getline` — reads the next record, sets `$0`, `NF`, `NR`,
    `FNR`. Returns 1 on success, 0 on EOF, -1 on error.
  - `getline var` — reads into `var`; doesn't touch `$0` or `NF`.
  - `getline < file` — reads from `file`. Returns the same.
  - `getline var < file` — combination.
  - `cmd | getline` — runs `cmd` and reads its output.
  - `cmd | getline var` — combination.
  - `cmd \|& getline var` (`gawk`) — reads from a coprocess.
- `close(expr)` — close the file or pipe corresponding to `expr`
  (which must be the same expression used to open it).
- `fflush([expr])` — flush output for `expr`, or all output if no
  argument.
- `system(cmd)` — run `cmd` through the shell, return its exit
  status.

#### Time (gawk)

- `systime()` — current time as seconds since the epoch.
- `mktime(spec)` — convert a `"YYYY MM DD HH MM SS"` spec to
  epoch seconds.
- `strftime([fmt, [time]])` — format epoch seconds. Without args,
  emits a Unix-`date`-like string.

#### Bit (gawk)

- `and(a, b)`, `or(a, b)`, `xor(a, b)`, `compl(x)`, `lshift(x, n)`,
  `rshift(x, n)` — bit operations on values that fit in a C
  unsigned long.

### Simple pattern-procedure examples

```awk
{ print $1 }                            # first column
{ print $NF }                            # last column
NF > 2                                    # records with more than 2 fields
NF == 7 && /^Name:/                       # 7-field records starting with Name:
$1 ~ /URGENT/ { print $3, $2 }            # rearrange columns when col 1 says URGENT

/pattern/ { ++count }
END { print count }                       # count occurrences

{ total += $2 }
END { print "total:", total }              # column sum

{ for (i = NF; i >= 1; i--) printf "%s ", $i; print "" }
                                          # reverse the words on each line

length($0) < 20                           # short lines

# print just the BEGIN..END block
/^BEGIN/,/^END/ { print }

# everything except the BEGIN..END block
/^BEGIN/,/^END/ { next } { print }

# top 10 most frequent first columns
{ c[$1]++ } END { for (k in c) print c[k], k | "sort -rn | head" }

# convert a single-column file into a comma-separated paragraph
BEGIN { RS=""; FS="\n"; OFS="," } { $1=$1; print }
```

### awk one-liners worth memorising

```bash
awk 'NR==1 || /pattern/'                  # always keep header, then matches
awk 'NF'                                  # remove blank lines
awk '!seen[$0]++'                         # de-dupe preserving order
awk 'length>72'                           # lines longer than 72 chars
awk '{print NR, $0}'                       # add line numbers
awk '{$1=$1; print}'                       # normalise spacing using OFS
awk -F: '$3 >= 1000 {print $1}' /etc/passwd
                                            # users with UID >= 1000
awk -F, '{a[$1] += $2} END {for (k in a) print k, a[k]}' input.csv
                                            # group sum by first column
awk -v OFS='\t' '{print $1, $2, $3}'       # convert to TSV
awk '{a[NR]=$0} END{for(i=NR;i>=1;i--) print a[i]}'
                                            # tac in pure awk
awk 'BEGIN{srand()} {print rand(), $0}' file | sort | cut -d' ' -f2-
                                            # random shuffle (poor man's shuf)
```

### awk vs sed

A useful rule of thumb:

- If you need to substitute on each line independently with no
  awareness of context, `sed` is shorter.
- If you need multiple substitutions on the same line conditionally,
  `sed` is still fine.
- The moment you need to count, sum, group, or remember anything
  across lines — switch to `awk`. The hold space exists, but it's
  the wrong tool for stateful work.
- If you need to compose a real program (functions, complex
  control flow, multiple data sources), use `awk` or escalate
  further to a real scripting language.

---

## The filter toolbox

Beyond `grep`, `sed`, and `awk`, the UNIX text-processing toolkit is
a constellation of small tools, each focused on a single
transformation. Knowing them well is the difference between writing
"one beautiful pipeline" and writing "a clumsy `awk` script that
reinvents three of these".

### tr — translate or delete characters

`tr` reads bytes from stdin and writes bytes to stdout, with simple
translations: replace, delete, or squeeze characters. It is
**not** line-oriented and **not** regex-based; it operates on the
raw character stream.

```
tr [OPTIONS] SET1 [SET2]
```

The basic form maps characters in `SET1` to the corresponding
character in `SET2`:

```bash
tr 'a-z' 'A-Z'              # uppercase
tr 'A-Z' 'a-z'              # lowercase
tr '[:lower:]' '[:upper:]'  # locale-aware uppercase
```

Character sets can use ranges (`A-Z`), individual characters
(`abc`), the POSIX classes (`[:alpha:]`, `[:digit:]`, etc.), and
escapes (`\t`, `\n`, `\r`, `\\`, `\nnn` for octal byte). The
length rule is "if `SET1` is longer than `SET2`, the last
character of `SET2` repeats" — unless you pass `-t` for truncation.

The really useful flags:

- `-d` — delete characters in `SET1`. No `SET2`.

  ```bash
  tr -d '\r' < dosfile.txt > unixfile.txt    # strip Windows CRs
  tr -d '[:punct:]' < text                   # strip punctuation
  tr -d '0-9' < file                          # strip digits
  ```

- `-s` — squeeze runs of identical characters in `SET1` into a
  single one. With one set, just squeezes; with two sets,
  translates first and then squeezes.

  ```bash
  tr -s ' ' < file                           # collapse runs of spaces
  tr -s '\n' < file                          # collapse runs of blank lines
  tr -s '[:space:]' < file                    # collapse all whitespace
  ```

- `-c` — *complement* `SET1`: operate on every character **not**
  in `SET1`.

  ```bash
  tr -cs '[:alnum:]' '\n' < file              # one alphanumeric token per line
  tr -cd '[:print:]\n' < file                 # keep printable + newlines
  ```

- `-t` — truncate `SET1` to `SET2`'s length.

A few classic recipes:

```bash
# tokenise: print one alphanumeric word per line
tr -cs '[:alnum:]' '\n' < input

# rot13
tr 'A-Za-z' 'N-ZA-Mn-za-m'

# strip non-ASCII
tr -cd '\11\12\15\40-\176' < input

# remove non-printable
tr -d '\000-\010\013-\037'

# capitalise every word, naive
tr -s ' ' '\n' < file | awk '{print toupper(substr($0,1,1)) substr($0,2)}' | tr '\n' ' '

# convert NULs to newlines (for `find -print0` consumers that want lines)
tr '\0' '\n'
```

`tr` does **not** do string substitution. `tr 'foo' 'bar'` does
not replace `foo` with `bar`; it maps `f→b`, `o→a`, `o→r`. For
string substitution use `sed`.

### cut — extract columns

`cut` extracts vertical slices of input. The slices can be
character offsets, byte offsets, or delimited fields.

```
cut -c LIST [files...]            # by character
cut -b LIST [files...]            # by byte
cut -f LIST [-d DELIM] [files...] # by delimiter-separated field
```

`LIST` is one or more ranges separated by commas. `3` means just
position 3; `3-7` means 3 through 7; `3-` means 3 through end;
`-7` means 1 through 7; `1,3,5-7` is allowed.

```bash
cut -c19 file                       # the 19th character of each line
cut -c1-10 file                      # first 10 characters
cut -c1-10,20-30 file                # two character ranges
cut -d: -f1 /etc/passwd              # first colon-separated field
cut -d: -f1,7 /etc/passwd            # username and shell
cut -d, -f2,5 data.csv               # 2nd and 5th comma-separated columns
cut -d$'\t' -f3 file.tsv             # tab-separated
```

The default delimiter is a tab. `cut` does **not** understand
runs of whitespace as a single delimiter; for that, use `awk` with
its default behaviour, or pre-squeeze with `tr -s ' '`.

Useful options:

- `-d C` — input delimiter (single character).
- `-s` — suppress lines that don't contain the delimiter at all.
  Without this, lines with no delimiter pass through unchanged.
- `--output-delimiter=S` — override the output delimiter (a string
  this time, not a single char).
- `-n` — when used with `-b` and a multibyte locale, don't split
  multibyte characters.

The "byte" vs "character" distinction is real in any UTF-8
locale: `-c1` should be the first character, `-b1` is the first
byte. For ASCII content they're the same.

For more sophisticated column extraction (regex separators, fields
identified by header name, computed columns), reach for `awk`.

### paste — combine files as columns

`paste` is the inverse of `cut`. It reads several files in
parallel and prints a line containing one line from each file:

```
paste [-d delim] [-s] [files...]
```

```bash
paste numbers letters
# 1  A
# 2  B
# 3  C
```

Useful options:

- `-d` — separators between columns. Cycle through the characters
  if more than one is supplied: `paste -d',|' a b c` uses comma
  between a and b, pipe between b and c, comma again between c
  and a (if there were a fourth file), and so on.
- `-s` — *serial* mode. Instead of joining files horizontally,
  transpose each file's lines into a single output line.

```bash
paste numbers letters                          # side-by-side
paste -d, numbers letters                      # CSV-style
paste -s letters                               # one line, tab-separated
paste -s -d, letters                           # comma-joined single line
seq 1 9 | paste -d, - - -                      # rows of three from a sequence
```

The dash-as-filename `-` reads stdin and is invaluable in
pipelines.

### sort — order lines

`sort` is the universal sorter. By default, it does a
lexicographic sort of input lines.

```bash
sort file                       # ascending
sort -r file                    # descending
sort -u file                    # sort and de-duplicate
sort -n file                    # numeric (10 after 9)
sort -h file                    # human-numeric (1K, 2M, 3G)
sort -f file                    # case-insensitive
sort -b file                    # ignore leading whitespace
sort -d file                    # dictionary order (only blanks and alnum)
sort -V file                    # version sort (file1, file2, file10)
```

#### Sort keys

The most powerful flag is `-k`, which selects part of each line
as the sort key. The general form is `-k F1[.C1][,F2[.C2]]`:

- `F1` — starting field (1-based; required).
- `C1` — character offset within F1 (1-based; default 1).
- `F2` — ending field (default: end of line).
- `C2` — character offset within F2 (default: 1, meaning "include
  through end of F2").

The default field separator is *transition between non-blank and
blank*, which is "whitespace" in the natural sense. To use a
specific separator, pair `-k` with `-t`:

```bash
sort -t: -k3 -n /etc/passwd                # by UID
sort -t: -k7 /etc/passwd                    # by login shell
sort -t, -k2 people.csv                    # by 2nd CSV field
sort -t, -k3,3 -k2,2n people.csv            # by city, then by age numerically
```

You can append per-key flags to override the global sort mode for
that key only: `-k3,3n` numeric on field 3, `-k1,1d` dictionary on
field 1. Multiple `-k` arguments are evaluated in order, so the
file is sorted by the first key, with ties broken by the next, and
so on.

#### Other useful flags

- `-c` — check if input is already sorted; print first
  out-of-order line and exit non-zero. Combined with `-u`,
  ensures duplicates fail the check.
- `-m` — merge already-sorted files (faster than sorting from
  scratch).
- `-T DIR` — use `DIR` for temporary files (relevant for very
  large sorts that don't fit in memory).
- `-S SIZE` — buffer size; tune for huge sorts.
- `--parallel=N` — number of sort threads.
- `-z` — input/output records separated by NUL rather than
  newline. Pairs with `find -print0`.

#### Locale and sort

`sort`'s output depends heavily on locale. `LC_ALL=C sort` gives
byte-order sort, which is what most scripts want for predictable
behaviour. Without it, `sort` uses the system collation, which
typically ignores case, treats accented characters specially, and
may interleave punctuation.

```bash
LC_ALL=C sort file > sorted.txt    # safe in scripts
```

### uniq — collapse runs

`uniq` operates on **adjacent** duplicate lines. It does not sort
input; you almost always pipe through `sort` first.

```bash
sort file | uniq                  # de-duplicate
sort file | uniq -c               # de-dup with counts
sort file | uniq -c | sort -rn    # frequency table, descending
sort file | uniq -d               # only the duplicates
sort file | uniq -u               # only the truly unique lines
```

Useful options:

- `-c` — prefix each line with its count.
- `-d` — print only duplicated lines.
- `-u` — print only unique lines.
- `-i` — case-insensitive.
- `-s N` — skip the first N characters when comparing.
- `-f N` — skip the first N whitespace-separated fields.
- `-w N` — only consider the first N characters.

```bash
# IPs by frequency
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head

# unique paths (regardless of timestamp prefix)
sort -k2 file | uniq -f1
```

`awk '!seen[$0]++'` is the streaming alternative that preserves
the original order; `sort | uniq` requires sorting.

### comm — compare sorted files set-theoretically

`comm` reads two sorted files and prints three columns: lines only
in file1, lines only in file2, and lines in both.

```bash
comm sortedA sortedB              # all three columns
comm -12 sortedA sortedB          # only column 3: lines in BOTH
comm -23 sortedA sortedB          # only column 1: in A, NOT in B
comm -13 sortedA sortedB          # only column 2: in B, NOT in A
```

The `-N` flags **suppress** the corresponding column. The classic
recipe is "things in left but not right":

```bash
comm -23 <(sort A.txt) <(sort B.txt)
```

`comm` requires both inputs to be sorted in the same way as
`comm` itself sorts (which is to say, lexicographically). Add
`--check-order` for paranoia, or use `LC_ALL=C` to be explicit.

### diff and patch — line-level differences

`diff` doesn't fit neatly into "filter" but lives in the same
neighbourhood. It compares two files line-by-line and emits a
description of changes.

```bash
diff a.txt b.txt           # default ed-style output
diff -u a.txt b.txt        # unified format (the one you actually want)
diff -c a.txt b.txt        # context format
diff -r dir1 dir2          # recursive
diff -q a b                # just whether they differ
diff -y a b                # side-by-side
diff -w a b                # ignore whitespace differences
diff -i a b                # ignore case
```

The unified format (`-u`) is the standard format for patches and
code review. `patch -p1 < changes.diff` applies a unified diff.

For binary files, `diff` reports "files differ"; use `cmp` for
byte-by-byte comparison.

### wc — count lines, words, chars, bytes

```bash
wc file                # lines, words, bytes (3 numbers)
wc -l file             # just lines
wc -w file             # just words
wc -c file             # just bytes
wc -m file             # just characters (locale-aware)
wc -L file             # length of the longest line
wc -l *.py             # per-file plus total
wc -l < file           # without filename in output
```

`wc -l` is the most-used; `wc -l < file` is a trick to suppress the
filename in the output.

### head and tail

```bash
head file              # first 10 lines
head -n 50 file        # first 50
head -n -5 file        # everything except the last 5 (GNU)
head -c 1024 file      # first 1024 bytes

tail file              # last 10 lines
tail -n 50 file        # last 50
tail -n +50 file       # from line 50 to end
tail -f file           # follow as the file grows
tail -F file           # follow even through rename/rotation (GNU)
tail -c 1024 file      # last 1024 bytes
```

`tail -f` is the standard log-tailing tool. Combine with
`grep --line-buffered` for live filtering.

`head` and `tail` together can extract any line range:

```bash
head -n 100 file | tail -n 21    # lines 80-100
sed -n '80,100p' file            # the same in sed
awk 'NR==80,NR==100' file        # the same in awk
```

### tac — reverse a file

```bash
tac file                  # last line first
tac --separator='|' f     # custom record separator
tac -r --separator='\n' f # treat separator as regex
```

`tac` is great for reversing chronologically-ordered logs. Note:
on macOS, `tac` is not in the default toolchain; install it via
`coreutils` and use `gtac`, or use `tail -r` (BSD-only) for the
same effect on small files.

### shuf — random selection

```bash
shuf file                 # randomly permute lines
shuf -n 10 file           # 10 random lines (without replacement)
shuf -e a b c             # shuffle command-line args
shuf -i 1-100             # shuffle a numeric range
shuf -i 1-100 -n 5        # 5 random integers in 1..100
shuf -r -n 10 file        # 10 random lines WITH replacement
```

`shuf` is GNU coreutils. On macOS, `gshuf` from Homebrew, or
`sort -R` (a less-uniform alternative), or pipe through `awk
'BEGIN{srand()} {print rand(), $0}' | sort | cut -d' ' -f2-`.

### tee — copy stdin to a file and to stdout

`tee` is the T-piece of UNIX plumbing. It copies stdin to one or
more files **and** to stdout, so you can both inspect a value
flowing through a pipeline and record it.

```bash
make 2>&1 | tee build.log                # see and save
make 2>&1 | tee -a build.log             # append (don't truncate)
make 2>&1 | tee build.log | grep -i error  # see, save, and filter

# write to a root-owned file from a user shell
sudo cmd | sudo tee /etc/something > /dev/null
```

The `> /dev/null` is to suppress the second copy that would
otherwise hit your terminal. `tee -a` appends instead of
overwriting.

### column — format columns

`column` reads input and arranges it into aligned columns. Two
common modes:

- **Pour into vertical columns** (default with no other flags):
  `column` fills as many vertical columns as fit in the terminal
  width.
- **Format a delimited table** (`-t`): treat input as already a
  table, just align the columns nicely.

```bash
seq 1 18 | column                 # vertical-fill
seq 1 18 | column -x              # horizontal-fill

cat threes
# one two three
# Do Re Mi
# you and me
column -t threes                  # align as a table

column -t -s, data.csv            # treat as CSV, then align
column -t -N name,age,city data   # add headings (requires -t)
column -t -N name,age,city --json data  # output as JSON
```

Useful options:

- `-s C` — input separator. With `column -t -s,`, treats the
  input as CSV.
- `-o C` — output separator. With `-t`, controls how columns are
  spaced.
- `-t` — table mode.
- `-N` — column headings (comma-separated).
- `-J` / `--json` — JSON output (requires `-t` and `-N`).
- `-x` — fill rows before columns.

`column` is great for making `cut`/`awk` output readable in a
terminal. It is **not** a structured data tool; for serious table
work, reach for `csvkit`, `miller` (`mlr`), or `q`.

### fmt and fold — wrap and unwrap

`fmt` reformats paragraphs to fit a target width. It's a
surprisingly useful tool for dealing with hand-written prose that
has been wrapped or un-wrapped by a previous editor.

```bash
fmt -w 72 file              # wrap at 72 cols
fmt -w 72 -u file           # uniform spacing (one space between words)
fmt -t file                 # tagged: indent of first line is preserved
```

`fold` does hard line breaks at a width, with no awareness of
words:

```bash
fold -w 80 file             # hard-wrap at 80 chars
fold -s -w 80 file          # break at spaces if possible
fold -b -w 80 file          # count bytes, not characters
```

### expand and unexpand — tabs and spaces

```bash
expand file                 # tabs → spaces (tab stops every 8)
expand -t 4 file            # tab stops every 4
expand -t 1,5,9,13 file     # specific tab stops

unexpand file               # spaces → tabs at start of line only
unexpand -a file            # anywhere on the line
unexpand -t 4 file          # treat 4 spaces as a tab
```

Use `expand` to normalise whitespace before diffing or grepping;
use `unexpand` cautiously — converting all spaces to tabs in
arbitrary content can break alignment in code that relies on
specific column positions.

To check what's actually in a file:

```bash
cat -T file       # render tabs as ^I
cat -A file       # render tabs as ^I, line ends as $, non-ASCII as M-x
od -c file        # dump escapes character by character
```

### nl — number lines

`nl` is `cat -n` with options. Line numbering with selective
ranges, restartable counters, and more.

```bash
nl file                          # number lines (skipping blanks by default)
nl -ba file                      # number all lines including blanks
nl -nrz -w4 file                 # right-justified zero-padded, width 4
nl -s'. ' file                   # custom separator after the number
```

For most cases, `cat -n file` or `awk '{print NR, $0}' file` is
shorter; `nl` earns its keep when you need to control numbering
across body, header, and footer sections.

### cat — concatenate

The simplest filter. Useful options that often surprise people:

```bash
cat -n file       # number all lines (cat -n) or non-blank only (cat -b)
cat -A file       # show all non-printables (-T tabs, -E ends, -v others)
cat -s file       # squeeze multiple blank lines into one
cat - file        # interleave stdin then file (rarely useful)
```

The famous "useless use of `cat`" — `cat file | cmd` instead of
`cmd < file` or `cmd file` — is a real cost when `cmd` is fast
and the file is huge, but a totally fine readability choice for
interactive use. Don't lecture your colleagues about it.

### od and hexdump — see bytes

When you need to know exactly what bytes are in a file:

```bash
od -c file                # character + name escapes
od -An -c file            # without offset addresses
od -An -tx1 file          # hex bytes only, no addresses
hexdump -C file           # canonical hex+ASCII (the easy-to-read one)
xxd file                  # similar to hexdump -C, with reverse mode
xxd -r dump.txt           # convert hex dump back to binary
```

`hexdump -C` is the format you've seen in every binary forensic
tool. `xxd -r` round-trips it.

### split and csplit — divide a file

```bash
split -l 1000 big.log chunk_         # 1000 lines per file
split -b 10M huge.tar parts_         # 10MB per file
split -n 5 file parts_               # 5 equal-byte chunks (GNU)
split -n l/5 file parts_             # 5 chunks split on line boundaries

csplit file '/^CHAPTER/' '{*}'       # split at every CHAPTER line
csplit file 100 200 300              # split at lines 100, 200, 300
```

`split` produces `chunk_aa`, `chunk_ab`, … and so on. `-d` gives
numeric suffixes. `-a N` controls suffix length.

`csplit` is "context split": split at lines matching a pattern, or
at specific line numbers.

### join — relational join

`join` performs a relational join on two sorted files based on a
shared field.

```
join [options] file1 file2
```

```bash
sort -k1 a.txt > a.sorted
sort -k1 b.txt > b.sorted
join a.sorted b.sorted                  # inner join on field 1
join -1 2 -2 1 file1 file2              # join on field 2 of file1 and field 1 of file2
join -t, -1 1 -2 1 a.csv b.csv          # CSV inputs
join -a 1 a.sorted b.sorted             # left outer join (keep unmatched a)
join -a 2 a.sorted b.sorted             # right outer join
join -e MISSING -o 1.1,1.2,2.2 a b      # custom output spec, missing-value placeholder
```

Both inputs must be sorted on the join key. `join` is finicky
about its input — any line that isn't sorted as it expects causes
silent oddities. For ad-hoc joins, `awk 'NR==FNR{...; next} {...}'`
loaded into a hash is often easier:

```awk
NR==FNR { lookup[$1] = $2; next }
$1 in lookup { print $0, lookup[$1] }
```

### A few more utilities worth knowing exist

These don't get a full section because they have a single use, but
they're useful enough to remember by name:

- `rev` — reverse the characters of each line.
- `pr` — paginate for printing (header, multi-column).
- `iconv` — convert between character encodings.
- `recode` — same idea, more options.
- `dos2unix`, `unix2dos`, `mac2unix` — line-ending converters.
- `strings` — extract printable runs from a binary file.
- `cmp` — byte-by-byte file comparison; exits non-zero if files
  differ.
- `tsort` — topological sort.
- `mktemp` — make a temp file safely.
- `pv` — pipe viewer: shows progress through a pipeline.

---

## Composed pipelines

The point of having all these tools is that they compose. A
useful question to ask of any text-processing problem is: "Can I
break this into stages where each stage is one transformation?"
If yes, you almost certainly have a one-line pipeline. If no, you
have a job for `awk` or for a real scripting language.

### Frequency analysis

```bash
# top 10 most frequent first columns
awk '{print $1}' file | sort | uniq -c | sort -rn | head

# top 10 most frequent words (rough)
tr -cs '[:alpha:]' '\n' < file | sort | uniq -c | sort -rn | head

# distinct second-column values
cut -d, -f2 data.csv | sort -u

# top 10 IPs hitting your web server
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head

# top 10 HTTP status codes
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# count error types in a log
grep -oE '[A-Z][a-z]+Error' app.log | sort | uniq -c | sort -rn
```

The five-stage pipeline `cmd | sort | uniq -c | sort -rn | head`
is the canonical UNIX frequency-analysis idiom. Memorise it; you
will type it three or four times a day.

### Aggregations and sums

```bash
# sum the second column
awk '{s+=$2} END{print s}' file

# average the third column
awk '{s+=$3; n++} END{print s/n}' file

# sum by first column (group-by)
awk '{t[$1]+=$2} END{for (k in t) print k, t[k]}' file

# CSV: sum column 3 by column 1, header-aware
awk -F, 'NR>1 {t[$1]+=$3} END{for (k in t) print k","t[k]}' data.csv

# min and max
awk 'NR==1{min=max=$1} {if($1<min)min=$1; if($1>max)max=$1} END{print min, max}' file

# percentiles via sort+awk
sort -n file | awk 'BEGIN{c=0} {a[NR]=$0; c++} END{print a[int(c*0.5)]}'
```

### Rearrange columns

```bash
# swap first two columns of a TSV
awk -F'\t' 'BEGIN{OFS="\t"} {print $2, $1}' file

# keep only columns 1, 3, 5 of a CSV
cut -d, -f1,3,5 file.csv

# add a prefix column
awk 'BEGIN{OFS=","} {print "prefix", $0}' file

# add a computed column (length of the line)
awk '{print length, $0}' file

# delete the first column
awk '{$1=""; sub(/^ /,""); print}' file
cut -d' ' -f2- file                  # simpler if delimiter is a single space
```

### Find and extract

```bash
# all email addresses in a directory tree (deduplicated)
grep -rhoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' . | sort -u

# IPv4 addresses in a log
grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' access.log | sort -u

# stricter IPv4 (no false positives like 999.999.999.999)
grep -oE '\b((25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\b' file

# UUIDs
grep -oE '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' file

# US-style social security numbers
grep -E '\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b' file

# US phone numbers (varied formats)
grep -E '\b\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{4}\b' file

# credit card numbers (rough; doesn't validate Luhn)
grep -E '\b[0-9]{4}([- ]?[0-9]{4}){3}\b' file
grep -E '\b[0-9]{4}([- ]?[0-9]{6})([- ]?[0-9]{5})\b' file   # Amex (15)

# Mac addresses
grep -Ei '\b[0-9a-f]{2}(:[0-9a-f]{2}){5}\b' file
```

### Cleaning and normalising

```bash
# strip trailing whitespace from every line of a file
sed -i.bak 's/[[:space:]]*$//' file

# strip leading whitespace
sed -i.bak -E 's/^[[:space:]]+//' file

# remove blank lines
sed -i.bak '/^$/d' file
awk 'NF' file                          # alternative

# remove comments and blank lines from a config
grep -Ev '^\s*(#|$)' /etc/ssh/sshd_config

# convert CRLF to LF (Windows → Unix line endings)
tr -d '\r' < dosfile.txt > unixfile.txt
sed -i.bak 's/\r$//' file              # GNU sed alternative
dos2unix file                          # if installed

# convert tabs to spaces
expand -t 4 file > file.spaces
unexpand -t 4 -a file > file.tabs

# squeeze multiple blank lines into one
cat -s file
awk 'NF || prev_blank == 0; { prev_blank = (NF == 0) }' file
```

### Composing find with grep, sed, awk

`find ... -exec` and `find ... | xargs` are the bridge between
"navigate the filesystem" and "process the contents".

```bash
# count TODOs across a project
find . -name '*.py' -exec grep -c TODO {} +

# print TODOs with filenames and line numbers
find . -name '*.py' -exec grep -nH TODO {} +

# safe with weird filenames
find . -name '*.py' -print0 | xargs -0 grep -n TODO

# replace a string across many files in one pass
find . -name '*.py' -print0 | xargs -0 sed -i.bak 's/old_api/new_api/g'

# delete trailing whitespace across the project
find . -name '*.py' -print0 | xargs -0 sed -i.bak 's/[[:space:]]*$//'
```

The `-print0` / `-0` pairing is the standard discipline for
filenames that may contain spaces, newlines, or other shell
metacharacters. Without it, `xargs` will split on whitespace and
break on filenames like `My Documents/file.txt`.

### Streaming logs

```bash
# tail and filter a log live
tail -F /var/log/nginx/access.log | grep --line-buffered -E '5[0-9][0-9] '

# tail multiple logs with filename prefixes
tail -F /var/log/{auth,syslog} | grep --line-buffered -i 'failed'

# extract response times that took longer than 1 second
awk '$NF > 1.0 {print}' /var/log/nginx/access.log

# rate of requests per minute
awk '{print substr($4, 2, 17)}' access.log | uniq -c

# look at the last 5 minutes of a log via timestamp
since=$(date -d '5 minutes ago' '+%H:%M:')   # Linux
grep "$since" /var/log/syslog
```

The `--line-buffered` flag on `grep` is essential when reading a
slow-flowing live log; without it, output is block-buffered and
your filtered view stays empty until enough matching bytes
accumulate.

### Working with structured data

For genuinely structured data — JSON, YAML, XML, CSV with
embedded commas — the classic UNIX tools produce wrong answers
on edge cases. Reach for the right tool:

- **JSON**: `jq` is the standard. `jq '.users[] | .email'` to
  pull a field; `jq -r` for raw output (no JSON quoting).
- **YAML**: `yq` (the Python `yq` is a `jq` wrapper that converts
  YAML to JSON; the Go `yq` is its own thing). Or `python -c
  'import yaml,sys; print(yaml.safe_load(sys.stdin))'`.
- **XML**: `xmlstarlet`, or `xmllint --xpath`.
- **CSV**: `csvkit` (`csvgrep`, `csvcut`, `csvjoin`,
  `csvstat`), or `mlr` (Miller). They both handle quoted fields
  with embedded commas correctly.

```bash
# JSON: extract email addresses from a list of users
jq -r '.users[].email' < users.json

# YAML: get a deep field
yq '.spec.template.spec.containers[0].image' < pod.yaml

# CSV with embedded commas: get the third column properly
csvcut -c 3 data.csv

# XML: extract every <title> element's text
xmlstarlet sel -t -m '//title' -v . -n book.xml
```

The line `cat data.csv | awk -F, ...` will silently produce wrong
output on rows with quoted fields containing commas. `csvkit` or
`mlr --csv` handles them correctly.

### Top-of-stack recipes

A few more pipelines worth keeping near the top of your head:

```bash
# longest line in a file
awk '{print length, $0}' file | sort -rn | head -1 | cut -d' ' -f2-

# files in a directory by line count
find . -type f -name '*.py' -exec wc -l {} + | sort -n

# disk hogs in current dir
du -h --max-depth=1 . | sort -h

# 10 largest files in a tree
find . -type f -printf '%s %p\n' | sort -rn | head | numfmt --field=1 --to=iec

# transpose a matrix (rows ↔ columns), assuming whitespace-separated
awk '{for(i=1;i<=NF;i++) a[NR,i]=$i; if(NF>m) m=NF} END{for(i=1;i<=m;i++){for(j=1;j<=NR;j++) printf "%s%s", a[j,i], (j==NR ? "\n" : " ")}}' file

# sum a column of human-formatted bytes
numfmt --from=auto < sizes | awk '{s+=$1} END{print s}'
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `sed -i` works on Linux but errors on macOS | BSD `sed` requires an extension argument after `-i` | Use `sed -i.bak '...'` (works on both); or `sed -i ''` on macOS only |
| `egrep`/`fgrep` deprecation warning | Modern GNU `grep` warns about the legacy aliases | Use `grep -E` and `grep -F` instead |
| ERE pattern (`+`, `?`, `(...)`) does nothing or matches the literal character | You used `grep` without `-E` (BRE default) | Add `-E`, or backslash-escape the metacharacters |
| `\d`, `\w`, `\s` match nothing | Standard BRE/ERE don't have them | Use `[0-9]`, `[A-Za-z0-9_]`, `[[:space:]]`, or switch to `grep -P` / `rg -P` |
| Pattern silently produces no output | Greedy match consumed too much, or pattern needed a different anchor | Add `\b` boundaries; use non-greedy in PCRE; check what's actually in the file with `cat -A` or `hexdump -C` |
| Pipeline stalls; nothing appears for a long time | Block buffering inside an intermediate stage | Add `--line-buffered` to `grep`, or `stdbuf -oL ...` to other tools, or use `unbuffer` from `expect` |
| Pipeline produces nothing in CI but works locally | Locale difference; `[a-z]` matches different things | Set `LC_ALL=C` explicitly in the script |
| Output looks normal but downstream tool says "no records" | CRLF line endings (Windows) | `tr -d '\r'` or `dos2unix` before processing |
| `awk -F:` only splits where you expect, but `cut -d:` splits differently | `awk` collapses runs of whitespace under default `FS=" "` but treats `-F:` as a literal single character; `cut -d:` always treats it as literal | Both behave consistently if you understand the rules; for whitespace runs, use `awk` default; for single-character delimiters, both work |
| `awk` script silently does the wrong thing on numbers | A field interpreted as a string when you expected numeric | Force numeric: `$3+0`, or use `+0` somewhere in the chain |
| `sort` orders things weirdly across systems | Locale-sensitive collation | `LC_ALL=C sort` for byte-order |
| Substitution stops at the first match per line | Forgot the `g` flag in `sed` | `sed 's/foo/bar/g'` for global within line |
| `grep -P` not supported | grep built without PCRE; common on BSD | `pcregrep` instead, or `rg -P` |
| `grep` shows `Binary file foo matches` instead of contents | Auto-detected as binary | `grep -a` to force text, `--binary-files=text` |
| `awk` says `cmd. line:1: syntax error` on a regex containing `/` | The `/` ended the regex literal | Escape with `\/` inside a regex literal, or assign the regex to a variable: `pat="..."; awk -v p="$pat" '$0 ~ p'` |
| `sed` script with a `\n` in the replacement does the wrong thing on macOS | BSD `sed` doesn't interpret `\n` in the replacement | Use a literal newline (escape with backslash before it), or switch to `gsed` |
| `find` with `-exec` is too slow on a big tree | One process per file | Use `-exec ... +` or pipe to `xargs` for batching |
| `xargs` produces "argument list too long" | Hits the kernel limit on argv size | `xargs` is meant to handle this; check that you aren't pre-expanding a glob that grew too big — use `find` instead |
| Pattern with `$` inside double quotes does the wrong thing | Shell expanded `$pattern` before `sed` saw it | Single-quote, or escape: `\$` |
| `sed`/`awk` reading my CSV gets the wrong field for rows with quoted commas | These tools don't understand quoted CSV | Use `csvkit` or `mlr --csv` |
| `column -t` lines up wrong on records with embedded multibyte | column-counts bytes, not characters, in some implementations | Use a recent `util-linux`; or `mlr --opprint cat` |
| `wc -l` returns one less than I expected | The file's last line isn't terminated by a newline | Either fix the file (`echo >> file`) or use `awk 'END{print NR}'` |

## Gotchas

A collection of foot-guns that catch experienced people.

### Locale traps

The single biggest source of "this works on my machine" pain is
locale. `[a-z]` is a *range* in the current locale, not "ASCII
lowercase letters". In a UTF-8 locale that knows about diacritics,
`[a-z]` may match `é`, `ö`, and so on; or it may match a different
range entirely depending on collation rules. The safe disciplines:

- **In scripts**, set `LC_ALL=C` at the top. This pins the locale
  to plain bytes for every stage of the pipeline. The behaviour
  is portable and predictable.
- **For Unicode-correct character classes**, use POSIX class names
  inside a UTF-8 locale: `[[:alpha:]]` is the locale-aware way to
  say "any letter", `[[:lower:]]` for lowercase, etc. These work
  consistently across `grep`, `sed`, `awk`, and `tr`.
- **Don't use case-insensitive matching across scripts**. `[Aa]`
  is a `2-character set; `(?i)A` (PCRE) handles all the locale
  case-folding rules. For ASCII case insensitivity in any tool,
  `[Aa][Bb][Cc]` is portable and obvious.

### Greedy quantifiers

`*`, `+`, and `{n,m}` are *greedy* in every standard regex
flavour: they match as much as they can. `s/<.*>//g` on the
string `<a> and <b>` matches the entire `<a> and <b>` because
the greedy `.*` extends to the last `>`. Almost certainly not
what you wanted.

The fixes:

- Use a negated class: `s/<[^>]*>//g` matches `<` followed by
  anything that's not `>`, which is the right thing for one-line
  HTML tags.
- Use non-greedy quantifiers (PCRE only): `<.*?>` matches the
  shortest possible string between `<` and `>`. Available with
  `grep -P`, `pcregrep`, `rg -P`, Perl, Python, Ruby.

### Regex on lines that span lines

`sed`, `grep`, `awk` are line-oriented by default. A pattern that
crosses a newline doesn't match because the boundary isn't part of
the pattern space.

If you genuinely need cross-line matching:

- `sed` with `N` and `D` (read more lines, then process) — works
  but is awkward.
- `awk` with `RS=""` (paragraph mode) — easy when records are
  paragraphs.
- `awk` with `RS=` set to a custom regex (`gawk`) — fully
  general.
- `grep -Pz` with `(?s)` — works for fixed-shape multi-line
  patterns.
- A real scripting language — almost always the right move once
  the pattern stops fitting on one screen.

### Backslashes get eaten by the shell

Single-quote your patterns. Always. Single-quoted strings pass
backslashes through unchanged. Double-quoted strings let the
shell process backslash escapes for `$`, `` ` ``, `\`, `"`, and
newline; everywhere else the backslash is preserved.

```bash
echo "$HOME"         # interpolated
echo '$HOME'         # literal $HOME
echo "\$HOME"        # literal $HOME
grep '\d+' file      # works (shell preserves \d+)
grep "\d+" file      # also works on most shells, but fragile
grep "\\d+" file     # double-escape, only sometimes needed
```

When in doubt, use single quotes; the worst case is that you
needed shell interpolation, in which case adopt the
"single-quote-and-concatenate" idiom: `'before-'"$VAR"'-after'`.

### `cd` traps when running from a script

`grep`, `sed`, `awk` invoked from a script run wherever the
script is run from. Their relative file arguments are resolved
relative to the current working directory of the calling shell,
not to the script's own directory. Be explicit about absolute
paths, or `cd` to a known directory at the top of the script.

### `awk` thinks numbers are strings sometimes

`awk` does dynamic type promotion based on context. Comparisons
between two strings of digits do *string* comparison if the type
ambiguity tilts that way:

```awk
{ if ($1 < "10") print }   # "9" < "10" is FALSE because "9" > "10" lexicographically
{ if ($1+0 < 10) print }   # forces numeric
```

Adding `+0` to a string forces it through `awk`'s number-coercion
machinery. The result is `0` for non-numeric input, an integer or
float for numeric input.

### `sort -u` and `uniq` aren't equivalent

`sort -u` keeps the first occurrence of each unique line in the
sorted order. `sort | uniq` does the same. `uniq` alone (without
`sort`) only collapses *adjacent* duplicates. So `cat a a b b a a |
uniq` returns `a b a`, not `a b`.

When de-duplication needs to preserve the original order (not
sort), the right tool is `awk '!seen[$0]++'`.

### `tr` is byte-level, not character-level

`tr 'a-z' 'A-Z'` works on ASCII but won't uppercase é, ñ, or any
other multi-byte character. For locale-aware case conversion in a
pipeline, use `awk '{print toupper($0)}'` or
`sed 's/.*/\U&/'` (GNU `sed`).

### `sort -n` vs `sort -V` vs `sort -h`

These three flags handle different kinds of "looks like a number":

- `-n` — leading numeric (integer or float). `1 < 9 < 10`.
- `-h` — human-numeric. `1K < 1M < 1G`. Useful for `du -h` output.
- `-V` — version sort. `1.2.10 > 1.2.9`. Useful for filenames or
  releases.

Picking the wrong one is silent and confusing. `ls | sort -V` to
view files in the natural order most humans expect.

### `head`/`tail` and pipelines

`head` exits as soon as it has its lines. Upstream commands get a
`SIGPIPE` and (depending on signal handling) may terminate
abnormally. Most tools handle this fine; the exception is when an
upstream stage is doing aggregation work that doesn't write until
EOF. In that case, `head` triggers a `Broken pipe` error from
upstream. The fix is usually to do the aggregation differently
(e.g. compute partial results) or remove the `head`.

### `find -delete` vs `find -exec rm`

`-delete` is faster but skips the predicate evaluation order
guarantees. If you have `find ... -name '*.tmp' -newer foo
-delete`, double-check by replacing `-delete` with `-print` first.
A single misplaced flag can mass-delete the wrong things.

### Empty grep on no matches is success or failure?

`grep` exits **1** when there are no matches, **0** when there
are, and **2** for errors. This means in a strict-mode (`set -e`)
shell script, an unmatched `grep` aborts the script. The standard
mitigation:

```bash
matches=$(grep pattern file || true)
```

The `|| true` swallows the non-zero exit so `set -e` doesn't fire.

---

## Regex by example: a compendium

A reference of the patterns that come up over and over in real
work. Each pattern is in ERE form (drop the `-E` and add
backslashes for BRE; use `grep -P` for the PCRE-only ones, which
are marked).

### Whitespace and emptiness

| Pattern | Matches |
| --- | --- |
| `^$` | An empty line. |
| `^[[:space:]]*$` | A blank line (only whitespace). |
| `^\s*$` (PCRE) | Same, more compact. |
| `[[:space:]]+` | Run of whitespace. |
| `\s+` (PCRE) | Same. |
| `^[[:space:]]+` | Leading whitespace. |
| `[[:space:]]+$` | Trailing whitespace. |
| `^\S` (PCRE) | Line that doesn't start with whitespace. |

### Identifiers and words

| Pattern | Matches |
| --- | --- |
| `[A-Za-z_][A-Za-z0-9_]*` | C-style identifier. |
| `[A-Z][A-Z_]+` | All-caps word (constants). |
| `[a-z]+(-[a-z]+)*` | kebab-case word. |
| `[a-z]+(_[a-z]+)*` | snake_case word. |
| `[A-Z][a-z]+(?:[A-Z][a-z]+)*` | CamelCase word. |
| `\bthe\b` | The word "the" (PCRE). |
| `\<the\>` | The word "the" (GNU BRE/ERE). |

### Numbers

| Pattern | Matches |
| --- | --- |
| `[0-9]+` | One or more digits. |
| `-?[0-9]+` | Optionally negative integer. |
| `[+-]?[0-9]+` | Signed integer. |
| `[0-9]+\.[0-9]+` | Decimal number. |
| `[+-]?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?` | Float with optional exponent. |
| `0[xX][0-9a-fA-F]+` | C-style hex literal. |
| `0[0-7]+` | C-style octal. |
| `[0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?` | Number with thousands separators. |

### IP addresses and networking

| Pattern | Matches |
| --- | --- |
| `([0-9]{1,3}\.){3}[0-9]{1,3}` | Loose IPv4. |
| `\b((25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])\.){3}(25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])\b` | Strict IPv4 (each octet 0–255). |
| `[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){7}` | IPv6 (no `::`). |
| `[0-9a-fA-F:]{2,39}` | IPv6 (loose). |
| `\b[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}\b` | MAC address. |

### URLs and emails

| Pattern | Matches |
| --- | --- |
| `https?://[^\s]+` | URL (very loose). |
| `https?://[A-Za-z0-9.-]+(/[^\s]*)?` | URL (still loose). |
| `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` | Email (loose). |

There is no good "validate every email" regex; the formal
specification permits patterns most validators reject. For
log mining, the loose patterns above are usually enough.

### Time and dates

| Pattern | Matches |
| --- | --- |
| `[0-9]{4}-[0-9]{2}-[0-9]{2}` | ISO date `YYYY-MM-DD`. |
| `[0-9]{2}:[0-9]{2}(:[0-9]{2})?` | Time `HH:MM` or `HH:MM:SS`. |
| `[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z\|[+-][0-9]{2}:?[0-9]{2})?` | RFC 3339 / ISO 8601. |
| `[A-Z][a-z]{2} +[0-9]{1,2} [0-9]{2}:[0-9]{2}:[0-9]{2}` | Syslog timestamp `Jan 23 12:34:56`. |

### Quoted strings

| Pattern | Matches |
| --- | --- |
| `"[^"]*"` | Double-quoted string with no escapes. |
| `"(\\.\|[^"\\])*"` (PCRE) | Double-quoted string with backslash escapes. |
| `'[^']*'` | Single-quoted string. |

For more elaborate quoting (here-docs, multi-line strings,
language-specific escapes), regex is the wrong tool — use a
proper parser.

### Common log-line shapes

| Pattern | Matches |
| --- | --- |
| `^[A-Z][a-z]{2} +[0-9]{1,2} [0-9:]+` | Syslog line start. |
| `\[[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9:]+\]` | Bracketed `[YYYY-MM-DD HH:MM:SS]`. |
| `^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ - - \[` | Common Log Format prefix. |
| `level=(DEBUG\|INFO\|WARN\|ERROR\|FATAL)` | Logfmt level field. |

---

## Version notes

### grep

- **GNU grep**: the dominant Linux implementation. Recent versions
  warn about `egrep`, `fgrep`, and `GREP_OPTIONS` as deprecated.
  Use `grep -E`, `grep -F`, and a shell alias instead.
- **BSD grep** (macOS default): supports `-E`, `-F`, `-G`, plus the
  common output-control flags. Does **not** support `-P`. Slower
  on huge inputs than GNU.
- `pcregrep` is the standalone PCRE implementation and works the
  same as `grep -P` in practice.
- `ripgrep` (`rg`) is a modern alternative, faster on tree-wide
  searches, gitignore-aware, with PCRE2 via `-P`. Not POSIX
  but ubiquitous in developer environments.

### sed

- **GNU sed** supports `-E` and `-r` for ERE, the `\u`/`\U`/`\l`/`\L`
  case-translation escapes, address steps `0~N`, comma-plus
  ranges `addr,+N`, the `Q` and `T` commands, and reading scripts
  from stdin with `-`.
- **BSD sed** (macOS) is more conservative. The big practical
  differences:
  - `-i` requires an argument: `-i ''` for no backup, `-i .bak`
    for backup. The portable form `-i.bak` works on both.
  - No `\n` in replacement text (use a literal escaped newline).
  - No `\u`/`\U`/`\l`/`\L` case translation.
  - No `Q` or `T`.
- `gsed` (Homebrew on macOS) gives you GNU `sed` behaviour
  alongside BSD `sed`.

### awk

- **gawk** (GNU): the de facto Linux `awk`. Adds regex `RS`,
  named patterns, `gensub()`, multi-dimensional arrays, `nextfile`,
  `BEGINFILE`/`ENDFILE`, sorted `for ... in`, internationalisation,
  bit operations, time functions, dynamic library loading,
  profiling, two-way I/O to coprocesses, raw socket I/O.
- **mawk**: Mike Brennan's fast implementation. Strict POSIX +
  `nawk` extensions; faster than gawk on simple programs.
- **BSD awk** (macOS): a derivative of `nawk`. Supports the
  POSIX/`nawk` features but not gawk's.
- **bwk awk**: Brian Kernighan's reference implementation, the
  "one true awk".
- All modern `awk` implementations support user-defined functions,
  the `in` operator, command-line `-v` assignment, dynamic regex
  separators with `-F`, and the standard built-in functions.

### Date and number formatting helpers

- `numfmt` (GNU coreutils) — convert between human-readable and
  machine-readable numbers. `numfmt --to=iec` to format, `--from=auto`
  to parse.
- `date` — POSIX has a basic interface; GNU `date` adds `-d`
  for date arithmetic and a rich format string. BSD `date` uses a
  different `-r` and `-v` interface.

### POSIX baseline vs GNU/BSD extensions

If you need maximum portability (your script will run on Solaris,
AIX, macOS, BusyBox, ancient Linux):

- Stick to BRE for `grep` and `sed` patterns.
- Use `-e CMD` and `-f FILE`, not the unmarked positional pattern
  argument, when supplying multiple commands.
- Avoid `-i` for `sed` in-place editing; rewrite to a temp file
  and `mv` it back.
- Avoid `awk` features beyond the POSIX intersection: no `gensub`,
  no `asort`, no `ENVIRON`, no `PROCINFO`, no `nextfile`.

For "modern Linux + macOS with developer tools installed", the
intersection is much wider: ERE everywhere, `-i.bak`, `awk`'s
`nawk` features, POSIX character classes.

When in doubt, write a small test:

```bash
sed --version 2>/dev/null | head -1
awk --version 2>/dev/null | head -1
grep --version | head -1
```

A blank or `--version` error is a hint that you're on a BSD
toolchain.

