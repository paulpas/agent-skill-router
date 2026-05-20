---
title: "Linux CLI — Quick Reference"
audience: "Engineers who use a Linux command line several times a week and want one page that consolidates the everyday tools."
status: "complete"
---

# Linux CLI
### A Quick Reference for the Working Engineer's Toolbox

---

> The Linux command line is a programming language disguised as a
> conversation. You type a single line, the shell parses it, looks up
> each word, and turns it into a chain of small programs feeding each
> other through pipes. The set of "small programs" is enormous — a
> typical Linux box ships with thousands of executables — but a few
> dozen of them carry the weight of almost everything you'll do at the
> command line. This card is the long form of those few dozen.
>
> The card is organised by what you want to *do*. Files, then
> processes, then users and permissions, then archives and packaging,
> then networking, then system inspection, then a survey of the small
> utilities that round out the toolkit. Where the same problem can be
> solved with several tools, the card explains why one is preferable
> to another for which kinds of work.
>
> Wherever the GNU and BSD versions diverge in interesting ways
> (`ps`, `sed`, `tar`, `find -delete`, `stat`, `readlink -f`, etc.),
> the differences are called out. Where modern alternatives have
> displaced classical commands (`ss` for `netstat`, `ip` for
> `ifconfig`, `journalctl` for log files, `ripgrep` for `grep -r`),
> both are covered.

## When to reach for this card

- You're sitting at a terminal and need to remember the exact flag
  for a tool you've used a hundred times.
- You're writing or reading a shell script and want to lean on the
  right small tool rather than re-implementing it.
- You're inheriting a server, a Docker image, or a CI pipeline and
  need to inspect what's running, what's installed, and what's
  failing.
- You're trying to construct a one-line pipeline that solves a
  problem that would otherwise take a full Python script.
- You're translating between distributions: `apt` on Debian/Ubuntu
  vs. `dnf` on Red Hat-family vs. `pacman` on Arch, or between Linux
  conventions and BSD/macOS conventions.

## When not to reach for this card

- For the deep details of `bash` as a programming language — that's
  the Bash Quick Reference. This card mentions enough shell
  scripting to drive its examples, but the heavy lifting is over
  there.
- For regex / `grep` / `sed` / `awk` / pipeline composition in
  full — that's the Text Processing Quick Reference. This card
  references the tools and shows the day-to-day forms; the deeper
  treatment lives in the Text Processing card.
- For DNS-specific queries and `BIND` — that's in the DNS and
  Networking card. This card covers the network utilities engineers
  reach for *outside* of DNS work (ping, traceroute, ss, ip,
  ssh, scp, rsync, curl, wget).

## Mental model

UNIX hands you a small composable kit: programs that read text on
stdin, write text on stdout, exit with a status code, and do exactly
one thing. The shell glues them together with pipes (`|`),
redirection (`>`, `<`, `>>`, `2>&1`), background jobs (`&`), command
substitution (`$(...)`), and a search-path-driven command lookup. Most
problems decompose into a chain of small programs.

A few principles worth holding in your head:

1. **Everything is a file.** Regular files, directories, symbolic
   links, sockets, pipes, devices, even the running kernel's state
   (`/proc`, `/sys`) all appear in the filesystem. Tools that take a
   file argument can almost always operate on any of them.
2. **Programs default to silence on success.** A successful
   `cp foo bar` prints nothing. The exit code is the contract; stdout
   is for data. This makes scripting predictable.
3. **stdin / stdout / stderr** are three independent channels. Most
   tools write data to stdout and diagnostics to stderr. A pipe
   threads stdout into the next stage's stdin; stderr stays on the
   terminal unless you redirect it.
4. **Globs and word splitting happen before the command runs.** When
   you type `cat *.log`, the shell expands the glob into a list of
   filenames before `cat` ever sees them. `cat` doesn't know it was
   given a wildcard. This is why filenames with spaces or globs that
   match nothing cause surprising behavior — the shell did the
   substitution and the program got what was left.
5. **Commands compose vertically, not horizontally.** A long pipeline
   reads top-to-bottom: each `|` is a stage. Adding a stage is
   cheaper than rewriting an existing one. Many problems that look
   complex collapse to four or five short pipeline stages.
6. **Filesystem layout is a map of intent.** `/etc` is configuration,
   `/var` is mutable data, `/usr` is system-installed software,
   `/home` is users, `/tmp` is throwaway, `/dev` is devices, `/proc`
   and `/sys` are kernel state. Knowing the map saves you from
   `find /` searches.

The rest of this card is the long form of those six principles.

## A note on conventions

Throughout this card, examples that show interactive use mark the
prompt with `→` so the command and its output are visually distinct:

```
→ ls -l README.md
-rw-r--r-- 1 you you 1632 May 17 09:22 README.md
```

A bare `$` prompt indicates a regular user shell; a `#` prompt
indicates a root / superuser shell. When examples assume `sudo`, that
is shown explicitly.

---

## Filesystem layout, navigation, and listing

### The standard layout

Every Linux distribution roughly follows the *Filesystem Hierarchy
Standard* (FHS). The conventional locations:

| Path | Holds |
| --- | --- |
| `/` | The root of everything. |
| `/bin`, `/sbin` | Essential user and system binaries. On modern systems usually symlinks to `/usr/bin` and `/usr/sbin`. |
| `/usr/bin`, `/usr/sbin` | The bulk of installed user/system commands. |
| `/usr/local/bin`, `/usr/local/sbin` | Software installed manually rather than through the package manager. |
| `/lib`, `/lib64`, `/usr/lib` | Shared libraries (`.so` files) used by binaries. |
| `/etc` | System-wide configuration files. Almost everything you tweak as an admin lives here. |
| `/home` | Per-user home directories (`/home/alice`, `/home/bob`). |
| `/root` | The root user's home (a separate location from `/home`). |
| `/var` | Variable data — logs (`/var/log`), spool files, package caches, mail queues, web roots in some distros. |
| `/var/log` | System and application logs. The first place to look when something is broken. |
| `/tmp` | World-writable scratch space, normally cleared on reboot. |
| `/var/tmp` | Same idea, but typically preserved across reboots. |
| `/opt` | Third-party packages that don't follow the FHS layout. |
| `/dev` | Device nodes — `/dev/sda` (a disk), `/dev/null` (the bit bucket), `/dev/random`, `/dev/tty`, etc. |
| `/proc` | Kernel-virtual filesystem exposing process and kernel state as files. `/proc/cpuinfo`, `/proc/meminfo`, `/proc/<pid>/...`. |
| `/sys` | Kernel-virtual filesystem exposing device and driver state. |
| `/boot` | The kernel image, initramfs, and bootloader configuration. |
| `/run` | Runtime state of the system since boot — pid files, sockets, transient configuration. Tmpfs in modern systems. |
| `/mnt`, `/media` | Conventional mount points for additional or removable filesystems. |
| `/srv` | Site-specific data served by the system (web roots, ftp roots) on some distros. |

The FHS is more a guideline than a rule, and individual distributions
move things around. When you're looking for a file by name across
multiple distros, `which`, `whereis`, `command -v`, and `locate` will
find it faster than guessing.

### Navigating

```
pwd                       # print working directory (absolute path)
cd /var/log               # absolute path
cd ../etc                 # relative
cd                        # back to $HOME
cd ~                      # same — ~ is $HOME
cd ~alice                 # alice's home
cd -                      # back to the previous directory
pushd /tmp                # push current onto stack and move to /tmp
popd                      # pop and return
dirs -v                   # show the directory stack
```

`pushd`/`popd`/`dirs` form a directory-stack navigation system that
some people swear by; if you're constantly hopping between two or
three directories, they reduce the cognitive load.

### Listing files (ls)

```
ls                        # current directory, terse
ls -l                     # long format: type, permissions, links, owner, group, size, mtime, name
ls -lh                    # human-readable sizes (4.0K, 1.2M, 3.4G)
ls -la                    # include hidden files (anything starting with .)
ls -lA                    # like -la but exclude . and .. themselves
ls -lt                    # sort by modification time, newest first
ls -ltr                   # newest at the *bottom*, oldest at the top — handy for tail-like reading
ls -lS                    # sort by size, biggest first
ls -lX                    # sort by extension
ls -li                    # show inode numbers
ls -d */                  # only directories in the current dir (the trailing /)
ls -F                     # decorate names: / for dirs, * for executable, @ for symlinks, | for FIFOs
ls --color=auto           # colour file types (the modern default in interactive shells)
ls -lR | less             # recursive, paged
```

The classical `ls -l` output is worth reading carefully:

```
drwxr-xr-x 2 alice users 4096 May 16 09:22 docs
-rw-r--r-- 1 alice users 1632 May 16 09:22 README.md
lrwxrwxrwx 1 alice users    9 May 16 09:23 latest -> README.md
```

Field by field: type-and-permissions (10 characters), link count,
owner, group, size in bytes, modification time, name. The first
character of the type-and-permissions field is `-` for a regular
file, `d` for a directory, `l` for a symbolic link, `c` for a
character device, `b` for a block device, `s` for a socket, `p` for
a named pipe.

Modern alternatives that some people prefer:

- **`exa` / `eza`** — drop-in `ls` replacements with colour by
  default, git status indicators, and tree mode.
- **`tree`** — recursive-tree display.

### Inspecting one file in depth

```
file foo.bin              # heuristically identify what's in the file
stat foo.bin              # all metadata: size, perms, owner, atime/mtime/ctime, inode, links
stat --format='%s %n' *   # custom format
ls -li foo.bin            # inode number plus the long listing
namei -l /path/to/file    # walk every component of the path, showing perms at each step
readlink latest           # show what a symlink points at
readlink -f latest        # resolve all symlinks, give absolute canonical path
realpath foo              # same idea (modern, GNU coreutils)
```

`stat`, `file`, and `readlink -f` together cover almost any
"what is this file?" question. Use them before you overwrite
anything you're unsure about.

### File globs (shell wildcards)

The shell expands these patterns *before* the command runs:

| Pattern | Matches |
| --- | --- |
| `*` | Any string of zero or more characters (not crossing `/`). |
| `?` | Exactly one character. |
| `[abc]` | Any one of `a`, `b`, `c`. |
| `[a-z]` | Any one character in the range. |
| `[!abc]` (`[^abc]` in bash) | Any one character NOT in the set. |
| `{a,b,c}` | Brace expansion: literally `a` `b` `c` produced as separate words. Distinct from globbing — does not require files to exist. |
| `**` | "Globstar" — recursive any-depth match. Requires `shopt -s globstar` in bash. |

Examples:

```
ls *.log                   # files ending in .log in the current dir
ls *.{md,txt}              # markdown OR text files
ls report-???.csv          # exactly three characters
ls [a-c]*.csv              # starts with a, b, or c
shopt -s globstar
ls **/*.go                 # all Go files at any depth
```

A glob that doesn't match anything passes through to the command as
the literal string by default. `shopt -s nullglob` makes unmatched
globs expand to nothing instead, which is usually safer in scripts.
`shopt -s nocaseglob` makes globs case-insensitive.

### Hidden files

Filenames starting with `.` are hidden by default — `ls` won't show
them, globs like `*` won't match them. They're meant to be
configuration: `.bashrc`, `.gitignore`, `.config/`. To see them:

```
ls -a       # everything including . and ..
ls -A       # like -a but skip . and ..
ls .*       # only the hidden ones (bash)
```

---

## File operations: copy, move, remove, link, create

### cp — copy

```
cp src dst                         # copy a single file
cp src1 src2 src3 dst-dir/         # copy several files into a directory
cp -r srcdir dstdir                # recursive: copy a directory tree
cp -a src dst                      # archive mode: -dpr — preserve perms, ownership, timestamps, links
cp -p src dst                      # preserve mtime and mode (subset of -a)
cp -i src dst                      # interactive: prompt before overwrite
cp -n src dst                      # never overwrite (the safe default for scripts)
cp -u src dst                      # update only — copy if dst is older or missing
cp -v src dst                      # verbose: print every file copied
cp -L src dst                      # follow symlinks (copy what they point at)
cp -P src dst                      # never follow — copy the symlink itself
cp --reflink=auto src dst          # use a copy-on-write reflink if the FS supports (btrfs, xfs)
cp --sparse=always src dst         # preserve sparseness when copying sparse files
```

The `-a` flag is the workhorse for "copy this whole tree without
breaking anything." It implies recursion (`-r`), preserves all
attributes (`-p`), preserves symlinks as symlinks (`-d`), and
operates on directories properly. `cp -a src/ dst/` (with trailing
slashes) and `cp -a src dst` are subtly different — the trailing
slash version copies the *contents* of `src` into `dst`; without it,
you copy `src` as a child of `dst`. Read `man cp` once and pick a
convention you'll stick with.

A common, low-stakes way to copy a tree to a remote host:

```
tar -C srcdir -cf - . | ssh user@host 'tar -C dstdir -xf -'
```

This streams the tarball through ssh and untars on the other side —
preserving permissions, ownership (when run as root), and not making
two passes over the data.

### mv — move and rename

```
mv old new                         # rename
mv file dir/                       # move into a directory (literal trailing /)
mv file1 file2 file3 dir/          # move several files into a directory
mv -i src dst                      # interactive
mv -n src dst                      # no overwrite
mv -u src dst                      # update only — like cp -u
mv -v src dst                      # verbose
```

`mv` within a single filesystem is atomic — the kernel just
updates a directory entry. `mv` across filesystems is implemented as
copy + delete and is *not* atomic; an interruption can leave the
file in a partial state. For large cross-filesystem moves, prefer
`rsync --remove-source-files` so partial transfers can resume.

There is no separate "rename" command in Linux — `mv` does both.
Some distros ship a `rename` command that takes a regex (Perl
flavour on Debian, a different syntax on RHEL); useful for bulk
renames but with a different vocabulary on each distro.

### rm — remove

```
rm file                            # remove a single file
rm file1 file2                     # remove several
rm -i file                         # prompt before each removal
rm -f file                         # force: don't prompt, ignore missing
rm -r dir                          # recursive
rm -rf dir                         # the canonical "delete a tree" flag combination — DANGER
rm -v file                         # verbose
rm --                              # end of options; everything after is a filename, even if it starts with -
rm -- -file                        # remove a file literally named "-file"
```

`rm` does not move files to a trash bin. It removes them. Recovery
is sometimes possible from a journaling filesystem with the right
forensics tools but should not be relied on. Treat `rm -rf` with
respect.

A scripting habit worth adopting:

```
rm -rf -- "${dir:?}"               # use ${dir:?} so an unset $dir aborts instead of running rm -rf /
```

The `${dir:?}` parameter expansion makes the shell error and exit
if `$dir` is empty. The famous `rm -rf "$VAR/"` catastrophe (an
empty `$VAR` becomes `rm -rf "/"`) is the kind of thing this
prevents.

### ln — links

A *hard link* is an additional name for the same inode — the same
file with two paths. A *symbolic link* (or symlink) is a small
special file whose content is a pathname.

```
ln target linkname                 # hard link
ln -s target linkname              # symbolic link (most common)
ln -sf target linkname             # symbolic link, replacing any existing linkname
ln -snf target dirlink             # symlink for a directory (the -n prevents stepping into the existing dir)
```

Practical differences:

- A hard link is indistinguishable from the original — both names
  point to the same data, deleting one doesn't delete the other,
  and changing the data through one is visible through the other.
- A symlink is a separate file containing a pathname. If the target
  is moved or deleted, the symlink becomes "dangling".
- Hard links can't span filesystems (the inode space is per-FS).
  Symlinks can point anywhere.
- Hard links to directories are forbidden on most Linux
  filesystems (they create cycles in the directory graph).
- `ls -l` shows symlinks as `linkname -> target`. `readlink
  linkname` prints the target; `readlink -f linkname` resolves
  all symlinks recursively to the canonical path.

### mkdir — make directories

```
mkdir foo                          # one directory
mkdir -p a/b/c/d                   # make the whole path; do not error if any part exists
mkdir -m 0755 dir                  # create with explicit mode (instead of mode masked by umask)
mkdir -v dir1 dir2                 # verbose
```

`mkdir -p` is the script-friendly form. Without `-p`, `mkdir foo`
fails if `foo` already exists; with `-p` it succeeds idempotently.

### rmdir, rm -d — remove empty directories

```
rmdir foo                          # remove an EMPTY directory
rmdir -p a/b/c                     # remove c, then b, then a if each is empty
rm -d foo                          # GNU coreutils — single empty directory
```

For non-empty directories, use `rm -r`. `rmdir` insisting on emptiness
is a safety feature.

### touch — create empty files and update timestamps

```
touch foo.txt                      # create empty file, or update mtime if it exists
touch -a foo                       # update access time only
touch -m foo                       # update modification time only
touch -t 202504010000 foo          # set to YYYYMMDDhhmm
touch -d '2025-04-01 12:00' foo    # set to a parseable date string
touch -r ref-file foo              # use ref-file's timestamps for foo
```

### Working with multiple files: brace expansion

```
mkdir -p project-{src,test,docs}    # create three directories
touch report-{1..10}.txt             # create 10 files
mv old-{a,b,c}.txt archive/         # move three specific files
cp file{,.bak}                       # copy file to file.bak — the empty alternative trick
```

Brace expansion is a shell feature, not a tool feature. It expands
to literal strings before the command runs. `{a,b,c}` produces
three words; `{1..10}` produces ten; `{a..z}` produces 26.
`{1..10..2}` adds a step.

---

## Permissions, ownership, and umask

Every file in a Linux filesystem has an owner (a user), a group, and
a 9-bit permission set: read/write/execute for the owner,
read/write/execute for the group, read/write/execute for everyone
else.

### Reading the permission string

`ls -l` shows the permissions as a 10-character string:

```
-rwxr-x---
^   first char: file type (- = file, d = dir, l = symlink, c/b = device, s = socket, p = FIFO)
 ^^^ owner permissions: read, write, execute
    ^^^ group permissions: read, no write, execute
       ^^^ other (everyone else): no permissions
```

