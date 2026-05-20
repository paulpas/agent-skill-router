---
title: "PowerShell — Quick Reference"
audience: "Engineers comfortable in another shell who need to be effective in PowerShell on Windows or PowerShell Core on Linux/macOS."
status: "complete"
---

# PowerShell
### A Quick Reference for the Object Shell

---

> PowerShell is an *object* shell. Commands return live .NET objects, not
> text. That single fact is the source of every difference from bash.

## When to reach for PowerShell

- You're administering Windows (Active Directory, WMI/CIM, registry,
  services, IIS, Exchange, Windows file ACLs).
- You want a shell that gives you typed objects with properties and
  methods rather than text you have to re-parse on every step.
- You need to run the same automation across Windows, Linux and macOS
  with one toolchain — that's **PowerShell Core / PowerShell 7+**.
- **Don't** reach for it for one-line shell glue on Linux when bash is
  already there and the team knows it.

## Mental model

A pipeline like `Get-Process | Where-Object CPU -GT 50 | Sort-Object CPU
| Select-Object -First 5 Name,CPU` passes *Process objects* between
cmdlets. There is no parsing of text columns. Each cmdlet's output type
is documented; you can `Get-Member` on the pipeline at any point to
discover properties and methods.

Cmdlets are named `Verb-Noun`. The verbs are a fixed vocabulary
(`Get`, `Set`, `New`, `Remove`, `Start`, `Stop`, `Test`, `Invoke`, …).
The nouns are singular by convention.

Aliases give you bash-shaped muscle memory: `ls`, `cat`, `cp`, `rm`,
`pwd`, `mv`, `cd` all exist as aliases. `Get-Alias` lists them.

> Throughout this card, examples assume PowerShell 7+ unless noted.

---

## Running commands

```powershell
Get-Process                           # cmdlet
gps                                   # alias for Get-Process
Get-Help Get-Process                  # help; -Examples for examples only
Get-Help Get-Process -Online          # browse online docs
Get-Command -Verb Get -Noun *Service* # discoverability
Get-Command notepad                   # info about an external EXE too
```

Tab completion expands cmdlets, parameters, parameter values, file
paths and dynamic objects (e.g. process names after `-Name`).

```powershell
Get-Process | Get-Member              # discover what's on the pipeline
Get-Process | Format-Table Name,Id -AutoSize
Get-Process | Format-List *           # everything as a list
Get-Process | Out-GridView            # GUI grid (Windows / 5.1 only)
```

`Format-*` is for *humans*. Never pipe `Format-*` into another cmdlet —
once you've formatted, you only have display objects, not the originals.

---

## Variables, types, operators

### Variables

```powershell
$name = 'ada'         # string
$age  = 36            # int
$pi   = 3.14          # double
$tags = @('a','b','c')   # array
$user = @{ name='ada'; age=36 }   # hashtable
$me   = [pscustomobject]@{ Name='ada'; Age=36 }   # named object
```

Type the variable explicitly when you want enforcement:

```powershell
[int]$port = 8080
[string[]]$names = @('a','b')
```

Automatic variables you'll see often:

| Var | Meaning |
| --- | --- |
| `$_` / `$PSItem` | current pipeline element inside `ForEach-Object` / `Where-Object` |
| `$?` | did the previous statement succeed? |
| `$LASTEXITCODE` | exit code of the last *external* command |
| `$args` | unbound positional args inside a function |
| `$PSVersionTable` | version + edition + build |
| `$PSScriptRoot` | directory of the running script |
| `$Error` | array; `$Error[0]` is the most recent error |

### Operators

PowerShell uses `-eq`, not `==`. `==` is an unrelated assignment-ish
operator.

| Op | Meaning |
| --- | --- |
| `-eq` `-ne` | equal / not equal |
| `-lt` `-le` `-gt` `-ge` | numeric or string comparison |
| `-like` `-notlike` | wildcard match (`*` `?`) |
| `-match` `-notmatch` | regex match; populates `$Matches` |
| `-replace` | regex replace |
| `-contains` `-notcontains` | does an *array* contain a value |
| `-in` `-notin` | is a value in an array |
| `-and` `-or` `-not` (`!`) | boolean |
| `-band -bor -bxor -bnot` | bitwise |

Add `-c` prefix for case-sensitive (`-ceq`, `-cmatch`, …) or `-i` to be
explicit about case-insensitive (the default).

```powershell
'hello' -match '^h(.+)o$'   # True; $Matches[0]='hello' $Matches[1]='ell'
'foo bar' -replace '(\w+) (\w+)', '$2 $1'   # 'bar foo'
'abc' -like 'a*'            # True
@(1,2,3) -contains 2        # True
2 -in @(1,2,3)              # True
```

---

## Pipeline of objects

The whole point of PowerShell.

```powershell
Get-Process |
  Where-Object { $_.CPU -gt 100 } |
  Sort-Object CPU -Descending |
  Select-Object -First 10 Name, Id, CPU
```

Short form for simple `Where-Object`:

```powershell
Get-Process | Where-Object CPU -gt 100
Get-Process | Where Name -like 'chrome*'
```

`ForEach-Object { … }` is the pipeline `for`:

```powershell
1..5 | ForEach-Object { $_ * $_ }
Get-ChildItem *.log | ForEach-Object { Compress-Archive $_ "$($_.Name).zip" }
```

`Select-Object` for projection / transformation:

```powershell
Get-Process | Select-Object Name, Id, @{n='MB';e={[int]($_.WS/1MB)}}
```

The `@{ n='Name'; e={ expression } }` shape is a *calculated property* —
add a column whose value is computed from `$_`.

`Group-Object`, `Measure-Object`, `Compare-Object` round it out:

```powershell
Get-ChildItem -Recurse | Group-Object Extension | Sort Count -Desc | Select Count,Name
Get-Content data.txt | Measure-Object -Line -Word -Character
Compare-Object (Get-Content a.txt) (Get-Content b.txt)
```

---

## Flow control

```powershell
if ($x -gt 10) { 'big' } elseif ($x -gt 0) { 'small' } else { 'zero or neg' }

switch ($status) {
  'start' { Start-Service $svc }
  'stop'  { Stop-Service $svc }
  default { "unknown: $status" }
}

switch -Regex ($s) {
  '^\d+$'   { 'digits' }
  '^[a-z]+$' { 'letters' }
}

for ($i=0; $i -lt 5; $i++) { $i }
foreach ($n in 1..5) { $n * 2 }
while ((Get-Service Spooler).Status -ne 'Running') { Start-Sleep 1 }
do { ... } while ($cond)
```

The pipeline form `... | ForEach-Object { ... }` is preferred over
`foreach (...)` when you're inside a pipeline — it streams.

---

## Functions, script blocks, parameters

### Simple function

```powershell
function Add-Numbers ($a, $b) { $a + $b }
Add-Numbers 2 3
Add-Numbers -a 2 -b 3
```

### Advanced function (cmdlet-shaped)

```powershell
function Get-Bigfile {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)] [string]$Path,
    [int64]$MinSize = 100MB
  )
  Get-ChildItem -Path $Path -Recurse -File |
    Where-Object Length -gt $MinSize
}
Get-Bigfile -Path C:\ -Verbose
```

`[CmdletBinding()]` gives you `-Verbose`, `-Debug`, `-ErrorAction`, etc.
for free.

### Pipeline-aware function