The execute bit means different things for files and directories:

- On a *file*, execute means the kernel can run it (a binary, or a
  text file with a shebang).
- On a *directory*, execute (often called "search permission")
  means you can `cd` into it and access files by name within it.
  Without execute on a directory, `ls` of it may still work but
  accessing any file inside fails.

Read on a directory means you can `ls` it (see what's there). Write
on a directory means you can create, delete, and rename files in
it — note that this controls *names*, not file contents. Owning a
file gives you no power to change it inside a directory you can't
write.

### Octal notation

Permissions are often expressed as a three-digit octal number.
Each digit is `read*4 + write*2 + execute*1`:

| Octal | Symbolic | Meaning |
| --- | --- | --- |
| 7 | rwx | read + write + execute |
| 6 | rw- | read + write |
| 5 | r-x | read + execute |
| 4 | r-- | read only |
| 3 | -wx | write + execute (rare) |
| 2 | -w- | write only (rare) |
| 1 | --x | execute only (rare) |
| 0 | --- | nothing |

Common combinations: `755` (rwxr-xr-x — typical for executables and
directories), `644` (rw-r--r-- — typical for regular files), `700`
(rwx------ — private), `600` (rw------- — private file like an
SSH private key), `750` (rwxr-x--- — owner full, group read+x,
nobody else), `777` (rwxrwxrwx — open to everyone, almost never
what you want), `400` (r-------- — read-only by owner, used for
keys and one-time secrets).

### chmod — change mode

```
chmod 644 file                  # set permissions absolutely (octal)
chmod 0644 file                 # leading 0 is the same; useful for clarity
chmod 755 dir                   # rwx for owner, rx for group/other
chmod -R 755 dir/                # recursive

chmod +x script.sh               # add execute for owner, group, AND other
chmod u+x script.sh              # add execute only for owner
chmod g+w file                   # add write for group
chmod o-r file                   # remove read from "other"
chmod a+r file                   # add read for all (a = ugo)
chmod u=rwx,g=rx,o= file         # set explicitly: owner all, group rx, other none
chmod u+x,go-w script.sh         # combine in one call
chmod -R u+rwX,go+rX dir/        # capital X = execute only on directories or already-executable files
```

The `X` (capital) trick is genuinely useful for "fix permissions on
this tree" — it adds execute to directories (so they're traversable)
and to files that are already executable, but doesn't add execute to
ordinary text files.

### Special permission bits: setuid, setgid, sticky

Beyond the basic 9 bits, there are three more in a fourth octal
digit:

| Bit | Octal | Symbol | Effect |
| --- | --- | --- | --- |
| setuid | 4xxx | `s` in user-execute slot | Run with the file's owner UID instead of the caller's |
| setgid | 2xxx | `s` in group-execute slot | Run with the file's group GID; on directories, new files inherit the dir's group |
| sticky | 1xxx | `t` in other-execute slot | On directories, only the file's owner can delete it (used on `/tmp`) |

```
chmod 4755 prog                 # setuid + rwxr-xr-x
chmod u+s prog                  # symbolic equivalent
chmod 2755 dir                  # setgid on a directory
chmod g+s dir                   # symbolic
chmod 1777 /tmp                 # sticky bit on a world-writable dir
chmod +t /tmp                   # symbolic
```

Setuid binaries are a privilege-escalation surface; minimise their
number, audit their permissions, and treat any new one with
suspicion. The sticky bit is what keeps `/tmp` from becoming a
free-for-all where anyone can delete anyone else's files.

### chown / chgrp — change owner and group

```
chown alice file                 # change owner
chown alice:devs file            # change owner AND group
chown :devs file                 # change group only
chown -R alice:devs dir/         # recursive

chgrp devs file                  # change group only (older alternative to chown :group)
chgrp -R devs dir/               # recursive
```

Only root can change an arbitrary file's owner. A regular user can
`chgrp` a file they own to any group they're a member of.

To change permissions on the *symlink itself* rather than the
target, use `chmod -h` (where supported) or `chown -h`. Symlinks on
Linux generally don't have meaningful permission bits — operations
go through to the target.

### umask — default permissions for newly created files

When a process creates a file, the kernel uses a *requested* mode
(typically `0666` for files and `0777` for directories), and the
process's umask is bitwise-NANDed against it to clear bits.

```
umask                            # show the current umask (octal, e.g. 0022)
umask 022                        # set: clear group/other write bits → files 644, dirs 755
umask 0027                       # files 640, dirs 750 (no other access at all)
umask 077                        # files 600, dirs 700 (private)
umask -S                         # show in symbolic form
umask -S u=rwx,g=rx,o=           # set in symbolic form
```

`umask` is a shell builtin and applies to the current shell and any
processes it spawns. Set it in your shell rc (`.bashrc`,
`.zshrc`) for personal default; set it in `/etc/profile` for system
default. Daemons typically reset their umask explicitly at startup.

### File ACLs (POSIX ACLs)

For permissions beyond the standard owner/group/other model,
filesystems that support it (most Linux filesystems do) offer
*Access Control Lists*:

```
getfacl file                     # show ACLs
setfacl -m u:bob:rwx file        # grant bob rwx on file
setfacl -m g:devs:rx file        # grant the devs group r-x
setfacl -x u:bob file            # remove bob's ACL
setfacl -b file                  # remove ALL ACLs
setfacl -d -m u:bob:rwx dir/     # default ACL on a directory — inherited by new entries
```

A `+` in `ls -l`'s permission column indicates that the file has
ACLs beyond the basic mode. `getfacl` shows the full picture.

ACLs solve "I need user X to have access without changing the file's
group" without resorting to creating new groups. They're widely
supported but easy to forget about — when troubleshooting "why can
this user read this file?", check `getfacl` as well as the basic
mode.

### Linux capabilities

Some operations historically required root (binding to a low port,
changing the system clock, sending raw network packets). *Linux
capabilities* break root's powers into individual flags that can
be granted to a binary or process.

```
getcap /usr/bin/ping             # show capabilities on a file
setcap cap_net_raw+ep /usr/local/bin/myprog   # grant raw-socket capability
capsh --print                    # show the calling process's capabilities
```

`ping` not being setuid-root anymore on modern Linux is because it
gets `cap_net_raw` instead — a much narrower elevation.

### Real, effective, saved, filesystem UIDs

When `sudo` runs a command as root, or when a setuid binary
executes, the process gets multiple identity slots:

- **Real UID** — who the user actually is.
- **Effective UID** — what the kernel uses for permission checks.
- **Saved set-UID** — preserves the original effective UID across
  privilege drops, so a privileged program can give up its
  privileges and reclaim them later.
- **Filesystem UID** — Linux-specific; rarely matters in practice.

`whoami` shows the effective UID. `id -u` shows the real UID. `id`
with no arguments shows them all (when they differ).

```
→ logname                         # real login name (the original)
alice
→ sudo logname
alice                             # still alice — logname doesn't follow sudo
→ whoami                          # effective name
alice
→ sudo whoami
root                              # under sudo, the effective UID is 0
```

---

## Reading and inspecting files

### cat, less, more, head, tail

```
cat file                         # whole file to stdout
cat file1 file2                  # concatenate several
cat -n file                      # number all lines
cat -b file                      # number non-blank lines only
cat -A file                      # show all non-printables: tabs as ^I, line ends as $, others as M-x
cat -s file                      # squeeze runs of blank lines into one
cat -T file                      # show tabs as ^I
```

`cat` is the simplest filter — pass-through. The "useless use of
`cat`" debate (`cat file | cmd` vs `cmd < file`) is mostly an
interactive-vs-script style choice; both work, and on small files
you'll never notice the difference. Use whichever reads more
naturally for you.

```
less file                        # paged view; q to quit, /pat to search forward, ?pat backward, n / N for next match
less +F file                     # follow mode — like tail -f but with all of less's navigation
less -S file                     # don't wrap long lines (chop instead)
less -N file                     # show line numbers
less -X file                     # don't clear the screen on exit
less -R file                     # render ANSI colour escapes
less +123 file                   # open at line 123
less +/pat file                  # open at the first match of pat
```

`less` is *less is more* — a much-improved successor to `more`. Use
`less` interactively; learn `/`, `?`, `n`, `N`, `g` (top), `G`
(end), `:n` (next file), `:p` (previous file), and `&pat`
(filter to matching lines). The `+F` mode is invaluable for
following a log; press Ctrl-C to stop following without leaving
`less`.

```
more file                        # the older pager; press space, b, q
```

`more` is still around for compatibility but `less` is universally
better.

```
head file                        # first 10 lines
head -n 50 file                  # first 50
head -n -5 file                  # everything except the last 5 (GNU extension)
head -c 1024 file                # first 1024 bytes
head file1 file2                 # first 10 of each, with banners

tail file                        # last 10 lines
tail -n 50 file                  # last 50
tail -n +50 file                 # from line 50 to end
tail -c 1024 file                # last 1024 bytes
tail -f file                     # follow as the file grows (canonical for log watching)
tail -F file                     # follow even through rename/rotation (GNU)
tail -f file --pid=PID           # stop following when process PID exits
```

`tail -F` is the right choice for `logrotate`d files — it survives
the underlying file being renamed and a new file being created at
the same path. `tail -f` does not.

`head` and `tail` together extract a line range:

```
head -n 100 file | tail -n 21    # lines 80–100
sed -n '80,100p' file            # the same with sed
awk 'NR==80,NR==100' file        # the same with awk
```

For very large files where you want a sample from the middle, the
sed/awk forms are O(n) but don't have to materialise lines 1–80
into memory the way the head/tail pipeline does — though in
practice both work fine.

### tac and rev

```
tac file                         # reverse line order — last line first
tac --separator='|' f            # custom record separator
rev file                         # reverse the characters in each line
```

`tac` ("cat" backwards) is great for reading chronologically-ordered
logs newest-first. On macOS, `tac` is not installed by default;
either install GNU coreutils via Homebrew (`gtac`) or use
`tail -r` (BSD-only). `rev` is a curiosity — useful for tasks like
"sort by file extension" via `rev | sort | rev`.

### wc — count

```
wc file                          # lines, words, bytes (3 numbers)
wc -l file                       # just lines
wc -w file                       # just words
wc -c file                       # just bytes
wc -m file                       # just characters (locale-aware)
wc -L file                       # length of the longest line
wc -l *.py                       # per-file plus total
wc -l < file                     # without filename in output (read from stdin)
```

`wc -l < file` is the trick to suppress the filename when you only
want the count.

### file — what is this?

```
file foo                         # heuristically identify
file -i foo                      # MIME type
file -b foo                      # don't print the filename, just the type
file *                           # type of every file in the current dir
```

`file` reads the first few bytes and consults a database of "magic
numbers" (file-type signatures). It will tell you a binary is an
ELF 64-bit shared library, that a `.txt` is actually UTF-8 with BOM,
that a `.zip` is a ZIP archive (and even hint at the version), or
that a particular blob is "data" (unrecognised). Indispensable for
"what did I just download?" moments.

### diff — compare files

```
diff a.txt b.txt                 # default ed-style output
diff -u a.txt b.txt              # unified format (the one humans read)
diff -c a.txt b.txt              # context format
diff -r dir1 dir2                # recursive
diff -q a b                      # just whether they differ
diff -y a b                      # side-by-side
diff -y -W 200 a b               # side-by-side, 200 columns wide
diff -w a b                      # ignore whitespace differences
diff -i a b                      # ignore case
diff -B a b                      # ignore blank lines
diff <(cmd1) <(cmd2)             # compare two command outputs (process substitution)
```

The unified format is the standard format for patches and code
review:

```
diff -u v1.txt v2.txt > changes.patch
patch < changes.patch            # apply the patch to the original
patch -p1 < changes.patch        # strip one leading path component (typical for git diffs)
patch -R < changes.patch         # reverse-apply (undo)
```

For binary files, `diff` reports "files differ"; use `cmp` for
byte-by-byte comparison.

### cmp — byte-level compare

```
cmp file1 file2                  # silent if identical, prints first difference otherwise
cmp -l file1 file2               # long: print every difference (offset, byte1, byte2 in octal)
cmp -s file1 file2               # totally silent — useful in conditionals
```

`cmp` exits 0 if files match, 1 if they differ, 2 on error. Useful
in scripts:

```
if cmp -s old new; then
  echo "no change"
else
  echo "differs"
fi
```

### shasum, md5sum, sha256sum, b3sum — checksums

```
sha256sum file                   # SHA-256 hash of file
sha256sum file1 file2 > sums.txt # save hashes
sha256sum -c sums.txt            # verify files match the recorded hashes
md5sum file                      # MD5 (insecure for adversarial use; fine for change detection)
shasum -a 256 file               # equivalent on macOS / older systems
b3sum file                       # BLAKE3, a modern fast hash (separate install)
```

Use SHA-256 or stronger for any integrity check that matters.
MD5 and SHA-1 are still routinely used for non-adversarial
change detection, but for anything where an attacker could
craft inputs, prefer SHA-256, SHA-512, or BLAKE3.

### od and hexdump — see the bytes

```
od -c file                       # character + name escapes
od -An -c file                   # without offset addresses
od -An -tx1 file                 # hex bytes, no addresses
od -An -tx1z file                # hex bytes + ASCII annotation
hexdump -C file                  # canonical hex+ASCII (the easy-to-read one)
xxd file                         # similar to hexdump -C
xxd -r dump.txt                  # convert hex dump back to binary
```

`hexdump -C` is the format you've seen in every binary forensic
tool. `xxd -r` round-trips it.

### strings — extract printable text from a binary

```
strings binary                   # default: 4-char minimum
strings -n 8 binary              # 8-char minimum
strings -e l binary              # 16-bit little-endian
strings -t x binary              # show offsets in hex
```

Useful for "what's in this binary?" — copyright strings, version
numbers, hardcoded paths, embedded URLs. Not a substitute for real
reverse engineering but a fast first pass.

---

## Searching for files: find and locate

### find

`find` walks a directory tree applying tests and actions to each
entry it visits. The general form:

```
find STARTING_PATH... [TESTS] [ACTIONS]
```

If you don't specify a `STARTING_PATH`, GNU `find` defaults to `.`
(BSD `find` requires it).

#### Common tests

```
-name 'pattern'                  # filename matches glob (no path components)
-iname 'pattern'                 # case-insensitive name match
-path 'pattern'                  # full path matches glob (use carefully — globs include /)
-regex 'pattern'                 # full path matches regex (default: emacs flavour, change with -regextype)
-type f                          # regular file
-type d                          # directory
-type l                          # symbolic link
-type s                          # socket
-type p                          # named pipe (FIFO)
-type c                          # character device
-type b                          # block device

-empty                            # empty file or directory

-size +100M                      # bigger than 100 MB
-size -10k                       # smaller than 10 KB
-size 0                           # exactly 0 bytes
-size +1G -size -10G              # between 1 and 10 GB

-mtime +30                       # modified more than 30 days ago
-mtime -7                        # modified within the last 7 days
-mmin -60                        # modified within the last 60 minutes
-newer ref                       # newer than ref's mtime
-newermt '2024-01-01'            # mtime newer than that date (GNU)

-user alice                      # owned by user alice
-group devs                      # owned by group devs
-uid 1000                        # owned by uid 1000
-nouser, -nogroup                # owned by a non-existent user/group

-perm 644                        # exact permissions
-perm -644                       # at least these bits set
-perm /222                       # any of these bits set (any write bit)
-perm -u+x                       # symbolic
-readable, -writable, -executable
                                 # current process can do this

-links N                         # has N hard links
-inum N                          # has inode number N
```

#### Combining tests

Predicates are AND-ed implicitly. Use `-o` for OR, `!` or `-not`
for NOT, and `\(` `\)` (escaped) for grouping.

```
find . -name '*.log' -mtime +30
find . \( -name '*.log' -o -name '*.tmp' \) -mtime +30
find . -type f ! -name '*.bak'
find . -type f -not -path '*/.git/*'
```

#### Actions

The default action is `-print`. Useful alternatives:

```
-print                           # default; print matching path
-print0                          # print with NUL terminator instead of newline (xargs-safe)
-printf '%p %s\n'                # custom format (GNU)
-ls                              # like ls -l for each match
-delete                          # delete matching entries (use with caution!)
-quit                            # stop after first match
-prune                           # don't descend further into matched dirs
-exec CMD {} \;                  # run CMD per match; {} is replaced by the path
-exec CMD {} +                   # batch: pass many paths to one CMD invocation (faster)
-execdir CMD {} \;               # run CMD in the directory of the match
-ok CMD {} \;                    # like -exec but prompt before each
```

The semicolon at the end of `-exec` must be quoted (`\;` or `';'`)
to keep the shell from eating it. The `+` form, where supported,
is dramatically faster on large match sets because it batches paths
into one process invocation.

#### Common find recipes

```
# all .log files in /var/log
find /var/log -type f -name '*.log'

# files modified in the last day
find . -type f -mtime -1

# big files
find /home -type f -size +100M

# delete .tmp files older than a week
find /tmp -type f -name '*.tmp' -mtime +7 -delete

# safer: print first, delete after review
find /tmp -type f -name '*.tmp' -mtime +7 -print
find /tmp -type f -name '*.tmp' -mtime +7 -delete

# rename a list of files (NUL-safe)
find . -name '*.JPG' -print0 | xargs -0 -I{} mv {} {}.lower

# permissions repair: 755 for dirs, 644 for files
find tree -type d -exec chmod 755 {} +
find tree -type f -exec chmod 644 {} +

# find files owned by a deleted user (UID still numeric, no name)
find / -nouser

# find SUID/SGID binaries on the system (security audit)
find / -perm /6000 -type f 2>/dev/null

# find broken symlinks
find . -xtype l

# find directories with many small files (potential backup pain)
find . -type d -size +50k                    # the dir's directory entries are big

# count files matching a pattern
find . -name '*.go' -type f | wc -l

# find with multiple actions
find . -name '*.log' -exec gzip {} \; -exec mv {}.gz archive/ \;

# stop descending into specific directories (the -prune trick)
find . -path './node_modules' -prune -o -type f -name '*.js' -print
```

The `-prune` trick is "match this prefix, prune (don't descend),
otherwise (`-o`) take the action." Read it as: "if you find
`./node_modules`, stop; otherwise, the test is to print all `.js`
files."

#### Find vs. xargs

When the action per match is a shell pipeline or a complex
expression, `find ... -print0 | xargs -0 ...` is often cleaner
than `-exec`. The `-print0` / `-0` pairing handles filenames with
spaces, newlines, or other shell-special characters safely.

```
find . -name '*.go' -print0 | xargs -0 wc -l
find . -name '*.log' -print0 | xargs -0 -P 4 -n 50 gzip
                                  # parallelise: 4 jobs, 50 paths each
```

`xargs -P N` parallelises across N jobs — fantastic for converting
"do X to every file in the tree" from sequential to parallel.

### locate / mlocate / plocate

`locate` is a database-backed file search. A daemon (`updatedb`)
periodically scans the filesystem and builds a database of
filenames; `locate` queries the database, which is much faster
than `find` for "where is the file named X?" questions.

```
locate filename                  # any file containing this substring in its full path
locate -i filename               # case-insensitive
locate -b '\filename'            # match basename only (the leading \ is required)
locate -c filename               # count matches instead of listing
locate -r '^/etc/.*\.conf$'      # regex
sudo updatedb                    # rebuild the database now (don't usually need this; it runs nightly)
```

Modern Linux distros ship `mlocate` or its faster successor
`plocate`. The database is at `/var/lib/mlocate/mlocate.db` (or
`/var/lib/plocate/plocate.db`). The database honours the
filesystem permissions of the user running `locate` — files in
directories you can't read won't appear in your results.

`locate` is fast but its results can be stale (up to a day, depending
on `updatedb` cadence). For files that just appeared, you still
need `find`.

### which, whereis, command -v, type

```
which ls                         # path to the executable that would run for `ls`
whereis ls                       # path to executable, source, manpage
command -v ls                    # POSIX-portable equivalent of `which`
type ls                          # bash-specific: shows aliases, functions, builtins, AND executables
type -a ls                       # show ALL matches in $PATH (not just the first)
hash -r                          # rebuild bash's cache of executables (after PATH changes)
```

`type` is the bash-aware tool — it'll tell you that `ls` is aliased
to `ls -F --color=auto`, or that something is a shell function.
`which` only sees executable files.

---

## Searching content: grep and friends

`grep` lives in the Text Processing Quick Reference in full detail.
Here's the day-to-day vocabulary that operators reach for at a
Linux prompt.

```
grep pattern file                # find lines matching pattern
grep -E 'foo|bar' file           # extended regex (or use egrep, but it's deprecated)
grep -F 'literal' file           # fixed string, no regex
grep -i pattern file             # case-insensitive
grep -v pattern file             # invert: lines that do NOT match
grep -n pattern file             # show line numbers
grep -c pattern file             # just count matches
grep -l pattern *.log            # list filenames that match
grep -L pattern *.log            # list filenames that DON'T match
grep -r pattern dir/             # recursive
grep -r --include='*.py' pat .   # only .py files
grep -r --exclude-dir=node_modules pat .
grep -A 2 -B 2 pat file          # 2 lines after, 2 before (context)
grep -C 3 pat file               # 3 lines either side
grep -o pattern file             # only the matching part, one match per line
grep -h ...                      # don't print filename
grep -H ...                      # always print filename
grep -w word file                # match only whole words
grep -x line file                # match only whole lines
grep -e p1 -e p2 file            # multiple patterns (any of them)
grep -f patterns.txt file        # patterns from a file (one per line)
grep -q pat file                 # quiet — for if/while; exit 0/1 only
grep -z pat file                 # input is NUL-separated, not newline-separated
```

Useful idioms reached for repeatedly:

```
grep -lZ foo *.txt | xargs -0 grep -l bar       # files that have BOTH foo AND bar
grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' access.log | sort -u   # IPv4 addresses
grep -Ev '^\s*(#|$)' /etc/ssh/sshd_config       # strip comments and blanks
grep -rn TODO src/                              # all TODOs with line numbers
history | grep ssh                              # what ssh commands have I run?
ps aux | grep -v grep | grep nginx              # find nginx without matching the grep itself
pgrep -af nginx                                 # better way to do that — see process management
```

### Modern alternative: ripgrep (rg)

`rg` is faster, recursive by default, gitignore-aware, and ships
with sane defaults. Same flag conventions for the most part.

```
rg pattern                       # recursive in current dir, respects .gitignore
rg -tpy pat                      # only Python files
rg -F 'literal'                  # fixed string
rg -i pat                        # case-insensitive
rg -A2 -B2 pat                   # context
rg -P 'pat'                      # PCRE2 mode
rg --files-with-matches pat      # like grep -l
rg --files                       # just list files that would be searched
```

If `rg` is installed on your system, it's usually the right
"search this tree" answer. `grep -r` is the universal fallback
when you can't install anything.

### awk and sed

`awk` and `sed` are full programming languages disguised as filters
— they get extended treatment in the Text Processing Quick
Reference. The day-to-day forms you'll reach for:

```
# awk
awk '{print $2}' file              # print 2nd whitespace-separated field
awk -F: '{print $1, $7}' /etc/passwd     # use : as field sep
awk '$3 > 100' file                # rows where col 3 > 100
awk 'NR>1' file                    # skip the header
awk '!seen[$0]++' file             # de-dupe preserving order
awk 'END{print NR}' file           # cheap line count

# sed
sed 's/old/new/g' file             # substitute everywhere
sed -i.bak 's/old/new/g' file      # in-place edit, with backup (portable form)
sed -n '5,10p' file                # print only lines 5-10
sed '/^$/d' file                   # remove blank lines
sed '1d' file                      # remove first line
sed 's/[[:space:]]*$//' file       # strip trailing whitespace
```

---

## Text utilities

A toolkit of small composable filters lives next to the command
line. The Text Processing Quick Reference covers them in full —
this section is the operator's quick lookup.

### sort, uniq

```
sort file                        # ASCII sort
sort -n file                     # numeric (10 after 9, not before)
sort -r file                     # reverse
sort -u file                     # unique while sorting
sort -h file                     # human-numeric: 1K < 1M < 1G
sort -V file                     # version sort: 1.2 < 1.10
sort -k2 file                    # by 2nd whitespace-separated field
sort -t: -k3 -n /etc/passwd      # by 3rd field, numeric, : separator
sort -t, -k2,2 -k1,1 file.csv    # multi-key
sort -R file                     # random shuffle (less uniform than `shuf`)
sort -c file                     # check that the file is already sorted
sort -m sorted1 sorted2          # merge already-sorted files (faster than re-sorting)
LC_ALL=C sort file               # byte-order sort, locale-independent (script discipline)
```

```
uniq file                        # collapse adjacent duplicates
uniq -c file                     # prefix each line with its count
uniq -d file                     # only print duplicates
uniq -u file                     # only print uniques
uniq -i file                     # case-insensitive
sort file | uniq -c | sort -rn   # frequency table — the canonical UNIX idiom
```

`uniq` operates only on *adjacent* duplicates, which is why you
almost always pipe through `sort` first. If you need to de-dupe
while preserving the original order, `awk '!seen[$0]++'` is the
streaming alternative.

### cut, paste, column

```
cut -d: -f1 /etc/passwd               # 1st colon-separated field
cut -d, -f2,5 file.csv                # fields 2 and 5
cut -c1-10 file                       # first 10 characters per line
cut -c5- file                         # from char 5 to end
cut -d$'\t' -f3 file.tsv              # tab-separated; $'\t' is bash's literal tab

paste file1 file2                     # side-by-side, tab-separated
paste -d, file1 file2                 # comma-separated
paste -s file                         # serial: each file's lines into one line
paste -d, -s file                     # serial, comma-joined
seq 1 9 | paste -d, - - -             # rows of three from a sequence (the dash reads stdin)

column -t file                        # align columns nicely
column -t -s, file.csv                # treat input as CSV
column -t -N name,age,city file       # add headings
```

### tr — translate or delete characters

```
tr 'a-z' 'A-Z' < file                 # uppercase
tr 'A-Z' 'a-z' < file                 # lowercase
tr -d '\r' < dosfile.txt              # strip carriage returns
tr -d '[:punct:]' < file              # strip punctuation
tr -s ' ' < file                      # squeeze runs of spaces
tr -cs '[:alnum:]' '\n'               # tokenise: each alphanumeric word on its own line
```

`tr` is byte-level, not regex — it doesn't do string replacement.
For string substitution, `sed`.

### tac, shuf

```
tac file                              # reverse line order
shuf file                             # random permutation of lines
shuf -n 10 file                       # 10 random lines
shuf -i 1-100 -n 5                    # 5 random integers from 1..100
```

### tee, fold, fmt, expand, unexpand, nl

```
make 2>&1 | tee build.log             # write to file AND continue down the pipe
make 2>&1 | tee -a build.log          # append instead of truncate
sudo cmd | sudo tee /etc/something > /dev/null   # write to a root-owned file from a user shell

fold -w 80 file                       # hard-wrap at 80 columns
fold -s -w 80 file                    # break at spaces if possible
fmt -w 72 file                        # paragraph reformat
expand -t 4 file                      # tabs → 4 spaces
unexpand -t 4 -a file                 # spaces → tabs (cautious — only at line starts by default)

nl file                               # number lines (skipping blanks by default)
nl -ba file                           # number ALL lines
cat -n file                           # simpler equivalent for most cases
```

### jq — JSON in pipelines

JSON is structured data; classical pipelines that treat it as plain
text get edge cases wrong (unicode escapes, embedded newlines in
strings, arbitrary key order). `jq` is the right tool.

```
jq . file.json                        # pretty-print
jq -r .name file.json                 # extract field, raw output (no JSON quotes)
jq '.users[].email' users.json        # field of every element in an array
jq '.[] | select(.status=="open")'    # filter
jq -s 'add' files...                  # slurp inputs into array, then add (concatenate)
jq 'keys' obj.json                    # list of top-level keys
jq 'length' file.json                 # length of a string/array/object
jq --arg name foo '.[$name]'           # pass shell variable into the filter
echo '{"a":1,"b":2}' | jq -r '. | to_entries | map("\(.key)=\(.value)") | .[]'
                                       # dump as KEY=VALUE pairs
```

For YAML, `yq` (the Python wrapper or the Go reimplementation) is
the equivalent. For XML, `xmlstarlet` or `xmllint --xpath`. For
CSV, `csvkit` (`csvgrep`, `csvcut`, `csvjoin`, `csvstat`) or `mlr`
(Miller).

---

## Processes and signals

A *process* is a running program. Linux assigns each one a process
ID (PID), tracks its parent (PPID), groups them into process groups
and sessions, and gives them a controlling terminal (TTY) when
they're interactive.

### Listing processes: ps, pgrep, pidof

`ps` is the classical process-listing tool. It has two parallel
flag styles — BSD-style (no leading dash, e.g. `ps aux`) and
SysV-style (leading dash, e.g. `ps -ef`). Most modern `ps`
implementations accept both.

```
ps                               # processes you own from the current terminal
ps aux                           # everyone, BSD style: USER, PID, %CPU, %MEM, VSZ, RSS, TTY, STAT, START, TIME, COMMAND
ps -ef                           # everyone, SysV style: UID, PID, PPID, C, STIME, TTY, TIME, CMD
ps axjf                          # process tree (BSD); sometimes ps fjax
ps -eo pid,ppid,user,comm,etime  # custom columns (SysV)
ps -o pid,comm,rss,etime -p 1234 # specific PID, custom columns
ps --sort=-rss aux | head        # sort by RSS descending — biggest memory hogs first
ps -L -p 1234                    # show threads of one process
```

`pgrep` is the modern, scriptable replacement for `ps | grep`:

```
pgrep nginx                      # PIDs of any process whose name matches
pgrep -af nginx                  # also show full command lines
pgrep -f 'python script\.py'     # match against the full command line
pgrep -u alice                   # only processes owned by alice
pgrep -P 1234                    # children of PID 1234
pgrep -n nginx                   # newest match only
pgrep -o nginx                   # oldest match only
pgrep -d, nginx                  # comma-separated output (handy for piping into kill)
```

```
pidof nginx                      # PIDs by exact name
pidof -s nginx                   # single PID only
```

`pgrep` doesn't include itself in matches the way `ps | grep` does,
so you don't need the `grep -v grep` dance.

### Process tree: pstree

```
pstree                           # tree of all processes
pstree -p                        # show PIDs
pstree -u                        # show usernames
pstree alice                     # only alice's processes
pstree -p 1234                   # tree rooted at PID 1234
```

### Live process display: top, htop

```
top                              # interactive — q to quit, M to sort by memory, P by CPU, k to kill
top -b -n 1                      # batch mode, one snapshot — useful for scripts
top -p 1234,5678                 # only specific PIDs
htop                             # nicer interactive top (separate install on most distros)
```

While `top` is running, useful keys: `M` (sort by memory), `P`
(by CPU), `T` (by time), `R` (reverse current sort), `c` (toggle
full command line), `H` (toggle threads), `1` (per-CPU view),
`u` (filter by user), `k` (kill a PID), `r` (renice), `q` (quit).

`htop` adds colour, mouse support, scrollable command lines, and
nicer kill/renice UIs.

### Memory and load

```
free -h                          # memory in human-readable units
free -h -s 5                     # update every 5 seconds
vmstat 1                         # virtual memory stats every 1 second
vmstat 1 10                      # 10 samples then stop
iostat 1                         # I/O stats (sysstat package)
iostat -x 1                      # extended (per-device queue depths, utilisation)
mpstat -P ALL 1                  # per-CPU stats
sar                              # system activity reports — historical data if sysstat is collecting
uptime                           # current load averages
w                                # who's logged in plus uptime
loadavg                          # not a real command — `cat /proc/loadavg` or `uptime` instead
```

The load averages are 1-minute, 5-minute, and 15-minute averages of
the run-queue length plus uninterruptibly-sleeping processes. A
load of 1.0 on a single-core system means the CPU is fully busy on
average; on an N-core system, full utilisation is roughly N. Read
the trend (rising vs. steady vs. falling) more than the absolute
number.

### Sending signals: kill, killall, pkill

A *signal* is a kernel-mediated message to a process. Common
signals:

| Signal | Number | Meaning |
| --- | --- | --- |
| `HUP` | 1 | Hangup. Many daemons treat this as "reread config." |
| `INT` | 2 | Interrupt. What Ctrl-C sends. Polite request to stop. |
| `QUIT` | 3 | Quit. Requests a core dump. |
| `KILL` | 9 | Forcible termination. Cannot be caught or ignored. |
| `TERM` | 15 | Terminate. The default `kill` signal. Polite request to clean up and exit. |
| `STOP` | 17/19/23 | Pause execution. Cannot be caught. |
| `CONT` | 18/19/25 | Resume after STOP. |
| `USR1`, `USR2` | 10/12 | User-defined; many daemons rebuild caches, rotate logs, etc. on these. |
| `PIPE` | 13 | Wrote to a closed pipe; default action is to terminate. |
| `CHLD` | 17 | Sent to parent when a child changes state. |
| `WINCH` | 28 | Window changed (terminal resize). |

```
kill 1234                        # send TERM to PID 1234
kill -TERM 1234                  # explicit
kill -15 1234                    # numeric form
kill -9 1234                     # SIGKILL — last resort, no cleanup
kill -HUP 1234                   # ask daemon to reload config
kill -l                          # list signal names

killall nginx                    # kill all processes named nginx (Linux; behaves differently on BSD/macOS)
killall -HUP rsyslogd            # reload all rsyslogd processes
killall -u alice                 # all of alice's processes

pkill nginx                      # kill by name pattern (matches comm field)
pkill -f 'python script\.py'     # match against full command line
pkill -u alice                   # all of alice's processes
pkill -SIGUSR1 nginx             # specific signal
```

Always try `kill` (TERM) before `kill -9` (KILL). TERM lets the
process clean up — release locks, flush buffers, write
checkpoints. KILL skips all of that and the kernel reaps the
process. If TERM doesn't work after a few seconds, then escalate.

### Job control: bg, fg, jobs, &, nohup, disown

A foreground process owns the terminal. A background process runs
without owning it. The shell's job control system manages multiple
foreground/background processes within one terminal.

```
sleep 100                        # foreground; terminal is busy
sleep 100 &                      # background; prints [1] PID
jobs                             # list jobs and their status
fg                               # bring the most recent background job to foreground
fg %1                            # bring job 1 to foreground
bg %1                            # resume job 1 in background (if it was stopped)

# while a foreground job is running:
Ctrl-Z                           # suspend (sends SIGTSTP) — process is stopped, not terminated
bg                               # resume that job in the background
fg                               # resume that job in the foreground

disown %1                        # remove job from shell's job table — it survives shell exit
disown -h %1                     # don't kill on shell exit, but keep in jobs list

nohup cmd &                      # run cmd in background, immune to SIGHUP, with stdin/out/err redirected
                                  # used to be "the way" to launch background jobs that survive logout

setsid cmd                       # run cmd in a new session (no controlling terminal)
```

For long-running tasks that need to survive a terminal session,
modern practice is `tmux` or `screen` (terminal multiplexers — your
session and its processes outlive your SSH connection), or
`systemd-run` (run a one-off command as a transient systemd
service).

```
tmux new -s work                 # create a new tmux session
tmux a -t work                   # attach to it later (-t = target)
# inside tmux: Ctrl-b d to detach, Ctrl-b c to create a window, Ctrl-b n/p to next/prev

screen                           # older alternative; Ctrl-a d to detach, Ctrl-a c new, etc.

systemd-run --scope --user my-script.sh
systemd-run --user --on-active=10s my-script.sh
                                  # run my-script.sh as a systemd unit
```

### nice, renice, ionice, taskset

```
nice cmd                         # start cmd with default niceness +10 (lower priority)
nice -n 19 cmd                   # very low priority
nice -n -10 cmd                  # higher priority — needs root
renice 5 -p 1234                 # adjust running process to niceness 5
renice -10 -p 1234               # higher priority (root only)
renice 10 -u alice               # all of alice's processes
ionice -c2 -n7 cmd               # I/O priority: class 2 (best-effort), level 7 (lowest)
ionice -c3 cmd                   # idle I/O class — only run I/O when nothing else needs it
taskset -c 0,1 cmd               # pin cmd to CPUs 0 and 1
taskset -pc 0,1 1234              # change affinity of running PID
```

Niceness ranges from -20 (highest priority) to +19 (lowest). Only
root can lower niceness (raise priority). Raising niceness above
the parent's is allowed without privilege.

### Resource inspection: lsof, fuser, strace, ltrace

```
lsof                             # everything currently open (massive)
lsof -p 1234                     # files opened by PID
lsof -u alice                    # everything alice has open
lsof file                        # who has this file open?
lsof +D /var                     # everything open in this directory tree
lsof -i                          # all network connections
lsof -i :80                      # what's bound to port 80
lsof -i tcp:443                  # specifically TCP port 443
lsof -i @host                    # connections to/from a host
lsof -nP -i                      # don't resolve names/ports — faster

fuser file                       # PIDs with file open
fuser -v file                    # verbose
fuser -k file                    # kill all processes that have file open (DANGEROUS)
fuser -u file                    # show usernames

strace cmd                       # run cmd, trace every system call
strace -p 1234                   # trace running PID
strace -f cmd                    # follow forks
strace -e trace=open,read cmd    # only specific syscalls
strace -e trace=network curl ... # only network-related
strace -c cmd                    # summarise: count and time per syscall
strace -o trace.log cmd          # write to file instead of stderr
strace -tt -T cmd                # microsecond timestamps and call durations

ltrace cmd                       # trace library calls (instead of syscalls)
ltrace -p 1234                   # attach to running process
```

`strace` is the most useful debugging tool you'll learn — when a
program "just hangs" or "just fails", attach `strace` and watch
what it actually does. The output is verbose; `-e trace=...`
filters to the syscalls you care about. `-c` is great for
"summarise: where is this program spending its time?".

### Process state codes (ps STAT field)

| Code | Meaning |
| --- | --- |
| `R` | Running or runnable |
| `S` | Sleeping (interruptible) |
| `D` | Sleeping (uninterruptible — usually waiting on I/O) |
| `T` | Stopped (e.g. by SIGSTOP) |
| `Z` | Zombie (terminated, not yet reaped by parent) |
| `I` | Idle kernel thread |
| `<` | High priority (negative nice) |
| `N` | Low priority (positive nice) |
| `s` | Session leader |
| `+` | Foreground process group |
| `l` | Multi-threaded |

A process stuck in `D` state is in an uninterruptible kernel sleep
— typically waiting for a slow disk or unresponsive NFS mount. You
can't `kill -9` it; the only options are to fix what it's waiting
for or to reboot.

---

## systemd and service management

`systemd` is the init system on most modern Linux distributions
(Debian, Ubuntu, RHEL/CentOS/Fedora, openSUSE, Arch, and many
others). It manages services, sockets, devices, mounts, timers,
and a unified system journal.

### Inspecting and controlling services

A `systemd` service is described by a *unit file* in
`/lib/systemd/system/` (distro-provided), `/etc/systemd/system/`
(local administrator), or `~/.config/systemd/user/` (per-user).

```
systemctl status nginx                # state, recent log, PID
systemctl is-active nginx             # "active" or "inactive" — exit code reflects state
systemctl is-enabled nginx            # whether it starts at boot
systemctl is-failed nginx             # whether it's in a failed state

systemctl start nginx                 # start now
systemctl stop nginx                  # stop now
systemctl restart nginx               # stop + start
systemctl reload nginx                # SIGHUP-equivalent — reread config without dropping connections
systemctl reload-or-restart nginx     # reload if supported, otherwise restart

systemctl enable nginx                # configure to start at boot
systemctl enable --now nginx          # enable AND start immediately
systemctl disable nginx               # don't start at boot
systemctl disable --now nginx         # disable AND stop now
systemctl mask nginx                  # forbid the service from being started, even manually
systemctl unmask nginx                # undo mask

systemctl daemon-reload               # re-read unit files after editing them
systemctl reset-failed nginx          # clear "failed" state so the service can be restarted

systemctl edit nginx                  # edit a drop-in override (preferred)
systemctl edit --full nginx           # edit the full unit file
systemctl cat nginx                   # show the effective unit file with overrides
```

### Listing units

```
systemctl list-units                  # currently loaded units (running and inactive)
systemctl list-units --type=service   # only services
systemctl list-units --type=service --state=running
systemctl list-units --failed         # what's broken
systemctl list-unit-files             # all installed unit files (not just loaded)
systemctl list-unit-files --type=service --state=enabled
```

### Viewing logs: journalctl

The systemd journal replaces classical `/var/log/*.log` files for
most modern services (some still write to `/var/log` as well).

```
journalctl                            # everything since boot, paged
journalctl -u nginx                   # logs for one unit
journalctl -u nginx -f                # follow (tail -f-like)
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx --since "2024-05-01" --until "2024-05-02"
journalctl -p err                     # severity err and above (emerg, alert, crit, err, warning, notice, info, debug)
journalctl -p warning                 # warning and above
journalctl --boot                     # current boot
journalctl --boot=-1                  # previous boot
journalctl --list-boots               # list all boots
journalctl _PID=1234                  # filter by PID
journalctl _UID=1000                  # filter by UID
journalctl _COMM=sshd                 # filter by command name
journalctl --grep='Failed password'   # regex match in message text
journalctl -r                         # newest first
journalctl -n 100                     # last 100 entries
journalctl -o json                    # JSON output
journalctl -o cat                     # only the message text
journalctl --disk-usage               # how much space the journal is using
journalctl --vacuum-size=500M         # trim to 500 MB
journalctl --vacuum-time=2weeks       # trim entries older than 2 weeks
```

Journal entries are structured — each record has fields like
`_PID`, `_UID`, `_COMM`, `MESSAGE`, `PRIORITY`, `_SYSTEMD_UNIT`,
plus any custom fields the program adds. You can filter on any of
them.

### Timers (systemd's cron replacement)

Modern alternative to cron. A `*.timer` unit triggers a `*.service`
unit on a schedule.

```
systemctl list-timers                 # all active timers, sorted by next trigger
systemctl status backup.timer
systemctl start backup.timer          # arm the timer now
systemctl enable backup.timer         # arm at boot
```

Defining a timer (in `/etc/systemd/system/backup.timer`):

```
[Unit]
Description=Daily backup

[Timer]
OnCalendar=daily
Persistent=true                       # run on next boot if the system was off when it was due
RandomizedDelaySec=10min              # spread load if many systems trigger together

[Install]
WantedBy=timers.target
```

And the corresponding service (in `/etc/systemd/system/backup.service`):

```
[Unit]
Description=Daily backup script

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/backup.sh
```

`OnCalendar=` accepts a flexible syntax: `daily`, `weekly`,
`hourly`, plus `Mon..Fri 08:00`, `*-*-1 04:00:00` (1st of every
month), `*-*-* 02:30:00` (every day 02:30), and so on. `man
systemd.time` for the full grammar.

### One-off and transient services: systemd-run

```
systemd-run --user my-script.sh             # run as a transient user service
systemd-run --user --on-active=30min my-script.sh   # run after 30 minutes
systemd-run --user --unit=my-job sleep 1h   # named unit you can systemctl-stop later
systemd-run --scope --slice=foo cmd         # run inside a resource-controlled slice
```

### Cron — still useful

Cron is still installed on many systems, especially older ones or
those running cron-using software. Per-user crontabs:

```
crontab -e                            # edit your user crontab in $EDITOR
crontab -l                            # list yours
crontab -r                            # remove yours (careful)
crontab -e -u alice                   # edit alice's crontab (root only)

# Crontab format:
# m  h  dom mon dow  command
  0  3  *   *   *    /usr/local/sbin/backup.sh
  */15 *  *   *   *    /usr/local/bin/check.sh
  0  9  *   *   1-5  /usr/local/bin/morning-report.sh
  @reboot              /home/alice/start-services.sh
  @daily               /usr/local/sbin/cleanup.sh
```

System-wide crontab files live in `/etc/crontab` (with an extra
"user" column) and in `/etc/cron.d/`. `/etc/cron.daily/`,
`/etc/cron.hourly/`, `/etc/cron.weekly/`, `/etc/cron.monthly/`
are conventional drop-in directories — any executable script in
them runs at the named cadence.

### One-shot scheduled tasks: at

```
at 'now + 1 hour' <<<'rm /tmp/lock'   # one-time, in an hour
at '03:00 tomorrow' <<<'reboot'
at noon tomorrow                      # interactive prompt for the command
atq                                   # list pending jobs
atrm 5                                # remove pending job 5
```

`at` is the right answer for "do this thing once at this time."
For repeating jobs, use `cron` or systemd timers.

### Boot, shutdown, runlevels

```
systemctl poweroff                    # graceful shutdown
systemctl reboot                      # graceful reboot
systemctl halt                        # halt the kernel
systemctl suspend                     # suspend to RAM
systemctl hibernate                   # suspend to disk
systemctl hybrid-sleep                # both

systemctl get-default                 # default boot target (multi-user.target, graphical.target, ...)
systemctl set-default multi-user.target
systemctl isolate rescue.target       # switch to a different target now (like old runlevel 1)
systemctl rescue                      # rescue / single-user mode
systemctl emergency                   # even more minimal
```

The classical "runlevels" (0 = halt, 1 = single user, 2 = multi
user without networking, 3 = multi user with networking, 5 =
graphical, 6 = reboot) map to systemd targets:

| Runlevel | Target |
| --- | --- |
| 0 | poweroff.target |
| 1 | rescue.target |
| 2-4 | multi-user.target |
| 5 | graphical.target |
| 6 | reboot.target |

`who -r` and `runlevel` still work for compatibility.

---

## Users, groups, and authentication

### Identity inquiries

```
whoami                           # effective username
id                               # user, primary group, all groups
id alice                         # info for another user
id -u                            # effective UID number
id -g                            # primary GID number
id -G                            # all GIDs
id -un                           # effective username (same as whoami)
groups                           # groups the current user belongs to
groups alice                     # alice's groups
logname                          # the original login name (preserved through sudo)
who                              # who is logged in
who -H                           # with column headings
w                                # who is logged in plus what they're running
last                             # login history (most recent first)
last alice                       # alice's history
last -n 20                       # last 20 entries
last -p '2024-05-01 12:00'       # who was logged in at this time
lastb                            # bad logins (failed attempts)
users                            # short list of currently-logged-in usernames
finger alice                     # detailed info (if installed)
tty                              # which terminal device am I on
```

### Switching users: su, sudo

```
su                               # become root (asks for root's password)
su -                             # become root with their full login environment
su alice                         # become alice (asks for alice's password)
su - alice                       # become alice with login environment

sudo cmd                         # run cmd as root (asks for YOUR password if you're a sudoer)
sudo -u alice cmd                # run cmd as alice
sudo -i                          # interactive root shell
sudo -s                          # shell as root using your environment
sudo -e file                     # edit file safely as root (uses sudoedit)
sudo -l                          # list what your sudoers entry permits
sudo -k                          # invalidate the cached credentials
sudo -v                          # refresh the credential cache
```

`sudo` configuration lives in `/etc/sudoers` (always edited with
`visudo` to catch syntax errors before they lock you out) and
drop-in files in `/etc/sudoers.d/`. The file is read by `sudo`
on every invocation. Common entries:

```
# user_or_%group  HOSTS = (RUN_AS) [NOPASSWD:] COMMANDS
alice    ALL=(ALL) ALL                              # alice can run anything as anyone
%wheel   ALL=(ALL) ALL                              # anyone in group wheel
%sudo    ALL=(ALL) ALL                              # anyone in group sudo (Debian/Ubuntu convention)
deploy   ALL=(www-data) NOPASSWD: /usr/bin/systemctl reload nginx
                                                    # specific command, no password
```

The `wheel` (RHEL family) and `sudo` (Debian family) groups are
the conventional "people allowed to escalate". Adding a user to
this group is the standard way to grant sudo access.

### User account management

```
sudo useradd -m -s /bin/bash alice         # create account, with home directory and bash shell
sudo useradd -m -s /bin/bash -G sudo alice # also add to the sudo group
sudo useradd -d /home/alice -s /bin/bash alice
                                            # explicit home directory
sudo useradd -u 1500 alice                  # specific UID
sudo useradd -G video,audio alice           # supplementary groups
sudo useradd -c 'Alice Smith' alice         # GECOS / full-name field
sudo useradd -r daemon-user                 # system account (UID < 1000)

sudo passwd alice                           # set/reset alice's password
sudo passwd -d alice                        # delete password (account remains, but no password login)
sudo passwd -l alice                        # lock account
sudo passwd -u alice                        # unlock
sudo passwd -e alice                        # force password change at next login

sudo usermod -aG video alice                # ADD alice to video group (the -a is critical — without it, -G replaces)
sudo usermod -L alice                       # lock account
sudo usermod -U alice                       # unlock
sudo usermod -s /bin/zsh alice              # change shell
sudo usermod -d /new/home -m alice          # change home (and -m moves files)
sudo usermod -l newname alice               # rename (DANGEROUS — depends on the username being unused)
sudo usermod --expiredate 2025-12-31 alice  # expire on a date

sudo userdel alice                          # delete account, leave home dir
sudo userdel -r alice                       # also remove home dir and mail spool

chsh                                        # change your own shell
chsh -s /bin/zsh                            # specify
sudo chsh -s /bin/zsh alice                 # change another user's shell

chfn                                        # change finger info (full name, etc.)
```

The most-bitten gotcha: `usermod -G group user` *replaces* the
user's supplementary group list. Always use `-aG` to *add*. The
`-a` flag is so important that distributions sometimes alias it
in.

### Group management

```
sudo groupadd devs                          # create
sudo groupadd -g 5000 devs                  # specific GID
sudo groupdel devs                          # delete
sudo groupmod -n newname devs               # rename
sudo groupmod -g 6000 devs                  # change GID

sudo gpasswd -a alice devs                  # add alice to devs group (modern alternative to usermod -aG)
sudo gpasswd -d alice devs                  # remove alice from devs

newgrp devs                                 # start a subshell with devs as primary group (use new perms now)
                                            # exit the subshell to revert
```

`/etc/passwd`, `/etc/shadow`, `/etc/group`, and `/etc/gshadow` are
the underlying files. They're flat text:

- `/etc/passwd` — username, x (placeholder), UID, GID, GECOS, home,
  shell. World-readable.
- `/etc/shadow` — username, hashed password, password aging fields.
  Root-only.
- `/etc/group` — group name, x, GID, comma-separated members.
- `/etc/gshadow` — group password (rarely used) and admin info.

Edit these only with the dedicated tools (`useradd`, `usermod`,
`vipw`, `vigr`) — they have file locking and validation. Hand-
editing is a recipe for inconsistency.

### Environment

```
printenv                          # all environment variables
printenv HOME                     # one variable
env                               # like printenv but also runs a command in a modified env
env VAR=value cmd                 # run cmd with VAR set to value
env -i cmd                        # run cmd with EMPTY environment
env -u VAR cmd                    # run cmd without VAR
echo $HOME                        # interpolate one variable in a shell
set                               # all shell variables AND functions (bash)
declare                           # similar
export VAR=value                  # set and export to child processes
export -p                         # show all exported variables

unset VAR                         # remove a variable
```

Common environment variables:

| Variable | Meaning |
| --- | --- |
| `HOME` | User's home directory |
| `PATH` | Colon-separated list of directories to search for executables |
| `USER`, `LOGNAME` | Username |
| `SHELL` | Login shell |
| `PWD` | Current working directory |
| `OLDPWD` | Previous working directory (used by `cd -`) |
| `EDITOR`, `VISUAL` | Default editor invoked by other programs |
| `PAGER` | Default pager (`less` is common) |
| `LANG`, `LC_*` | Locale (language, currency, time formatting, etc.) |
| `TZ` | Timezone (`America/Los_Angeles`, `UTC`, etc.) |
| `TERM` | Terminal type for curses/colour |
| `HOSTNAME` | Machine's hostname (sometimes — depends on shell) |
| `SHLVL` | Nesting level of the current shell |

---

## Archives, compression, and packaging

### tar — the universal archiver

`tar` (tape archive) bundles many files into one. Combined with a
compressor, it produces the canonical Linux distribution format.

The flag combinations to memorise:

```
tar -cf out.tar dir/                  # create
tar -xf out.tar                       # extract
tar -tf out.tar                       # list contents
tar -czf out.tar.gz dir/              # create + gzip compression
tar -cjf out.tar.bz2 dir/             # create + bzip2
tar -cJf out.tar.xz dir/              # create + xz
tar -caf out.tar.zst dir/             # create + auto-detect from extension (GNU)
tar -xf archive.tar.gz                # extract any of the above (GNU auto-detects)
tar -xf archive.tar.gz -C /dest       # extract into /dest
tar -czvf out.tgz dir/                # verbose (list files as you go)
tar -czf out.tgz --exclude='*.log' dir/
tar -czf out.tgz --exclude-from=excludes.txt dir/
tar -czf out.tgz --transform 's,^dir/,newdir/,' dir/    # rename on the fly
tar -czf out.tgz --owner=0 --group=0 --numeric-owner dir/
                                       # reproducible: no per-machine owner names
```

The flag mnemonics:

| Flag | Meaning |
| --- | --- |
| `c` | Create |
| `x` | Extract |
| `t` | Test / list |
| `f` | File — next argument is the archive name |
| `z` | gzip |
| `j` | bzip2 |
| `J` | xz |
| `a` | auto-detect from filename (GNU) |
| `v` | Verbose |
| `C dir` | Change directory to `dir` first |
| `--exclude` | Skip matching paths |
| `--strip-components=N` | Drop N leading path components when extracting |

Common operational forms:

```
# back up a directory tree
tar -czf /backup/etc-$(date +%F).tar.gz /etc

# extract while changing directory
tar -xzf release.tar.gz -C /opt

# strip the top-level directory ("source-1.2.3/...") on extraction
tar -xzf source-1.2.3.tar.gz --strip-components=1

# pipe through ssh (no temporary file)
tar -C srcdir -czf - . | ssh user@host 'tar -C dstdir -xzf -'

# produce an archive with deterministic timestamps and ordering
tar --sort=name --mtime='2024-01-01 00:00:00 UTC' \
    --owner=0 --group=0 --numeric-owner \
    -czf out.tar.gz dir/

# show what's in an archive without extracting
tar -tzf archive.tar.gz | less
tar -tzvf archive.tar.gz                  # with permissions and sizes
```

### gzip family: gzip, gunzip, zcat, bzip2, xz, zstd

Single-file compressors. `tar` invokes them via flags; you can also
use them standalone.

```
gzip file                              # produces file.gz, removes original
gzip -k file                           # keep the original (-k = keep)
gzip -9 file                           # max compression (1-9, default 6)
gzip -1 file                           # fastest, least compression
gunzip file.gz                         # decompress
zcat file.gz                           # cat without unpacking on disk
zless file.gz                          # less for gzip
zgrep pat file.gz                      # grep for gzip
zdiff file1.gz file2.gz                # diff for gzip

bzip2 file                             # better compression, slower
bunzip2 file.bz2
bzcat file.bz2

xz file                                # even better compression, slower still
unxz file.xz
xzcat file.xz

zstd file                              # modern: very fast, good ratio
unzstd file.zst
zstdcat file.zst
zstd --ultra -22 file                  # maximum compression
zstd -1 file                           # fastest

lz4 file                               # fastest of all, modest ratio
unlz4 file.lz4
```

Roughly: `lz4` < `gzip` < `zstd` ≈ `bzip2` < `xz` in compression
ratio; reversed in speed. `zstd` is the modern sweet spot for most
work — it's fast and compresses comparably to `xz` at default
levels. `xz` still wins for "smallest possible archive."

### zip / unzip

ZIP archives are the cross-platform standard, especially for
files exchanged with Windows or macOS users.

```
zip out.zip file1 file2                # create
zip -r out.zip dir/                    # recursive (zip is NOT recursive by default)
zip -9 out.zip files                   # max compression
zip out.zip -x '*.log'                 # exclude pattern
zip -e out.zip files                   # encrypted (prompt for password)
zip -j out.zip dir/file                # junk paths — store basenames only
zip -d out.zip 'path/inside/*'         # delete entries from existing archive
zip -u out.zip newfile                 # update — add or replace

unzip out.zip                          # extract here
unzip out.zip -d /dest                 # extract to /dest
unzip -l out.zip                       # list contents
unzip -p out.zip file > extracted      # extract one file to stdout
unzip -o out.zip                       # overwrite without prompting
```

### 7z

`p7zip` (the Linux build of 7-Zip) handles `.7z` and many other
formats with strong compression.

```
7z a out.7z dir/                       # add (create or update)
7z x out.7z                            # extract preserving paths
7z l out.7z                            # list
7z t out.7z                            # test integrity
7z a -p out.7z dir/                    # password-protect
```

### Other archive utilities worth knowing exist

- `cpio` — older archive format; still used for kernel `initrd`
  files.
- `ar` — archives of object files (`.a` static libraries).
- `pax` — POSIX archive exchange format.
- `dpkg-deb`, `rpm2cpio` — extract content from package files.

---

## Package management

Each Linux distribution family has its own package manager. The
concepts (install, remove, update, search, query, list contents)
are the same; the commands differ. This section covers the major
families.

### Debian / Ubuntu (apt, dpkg)

```
sudo apt update                            # refresh package index from repos
sudo apt upgrade                           # upgrade installed packages (no removals)
sudo apt full-upgrade                      # upgrade, allowing removals to satisfy deps
sudo apt install nginx                     # install
sudo apt install -d nginx                  # download only (don't install)
sudo apt install ./local.deb               # install a local .deb (apt 1.1+)
sudo apt remove nginx                      # uninstall (keep config files)
sudo apt purge nginx                       # uninstall + remove config files
sudo apt autoremove                        # remove automatically-installed packages no longer needed
sudo apt clean                             # purge cached .deb files

apt list --installed                       # all installed packages
apt list --installed | grep -i ssh         # filter
apt list --upgradable                      # what's available to upgrade
apt search nginx                           # search by keyword
apt show nginx                             # metadata
apt policy nginx                           # version available, where it would come from
apt depends nginx                          # what nginx depends on
apt rdepends nginx                         # what depends on nginx
apt-cache madison nginx                    # all available versions

# dpkg works on local .deb files and queries the package database
dpkg -i package.deb                        # install local .deb
dpkg -r nginx                              # remove
dpkg -P nginx                              # purge
dpkg -l                                    # list installed
dpkg -l | grep nginx                       # is it installed?
dpkg -L nginx                              # what files did the package install?
dpkg -S /usr/bin/nginx                     # which package owns this file?
dpkg -s nginx                              # status of an installed package
dpkg --get-selections                      # all selections (handy for "transfer" between hosts)
dpkg --set-selections < selections.txt
sudo apt-get dselect-upgrade               # apply set-selections
dpkg --configure -a                        # finish any half-configured packages
```

Repository configuration lives in `/etc/apt/sources.list` and
drop-ins under `/etc/apt/sources.list.d/`. Adding a third-party
repository typically involves a sources file plus a GPG key under
`/etc/apt/keyrings/` (or `/etc/apt/trusted.gpg.d/` on older
systems).

### Red Hat / Fedora / CentOS / Rocky / Alma (dnf, yum, rpm)

```
sudo dnf install nginx                     # install
sudo dnf install ./local.rpm               # local .rpm file
sudo dnf remove nginx                      # uninstall
sudo dnf upgrade                           # upgrade everything
sudo dnf upgrade nginx                     # upgrade one package
sudo dnf check-update                      # what's available to upgrade
sudo dnf autoremove                        # remove orphans
sudo dnf clean all                         # purge caches
sudo dnf history                           # transaction log
sudo dnf history undo TRANSACTION_ID       # roll back a transaction (powerful!)

dnf list installed                         # what's installed
dnf list installed | grep nginx
dnf list available nginx                   # is it available in repos?
dnf search nginx                           # by keyword
dnf info nginx                             # metadata
dnf provides /usr/bin/nginx                # which package provides this file
dnf repoquery --requires nginx             # what nginx depends on
dnf repoquery --whatrequires nginx         # what depends on nginx
dnf module list                            # AppStream modules (Fedora/RHEL 8+)
dnf module install postgresql:13          # install a module stream

# rpm works locally on .rpm files and queries the database
rpm -ivh package.rpm                       # install
rpm -Uvh package.rpm                       # upgrade or install
rpm -e nginx                               # remove
rpm -q nginx                               # is it installed? Print version
rpm -qa                                    # all installed packages
rpm -qa | grep nginx
rpm -qi nginx                              # info
rpm -ql nginx                              # files installed by package
rpm -qf /usr/bin/nginx                     # which package owns this file
rpm -V nginx                               # verify integrity (compares to install)
rpm -qpl package.rpm                       # contents of a .rpm file before installing
```

`yum` is the older command, replaced by `dnf` on RHEL 8+, Fedora,
Rocky, Alma. Most `yum` commands work as aliases under `dnf`.

### Arch (pacman)

```
sudo pacman -S nginx                       # install
sudo pacman -S --needed nginx              # install only if not already installed
sudo pacman -R nginx                       # remove
sudo pacman -Rs nginx                      # remove plus dependencies no longer needed
sudo pacman -Rns nginx                     # remove + deps + config files
sudo pacman -Syu                           # synchronise repos and upgrade everything
sudo pacman -Sy                            # only refresh
sudo pacman -Sc                            # clean old cached packages
sudo pacman -U package.pkg.tar.zst         # install a local package file

pacman -Q                                  # all installed
pacman -Qi nginx                           # info
pacman -Ql nginx                           # files
pacman -Qo /usr/bin/nginx                  # which package owns this file
pacman -Qe                                 # explicitly installed (not deps)
pacman -Qdt                                # orphans (no longer required)

pacman -Ss nginx                           # search remote
pacman -Si nginx                           # info on remote
```

The Arch User Repository (AUR) extends pacman via helpers like
`yay`, `paru`, etc.

### openSUSE (zypper)

```
sudo zypper install nginx
sudo zypper remove nginx
sudo zypper update
sudo zypper refresh
sudo zypper search nginx
zypper info nginx
zypper se -i                               # installed only
zypper repos                                # configured repositories
sudo zypper addrepo URL alias               # add a repo
sudo zypper modifyrepo --enable alias       # enable
```

### Universal-ish: snap, flatpak, appimage

These are application packagers that bundle dependencies. They run
on most distros.

```
# snap
sudo snap install firefox
sudo snap refresh                           # update all snaps
snap list                                   # installed
snap info firefox

# flatpak
flatpak install flathub org.mozilla.firefox
flatpak update
flatpak list
flatpak run org.mozilla.firefox

# AppImage — single executable file
chmod +x ~/Downloads/MyApp-x86_64.AppImage
~/Downloads/MyApp-x86_64.AppImage
```

These are sandboxed environments — different from native packages
in that they bundle their own libraries and run in restricted
filesystem views. Useful for proprietary apps and rapidly-changing
GUI software; less convenient for command-line tools.

### Language-specific package managers

Each language has its own world. Rough guide to where each one
lives:

| Language | Tool(s) | Typical command |
| --- | --- | --- |
| Python | `pip`, `pipx`, `poetry`, `uv` | `pip install`, `pipx install`, `poetry add`, `uv pip install` |
| Node.js | `npm`, `yarn`, `pnpm` | `npm install`, `yarn add`, `pnpm add` |
| Ruby | `gem`, `bundler` | `gem install`, `bundle install` |
| Go | `go install`, modules | `go install pkg@latest` |
| Rust | `cargo` | `cargo install crate-name` |
| Perl | `cpan`, `cpanm`, `carton` | `cpanm Module::Name` |
| Haskell | `cabal`, `stack` | `cabal install`, `stack install` |
| OCaml | `opam` | `opam install pkg` |
| Lua | `luarocks` | `luarocks install rock` |

Use language-native tools for development environments. For
system-wide tools (`htop`, `tmux`, `ripgrep`), prefer the OS
package manager — it gives you proper integration, automatic
updates, and signature verification.

---

## Networking utilities

The DNS and Networking Quick Reference covers the DNS-specific
toolchain. This section covers the rest of the everyday networking
toolbox — what you reach for when "is the network working?" comes
up.

### Reachability: ping, mtr, traceroute

```
ping host                         # ICMP echo, indefinite
ping -c 4 host                    # 4 packets and stop
ping -i 0.2 host                  # 0.2-second interval (root for < 1s on some systems)
ping -W 2 host                    # 2-second timeout per packet
ping -s 1500 host                 # 1500-byte payload (path MTU testing)
ping -M do -s 1472 host           # don't fragment; effective MTU diagnostic
ping -4 host                      # force IPv4
ping6 host    or    ping -6 host  # IPv6
ping -n host                      # numeric — don't reverse-DNS the response addresses
fping host1 host2 host3           # parallel ping to many hosts (separate install)

traceroute host                   # show network path
traceroute -n host                # numeric — faster, no reverse DNS
traceroute -T host                # TCP traceroute (some firewalls only pass TCP)
traceroute -I host                # ICMP traceroute (some only pass ICMP)
traceroute -p 443 -T host         # specific TCP port
traceroute -4 host / -6 host      # force IP version
tracepath host                    # similar; auto-discovers path MTU

mtr host                          # interactive ping+traceroute, continuous
mtr --report -c 50 host           # batch mode: 50 cycles, then summary
mtr --report-wide -c 50 host      # wider output
mtr -n host                       # numeric
mtr -T -P 443 host                # TCP, port 443
```

`mtr` is invaluable for "is it the network or me?" — it shows
per-hop loss and latency, and you can read the pattern in the
table:

- A single hop with high loss followed by clean hops is *that*
  hop's problem (often the router rate-limiting ICMP responses;
  not necessarily a real issue).