```powershell
function Square {
  param(
    [Parameter(ValueFromPipeline)] [int]$N
  )
  process { $N * $N }
}
1..5 | Square      # 1 4 9 16 25
```

`begin / process / end` blocks split out one-time setup, per-item work
and one-time finalization.

### Script blocks

A script block is `{ … }` — a first-class function value.

```powershell
$double = { param($x) $x * 2 }
& $double 5            # 10
$double.Invoke(5)
```

---

## Modules and profiles

```powershell
Get-Module                   # currently loaded
Get-Module -ListAvailable    # everything installed
Import-Module ActiveDirectory
Find-Module Pester           # search the gallery
Install-Module Pester -Scope CurrentUser
Update-Module Pester
```

`$PROFILE` points at your profile script. Customize the shell:

```powershell
notepad $PROFILE
# add aliases, prompt, function definitions, env vars
```

Each PowerShell host has its own profile; `$PROFILE | Get-Member` shows
the four scopes (AllUsers/CurrentUser × AllHosts/CurrentHost).

---

## Files & filesystem

```powershell
Get-ChildItem .                    # ls
Get-ChildItem -Recurse -Filter *.log
Get-ChildItem -Hidden
Get-Content file.txt               # cat
Get-Content -Tail 50 -Wait file.log    # tail -f
Set-Content out.txt 'hello'         # write (overwrite)
Add-Content out.txt 'more'          # append
Out-File -FilePath out.txt -InputObject $obj  # write with formatting
Test-Path C:\foo\bar
New-Item -ItemType Directory -Path .\dir
Copy-Item src dst
Move-Item old new
Remove-Item file
Remove-Item -Recurse -Force dir/
Resolve-Path .\rel
```

Reading structured files:

```powershell
$cfg = Get-Content -Raw config.json | ConvertFrom-Json
$cfg.servers.web.port

$rows = Import-Csv data.csv
$rows | Where-Object Status -eq 'OK' | Measure-Object

[xml]$xml = Get-Content data.xml
$xml.root.SelectNodes('//item')
```

Writing structured files:

```powershell
$obj | ConvertTo-Json | Set-Content out.json
$rows | Export-Csv out.csv -NoTypeInformation
```

---

## Processes, services, registry

```powershell
Get-Process                            # all
Get-Process notepad                    # by name
Stop-Process -Id 1234
Stop-Process -Name chrome -Force
Start-Process notepad

Get-Service
Get-Service Spooler
Start-Service Spooler
Stop-Service Spooler
Restart-Service Spooler
Set-Service Spooler -StartupType Automatic
```

The registry as a drive (Windows):

```powershell
Get-ChildItem HKLM:\Software
Get-ItemProperty 'HKLM:\Software\Microsoft\Windows NT\CurrentVersion'
Set-ItemProperty 'HKCU:\…' -Name X -Value 1
New-ItemProperty 'HKCU:\…' -Name X -Value 1 -PropertyType DWord
```

WMI / CIM:

```powershell
Get-CimInstance Win32_OperatingSystem | Select Caption, Version, BuildNumber
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' |
  Select DeviceID, @{n='FreeGB';e={[int]($_.FreeSpace/1GB)}}
```

`Get-CimInstance` is the modern replacement for `Get-WmiObject` (which
still exists in Windows PowerShell 5.1 but is gone in 7+).

---

## Remoting

PowerShell remoting (over WinRM on Windows, SSH on cross-platform):

```powershell
Test-WSMan host                              # is WinRM up?
Enter-PSSession -ComputerName host           # interactive
Invoke-Command -ComputerName host -ScriptBlock { Get-Service }
$session = New-PSSession -ComputerName host  # persistent
Invoke-Command -Session $session -ScriptBlock { … }
Remove-PSSession $session

# SSH-based (works on Linux/macOS targets)
Enter-PSSession -HostName host -UserName ada
Invoke-Command -HostName host -UserName ada -ScriptBlock { … }
```

Fan out:

```powershell
Invoke-Command -ComputerName web1,web2,web3 -ScriptBlock { hostname; uptime }
```

---

## Error handling

PowerShell has *terminating* and *non-terminating* errors. `try/catch`
catches terminating ones; non-terminating ones are reported but don't
abort the pipeline unless you ask.

```powershell
try {
  Get-Item 'C:\does\not\exist' -ErrorAction Stop
} catch [System.Management.Automation.ItemNotFoundException] {
  Write-Warning "missing: $($_.TargetObject)"
} catch {
  Write-Error $_                  # rethrow with context
} finally {
  Write-Verbose 'done'
}
```

`-ErrorAction` on any cmdlet:

| Value | Effect |
| --- | --- |
| `Continue` | default; report and keep going |
| `SilentlyContinue` | suppress display, continue |
| `Stop` | promote to terminating (catchable) |
| `Inquire` | prompt |
| `Ignore` | as if it never happened, no `$Error` entry |

Set globally for a script with `$ErrorActionPreference = 'Stop'`.

---

## Jobs

```powershell
Start-Job -ScriptBlock { 1..5 | ForEach-Object { Start-Sleep 1; $_ } }
Get-Job
Receive-Job -Id 1               # collect output
Wait-Job -Id 1
Remove-Job -Id 1

# Thread-based (much faster startup, in-process; 7+)
Start-ThreadJob -ScriptBlock { ... }

# Parallel ForEach (7+)
1..10 | ForEach-Object -Parallel { Test-Connection -Count 1 host$_ } -ThrottleLimit 5
```

---

## Execution policy and signing (Windows)

```powershell
Get-ExecutionPolicy
Get-ExecutionPolicy -List
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Practical scopes: `RemoteSigned` (allow your own scripts; require
signature on downloaded scripts) or `AllSigned` for high-security envs.

```powershell
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Select -First 1
Set-AuthenticodeSignature .\script.ps1 $cert
Get-AuthenticodeSignature .\script.ps1
```

---

## Debugging

```powershell
Set-PSBreakpoint -Script .\script.ps1 -Line 42
Set-PSBreakpoint -Variable count -Mode ReadWrite
Set-PSBreakpoint -Command Get-Process

# inside the debugger prompt:
#   s -> step into
#   v -> step over
#   o -> step out
#   c -> continue
#   q -> quit and detach
#   list -> show source

Get-PSBreakpoint | Remove-PSBreakpoint

Set-PSDebug -Trace 1            # set -x equivalent
Set-PSDebug -Trace 0
Set-PSDebug -Strict             # like -u in bash
```

Inside a script, sprinkle `Write-Verbose 'msg'` and run with `-Verbose`,
or `Write-Debug 'msg'` with `-Debug`. Don't pollute stdout with
diagnostic strings — that breaks the pipeline.

---

## .NET and COM interop

```powershell
[System.Math]::Pi
[System.IO.File]::Exists('C:\foo')
[System.Net.WebClient]::new().DownloadString('https://x.y')

Add-Type -AssemblyName System.Web
[System.Web.HttpUtility]::UrlEncode('a b c')

# COM (Windows)
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $true
```

Casting:

```powershell
[int]'42'                    # 42
[datetime]'2024-01-01'       # DateTime
[guid]::NewGuid()
[xml]$x = '<r><a>1</a></r>'
```

---

## Useful one-liners

```powershell
# top 10 CPU consumers
Get-Process | Sort CPU -Desc | Select -First 10 Name,Id,CPU,WS

# find files modified in last 24h
Get-ChildItem -Recurse -File | Where LastWriteTime -gt (Get-Date).AddDays(-1)