- Rising loss from a hop onward is everything *beyond* that hop
  being affected.

### Local interfaces: ip

The `ip` command from `iproute2` replaces the classical
`ifconfig`, `route`, `arp`, etc. It's the modern, supported
interface.

```
ip a                              # all interfaces and addresses
ip -br a                          # one-line summary per interface
ip -c a                           # colourised
ip -4 a                           # only IPv4
ip -6 a                           # only IPv6
ip a show eth0                    # one interface

ip link                           # link-layer details
ip -br link
sudo ip link set eth0 up          # bring up
sudo ip link set eth0 down        # bring down
sudo ip link set eth0 mtu 9000    # set MTU

ip route                          # routing table
ip -6 route
ip route get 1.1.1.1              # which route would be used for this destination
sudo ip route add 10.0.0.0/24 via 192.168.1.1
sudo ip route del 10.0.0.0/24

ip neigh                          # ARP / IPv6 neighbour cache (ip neighbor)
ip -s link                        # per-interface stats
ip rule                           # routing policy database (rules)

ifconfig                          # legacy; still available on most systems via net-tools
route -n                          # legacy
arp -an                           # legacy
```

The legacy commands (`ifconfig`, `route`, `arp`) are deprecated on
modern distributions but still ship for compatibility. New scripts
should use `ip`.