# count lines of code
(Get-ChildItem -Recurse -Include *.cs,*.ps1 | Get-Content | Measure-Object -Line).Lines

# show services not running that should be
Get-Service | Where { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' }

# decode a JSON Web Token payload
$jwt = '...'
$parts = $jwt.Split('.')
$pad = '=' * ((4 - $parts[1].Length % 4) % 4)
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parts[1]+$pad)) | ConvertFrom-Json

# call a REST API
$r = Invoke-RestMethod 'https://api.example.com/v1/items' -Headers @{Authorization="Bearer $tok"}
$r.items | Where Status -eq 'open' | Select Id,Title
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `==` does the wrong thing | not a comparison op | use `-eq` |
| Pipeline shows table but later steps see nothing | piped through `Format-Table` | drop the `Format-*`; format only at the very end |
| String contains `$variable` literal | single quotes | use double quotes for interpolation |
| `Get-WmiObject` not found in 7+ | removed | use `Get-CimInstance` |
| Script "blocked" on Windows | execution policy + zone bit | `Unblock-File .\script.ps1` and/or `Set-ExecutionPolicy RemoteSigned` |
| `&` operator confused with bash | `&` is the *call* operator | `& 'C:\Program Files\…\app.exe' arg1` |
| Args splatting weirdly | passing a hashtable as one arg | use splat: `& $cmd @args` with `$args = @{Name='x'; Path='y'}` |

## Gotchas

- Do not pipe `Format-*` into anything. The objects after a `Format-*`
  are display records, not your data.
- Returning from a function: `return $x` inside a function does NOT
  *only* return `$x` — every uncaptured expression is part of the
  return value. Suppress with `$null = …` or `Out-Null`.
- `Write-Host` writes to the host UI, not the pipeline. Use it for
  banners only. For data, just emit the value.
- `$null -eq $x` is the recommended idiom (puts `$null` on the left)
  because `$x -eq $null` returns the wrong thing if `$x` is an array.
- `-replace` is regex. To replace a literal string, escape: `[regex]::Escape($x)`
  or use `.Replace($a,$b)` on the string method.

## Version notes

- **Windows PowerShell 5.1** is bundled with Windows; .NET Framework
  underneath. End of feature road.
- **PowerShell 7+** (a.k.a. PowerShell Core) is cross-platform, .NET
  Core/5+ underneath, install separately. Most new features land here.
- Compatibility shims (`Microsoft.PowerShell.Compatibility`) let 7+
  call into 5.1 modules where needed.
- `Get-WmiObject`, `*-EventLog`, `WMI` provider — gone in 7+. Use
  `Get-CimInstance` and `Get-WinEvent`.
- `Invoke-WebRequest` / `Invoke-RestMethod` are first-class on all
  versions; the 7+ versions are based on .NET HttpClient and behave
  consistently across OSes.
---

## Recipe collection: day-to-day operations

A working set of one-and-two-line patterns for common operational tasks.
Each recipe is self-contained; copy, adapt the names, run.

### Process and service triage

```powershell
# Top 10 memory consumers, with friendly columns
Get-Process |
    Sort-Object WorkingSet64 -Descending |
    Select-Object -First 10 Name, Id,
        @{n='WS_MB'; e={[int]($_.WorkingSet64/1MB)}},
        @{n='CPU_s';  e={[int]$_.CPU}}

# Show every process that has been running for more than 7 days
Get-Process |
    Where-Object { $_.StartTime -and $_.StartTime -lt (Get-Date).AddDays(-7) } |
    Sort-Object StartTime |
    Select-Object Name, Id, StartTime,
        @{n='Age_days'; e={[int]((Get-Date)-$_.StartTime).TotalDays}}

# Restart any services that are set to Automatic but stopped
Get-Service |
    Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' } |
    Start-Service -PassThru |
    Format-Table Name, Status

# Wait for a service to reach Running with a timeout
$deadline = (Get-Date).AddSeconds(60)
do {
    $s = Get-Service MyService
    if ($s.Status -eq 'Running') { break }
    Start-Sleep -Seconds 1
} until ((Get-Date) -gt $deadline)
if ($s.Status -ne 'Running') { throw "MyService didn't start in time" }
```

### File-system reconnaissance

```powershell
# Disk usage by top-level folder, sorted descending
Get-ChildItem C:\ -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
                 Measure-Object Length -Sum).Sum
        [pscustomobject]@{
            Path    = $_.FullName
            Size_GB = [math]::Round($size / 1GB, 2)
        }
    } |
    Sort-Object Size_GB -Descending

# Files larger than 100 MB anywhere under a tree
Get-ChildItem . -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object Length -gt 100MB |
    Sort-Object Length -Descending |
    Select-Object FullName, @{n='MB'; e={[int]($_.Length/1MB)}}

# Count files by extension under a tree
Get-ChildItem . -Recurse -File |
    Group-Object Extension |
    Sort-Object Count -Descending |
    Select-Object -First 20 Count, Name

# Find files containing a string, with line numbers (PS-native grep)
Get-ChildItem . -Recurse -Include *.log, *.txt -File |
    Select-String -Pattern 'ERROR|FATAL' -SimpleMatch:$false |
    Select-Object Path, LineNumber, Line

# Newest 10 files anywhere under cwd
Get-ChildItem . -Recurse -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10 LastWriteTime, FullName
```

### Network and ports

```powershell
# Listening TCP ports with owning process names
Get-NetTCPConnection -State Listen |
    Select-Object LocalAddress, LocalPort,
        @{n='Process'; e={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Name}},
        OwningProcess |
    Sort-Object LocalPort

# All TCP connections to a remote host
Get-NetTCPConnection -RemoteAddress 10.0.0.5 |
    Select-Object LocalPort, RemoteAddress, RemotePort, State,
        @{n='Process'; e={(Get-Process -Id $_.OwningProcess).Name}}

# Test if a remote TCP port is reachable (with timeout)
function Test-Port {
    param([string]$Host, [int]$Port, [int]$TimeoutMs = 1500)
    $c = New-Object Net.Sockets.TcpClient
    try {
        $iar = $c.BeginConnect($Host, $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        if ($ok) { $c.EndConnect($iar); return $true }
        return $false
    } finally { $c.Close() }
}

# Resolve a name multiple ways
Resolve-DnsName www.example.com -Type A
Resolve-DnsName www.example.com -Server 1.1.1.1 -Type AAAA
[System.Net.Dns]::GetHostEntry('www.example.com')
```

### Event logs and Windows logs

```powershell
# Last 50 errors from the System log
Get-WinEvent -FilterHashtable @{LogName='System'; Level=2} -MaxEvents 50 |
    Select-Object TimeCreated, Id, ProviderName, Message |
    Format-List

# Errors in the last hour, any log
Get-WinEvent -FilterHashtable @{
    StartTime = (Get-Date).AddHours(-1)
    Level     = 1, 2     # 1=Critical 2=Error
} -ErrorAction SilentlyContinue

# Logon failures (event 4625)
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id      = 4625
    StartTime = (Get-Date).AddDays(-1)
} -MaxEvents 200 |
    ForEach-Object {
        [pscustomobject]@{
            Time = $_.TimeCreated
            User = $_.Properties[5].Value
            From = $_.Properties[19].Value
        }
    }
```

### Scheduled tasks