### Listening sockets: ss

`ss` (socket statistics) replaces the classical `netstat`. Faster,
and reads from the kernel directly.

```
ss                                # all established TCP sockets
ss -t                             # TCP only
ss -u                             # UDP only
ss -tn                            # TCP, no name resolution (faster)
ss -tnlp                          # listening TCP, with PIDs
ss -tnp                           # established TCP, with PIDs
ss -unlp                          # listening UDP
ss -s                             # summary counts
ss -t state established
ss -t state time-wait
ss -lt 'sport = :80'              # filter
ss -tnp '( sport = :22 or sport = :443 )'
ss -tnp '( dst 192.168.1.0/24 )'

netstat -tnlp                     # legacy equivalent
netstat -rn                       # legacy: show routing table (use `ip route` instead)
```

### Port testing: nc, ncat, socat

```
nc -zv host 443                   # TCP port-knock; -v for verbose
nc -uvz host 53                   # UDP port-knock (less reliable — UDP is connectionless)
nc -lvp 9000                      # listen on TCP/9000 (test harness)
nc -lvp 9000 < file.bin           # serve file once on connect
nc host 9000 > file.bin           # download whatever the listener sends
nc -lvp 9000 -e /bin/bash         # ⚠️ shell over a socket — useful for debugging, terrible if exposed

# ncat (nmap's nc) has a more consistent option set across systems
ncat -lvk 9000                    # -k = keep listening for further connections after the first

# socat is more powerful: arbitrary "from" and "to" specifications
socat - TCP:host:443
socat TCP-LISTEN:8080,reuseaddr,fork TCP:internal:80
                                   # forward port 8080 → internal:80
socat UNIX-LISTEN:/tmp/sock,fork EXEC:/usr/bin/something

# nmap for actual scanning
nmap -p 22,80,443 host
nmap -sU -p 53,123 host           # UDP scan
nmap -sV host                     # service detection
nmap -A host                      # OS + service + script + traceroute (aggressive)
```