```powershell
# All enabled scheduled tasks, with last result code
Get-ScheduledTask |
    Where-Object State -ne 'Disabled' |
    Get-ScheduledTaskInfo |
    Select-Object TaskName, LastRunTime, LastTaskResult, NextRunTime |
    Sort-Object NextRunTime

# Register a daily task that runs a script as the SYSTEM account
$action  = New-ScheduledTaskAction -Execute 'pwsh' -Argument '-File C:\ops\nightly.ps1'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName 'NightlyOps' -Action $action -Trigger $trigger `
    -User 'SYSTEM' -RunLevel Highest -Description 'Nightly maintenance'
```

### Certificates

```powershell
# Certs in the local machine's My store, with expiry
Get-ChildItem Cert:\LocalMachine\My |
    Select-Object Subject, NotAfter,
        @{n='Days_Left'; e={[int]($_.NotAfter - (Get-Date)).TotalDays}} |
    Sort-Object Days_Left

# Certs expiring in the next 30 days, anywhere on the box
Get-ChildItem Cert:\ -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.NotAfter -and $_.NotAfter -lt (Get-Date).AddDays(30) } |
    Select-Object PSParentPath, Subject, NotAfter
```

---

## Recipe collection: Active Directory, identity, and inventory

These recipes assume the `ActiveDirectory` module is present (RSAT on
Windows, or `Install-WindowsFeature RSAT-AD-PowerShell` on a server). On
non-domain hosts skip this section.

### Quick AD lookups

```powershell
# Resolve a username to its DN, manager, and groups
$u = Get-ADUser -Identity jdoe -Properties DisplayName, Manager, MemberOf, LastLogonDate
$u | Select-Object DisplayName, DistinguishedName, LastLogonDate
$u.MemberOf | ForEach-Object { (Get-ADGroup $_).Name } | Sort-Object

# Reverse: who's in this group, recursively?
Get-ADGroupMember -Identity 'Domain Admins' -Recursive |
    Get-ADUser -Properties LastLogonDate |
    Select-Object Name, SamAccountName, Enabled, LastLogonDate |
    Sort-Object LastLogonDate

# Find disabled accounts that still hold any group membership
Get-ADUser -Filter { Enabled -eq $false } -Properties MemberOf |
    Where-Object { $_.MemberOf.Count -gt 1 } |  # 1 = primary group only
    Select-Object Name, SamAccountName, @{n='GroupCount'; e={$_.MemberOf.Count}}

# Stale accounts: no logon in 90+ days
$cut = (Get-Date).AddDays(-90)
Get-ADUser -Filter { Enabled -eq $true } -Properties LastLogonDate |
    Where-Object { $_.LastLogonDate -lt $cut } |
    Select-Object Name, SamAccountName, LastLogonDate |
    Sort-Object LastLogonDate
```

### Bulk operations

```powershell
# Bulk-create users from a CSV (Name,SamAccountName,Email,Department)
Import-Csv .\new-users.csv | ForEach-Object {
    $pw = ConvertTo-SecureString -AsPlainText -Force `
            -String ([System.Web.Security.Membership]::GeneratePassword(16, 4))
    New-ADUser -Name $_.Name -SamAccountName $_.SamAccountName `
               -EmailAddress $_.Email -Department $_.Department `
               -AccountPassword $pw -Enabled $true `
               -Path 'OU=NewHires,DC=corp,DC=example,DC=com' `
               -ChangePasswordAtLogon $true
}

# Add a list of users to a group
Get-Content .\users.txt | ForEach-Object {
    Add-ADGroupMember -Identity 'VPN-Users' -Members $_
}

# Remove a single user from every group except their primary
$user = Get-ADUser jdoe -Properties MemberOf
$user.MemberOf | ForEach-Object { Remove-ADGroupMember $_ -Members $user -Confirm:$false }
```

### Computer inventory across the domain

```powershell
# All servers seen in AD, with OS and last logon
Get-ADComputer -Filter { OperatingSystem -like '*Server*' } `
               -Properties OperatingSystem, OperatingSystemVersion, LastLogonDate |
    Select-Object Name, OperatingSystem, OperatingSystemVersion, LastLogonDate |
    Sort-Object Name

# Inventory: hostname, OS, model, RAM, CPU — pulled in parallel
$names = (Get-ADComputer -Filter { Enabled -eq $true } -SearchBase 'OU=Servers,DC=corp,DC=example,DC=com').Name
$names | ForEach-Object -Parallel {
    try {
        $cs = Get-CimInstance -ComputerName $_ Win32_ComputerSystem -OperationTimeoutSec 5
        $os = Get-CimInstance -ComputerName $_ Win32_OperatingSystem  -OperationTimeoutSec 5
        [pscustomobject]@{
            Host    = $_
            OS      = $os.Caption
            Model   = $cs.Model
            RAM_GB  = [math]::Round($cs.TotalPhysicalMemory/1GB, 1)
            CPUs    = $cs.NumberOfLogicalProcessors
            BootTime= $os.LastBootUpTime
        }
    } catch {
        [pscustomobject]@{ Host = $_; Error = $_.Exception.Message }
    }
} -ThrottleLimit 16 |
    Export-Csv .\inventory.csv -NoTypeInformation
```

### Software inventory

```powershell
# Installed applications from the registry (faster than Win32_Product)
$paths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
Get-ItemProperty $paths -ErrorAction SilentlyContinue |
    Where-Object DisplayName |
    Select-Object DisplayName, DisplayVersion, Publisher, InstallDate |
    Sort-Object DisplayName

# Hotfixes installed in the last 30 days
Get-HotFix |
    Where-Object InstalledOn -gt (Get-Date).AddDays(-30) |
    Sort-Object InstalledOn -Descending |
    Select-Object HotFixID, Description, InstalledOn, InstalledBy
```

---

## Recipe collection: troubleshooting playbook

Symptom-first index for incidents that recur often enough to memorise.

### "My script worked yesterday and doesn't today"

1. Was PowerShell upgraded? `$PSVersionTable.PSVersion` — note the major
   version. 5.1 ↔ 7+ behaviour differences are the most common cause.
2. Was a module updated? `Get-Module ModName -ListAvailable | Sort Version`
   — pin a version with `Import-Module ModName -RequiredVersion 1.2.3`.
3. Did the execution policy change? `Get-ExecutionPolicy -List` shows
   policy at every scope.
4. Is there a profile script that changed? `$PROFILE.AllUsersAllHosts`,
   `$PROFILE.CurrentUserAllHosts`, `$PROFILE.CurrentUserCurrentHost` —
   inspect each.
5. Network change? Some failures are upstream; isolate with
   `Test-NetConnection target -Port 443 -InformationLevel Detailed`.

### "Pipeline gives me strings when I expected objects"

You almost certainly piped through a `Format-*` cmdlet earlier in the
pipeline. The output of `Format-Table`, `Format-List`, `Format-Wide`
is *display records*, not your data. Move all `Format-*` to the end of
the pipeline; it should be the very last step.

```powershell
# WRONG — Format-Table is mid-pipeline, breaks downstream
Get-Process | Format-Table Name, Id | Where-Object Name -like 'pwsh*'

# RIGHT — filter on objects, format last (or omit entirely)
Get-Process | Where-Object Name -like 'pwsh*' | Format-Table Name, Id
```

### "Can't run script — execution policy"

The fastest legitimate workarounds, in increasing order of permanence:

```powershell
# One invocation only
pwsh -ExecutionPolicy Bypass -File .\thing.ps1

# Current process only (until you exit)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# User-scope, persistent
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# If the problem is the "downloaded from internet" zone bit, not the policy:
Unblock-File .\thing.ps1
```

### "Get-WmiObject: not recognised"

You're on PowerShell 7+, where the WMI cmdlets were removed. Replace
verb-by-verb:

| 5.1 | 7+ |
| --- | --- |
| `Get-WmiObject Win32_OperatingSystem` | `Get-CimInstance Win32_OperatingSystem` |
| `Get-WmiObject -ComputerName X -Class Y` | `Get-CimInstance -ComputerName X -ClassName Y` |
| `Invoke-WmiMethod` | `Invoke-CimMethod` |
| `Set-WmiInstance` | `Set-CimInstance` |
| `Register-WmiEvent` | `Register-CimIndicationEvent` |

### "Output looks empty in a remoting session"

Two common causes:

- **Profiles didn't load on the remote side.** Remoting sessions skip
  user profiles by default. Pass any prerequisites explicitly with
  `Invoke-Command -ArgumentList` and reference them as `$args[0]`,
  `$args[1]` (or `param($x, $y)` inside the scriptblock).
- **The remote side speaks a different PS version.** Check
  `Invoke-Command -ComputerName X -ScriptBlock { $PSVersionTable.PSVersion }`
  before debugging the script logic.

### "Splatting passes the hashtable as one argument instead of expanding"

You used `$args` (the variable name) instead of a fresh variable, *or*
you used `$h` instead of `@h`. Splatting is the `@` prefix:

```powershell
# WRONG
$opts = @{ Path = 'C:\'; Recurse = $true }
Get-ChildItem $opts        # passes the hashtable as -LiteralPath

# RIGHT
Get-ChildItem @opts        # expands to: -Path C:\ -Recurse $true
```

### "String interpolation isn't happening"

Single-quoted strings do not interpolate. Use double quotes for
interpolation; use single quotes whenever the value contains `$` and
should be literal.

```powershell
$x = 42
'value is $x'         # 'value is $x'
"value is $x"         # 'value is 42'
"path is $($obj.Name)"   # use $(...) for property access in strings
```

### "Comparison returns the wrong thing on an array"

In PowerShell, comparing an array with `-eq` filters the array — it
returns the elements that match, not a boolean. Two patterns to know:

```powershell
$arr = 1, 2, 3, 2
$arr -eq 2            # returns 2, 2 (the matches)
($arr -eq 2).Count    # 2 — handy
$arr -contains 2      # returns $true (boolean)
2 -in $arr            # same result with operands swapped

# When testing against $null, put $null on the LEFT:
$null -eq $arr        # returns $true only if $arr is actually $null
$arr -eq $null        # behaves like a filter; almost never what you want
```

### "Long-running command can't be Ctrl-C'd"

Many .NET-backed cmdlets check cancellation only at the end of a step.
If you need promptly-cancellable work, run it in a job and cancel the
job:

```powershell
$j = Start-Job { Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue }
# ... change of mind ...
Stop-Job  $j
Remove-Job $j -Force

# Or for parallel work:
$j = $items | ForEach-Object -Parallel { Slow-Thing $_ } -AsJob -ThrottleLimit 8
Wait-Job $j -Timeout 60 | Receive-Job
```

### "Path has special characters and breaks"

Always use `-LiteralPath` instead of `-Path` when the value comes from
data, not from a typed glob. `-Path` does wildcard expansion; brackets
and other glob-special characters in real filenames break it.

```powershell
$p = 'C:\Users\jdoe\Reports[2024].xlsx'
Test-Path -Path $p             # may return $false even though file exists
Test-Path -LiteralPath $p      # correct
Get-Content -LiteralPath $p
```

### "Encoding garbage on Windows PowerShell 5.1"

Default output encoding on 5.1 is whatever the console code page is —
often a problem when scripts hand off output to Linux tools or to
log shippers. Force UTF-8:

```powershell
# Per-cmdlet
Out-File -Encoding utf8 ...
Set-Content -Encoding utf8 ...
$txt | Set-Content -Encoding utf8 file.txt

# Process-wide on 5.1
$OutputEncoding = [Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
```

PowerShell 7+ defaults to UTF-8 (without BOM) for most cmdlets — one of
the strongest reasons to upgrade.

### "Module imports but cmdlets aren't found"

```powershell
# Confirm the module loaded and which version
Get-Module ModName

# See exactly which cmdlets/functions the module exports
Get-Command -Module ModName

# If a function is defined in the module but not exported, the module's
# own manifest didn't list it. Force-import to inspect:
Import-Module .\ModName.psd1 -Force -Verbose
```

### "Out-File and > write differently"

`>` is `Out-File` with default settings. On 5.1 that means a non-UTF-8
encoding and possibly a BOM; on 7+ it's UTF-8 (no BOM). For predictable
behaviour across versions, prefer `Set-Content -Encoding utf8` over `>`
in scripts you'll run on both.

### "Background job stays in NotStarted forever"

Two possible causes:

- You created the job with `Start-Job` but never received it, and the
  child runspace failed to launch. Check `Get-Job $j | Select State,
  ChildJobs` and `Receive-Job $j -Keep` to see any startup error.
- Resource exhaustion: too many jobs at once. Use
  `ForEach-Object -Parallel -ThrottleLimit N` or a `Start-ThreadJob`
  pool instead of unbounded `Start-Job`.

### "PSReadLine history full of secrets"

PSReadLine logs every command, including those with secrets passed on
the command line. Clean-up patterns:

```powershell
# Show where history is kept
(Get-PSReadLineOption).HistorySavePath

# Stop saving sensitive lines — bind a predicate
Set-PSReadLineOption -AddToHistoryHandler {
    param($line)
    if ($line -match 'password|secret|token|apikey|connectionstring') {
        return $false        # skip
    }
    return $true
}

# Wipe what's already there
Remove-Item (Get-PSReadLineOption).HistorySavePath -ErrorAction SilentlyContinue
```

---

## Recipe collection: data-shaping pipelines

Idiomatic combinations of `Where-Object`, `Select-Object`, `Group-Object`,
`Sort-Object`, and friends.

### Custom columns with calculated properties

```powershell
Get-ChildItem -File |
    Select-Object Name,
        @{n='KB';   e={[int]($_.Length/1KB)}},
        @{n='Age';  e={(Get-Date) - $_.LastWriteTime}},
        @{n='Ext';  e={$_.Extension.TrimStart('.')}}
```

The `@{n=...; e={...}}` shape (name + expression) works in
`Select-Object`, `Format-Table`, `Format-List`, `Sort-Object`, and
`Group-Object`. Memorise it.

### Group, summarise, sort

```powershell
# Lines per file in a tree
Get-ChildItem . -Recurse -File -Include *.ps1 |
    ForEach-Object {
        [pscustomobject]@{
            File  = $_.FullName
            Lines = (Get-Content $_).Count
        }
    } |
    Sort-Object Lines -Descending |
    Select-Object -First 20

# Errors by source from the System log, last 24h
Get-WinEvent -FilterHashtable @{LogName='System'; Level=2; StartTime=(Get-Date).AddDays(-1)} |
    Group-Object ProviderName |
    Sort-Object Count -Descending |
    Select-Object Count, Name
```

### Pivot: rows to columns

```powershell
# Disk usage by extension as a single row of columns
Get-ChildItem . -Recurse -File |
    Group-Object Extension |
    ForEach-Object {
        [pscustomobject]@{
            Ext   = $_.Name
            Count = $_.Count
            MB    = [math]::Round(($_.Group | Measure-Object Length -Sum).Sum/1MB, 1)
        }
    } |
    Sort-Object MB -Descending
```

### Joins (set operations)

```powershell
# Files in A but not in B
$a = Get-ChildItem .\dirA -File | Select-Object -ExpandProperty Name
$b = Get-ChildItem .\dirB -File | Select-Object -ExpandProperty Name
Compare-Object $a $b -PassThru |
    Where-Object SideIndicator -eq '<='     # left-only

# Files common to both
Compare-Object $a $b -IncludeEqual -ExcludeDifferent -PassThru
```

### Pagination of long output

```powershell
# Page through a long object pipeline
Get-Process | Sort-Object CPU -Descending | Out-Host -Paging

# Open in a sortable grid (Windows host only on 5.1; cross-platform Out-GridView is still 5.1-only)
Get-Service | Out-GridView -Title 'Services' -PassThru
```

---

## Recipe collection: short scripts you'll write again

Every shop ends up writing rough equivalents of these. Templates here so
you don't reinvent them at 2 am.

### Robust "do this on every server in a list"

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string[]]$ComputerName,
    [Parameter(Mandatory)][scriptblock]$ScriptBlock,
    [int]$ThrottleLimit = 16,
    [int]$TimeoutSec    = 30
)

$ComputerName | ForEach-Object -Parallel {
    $h = $_
    $sb = $using:ScriptBlock
    $timeout = $using:TimeoutSec
    $start = Get-Date
    try {
        $result = Invoke-Command -ComputerName $h -ScriptBlock $sb -ErrorAction Stop `
                                  -OperationTimeout ($timeout * 1000)
        [pscustomobject]@{
            Host    = $h
            Status  = 'ok'
            Elapsed = (Get-Date) - $start
            Result  = $result
        }
    } catch {
        [pscustomobject]@{
            Host    = $h
            Status  = 'fail'
            Elapsed = (Get-Date) - $start
            Error   = $_.Exception.Message
        }
    }
} -ThrottleLimit $ThrottleLimit
```

### CSV → API push with retries

```powershell
function Invoke-WithRetry {
    param([scriptblock]$Script, [int]$Max = 5, [int]$DelaySec = 2)
    for ($i = 1; $i -le $Max; $i++) {
        try { return & $Script } catch {
            if ($i -eq $Max) { throw }
            Start-Sleep -Seconds ($DelaySec * [math]::Pow(2, $i - 1))
        }
    }
}

Import-Csv .\rows.csv | ForEach-Object {
    $body = $_ | ConvertTo-Json -Depth 5
    Invoke-WithRetry {
        Invoke-RestMethod -Method Post `
            -Uri 'https://api.example.com/v1/widgets' `
            -ContentType 'application/json' `
            -Headers @{ Authorization = "Bearer $env:API_TOKEN" } `
            -Body $body
    }
}
```

### Periodic health-check loop with exponential backoff

```powershell
$delay = 1
while ($true) {
    try {
        $r = Invoke-RestMethod 'https://api.example.com/health' -TimeoutSec 5
        if ($r.status -eq 'ok') {
            Write-Host "$(Get-Date -Format s) ok"
            $delay = 1
        } else {
            throw "unhealthy: $($r | ConvertTo-Json -Compress)"
        }
    } catch {
        Write-Warning "$(Get-Date -Format s) $_"
        $delay = [math]::Min($delay * 2, 60)
    }
    Start-Sleep -Seconds $delay
}
```

### Atomic "write to file" pattern

```powershell
function Set-FileAtomically {
    param([string]$Path, [string]$Content, [string]$Encoding = 'utf8')
    $tmp = "$Path.tmp.$([guid]::NewGuid().ToString('N'))"
    try {
        Set-Content -LiteralPath $tmp -Value $Content -Encoding $Encoding -NoNewline
        Move-Item -LiteralPath $tmp -Destination $Path -Force
    } catch {
        if (Test-Path $tmp) { Remove-Item $tmp -Force }
        throw
    }
}
```

### Locked-down run-this-script harness

```powershell
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$Target,
    [switch]$Force
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 3.0

function Write-Log {
    param([string]$Msg, [string]$Level='INFO')
    $ts = Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'
    "$ts $Level $Msg" | Tee-Object -Append -FilePath "$PSScriptRoot\run.log" | Write-Host
}

trap {
    Write-Log "FAILED: $($_.Exception.Message)" 'ERROR'
    exit 1
}

Write-Log "starting against $Target"
if ($PSCmdlet.ShouldProcess($Target, 'Apply changes')) {
    # ... real work ...
    Write-Log "done"
} else {
    Write-Log "would have changed $Target (WhatIf)"
}
```

---

## Quick lookup: common verb-noun mappings from other shells

| What you'd type in bash | PowerShell equivalent |
| --- | --- |
| `ls -la` | `Get-ChildItem -Force` |
| `cat file` | `Get-Content file` |
| `head -n 20 file` | `Get-Content file -TotalCount 20` |
| `tail -n 20 file` | `Get-Content file -Tail 20` |
| `tail -f file` | `Get-Content file -Wait -Tail 0` |
| `grep PATTERN file` | `Select-String PATTERN file` |
| `grep -r PATTERN dir` | `Get-ChildItem dir -Recurse \| Select-String PATTERN` |
| `wc -l file` | `(Get-Content file).Count` |
| `find . -name '*.ps1'` | `Get-ChildItem . -Recurse -Filter *.ps1` |
| `which cmd` | `Get-Command cmd` |
| `which -a cmd` | `Get-Command cmd -All` |
| `env` | `Get-ChildItem Env:` |
| `export X=Y` | `$env:X = 'Y'` |
| `kill -9 pid` | `Stop-Process -Id pid -Force` |
| `ps aux` | `Get-Process` |
| `df -h` | `Get-PSDrive -PSProvider FileSystem` |
| `free -h` | `Get-CimInstance Win32_OperatingSystem \| Select FreePhysicalMemory, TotalVisibleMemorySize` |
| `curl URL` | `Invoke-RestMethod URL` (parses JSON automatically) |
| `curl -s URL > file` | `Invoke-WebRequest URL -OutFile file` |
| `pwd` | `Get-Location` |
| `cd -` | `Pop-Location` (after `Push-Location`) |
| `history` | `Get-History` |
| `!42` | `Invoke-History 42` |
| `man cmd` | `Get-Help cmd -Full` |
| `time cmd` | `Measure-Command { cmd }` |
| `xargs` | `ForEach-Object` |
| `sort -u` | `Sort-Object -Unique` |
| `uniq -c` | `Group-Object \| Select Count, Name` |
| `cut -d, -f2` | `Import-Csv \| Select-Object -ExpandProperty col2` |

---

## Recipe collection: workflows, VS Code, and authoring environments

### PowerShell Workflows — what they are and when (not) to use them

PowerShell Workflows were a Windows-only feature in PowerShell 5.1
that wrapped a script as a Windows Workflow Foundation activity.
The promise: long-running, restartable, parallelizable jobs that
survived reboots.

**Status today:** removed in PowerShell 7. New code should not use
workflows.

If you encounter `workflow MyThing { ... }` in a legacy script, your
migration options are:

| Workflow feature | Modern replacement |
| --- | --- |
| `parallel { ... }` block | `ForEach-Object -Parallel -ThrottleLimit N` (PS 7+) |
| `foreach -parallel` | Same |
| Checkpointed restart (`Checkpoint-Workflow`) | Re-architect: persist progress to a store; on restart, query the store and skip done work |
| Run as a Scheduled Job | `Register-ScheduledTask` with `pwsh.exe` |
| Long-running cross-machine | Kubernetes Job / Argo Workflows / Step Functions |

A typical conversion shape:

```powershell
# Old: workflow form
workflow Update-Servers {
    param([string[]]$ComputerName)
    foreach -parallel ($c in $ComputerName) {
        InlineScript { Update-Stuff -On $using:c }
    }
}

# Modern: ForEach-Object -Parallel
function Update-Servers {
    param([string[]]$ComputerName, [int]$ThrottleLimit = 16)
    $ComputerName | ForEach-Object -Parallel {
        Invoke-Command -ComputerName $_ -ScriptBlock {
            # do the work
        }
    } -ThrottleLimit $ThrottleLimit
}
```

`-Parallel` runs each iteration in its own runspace. `$using:` brings
outer-scope variables in, the same as remoting. The `-ThrottleLimit`
cap matters — without it you'll exhaust the thread pool on large
inputs.

### Editors and authoring environments

#### VS Code with the PowerShell extension

The current default development surface for PowerShell is VS Code +
the official PowerShell extension. You get:

- IntelliSense and parameter help.
- Integrated terminal that's a real `pwsh` session (or `powershell.exe`
  if you configure it).
- The PowerShell debugger — set breakpoints, step, inspect variables,
  view the runspace stack.
- `Pester` test runner integration.
- A "PowerShell ISE Mode" theme/keymap if you're migrating from ISE.

Useful settings (`settings.json`):

```jsonc
{
  "powershell.codeFormatting.preset": "OTBS",
  "powershell.codeFormatting.useCorrectCasing": true,
  "powershell.codeFormatting.alignPropertyValuePairs": true,
  "powershell.scriptAnalysis.enable": true,
  "powershell.scriptAnalysis.settingsPath": "PSScriptAnalyzerSettings.psd1",
  "powershell.integratedConsole.suppressStartupBanner": true,
  "powershell.integratedConsole.showOnStartup": false,
  "[powershell]": {
    "editor.defaultFormatter": "ms-vscode.powershell",
    "editor.formatOnSave": true,
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  }
}
```

A repo-level `PSScriptAnalyzerSettings.psd1` example:

```powershell
@{
    Severity     = @('Error', 'Warning')
    IncludeRules = @('PSAvoidUsingPlainTextForPassword',
                     'PSAvoidUsingInvokeExpression',
                     'PSUseShouldProcessForStateChangingFunctions',
                     'PSAvoidUsingPositionalParameters',
                     'PSUseDeclaredVarsMoreThanAssignments')
    Rules        = @{
        PSUseCompatibleSyntax = @{
            Enable        = $true
            TargetVersions = @('5.1', '7.4')
        }
    }
}
```

#### Windows PowerShell ISE — the sunsetted predecessor

ISE is the integrated scripting environment that shipped with
Windows PowerShell 5.1. It does not support PowerShell 7+ and is
no longer being developed. New scripting work should happen in
VS Code. Treat any ISE-only feature you find (commands tab, snippets
panel) as a deprecation signal.

#### Other editors

- **Visual Studio** — full integration via the "PowerShell Tools"
  extension; aimed at developers writing modules alongside C#.
- **Sublime / Vim / emacs** — community PowerShell plugins exist
  with syntax highlighting and basic LSP support; debugging is
  weaker than VS Code's.
- **Rider / PyCharm / IntelliJ** — JetBrains ships a PowerShell
  plugin with PSScriptAnalyzer and run-config integration; quality
  is good if your team already lives in JetBrains tools.

### Static analysis with PSScriptAnalyzer

```powershell
# Install
Install-Module PSScriptAnalyzer -Scope CurrentUser

# Lint a script or directory
Invoke-ScriptAnalyzer -Path .\scripts -Recurse |
    Where-Object Severity -in 'Error', 'Warning'

# In CI: fail on any error
$results = Invoke-ScriptAnalyzer -Path . -Recurse -Severity Error
if ($results) {
    $results | Format-Table
    exit 1
}
```

PSScriptAnalyzer has rules for:

- Common foot-guns (`Invoke-Expression` on user input, plain-text
  passwords, mutating loops over collections).
- Style consistency (verb-noun naming, parameter casing).
- Cross-version compatibility (`PSUseCompatibleSyntax`,
  `PSUseCompatibleCmdlets` — point them at your target versions).
- Custom rules — write your own and load them via `-CustomRulePath`.

### Pester — the testing framework

```powershell
# Install Pester 5+
Install-Module Pester -MinimumVersion 5.0 -Scope CurrentUser -Force

# tests/Get-Thing.Tests.ps1
Describe 'Get-Thing' {
    BeforeAll {
        . $PSScriptRoot/../src/Get-Thing.ps1
    }

    It 'returns the expected object' {
        $r = Get-Thing -Name 'foo'
        $r.Name | Should -Be 'foo'
        $r.Status | Should -Be 'ok'
    }

    It 'throws on empty input' {
        { Get-Thing -Name '' } | Should -Throw
    }
}

# Run
Invoke-Pester -Path .\tests -Output Detailed
```

Pester 5 is a major rewrite vs Pester 3/4; the syntax above is the
current shape. Tests run inside fresh runspaces, which catches
"works in my console because of state" bugs.

### Module authoring — the minimum viable layout

```
MyModule/
├── MyModule.psd1            # manifest
├── MyModule.psm1            # root module — dot-sources public/private
├── public/
│   ├── Get-Thing.ps1
│   └── Set-Thing.ps1
├── private/
│   └── Helper-Function.ps1
└── tests/
    └── Get-Thing.Tests.ps1
```

A skeleton `MyModule.psm1`:

```powershell
$public  = @(Get-ChildItem -Path $PSScriptRoot/public  -Filter *.ps1)
$private = @(Get-ChildItem -Path $PSScriptRoot/private -Filter *.ps1 -ErrorAction SilentlyContinue)

foreach ($f in $public + $private) {
    . $f.FullName
}

Export-ModuleMember -Function $public.BaseName
```

A skeleton `MyModule.psd1`:

```powershell
@{
    RootModule        = 'MyModule.psm1'
    ModuleVersion     = '0.1.0'
    GUID              = (New-Guid).Guid
    Author            = 'Your Name'
    CompatiblePSEditions = @('Core', 'Desktop')
    PowerShellVersion = '5.1'
    FunctionsToExport = @('Get-Thing', 'Set-Thing')
    CmdletsToExport   = @()
    AliasesToExport   = @()
}
```

Publishing to a private feed:

```powershell
Register-PSRepository -Name InternalPS `
    -SourceLocation https://nuget.example.com/api/v2 `
    -PublishLocation https://nuget.example.com/api/v2/package `
    -InstallationPolicy Trusted

Publish-Module -Path .\MyModule -Repository InternalPS -NuGetApiKey $env:NUGET_KEY
```

### Building a class-based DSC resource (when you must)

DSC is the Microsoft analogue to Ansible/Chef/Puppet. New work tends
to use Ansible or pull-mode tools instead, but you'll see DSC in
existing Windows estates. The minimum viable class-based resource:

```powershell
[DscResource()]
class FileLine {
    [DscProperty(Key)]   [string] $Path
    [DscProperty(Key)]   [string] $Line
    [DscProperty()]      [Ensure] $Ensure = [Ensure]::Present

    [bool] Test() {
        if (-not (Test-Path $this.Path)) { return $this.Ensure -eq 'Absent' }
        $hit = Select-String -Path $this.Path -Pattern ([regex]::Escape($this.Line)) -SimpleMatch
        return ($null -ne $hit) -eq ($this.Ensure -eq 'Present')
    }
    [void] Set() {
        if ($this.Ensure -eq 'Present') {
            Add-Content -Path $this.Path -Value $this.Line
        } else {
            (Get-Content $this.Path) | Where-Object { $_ -ne $this.Line } |
                Set-Content -Path $this.Path
        }
    }
    [FileLine] Get() {
        $r = [FileLine]::new()
        $r.Path = $this.Path
        $r.Line = $this.Line
        $r.Ensure = (Test-Path $this.Path) -and (
            Select-String -Path $this.Path -Pattern ([regex]::Escape($this.Line)) -SimpleMatch
        ) ? [Ensure]::Present : [Ensure]::Absent
        return $r
    }
}

enum Ensure { Present; Absent }
```

For greenfield projects on Windows, prefer Ansible's `win_*` modules
over rolling your own DSC resources.

---

## Recipe collection: cross-version compatibility

Patterns for code that needs to run on both Windows PowerShell 5.1
(still installed by default on Windows) and PowerShell 7+
(cross-platform, the modern target).

### Detect the host

```powershell
if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Warning "Running on Windows PowerShell — some features will be limited."
}