### TLS and HTTP

```
curl -v https://host/path                          # verbose; shows the full request and response
curl -vk https://host/path                          # also -k = ignore TLS verification (debugging)
curl --resolve host:443:1.2.3.4 -v https://host/   # connect to this IP but use this SNI/Host
curl -L url                                         # follow redirects
curl -o out.html url                                # save to file
curl -sS url                                        # silent except errors
curl -X POST -d 'a=1' url                          # POST form data
curl -X POST -H 'Content-Type: application/json' -d '{"a":1}' url
curl -u user:pass url                               # HTTP basic auth
curl -H 'Authorization: Bearer TOKEN' url
curl -I url                                         # HEAD only
curl --head url                                     # same
curl -w '%{http_code} %{time_total}\n' -o /dev/null -s url
                                                    # write output stats to a custom format

wget -O out url                                     # save with explicit name
wget -c url                                         # continue partial download
wget --mirror url                                   # recursive site mirror

httpie / http                                       # human-friendly HTTP client (separate install)

openssl s_client -connect host:443 -servername host </dev/null
                                                    # full TLS handshake details
openssl s_client -connect host:443 -showcerts </dev/null
                                                    # all certs in the chain
echo Q | openssl s_client -connect host:443 -servername host 2>/dev/null \
       | openssl x509 -noout -subject -issuer -dates
                                                    # quick cert summary
```

`--resolve` is invaluable for testing a new endpoint *before*
you've cut DNS over to it: it lets `curl` connect to the new IP
while sending the right SNI/Host header.

### File transfer: ssh, scp, rsync, sftp, rclone

```
ssh user@host                                       # interactive login
ssh user@host cmd                                   # run a single command remotely
ssh -p 2222 user@host                               # non-default port
ssh -i ~/.ssh/id_specific user@host                 # specific key
ssh -o StrictHostKeyChecking=accept-new user@host   # auto-accept first-time host keys
ssh -L 8080:localhost:80 user@host                  # local port forward (you:8080 → host:80 from host)
ssh -R 9000:localhost:22 user@host                  # reverse forward (host:9000 → your:22 from host)
ssh -D 1080 user@host                               # SOCKS5 proxy on local 1080
ssh -J jump-host user@target                        # ProxyJump through jump-host
ssh-keygen                                          # generate key pair
ssh-keygen -t ed25519                               # modern algorithm (preferred over RSA)
ssh-keygen -t rsa -b 4096                           # RSA 4096 if you must
ssh-copy-id user@host                               # install your pubkey on host
ssh-add ~/.ssh/id_ed25519                           # add to agent
ssh-add -l                                          # list agent identities

scp file user@host:/path/                           # copy local → remote
scp user@host:/path/file .                          # remote → local
scp -r dir/ user@host:                              # recursive
scp -P 2222 file user@host:                         # non-default port (capital P, unlike ssh's -p)

# rsync — incremental, restartable file sync
rsync -av src/ user@host:/dest/                     # archive mode (preserves perms, times, links)
rsync -av --progress src/ user@host:/dest/          # show progress
rsync -av --delete src/ user@host:/dest/            # mirror — delete extras at dest
rsync -av --dry-run src/ user@host:/dest/           # show what would happen
rsync -av --exclude '*.log' src/ user@host:/dest/
rsync -av --exclude-from=excludes.txt src/ user@host:/dest/
rsync -av -e 'ssh -p 2222' src/ user@host:/dest/    # explicit ssh
rsync -av --partial --append-verify src/ user@host:/dest/   # resumable

# sftp — interactive file transfer
sftp user@host
> put file
> get file
> ls
> cd /path
> bye

# rclone — many-cloud file sync
rclone config                                       # interactive setup of remotes
rclone ls remote:
rclone copy file remote:path
rclone sync localdir remote:path                    # like rsync, for clouds
```

Trailing slash on the source matters in `rsync`. `rsync -a src/
dst/` copies the *contents* of `src` into `dst`. `rsync -a src
dst/` copies `src` itself as a child of `dst`. Same trap as `cp`,
same fix: pick a convention.

### Packet capture

```
tcpdump -ni any port 53                # all interfaces, DNS only
tcpdump -ni eth0 host 1.1.1.1          # specific interface, specific peer
tcpdump -ni any 'port 80 or port 443'  # multiple ports
tcpdump -ni any -w capture.pcap        # save for later
tcpdump -r capture.pcap                # read a saved capture
tcpdump -ni any -A port 80             # ASCII dump of payloads (HTTP debugging)
tcpdump -ni any -X port 80             # hex + ASCII

tshark -ni any port 53                 # decoded DNS (CLI Wireshark)
tshark -nr capture.pcap -Y 'http.request'

wireshark capture.pcap                 # GUI
```

### What's bound to which port

```
ss -tnlp | grep :80                    # what's listening on port 80
sudo ss -tnlp                          # need root to see PIDs of root-owned processes
lsof -i :80                            # alternative
fuser 80/tcp                           # PIDs bound to TCP/80
```

### DNS-side: dig, host, nslookup

These get full coverage in the DNS and Networking card. The
operator's day-to-day:

```
dig example.com                        # default A query
dig example.com AAAA                   # IPv6
dig example.com MX
dig +short example.com                 # just the answers
dig -x 1.2.3.4                         # reverse
dig @8.8.8.8 example.com               # specific resolver
host example.com
nslookup example.com
```

---

## Disks and filesystems

### Inspecting block devices

```
lsblk                              # tree of block devices and their mounts
lsblk -f                           # also show filesystem types and UUIDs
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,UUID
lsblk -p                           # show full /dev paths
lsblk -d                           # only top-level devices (no partitions)

blkid                              # UUIDs and labels for filesystems
blkid /dev/sda1
sudo blkid -p /dev/sda1            # probe (don't use the cache)

fdisk -l                           # all disk partitions (read-only listing)
sudo fdisk -l /dev/sda             # specific disk
sudo fdisk /dev/sda                # interactive partition editor (DANGEROUS)
sudo parted -l                     # alternative listing
sudo parted /dev/sda print         # one disk
sudo gdisk /dev/sda                # GPT partition editor
sudo cfdisk /dev/sda               # curses-based partition editor

# disk identification at hardware level
sudo smartctl -a /dev/sda          # full SMART data (drive health)
sudo smartctl -H /dev/sda          # just the pass/fail
sudo hdparm -I /dev/sda            # drive identification info
```

### Free space

```
df -h                              # human-readable filesystem usage
df -hT                             # also show filesystem types
df -i                              # inode usage (some "disk full" errors are inode exhaustion)
df -h /var                         # specific path
df -h --output=source,fstype,size,used,avail,pcent,target

du -h --max-depth=1 .              # space used per top-level entry
du -sh *                           # summarise each entry in current dir
du -sh ./* | sort -h               # by size, smallest last
du -h --max-depth=1 / 2>/dev/null | sort -h
                                   # walk the root looking for hogs
ncdu                               # interactive disk-usage explorer (separate install)
```

`du -h` reports *disk usage* (allocated blocks). For sparse files
or thin-provisioned filesystems this can differ from
*apparent size* (total bytes the application thinks it has):

```
du --apparent-size -h file
ls -l file                         # also shows apparent size
```

### Mounting and unmounting

```
mount                              # show what's mounted
mount -t ext4                      # only filesystems of a type
findmnt                            # nicer tree view
findmnt -t ext4
findmnt /var                       # what's mounted at /var

sudo mount /dev/sdb1 /mnt          # mount a filesystem
sudo mount -t ext4 /dev/sdb1 /mnt  # explicit fs type
sudo mount -o ro,noatime /dev/sdb1 /mnt
                                   # mount options
sudo mount -o remount,ro /         # remount root read-only (for fsck or shutdown)
sudo mount -o remount,rw /
sudo mount --bind /src /target     # bind mount: same fs visible at two paths
sudo mount --rbind /src /target    # recursive bind (includes nested mounts)
sudo umount /mnt                   # unmount
sudo umount -l /mnt                # lazy umount: detach now, finish when not busy

# fstab persistent mounts in /etc/fstab:
# device          mountpoint  fstype options                  dump pass
UUID=abc123       /data       ext4   defaults,noatime         0    2
```

`mount -a` mounts everything in `fstab` that's marked to mount on
boot. After editing `fstab`, test with `mount -a` before rebooting
— a syntax error here can leave the system unbootable.

### Filesystem creation and check

```
sudo mkfs.ext4 /dev/sdb1                  # format
sudo mkfs.xfs /dev/sdb1
sudo mkfs.btrfs /dev/sdb1
sudo mkfs.vfat /dev/sdb1                  # FAT32 (USB sticks for cross-platform use)

sudo fsck /dev/sdb1                       # check (fs must be unmounted!)
sudo fsck -y /dev/sdb1                    # auto-yes to all prompts

sudo tune2fs -l /dev/sda1                 # show ext2/3/4 superblock info
sudo xfs_info /mnt                        # XFS details

sudo e2label /dev/sdb1 mydata             # set ext label
sudo xfs_admin -L mydata /dev/sdb1        # set XFS label
```

### LVM (Logical Volume Manager)

LVM is a layer between block devices and filesystems that provides
volume groups and dynamic resizing. The vocabulary:

- *Physical volumes* (PVs) — disks or partitions added to LVM.
- *Volume groups* (VGs) — pools of one or more PVs.
- *Logical volumes* (LVs) — slices of a VG, on which you put a
  filesystem.

```
sudo pvs                                  # list PVs
sudo vgs                                  # list VGs
sudo lvs                                  # list LVs
sudo pvdisplay
sudo vgdisplay
sudo lvdisplay

sudo pvcreate /dev/sdb                    # initialise as PV
sudo vgcreate myvg /dev/sdb /dev/sdc      # create a VG
sudo vgextend myvg /dev/sdd               # add a PV to a VG
sudo lvcreate -L 100G -n data myvg        # create a 100 GB LV named "data"
sudo lvcreate -l 100%FREE -n big myvg     # use all remaining VG space

sudo lvextend -L +50G /dev/myvg/data      # grow LV by 50 GB
sudo lvextend -l +100%FREE /dev/myvg/data # grow to fill
sudo lvextend -L +50G -r /dev/myvg/data   # also resize the filesystem

sudo lvremove /dev/myvg/data
sudo vgremove myvg
sudo pvremove /dev/sdb

# LVM snapshots (point-in-time copies, useful for backups)
sudo lvcreate -L 10G -s -n snap /dev/myvg/data
sudo lvremove /dev/myvg/snap
```

### dd — block-level copying

```
sudo dd if=/dev/sda of=disk.img bs=1M status=progress  # disk → image
sudo dd if=disk.img of=/dev/sda bs=1M status=progress  # image → disk
sudo dd if=/dev/zero of=/dev/sda bs=1M status=progress # wipe (DANGEROUS)
sudo dd if=/dev/urandom of=/dev/sda bs=1M              # random wipe
sudo dd if=/dev/sda of=mbr bs=512 count=1              # back up MBR
sudo dd if=ubuntu.iso of=/dev/sdb bs=1M                # write ISO to USB stick
```

`dd` will silently obliterate disks if you reverse `if` and `of` or
specify the wrong device. **Double-check** every `dd` command before
hitting Enter. `lsblk` to confirm your target device. `bs=1M` is
much faster than the tiny default block size.

### Swap

```
sudo swapon                                # show active swap
sudo swapon /dev/sdb2                      # activate a swap partition
sudo swapoff /dev/sdb2

sudo mkswap /dev/sdb2                      # initialise a partition as swap
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
                                           # add to /etc/fstab to persist:
                                           # /swapfile none swap sw 0 0
```

---

## I/O redirection, pipes, command substitution

The shell builds pipelines and redirections at parse time, before
the commands run. The Bash Quick Reference covers the bash language
in full; this section is the practical operator's vocabulary for
gluing commands together.

### File descriptors

A process starts with three open file descriptors:

| FD | Name | Default |
| --- | --- | --- |
| 0 | stdin | the terminal (keyboard) |
| 1 | stdout | the terminal (screen) |
| 2 | stderr | the terminal (screen) |

You can attach each one to a file or to another process's stdin/stdout
via redirection.

### Basic redirection

```
cmd > file                         # stdout to file (truncate first)
cmd >> file                        # stdout to file (append)
cmd 2> file                        # stderr to file
cmd 2>> file                       # stderr to file (append)
cmd > file 2>&1                    # stdout AND stderr to file (order matters!)
cmd &> file                        # bash shorthand for the above
cmd &>> file                       # bash append shorthand
cmd > /dev/null                    # discard stdout
cmd 2> /dev/null                   # discard stderr
cmd > /dev/null 2>&1               # discard everything
cmd > out.log 2> err.log           # split: stdout to one, stderr to another
cmd < input.txt                    # stdin from file
cmd <<< "string"                   # stdin from a here-string
cmd <<EOF                          # here-doc: stdin from text
content
EOF
cmd <<-EOF                         # here-doc with leading-tab stripping
	content
	EOF
```

The order of `>` and `2>&1` matters. Read it left-to-right:

- `cmd > file 2>&1` — stdout goes to `file`, then stderr is
  duplicated to whatever stdout currently points to (which is now
  `file`). Both end up in `file`. ✓
- `cmd 2>&1 > file` — stderr is duplicated to whatever stdout
  currently points to (the terminal), then stdout is redirected
  to `file`. stderr still goes to the terminal. ✗

The `&>` shorthand sidesteps the order trap. If your shell is
bash, prefer `&> file`.

### Pipes

```
cmd1 | cmd2                        # cmd1's stdout becomes cmd2's stdin
cmd1 |& cmd2                       # bash: cmd1's stdout AND stderr both pipe into cmd2
cmd1 2>&1 | cmd2                   # POSIX-portable equivalent of |&
cmd1 | tee file | cmd2             # T-piece: see and save the intermediate
cmd1 | tee -a file | cmd2          # append
```