$IsCore = $PSVersionTable.PSEdition -eq 'Core'
$IsWin  = $IsWindows  # auto-set on 6+; on 5.1 use [Environment]::OSVersion.Platform
$IsLin  = $IsLinux
$IsMac  = $IsMacOS
```

The `$IsWindows` / `$IsLinux` / `$IsMacOS` automatic variables exist
on 6+. On 5.1 they don't, so a portable check is:

```powershell
if (-not (Test-Path Variable:IsWindows)) {
    $script:IsWindows = $true   # 5.1 only runs on Windows
    $script:IsLinux   = $false
    $script:IsMacOS   = $false
}
```

### CIM cmdlets work everywhere

Replace WMI cmdlets with CIM cmdlets in any portable code:

```powershell
# Portable across 5.1 and 7+
$os = Get-CimInstance Win32_OperatingSystem
$ws = Get-CimInstance Win32_ComputerSystem
```

### Module gates

In a manifest, gate behaviour via `CompatiblePSEditions`:

```powershell
@{
    RootModule = 'MyModule.psm1'
    CompatiblePSEditions = @('Core', 'Desktop')
    PowerShellVersion    = '5.1'
}
```

In code, branch only where you must:

```powershell
function Get-Something {
    if ($PSVersionTable.PSVersion.Major -ge 7) {
        # native PS 7+ path
    } else {
        # 5.1 fallback
    }
}
```

### The Compatibility module

If you have to call 5.1-only modules from 7+ on Windows, the
`WindowsCompatibility` module loads them in a side-by-side 5.1
runspace:

```powershell
Install-Module WindowsCompatibility
Import-WinModule -Name ActiveDirectory
Get-ADUser jdoe          # transparently calls into a 5.1 runspace
```

It's slow (cross-runspace serialisation per call) but unblocks
migrations.

### File-encoding quirks

5.1 defaults to non-UTF-8 in many cmdlets; 7+ defaults to UTF-8
without BOM. To produce identical output across versions:

```powershell
function Write-UtfFile {
    param([string]$Path, [string]$Content)
    [IO.File]::WriteAllText(
        $Path, $Content,
        (New-Object Text.UTF8Encoding($false))   # $false = no BOM
    )
}
```

Or set process-wide on 5.1:

```powershell
$OutputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
```

---

## Recipe collection: cross-platform PowerShell

### Path-handling that doesn't care about the OS

```powershell
# Use Join-Path, never string concatenation
$config = Join-Path $env:HOME '.config' 'myapp' 'config.toml'

# Or Path.Combine for >2 segments (5.1)
$config = [IO.Path]::Combine($env:HOME, '.config', 'myapp', 'config.toml')
```

### Determine config locations cross-platform

```powershell
function Get-AppConfigPath {
    param([string]$AppName)
    $base = if ($IsWindows) {
        $env:APPDATA
    } elseif ($IsMacOS) {
        Join-Path $env:HOME 'Library/Application Support'
    } else {
        $env:XDG_CONFIG_HOME ?? (Join-Path $env:HOME '.config')
    }
    Join-Path $base $AppName
}
```

### Process invocation that works everywhere

```powershell
# WRONG — Windows-specific
Start-Process cmd.exe -ArgumentList "/c some-tool"

# RIGHT — let PowerShell find it on $PATH
$rc = & some-tool arg1 arg2
$LASTEXITCODE  # exit status
```

### Avoid Windows-only types

| Don't use cross-platform | Use instead |
| --- | --- |
| `Get-WmiObject` | `Get-CimInstance` (still Windows-only but portable) |
| `Get-EventLog` | `Get-WinEvent` (Windows-only); for cross-platform logs read files directly |
| Registry providers (`HKLM:\…`) | Out of scope on Linux/macOS — guard with `$IsWindows` |
| `*-WindowsFeature` | Windows-only by design |
| `[System.Windows.Forms]` | Use cross-platform UI alternatives or skip a GUI |

---

## Recipe collection: parallel patterns at scale

### `ForEach-Object -Parallel` — the modern default

```powershell
# Process up to N items concurrently
$results = $items | ForEach-Object -Parallel {
    $item = $_
    # ... work ...
    [pscustomobject]@{ Id = $item.Id; Result = 'ok' }
} -ThrottleLimit 16
```

Limitations to remember:

- Each iteration runs in its own runspace; outer variables are not
  in scope unless prefixed `$using:`.
- Functions defined in the parent script are *not* available; either
  re-define inside the script block, or import a module.
- Output ordering is not deterministic.

### `Start-ThreadJob` — when you need a job handle

```powershell
$jobs = $items | ForEach-Object {
    Start-ThreadJob -ScriptBlock {
        param($i)
        # work
    } -ArgumentList $_ -ThrottleLimit 16
}
$jobs | Wait-Job | Receive-Job
$jobs | Remove-Job
```

`Start-ThreadJob` is faster than `Start-Job` because it uses
threads instead of separate processes. Install it on 5.1 with
`Install-Module ThreadJob`.

### Runspace pools for high-fanout work

For thousands of concurrent operations, manage a runspace pool
directly:

```powershell
$pool = [runspacefactory]::CreateRunspacePool(1, 32)
$pool.Open()

$tasks = foreach ($i in 1..1000) {
    $ps = [powershell]::Create().AddScript({ param($n) "result-$n" }).AddArgument($i)
    $ps.RunspacePool = $pool
    [pscustomobject]@{ PowerShell = $ps; Async = $ps.BeginInvoke() }
}

$results = foreach ($t in $tasks) {
    try { $t.PowerShell.EndInvoke($t.Async) }
    finally { $t.PowerShell.Dispose() }
}

$pool.Close(); $pool.Dispose()
```

Reach for this only when `ForEach-Object -Parallel` isn't enough —
the bookkeeping isn't free.