A pipeline's exit status is the last command's by default. With
`set -o pipefail` (or `bash`'s `pipefail` option), the exit status
is the leftmost non-zero exit (so a failure anywhere in the
pipeline is detectable).

### Command substitution

Run a command and substitute its output as text:

```
today=$(date +%F)
files=$(ls *.log)
size=$(stat -c%s file)
hostname="$(hostname -f)"

# legacy backtick syntax (still works, harder to nest):
files=`ls *.log`
```

Always use `$(...)` in modern scripts. Backticks work but don't
nest cleanly: `$(cmd1 $(cmd2))` reads better than the equivalent
backtick form.

### Process substitution

Treat a command's output as a temporary "file":

```
diff <(sort a.txt) <(sort b.txt)               # compare two pipelines as files
while read line; do ... done < <(cmd)           # avoid the subshell trap of `cmd | while`
comm -23 <(sort a) <(sort b)                    # set difference
paste <(seq 1 5) <(seq 10 14)                   # join two sequences
cmd > >(filter1) 2> >(filter2)                  # split stdout and stderr to two filters
```

Process substitution creates a named pipe (or `/dev/fd/N`) that
behaves like a file. Useful when you have a command that takes a
file argument and you want to feed it from another command.

### Tee — split a pipeline

```
make 2>&1 | tee build.log                       # see and save
make 2>&1 | tee -a build.log                    # append
sudo cmd | sudo tee /etc/something > /dev/null  # write to a root-owned file from a user shell
cmd | tee >(filter1 > out1) >(filter2 > out2) > out3
                                                 # split into three destinations
```

### xargs — turn stdin into command arguments

`xargs` is the bridge between commands that emit names on stdout
and commands that take names as arguments.

```
echo a b c | xargs -n1 echo                # one arg per call: echo a, echo b, echo c
find . -name '*.log' | xargs ls -l         # lists all log files
find . -name '*.log' -print0 | xargs -0 ls -l
                                           # NUL-safe (handles spaces, newlines)
echo a b c | xargs -I{} cp {} /backup/{}.bak
                                           # placeholder template
seq 1 100 | xargs -P 8 -n 1 download.sh    # parallel: 8 jobs, 1 arg each
echo "hello world" | xargs -I{} echo "{}!"   # interpolate

# Variants
xargs -n N                                 # N args per call
xargs -L N                                 # N input lines per call
xargs -P N                                 # parallel: N processes at once
xargs -p ...                               # prompt before each
xargs -t ...                               # print the command before running
xargs --no-run-if-empty                    # skip if no input
xargs -d '\n'                              # use newline (not whitespace) as separator
```

The classic combination: `find ... -print0 | xargs -0 ...` is
NUL-safe; without `-print0`/`-0`, filenames with spaces or
newlines break.

### Parallel — bigger sibling of xargs

GNU `parallel` is a more featureful job runner:

```
parallel -j 8 gzip ::: *.log               # 8 parallel gzips, one per arg
parallel echo {} ::: a b c                 # like xargs but more readable
parallel -j 4 'curl {} -O' :::: urls.txt   # one URL per line in urls.txt
parallel echo {1} {2} ::: a b ::: 1 2      # cartesian product
parallel --eta -j 8 cmd ::: inputs         # show estimated time of arrival
parallel --joblog log.txt cmd ::: inputs   # log each job's stats
```

### Subshells and grouping

```
(cmd1; cmd2)                               # subshell: cd, env changes don't escape
{ cmd1; cmd2; }                            # group in current shell — note the spaces and semicolons
(cd /tmp && tar -czf out.tgz files)        # cd in a subshell so the parent shell's cwd is unchanged

# combine with redirection
{ echo hello; date; } > both.log           # combined output of two commands

# run in background, capture later
(long_running_cmd &) >/dev/null 2>&1
```

---

## Editors and pagers

You'll edit files at the command line. Even if your day job is in
VS Code or JetBrains, knowing one terminal editor well is non-
negotiable for working on remote machines.

### nano — the gentle option

`nano` is the simplest. Most distros install it by default. Help is
visible at the bottom of the screen at all times.

```
nano file                              # edit
nano -B file                           # backup with ~
nano -w file                           # don't wrap long lines
nano +42 file                          # open at line 42
nano +/pat file                        # open at first match
```

Common keys: `Ctrl-O` (write/save), `Ctrl-X` (exit), `Ctrl-W`
(search), `Ctrl-K` (cut line), `Ctrl-U` (paste), `Ctrl-A` (start
of line), `Ctrl-E` (end of line). Help is on `Ctrl-G`.

### vim — the powerful option

`vim` is modal: there's a *normal* mode (move and execute commands),
an *insert* mode (type text), a *visual* mode (select), and an
*ex/command* mode (`:` commands).

The minimum survival kit:

```
vim file                               # open
i                                      # enter insert mode
Esc                                    # back to normal mode
:w                                     # save
:q                                     # quit
:wq    or    ZZ                        # save and quit
:q!                                    # quit without saving
:e file                                # open another file
:e!                                    # discard changes, reload
```

Movement (in normal mode):

```
h j k l                                # left, down, up, right
w                                      # next word
b                                      # previous word
e                                      # end of word
0                                      # start of line
^                                      # first non-blank
$                                      # end of line
gg                                     # top of file
G                                      # end of file
:42                                    # go to line 42
Ctrl-d / Ctrl-u                        # half-page down / up
Ctrl-f / Ctrl-b                        # full-page forward / back
%                                      # matching bracket
*                                      # search for word under cursor
/pat                                   # search forward
?pat                                   # search backward
n / N                                  # next/previous match
```

Editing:

```
i                                      # insert before cursor
I                                      # insert at start of line
a                                      # append after cursor
A                                      # append at end of line
o                                      # open new line below
O                                      # open new line above
x                                      # delete character under cursor
dd                                     # delete (cut) line
yy                                     # yank (copy) line
p                                      # paste below
P                                      # paste above
u                                      # undo
Ctrl-r                                 # redo
.                                      # repeat last change
r{char}                                # replace one character
cw                                     # change word
ciw                                    # change inner word (smart)
ci"                                    # change inside double quotes
da{                                    # delete around braces (including the braces)
:s/old/new/g                           # substitute on current line
:%s/old/new/g                          # substitute in whole file
:%s/old/new/gc                         # substitute, confirming each
v                                      # visual mode (character)
V                                      # visual line mode
Ctrl-v                                 # visual block mode (for column edits)
```

`vim` repays investment over years. The 30-minute survival kit
above is enough to make small edits productively. If you commit
to learning it, `vimtutor` is the standard 30-minute tutorial.

### emacs — the other option

`emacs` is a different mental model: not modal, every key is
prefixed with a control or meta sequence.

```
emacs file
emacs -nw file                         # don't pop a window — stay in the terminal

C-x C-f                                # find/open file
C-x C-s                                # save
C-x C-c                                # exit
C-x b                                  # switch buffer
C-x k                                  # kill buffer
C-s pattern                            # search forward
C-r pattern                            # search backward
C-g                                    # cancel current command
C-_  or  C-/                           # undo
M-w                                    # copy region
C-w                                    # cut region
C-y                                    # paste
C-space                                # set mark for region
M-x command                            # execute named command
```

`C-` is Ctrl, `M-` is Meta (Esc on most keyboards, or Alt). Like
`vim`, it has a tutor: `M-x help-with-tutorial`.

### Other terminal editors

- **`micro`** — modern, more like a GUI editor in the terminal.
  Good for occasional users who don't want to learn vim.
- **`mcedit`** — part of `mc` (Midnight Commander); Norton
  Commander descendant.
- **`joe`** — an older WordStar-style editor.
- **`ed`** — the original line editor. Still occasionally useful
  in scripts where you can't assume a screen-based editor.

### Pagers: less

Already covered above; worth a focused section because you'll spend
hours in `less`.

```
less file                              # open
q                                      # quit
/pat                                   # search forward
?pat                                   # search backward
n / N                                  # next / previous match
g                                      # top of file
G                                      # end of file
:n / :p                                # next / previous file
&pat                                   # filter to lines matching pat
&!pat                                  # filter to lines NOT matching
F                                      # follow mode (like tail -f); Ctrl-C to stop following
v                                      # edit current file in $EDITOR
=                                      # show position in file
-N                                     # toggle line numbers
-S                                     # toggle line wrapping
-i                                     # toggle case-insensitive search
m{letter}                              # set bookmark
'{letter}                              # jump to bookmark
```

`less` is a small but rich tool — invest five minutes in `less
--help` and you'll save hours over a career.

---

## Date and time, math, environment

### date

```
date                                       # current date in default format
date -u                                    # UTC
date +%Y-%m-%d                             # specific format: 2025-05-17
date +%FT%T%z                              # ISO 8601: 2025-05-17T09:22:13-0700
date +%s                                   # Unix timestamp (seconds since epoch)
date -d '1 hour ago'                       # GNU: relative date
date -d '2025-01-01 +30 days'              # arithmetic on dates
date -d '@1700000000'                      # convert epoch to human
date -d 'next monday'                      # natural language (limited)
date --date='2025-12-25' +%A               # what day of the week is Christmas?
date -r file                               # mtime of a file (BSD; GNU is `stat`)
TZ=America/New_York date                   # in a specific timezone
TZ=UTC date +%FT%TZ                        # canonical UTC ISO timestamp

date -s '2025-01-01 12:00:00'              # set the system clock (root) — almost always handled by NTP today
```

Format codes worth remembering:

| Code | Meaning |
| --- | --- |
| `%Y` | 4-digit year |
| `%y` | 2-digit year |
| `%m` | month (01-12) |
| `%d` | day of month (01-31) |
| `%j` | day of year (001-366) |
| `%H` | hour (00-23) |
| `%M` | minute |
| `%S` | second |
| `%N` | nanoseconds |
| `%F` | full date `YYYY-MM-DD` |
| `%T` | full time `HH:MM:SS` |
| `%z` | numeric TZ offset (+0500) |
| `%Z` | TZ name (PST, UTC) |
| `%s` | Unix timestamp |
| `%a` / `%A` | abbreviated / full weekday name |
| `%b` / `%B` | abbreviated / full month name |

### Time synchronisation

Most modern systems use `chrony` or `systemd-timesyncd`. The
classical `ntpd` is still around but deprecated on many distros.

```
chronyc tracking                           # current sync status
chronyc sources                            # which servers
chronyc -n sources                         # numeric, faster
chronyc makestep                           # step the clock now (instead of slewing)
chronyc -a 'burst 4/4'                     # quick re-sync

timedatectl                                # systemd's interface
timedatectl set-timezone Europe/London
timedatectl set-time '2025-01-01 12:00:00' # only if NTP is off
timedatectl set-ntp false                  # disable NTP sync
timedatectl status                         # full state
timedatectl list-timezones                 # all known
timedatectl list-timezones | grep -i tokyo
```

### Math at the command line

```
expr 2 + 3                                 # 5 (whitespace required, * needs escape)
expr 7 \* 6                                # 42
echo $((2 + 3))                            # bash arithmetic expansion
echo $((100 / 7))                          # 14 (integer division)
echo $((100 % 7))                          # 2 (remainder)

bc <<<'2+3'                                # arbitrary-precision calculator
bc -l <<<'4*a(1)'                          # -l = math library; a() = atan; 4*atan(1) = pi
echo 'scale=10; 22/7' | bc                 # 10 decimal digits
bc                                         # interactive

awk 'BEGIN{print 2+3}'                     # awk has full math
awk 'BEGIN{print sqrt(2), exp(1), log(10)}'

python -c 'print(2**32-1)'                 # python as a pocket calculator
python3 -c 'import math; print(math.pi)'
```

### Number conversion

```
printf '%d\n' 0xff                         # hex → decimal: 255
printf '%d\n' 0177                         # octal → decimal: 127
printf '0x%x\n' 255                        # decimal → hex: 0xff
printf '%o\n' 64                           # decimal → octal: 100
printf '%b\n' '\\101'                      # printf treats argument as backslash escapes
echo 'obase=16; 255' | bc                  # any base via bc
echo 'obase=2; 127' | bc                   # binary
echo 'ibase=16; FF' | bc                   # hex input
```

### Sequences

```
seq 5                                      # 1 2 3 4 5
seq 5 10                                   # 5 6 7 8 9 10
seq 0 2 10                                 # 0 2 4 6 8 10
seq -w 5                                   # 1 2 3 4 5 zero-padded if needed
seq -f 'item-%02g' 5                       # printf-format
seq -s, 1 5                                # comma-separated: 1,2,3,4,5

for i in {1..10}; do ...; done             # bash brace expansion
for i in $(seq 1 10); do ...; done         # equivalent
for ((i=0; i<10; i++)); do ...; done       # C-style
```

### Random data

```
shuf -i 1-100 -n 5                         # 5 random integers in 1..100
shuf -e a b c                              # shuffle args
shuf -n 1 file                             # one random line from a file

openssl rand -hex 16                       # 16 random bytes as hex
openssl rand -base64 32                    # 32 random bytes as base64

# generate a strong password
openssl rand -base64 24 | tr '/+=' '_-.'

# generate a UUID
uuidgen
cat /proc/sys/kernel/random/uuid

# random bytes from the kernel
head -c 16 /dev/urandom | xxd -p
```

### File timestamps

```
stat file                                  # all timestamps and metadata
stat -c '%Y %n' file                       # mtime as epoch + name
ls -l --time=ctime file                    # show ctime instead of mtime
ls -l --time=atime file                    # show atime
touch file                                 # update mtime to now
touch -d '2025-01-01' file                 # set to a specific time
touch -r ref file                          # set to ref's timestamp
```

Three timestamps per file:

- *atime* — last accessed (read). Often disabled (`noatime` mount
  option) for performance.
- *mtime* — last modified (content changed).
- *ctime* — inode metadata last changed (perms, owner, links).
  Cannot be set arbitrarily by user-space.

### Hostname and machine ID

```
hostname                                   # short hostname
hostname -f                                # FQDN
hostname -d                                # domain name
hostname -s                                # short
hostname -I                                # all IP addresses (no DNS, just interface IPs)
sudo hostname newhost                      # set (transient)
sudo hostnamectl set-hostname newhost      # set (persistent, with systemd)
hostnamectl                                # show machine info: hostname, OS, kernel, machine-id

cat /etc/hostname                          # the persistent hostname
cat /etc/machine-id                        # unique 32-char ID per Linux installation
```

---

## Make and build automation

`make` is a dependency-driven build tool. You declare *targets*,
their *dependencies*, and the *recipe* (commands) to build the
target from the dependencies. `make` figures out what's
out-of-date and rebuilds only what needs rebuilding.

`make` predates everything else in this card by decades and is
still ubiquitous. It's worth understanding even if you don't use it
day-to-day, because it appears in almost every C/C++ project, in
many other language ecosystems, and as a thin wrapper for
"command-runner" use cases (the modern version of which is `just`).

### A minimal Makefile

```
# A simple Makefile

CC = cc
CFLAGS = -O2 -Wall

prog: main.o util.o
	$(CC) $(CFLAGS) -o $@ $^

main.o: main.c util.h
	$(CC) $(CFLAGS) -c -o $@ $<

util.o: util.c util.h
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	rm -f prog main.o util.o

.PHONY: clean
```

Reading this:

- `CC = cc` and `CFLAGS = -O2 -Wall` are *variables*. Reference
  them as `$(CC)` and `$(CFLAGS)`.
- `prog: main.o util.o` declares that the target `prog` depends on
  `main.o` and `util.o`. The indented lines below it are the
  *recipe* — shell commands to build `prog`. The indent **must be
  a tab**, not spaces.
- `$@` is the target's name, `$^` is all the dependencies, `$<` is
  the first dependency. There are several others — see "Automatic
  variables" below.
- `.PHONY: clean` declares that `clean` is not actually a file
  name, so make should always run it (and not be confused by a
  file named `clean`).

### Running make

```
make                                       # build the first target in the file
make prog                                  # build a specific target
make clean                                 # run the clean target
make -j4                                   # 4 parallel jobs
make -j$(nproc)                            # one job per CPU
make -k                                    # keep going after errors
make -B                                    # rebuild everything (force)
make -n                                    # dry run: show commands but don't execute
make --debug=v                             # explain why each target is being built
make -p                                    # print the database (rules, variables) and exit
make -p -f /dev/null                       # show the built-in rules and variables
make -d                                    # debug output (very verbose)
make -C dir target                         # cd into dir first
make -f Makefile.dev target                # use a different makefile
make VAR=value target                      # override a variable on the command line
```

### Variables

Several flavours of variable assignment in `make`:

```
A = 5                          # recursively expanded — RHS is re-evaluated each time A is used
B := 5                         # simply expanded — RHS evaluated once at definition time
C ?= 5                         # set only if not already set
D += extra                     # append
```

Recursively expanded (`=`) is the default but can lead to
surprises with nested variable references. Simply expanded (`:=`)
is more like a normal programming language and is usually what you
want.

```
CFLAGS := -O2 -Wall
LDFLAGS := -lm
SOURCES := $(wildcard src/*.c)
OBJECTS := $(SOURCES:.c=.o)            # substitute .c for .o
                                       # equivalent: $(patsubst %.c, %.o, $(SOURCES))
DEPS := $(OBJECTS:.o=.d)
```

### Automatic variables

Inside a recipe, `make` provides:

| Variable | Meaning |
| --- | --- |
| `$@` | The target's name |
| `$<` | The first prerequisite |
| `$^` | All prerequisites (deduplicated) |
| `$+` | All prerequisites (with duplicates) |
| `$?` | Prerequisites newer than the target |
| `$*` | The "stem" of a pattern rule (the part `%` matched) |

### Pattern rules

A pattern rule applies to many targets matching a pattern:

```
%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<
```

This says "to build any `*.o` file from the corresponding `*.c`
file, run this recipe." `%` is the wildcard; `$*` inside the
recipe is what `%` matched.

### Implicit rules

`make` ships with built-in rules for common languages. Type `make
-p` to see them all. The most useful: there's a built-in rule for
`%.o: %.c` that uses `$(CC)` and `$(CFLAGS)`. So a Makefile can
be as small as:

```
CFLAGS = -O2 -Wall
prog: main.o util.o
```

— the implicit rule handles building `main.o` from `main.c`, and
the linker step is a built-in rule too. For new code, use these
implicit rules as a base and override only what you need.

### Phony targets

Targets that don't correspond to files should be marked
`.PHONY`:

```
.PHONY: clean test install all check distclean help

clean:
	rm -f $(OBJECTS)
	rm -f prog

test:
	./run-tests.sh

help:
	@echo "Targets: prog, clean, test, install"
```

The `@` prefix on a recipe line suppresses the echo of the command
itself before running it. Useful for `help` targets and other
chatty rules.

### Common Makefile patterns

```
# Recursively descend into subdirectories
SUBDIRS = src tests docs
.PHONY: all $(SUBDIRS)

all: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@

# Out-of-tree build
SRCDIR := src
BUILDDIR := build
SOURCES := $(wildcard $(SRCDIR)/*.c)
OBJECTS := $(patsubst $(SRCDIR)/%.c, $(BUILDDIR)/%.o, $(SOURCES))

$(BUILDDIR):
	mkdir -p $@

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CFLAGS) -c -o $@ $<

# Auto-generated dependency files (for headers)
DEPS := $(OBJECTS:.o=.d)
-include $(DEPS)
$(BUILDDIR)/%.d: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) -MM -MF $@ -MT $(@:.d=.o) $(CFLAGS) $<
```

### Make-as-task-runner

For non-build use cases, `make` is a portable, no-dependency
task runner:

```
.PHONY: install lint test deploy

install:
	pip install -e '.[dev]'

lint:
	ruff check .
	mypy src

test:
	pytest -q

deploy: lint test
	./scripts/deploy.sh
```

The dependency mechanism (`deploy: lint test`) ensures the lint
and test steps run before deploy. Modern alternatives in this
space include `just`, `task`, `mage`, `cake`, but `make` remains
the universal default. Put a `Makefile` in any project and
contributors can `make` without learning a new tool.

### Common `make` mistakes

- **Spaces instead of tabs.** Recipe lines must start with a tab.
  This is the most-cited Makefile error of all time.
- **Forgetting `.PHONY`.** A target that's also a real filename
  will silently not run.
- **Variables expanded too late.** If `A = $(B)` and `B` is set
  later, `A` becomes `B`'s later value. With `A := $(B)`, `A`
  freezes at definition time.
- **Recursive make problems** — when you split a build across
  many subdirectory `Makefile`s, dependency tracking across them
  breaks down. The classic article "Recursive Make Considered
  Harmful" (Peter Miller, 1998) is still relevant.
- **Side effects of pattern rules.** `make` will gleefully apply
  a pattern rule whose target name happens to match — be careful
  with patterns like `%.x` that overlap with real files.
---

## Troubleshooting and recipes

A field guide to recurring "is this thing broken?" patterns and
the commands that diagnose them.

### "The disk is full"

```
df -h                                      # which filesystem?
df -i                                      # inodes? (rare but real)
du -h --max-depth=1 / 2>/dev/null | sort -h
                                           # walk down to find the hog
ncdu /                                     # interactive UI
find / -size +1G -type f 2>/dev/null       # files bigger than 1 GB
find /var/log -type f -mtime +30 -size +10M
                                           # old big logs
journalctl --disk-usage                    # journal size
journalctl --vacuum-time=2weeks            # trim journal
docker system df                           # Docker disk usage if applicable
docker system prune                        # reclaim Docker space
sudo apt clean                             # apt cache
sudo dnf clean all                         # dnf cache
```

A surprising classic: a process that has deleted a file but still
has it open continues to consume disk. `df` sees the space as
used, `du` doesn't show the file. Find these with:

```
sudo lsof +L1                              # show open files with link count 0 (deleted but in use)
```

The fix is restart the process holding the file open.

### "Out of memory"

```
free -h                                    # current memory and swap
ps -eo pid,user,%mem,rss,comm --sort=-rss | head
                                           # top RSS users
top -o %MEM                                # sort by memory (interactive)
sudo dmesg | grep -i 'oom\|kill'           # OOM killer history
journalctl -k | grep -i 'oom\|out of memory'
                                           # same via journal
ps aux --sort=-%mem | head                 # alternate
```

The kernel's OOM killer chooses a victim by scoring all processes;
its choice ends up in `dmesg`. To make a process less likely to be
killed:

```
echo -1000 | sudo tee /proc/$PID/oom_score_adj
                                           # range -1000 to +1000
```

`-1000` makes a process effectively immortal under OOM, `+1000`
makes it the first victim.

### "Process pegged at 100% CPU"

```
top                                        # immediately visible
htop -p $PID                               # focus on one process
strace -p $PID                             # what's it doing? (interrupt with Ctrl-C)
strace -c -p $PID                          # summary after several seconds
perf top -p $PID                           # CPU profiling (perf package)
sudo perf record -p $PID -- sleep 10
sudo perf report                           # interactive flame-graph-like view
gdb -p $PID                                # attach a debugger and "bt" for a stack trace
```

### "Process is stuck (state D)"

A process in `D` (uninterruptible sleep) state is waiting on the
kernel for I/O — usually a slow or unresponsive disk or NFS mount.

```
ps -eo pid,stat,cmd | awk '$2 ~ /^D/'      # processes in D state
cat /proc/$PID/wchan                       # what kernel function is the process sleeping in
cat /proc/$PID/stack                       # kernel stack trace (root)
sudo dmesg | grep -i 'hung'                # kernel hung-task warnings
mount | grep nfs                           # is NFS involved?
```

A `D`-state process can't be killed. The only options are to fix
what it's waiting for (storage, NFS server) or to reboot.

### "Mystery file lock"

Something is holding `/var/lock/myapp.lock` (or `/var/run/foo.pid`
or whatever) and a fresh process refuses to start.

```
lsof /var/lock/myapp.lock                  # who has it open?
fuser -v /var/lock/myapp.lock              # alternative
sudo fuser -k /var/lock/myapp.lock         # kill them (DANGEROUS)
```

If nothing has it open but the file lingers, it's a stale lock
file from a crash; remove it manually and start the service.

### "Address already in use"

A port is occupied, often after a process was killed but the
kernel hasn't released the port yet (TIME_WAIT state).

```
ss -tnlp | grep :8080                      # what's bound to 8080?
ss -tnlp '( sport = :8080 )'                # filter syntax
sudo lsof -i :8080
sudo fuser 8080/tcp                        # PIDs using the port
sudo fuser -k 8080/tcp                     # kill them
ss -tan state time-wait                    # TIME_WAIT sockets
```

For a server in TIME_WAIT to be replaceable immediately, set
`SO_REUSEADDR` in the application or wait the kernel out
(typically 60 seconds).

### "command not found" after install

```
hash -r                                    # bash forgets cached lookups
which cmd                                  # confirm where it's installed
echo $PATH                                 # is the directory in PATH?
type -a cmd                                # all places bash sees this name
exec bash                                  # reload the shell entirely
```

If the command is installed but not in `$PATH`, either move it to
a `$PATH` directory, add its directory to `$PATH` in your shell rc,
or invoke it by full path.

### "Permission denied" on a file you should own

```
ls -l file                                 # mode and owner
getfacl file                               # ACLs (might override the basic mode)
namei -l /path/to/file                     # walk every component, show perms at each step
ls -ld /                                   # remote possibility — broken root permissions
mount | grep noexec                        # filesystem mounted noexec?
mount | grep nosuid                        # nosuid?
mount | grep ro                            # read-only?
```

Check SELinux / AppArmor labels too:

```
ls -lZ file                                 # SELinux label
sudo aa-status                              # AppArmor status
sudo dmesg | grep -i denied                 # security denials
sudo journalctl -k | grep -i avc            # SELinux AVC denials
```

### "DNS isn't working"

Covered in the DNS and Networking card. Quick triage:

```
dig +short example.com                      # default resolver
dig +short example.com @8.8.8.8             # external resolver
cat /etc/resolv.conf                        # current resolver
resolvectl status                           # systemd-resolved view
ping -c 4 1.1.1.1                           # is the network up at all?
```

### "Slow network"

```
ping -c 10 host                             # latency to one host
mtr --report -c 50 host                     # path loss/latency
iftop                                       # who's using bandwidth (separate install)
nethogs                                     # bandwidth per process
ss -ti                                      # detailed TCP info, including RTT
ethtool eth0                                # link status (speed, duplex)
ip -s link                                  # interface counters
```

### "I'm getting weird characters in my output"

```
file file                                   # what is the encoding?
hexdump -C file | head                      # see actual bytes
cat -A file | head                          # show non-printables explicitly
iconv -f UTF-16 -t UTF-8 file > new          # convert encodings
dos2unix file                                # CRLF → LF
locale                                       # what's my current locale?
LC_ALL=C cat file                           # disable locale interpretation
```

### "Process has terminated unexpectedly"

```
journalctl -u service --since '1 hour ago'  # journal of the service
journalctl _PID=12345                        # entries for the process
sudo coredumpctl list                        # all core dumps systemd has caught
sudo coredumpctl info $PID                   # info about a specific dump
sudo coredumpctl gdb $PID                    # open the dump in gdb
ulimit -c                                    # core size limit (0 = no dumps)
```

### Useful one-liners for diagnosis

```
# top 10 largest files in a tree
find . -type f -printf '%s %p\n' | sort -rn | head | awk '{ printf "%10d  %s\n", $1, $2 }'

# top 10 most CPU-hungry processes
ps -eo pid,user,%cpu,comm --sort=-%cpu | head

# top 10 most RAM-hungry processes
ps -eo pid,user,%mem,rss,comm --sort=-rss | head

# disk hogs in current dir
du -h --max-depth=1 . | sort -h

# count files matching a pattern
find . -name '*.py' -type f | wc -l

# how many open files do my processes have
ls -1 /proc/*/fd 2>/dev/null | wc -l

# last 10 errors in syslog
journalctl -p err -n 10

# what just broke (system-wide)?
journalctl --since '5 minutes ago' -p warning

# which package owns this command
which command
dpkg -S "$(which command)"          # Debian
rpm -qf "$(which command)"          # RHEL

# strace a command's syscalls without restarting it
strace -p $(pgrep -n cmd) -c
```

---

## Gotchas

A field guide to foot-guns.

### `rm -rf` and unexpanded variables

```
rm -rf "$VAR/"                              # if VAR is empty, this is rm -rf "/"
rm -rf -- "${VAR:?VAR is required}"         # safer: aborts on empty VAR
```

Always quote, always validate, always preview with `echo` or
`-print` before running destructive commands. Treat `rm -rf` like
loaded firearm.

### Quotes and word splitting

The shell splits unquoted variables on whitespace and tabs (and
whatever's in `IFS`). Filenames with spaces are the classic
victim:

```
file="My Documents/notes.txt"
ls $file                                    # WRONG: ls sees "My", "Documents/notes.txt"
ls "$file"                                  # right: one argument
```

Always double-quote variable expansions in scripts. Single-quote
literal strings unless you need interpolation. The Bash Quick
Reference covers this in depth.

### `cp -a src/ dst/` vs `cp -a src dst`

```
cp -a src/ dst/                             # copy CONTENTS of src into dst
cp -a src dst                               # copy src ITSELF as dst (or as a child of dst if dst is a dir)
```

Pick a convention and stick with it. The same trap exists in
`rsync`.

### `mv` across filesystems isn't atomic

Within one filesystem, `mv` is a directory-entry update — atomic.
Across filesystems, `mv` is `cp + rm` — interruption can leave a
half-copied destination and the source still around. For large
cross-filesystem moves, use `rsync --remove-source-files` so a
crash leaves the source intact.

### Globs that don't match

```
ls *.log                                    # if no .log files exist, depending on shell, ls receives "*.log"
shopt -s nullglob                           # bash: unmatched globs expand to nothing
shopt -s failglob                           # bash: unmatched globs are an error
```

`set -o nullglob` in scripts is usually the right discipline.

### `find ... -delete` evaluation order

`-delete` is fast but doesn't honour the standard predicate
evaluation order. Test with `-print` first:

```
find . -name '*.tmp' -mtime +30 -print      # SHOW
find . -name '*.tmp' -mtime +30 -delete     # DELETE
```

### `find ... -exec ... ; ` vs `+`

```
find . -name '*.txt' -exec gzip {} \;       # one process per file (slow on big trees)
find . -name '*.txt' -exec gzip {} +        # batch into many files per process (fast)
```

The semicolon must be quoted (`\;` or `';'`) so the shell doesn't
eat it. `+` is a separate ending; remember the difference.

### `xargs` without `-0`

```
find . -name '*.log' | xargs ls -l           # WRONG: filenames with spaces or newlines break
find . -name '*.log' -print0 | xargs -0 ls -l  # correct
```

The `-print0` / `-0` pairing is the standard discipline.

### `set -e` doesn't always exit on error

`set -e` (or `#!/bin/bash -e` in a script) makes the shell exit on
any failed command. Except:

- A failure inside an `if`, `while`, `until`, `&&`, `||` chain is
  treated as just a value, not an error.
- A failure in a function called from one of the above contexts
  doesn't propagate.
- A failure in a pipeline (anywhere except the last command) is
  invisible without `set -o pipefail`.

The robust opening for any non-trivial bash script:

```
#!/bin/bash
set -Eeuo pipefail
IFS=$'\n\t'
```

### Locale-sensitive operations

```
sort file                                    # locale-aware (slower, sometimes "weird" order)
LC_ALL=C sort file                           # byte-order, predictable
```

`[a-z]`, `[[:upper:]]`, `tolower`, regex character classes — all
locale-aware. In scripts, `LC_ALL=C` is the standard way to get
predictable byte-level behaviour.

### macOS / BSD differences

Many GNU-specific flags don't exist on the BSD versions shipped
with macOS:

| Tool | GNU-only flags / behaviour |
| --- | --- |
| `sed -i` | macOS requires an extension argument: `sed -i '' 's/.../.../'`. Portable: `sed -i.bak`. |
| `tar --transform`, `--xform` | GNU only; BSD has `-s '/old/new/'`. |
| `cp --reflink` | GNU/Linux-specific (filesystem support too). |
| `find -mtime -1` | works; but `-print0` is GNU. macOS `find` has it. |
| `tac` | not on macOS by default; use `tail -r` or install `coreutils` (then `gtac`). |
| `seq -w` | works. macOS shipped a different seq for years. |
| `readlink -f` | GNU; macOS doesn't have `-f`. Use `realpath` or write a tiny shim. |
| `stat -c '%Y' file` | GNU. macOS: `stat -f '%m' file`. |
| `wc -L` | GNU; not on BSD. |
| `mktemp -d /tmp/...` | works; the template format differs. |
| `xargs -d '\n'` | GNU. macOS xargs doesn't have `-d`. |

`brew install coreutils findutils gnu-sed gawk gnu-tar` on macOS
gives you the GNU versions prefixed with `g` (`gsed`, `gawk`,
`gstat`, `greadlink`, etc.).

### `kill -9` skips cleanup

`kill -9` (SIGKILL) terminates immediately without giving the
process a chance to release locks, flush buffers, write
checkpoints, or notify children. Always try `kill` (TERM) first;
escalate to `kill -9` only when TERM doesn't work after a few
seconds.

### Accidentally backgrounded jobs

```
slow-command &
                                            # exits the terminal: kills the job
                                            # unless ...
slow-command &
disown
                                            # ... or use:
nohup slow-command &
                                            # ... or:
tmux new -s work
slow-command
# Ctrl-b d to detach
```

For anything serious, use `tmux` (or `screen`, or systemd-run).

### Infinite loops in scripts

```
while true; do ...; done                    # eats CPU if the loop body is short — add `sleep N`
while read line; do ...; done < file        # works, but if file is empty, the body never runs
```

### Bash array gotchas

```
arr=(a b c)
echo $arr                                    # only "a"!
echo "${arr[@]}"                             # all elements, properly quoted
echo "${#arr[@]}"                            # count
```

Use `"${arr[@]}"` to expand an array safely.

### Parse `ls` at your peril

```
for f in $(ls *.log); do ...; done           # WRONG: breaks on spaces in filenames
for f in *.log; do ...; done                 # correct: shell glob expansion
```

`ls` output is for humans; use shell globs or `find -print0` for
scripts.

---

## Distribution and version notes

### Major distribution families and their flavours

- **Debian and derivatives** — Debian, Ubuntu, Linux Mint, Pop!_OS,
  Kali, Raspberry Pi OS. Package manager: `apt` / `dpkg`. Init:
  `systemd` (modern Debian and Ubuntu).
- **Red Hat and derivatives** — RHEL, CentOS Stream, Fedora, Rocky
  Linux, AlmaLinux, Amazon Linux. Package manager: `dnf` (older
  systems: `yum`); `rpm` underneath. Init: `systemd`.
- **Arch and derivatives** — Arch Linux, Manjaro, EndeavourOS,
  Garuda. Package manager: `pacman`. Init: `systemd`.
- **openSUSE / SLES** — Package manager: `zypper`. Init: `systemd`.
- **Alpine** — minimal, security-focused, popular for containers.
  Package manager: `apk`. Init: `OpenRC` (not `systemd`). `musl`
  libc and `busybox` instead of GNU coreutils — many shell scripts
  written for "Linux" need adjustments here.
- **Gentoo** — source-based. Package manager: `emerge`/`portage`.

For most operational work, the Debian and Red Hat families cover
the majority of servers in production. Arch, openSUSE, Alpine, and
Gentoo each have specific niches.

### Init systems

- **`systemd`** — dominant on modern desktop and server distros.
  Covered in detail above.
- **`OpenRC`** — Alpine, Gentoo. Service management via
  `rc-service`, `rc-update`. Configuration files in
  `/etc/init.d/`.
- **`runit`** — Void Linux, some embedded systems.
- **`SysV init`** — historical; some long-running enterprise
  installations still use it. Service management via
  `/etc/init.d/SERVICE start|stop|restart`. Replaced by systemd
  on most distributions.
- **`Upstart`** — Ubuntu's between-stages init from 2006-2014.
  Replaced by systemd.

If you SSH into a system and find `systemctl` doesn't exist, check
which init is running:

```
ps -p 1                                    # what is PID 1?
cat /proc/1/comm                           # alternative
```

If PID 1 is `systemd`, you have systemd. If it's `init` or
something else, look up the init system before assuming.

### Shells

The default shell on most modern Linux is `bash`. The default on
macOS since 2019 is `zsh`. Common alternatives:

- **`bash`** — Bourne-again shell. The de facto default. Covered
  in detail in the Bash Quick Reference.
- **`zsh`** — backwards-compatible with bash but with many
  improvements (better completion, themes via Oh My Zsh /
  prezto / starship, prompt features). Default on macOS.
- **`dash`** — small POSIX shell. Default `/bin/sh` on Debian and
  Ubuntu (so when scripts use `#!/bin/sh`, they get dash). Faster
  than bash for scripts but missing many bash extensions.
- **`fish`** — Friendly Interactive Shell. Different (non-bash)
  syntax. Strong autosuggestions and syntax highlighting.
  Interactive use only — not for scripts.
- **`busybox`'s `ash`** — minimal POSIX shell, common in Alpine
  and embedded systems.
- **`ksh`, `tcsh`, `csh`** — historical alternatives. Still
  encountered occasionally.

Test with `echo $0` or `ps -p $$ -o comm=`.

### Shell configuration files

A bash login shell reads:

1. `/etc/profile`
2. The first of `~/.bash_profile`, `~/.bash_login`, `~/.profile`
3. On exit: `~/.bash_logout`

A bash interactive non-login shell reads:

1. `/etc/bash.bashrc`
2. `~/.bashrc`

A non-interactive bash (a script started with `bash`) reads
neither, unless `BASH_ENV` is set.

The conventional pattern is to put environment variables in
`~/.bash_profile` (for login shells) or `~/.profile` and put
aliases, functions, and per-shell behaviour in `~/.bashrc`. Many
systems source `~/.bashrc` from `~/.bash_profile` to make the
distinction less important:

```
# in ~/.bash_profile
[[ -f ~/.bashrc ]] && . ~/.bashrc
```

### Filesystem types

The default for most distros has shifted over the years:

- **`ext4`** — robust, mature, default on most distros. Reliable
  default choice.
- **`xfs`** — Red Hat's preferred default. Excellent on large
  filesystems, can grow online.
- **`btrfs`** — copy-on-write, snapshots, multi-device. Default on
  Fedora and openSUSE. Some operational care required for stable
  use.
- **`zfs`** — copy-on-write, snapshots, RAID-like volume
  management. Licensing prevents direct kernel inclusion in many
  distros; available as DKMS or the OpenZFS port. Heavy memory
  footprint but very robust.
- **`f2fs`** — flash-friendly. Common on phones/embedded.
- **`vfat` / `exFAT`** — cross-platform compatibility (USB
  sticks).
- **`ntfs`** — Windows NTFS, readable via `ntfs-3g` or kernel
  driver. Mostly for shared drives.

### Kernel version

```
uname -a                                    # everything
uname -r                                    # kernel release: 6.5.0-15-generic
uname -m                                    # machine: x86_64, aarch64
uname -p                                    # processor type
hostnamectl                                 # also shows kernel via systemd
cat /proc/version                           # full kernel build info
```

### CPU and memory info

```
lscpu                                       # CPU summary: cores, threads, model, frequency
nproc                                       # number of online CPUs
nproc --all                                 # all CPUs (including offline)
cat /proc/cpuinfo                           # per-core details (verbose)
free -h                                     # memory
free -hw                                    # show buffers/cache separately
cat /proc/meminfo                           # detailed memory state
lshw                                        # hardware (very thorough; needs root for full output)
lshw -short                                 # condensed
hwinfo                                      # alternative on some distros
dmidecode                                   # SMBIOS / DMI tables (motherboard, BIOS, etc.)
inxi -F                                     # human-friendly system info (separate install)
neofetch                                    # pretty print of system info
```

### A note on container and minimal environments

Inside a Docker container, an Alpine VM, or a minimal cloud image,
many of the commands above are missing or different. Containers
based on `busybox` (Alpine) ship a single multi-call binary that
implements many tools, but with reduced flag sets. Common
surprises:

- `ps` accepts a different flag set.
- `find -print0` and `xargs -0` may be missing.
- `awk` is `gawk`-incompatible.
- `sed -i` requires the BSD-style empty extension argument.
- `bash` may not be present at all — only `sh` (which is `ash`).

When writing scripts that run in containers, target POSIX `sh`
where possible, or pin a base image that includes the GNU tools
(e.g. `debian:slim`, `ubuntu`, `alpine` plus
`apk add coreutils findutils sed grep`).

### Modern alternatives worth knowing

A non-exhaustive list of "the modern tool that replaces this
classical tool":

| Classical | Modern alternative |
| --- | --- |
| `grep -r` | `ripgrep` (`rg`) |
| `find` (for searching) | `fd` |
| `cat` | `bat` (with syntax highlighting) |
| `ls` | `eza` (formerly `exa`) |
| `top` | `htop`, `btop`, `bottom` |
| `ps + grep` | `pgrep` |
| `du` | `dust`, `ncdu` |
| `df` | `duf` |
| `tree` | `eza --tree`, `tre` |
| `cd` (with history) | `zoxide` (`z dirname`) |
| `sed` (interactive) | `sd` |
| `man` | `tldr` (concise examples) |
| `awk` (for data) | `mlr` (Miller) |
| `cut`, `awk` (for CSV) | `csvkit`, `xsv`, `qsv` |
| `netstat`, `ifconfig` | `ss`, `ip` (already covered) |

These don't replace knowing the classical tools — every Linux
machine has the classics, only some have the modern alternatives.
But once installed, they save a lot of typing.

