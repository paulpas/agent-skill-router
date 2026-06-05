---




name: python-devops
description: Python reference for ops teams — shelling out, file manipulation, structured data parsing, CLI tools, testing, cloud SDKs, Kubernetes API, IaC and CI/CD patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: devops
  triggers: python devops, ops automation, infrastructure as code, iac, ci cd, kubernetes api, how do i write ops python scripts, subprocess
  role: reference
  scope: infrastructure
  output-format: code
  related-skills: bash-quick-reference,text-processing-quick-reference
  archetypes: educational
  anti_triggers: implement from scratch, architect a system, build infrastructure, design patterns
  response_profile:
    verbosity: high
    directive_strength: low
    abstraction_level: operational




---





# Python for DevOps — Quick Reference

Reference for using Python the way ops teams use it: shelling out, manipulating files, parsing structured data, building CLI tools, writing tests, talking to clouds and Kubernetes.

## When to Use

- Logic that doesn't fit one screen of bash (anything past ~50 lines of control flow reads better in Python)
- Working with real data structures: nested dicts, typed records, dataframes
- Writing testable ops automation where pytest is far more pleasant than bash testing
- HTTP, JSON/YAML/TOML/XML parsing, cloud SDKs, and Kubernetes API interaction
- Cross-platform work (especially Windows compatibility) without rewriting

## When NOT to Use

- For plain pipe-A-into-B-into-C tasks — bash is shorter and faster to start up
- Simple CLI glue where subprocess calls would add unnecessary complexity
- Performance-critical loops where compiled languages are more appropriate

## Mental model

Treat ops Python like any other Python: virtualenvs, packaging, tests.
The *content* is different (you call out to subprocesses, you parse
YAML, you talk to clouds) but the discipline that keeps Python
maintainable applies the same.

> Examples assume Python 3.10+.

---

## Project layout

A small but proper layout that scales:

```
myops/
├── pyproject.toml
├── src/myops/
│   ├── __init__.py
│   ├── cli.py
│   └── tasks/
│       ├── __init__.py
│       └── deploy.py
├── tests/
│   ├── __init__.py
│   └── test_deploy.py
└── README.md
```

`pyproject.toml` (PEP 621):

```toml
[project]
name = "myops"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
  "click>=8",
  "pyyaml",
  "requests",
]

[project.scripts]
myops = "myops.cli:main"

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "mypy", "ruff"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

---

## Virtualenvs and packaging

```bash
python -m venv .venv          # create
source .venv/bin/activate     # *nix
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
deactivate                    # leave

python -m pip install -U pip wheel
python -m pip install -e '.[dev]'    # editable install + dev extras
python -m pip install -r requirements.txt

python -m pip freeze > requirements.txt
python -m pip list --outdated
```

Modern alternatives:

- **uv** (fast all-in-one): `uv venv`, `uv pip install`, `uv run`.
- **poetry** (popular for libraries): `poetry add`, `poetry install`,
  `poetry run`.
- **pipx** for installing CLI tools globally without polluting envs.

For binary-distributable tools, build wheels (`python -m build`) or
freeze with `pyinstaller` / `shiv`.

---

## Calling out to the shell

`subprocess.run` is the right answer 95% of the time.

```python
import subprocess

# 1) capture output, raise on non-zero
result = subprocess.run(
    ["git", "rev-parse", "HEAD"],
    capture_output=True, text=True, check=True,
)
sha = result.stdout.strip()

# 2) just want exit code, stream output to terminal
subprocess.run(["pytest", "-q"], check=True)

# 3) feed stdin
subprocess.run(["sort"], input="b\na\nc\n", text=True, capture_output=True)

# 4) timeout
subprocess.run(["slow"], timeout=30)

# 5) environment override
subprocess.run(["printenv", "FOO"], env={**os.environ, "FOO": "bar"})

# 6) cwd
subprocess.run(["make", "test"], cwd="/path/to/proj", check=True)
```

Avoid `shell=True` unless you actually need shell features (globs,
pipes, redirection). When you do, pass a string and accept that you
have to think about quoting.

```python
# DO NOT do this with untrusted input
subprocess.run(f"grep {pattern} *.log | head", shell=True)
# DO this
subprocess.run(["grep", pattern, *glob.glob("*.log")], stdout=open("h.txt","w"))
```

For long-running processes you want to interact with, use `Popen`:

```python
proc = subprocess.Popen(
    ["tail", "-F", "/var/log/app.log"],
    stdout=subprocess.PIPE, text=True, bufsize=1,
)
for line in proc.stdout:
    if "ERROR" in line:
        notify(line)
```

---

## Files and paths

`pathlib.Path` is the modern way; `os.path` is legacy.

```python
from pathlib import Path

p = Path.home() / "logs" / "app.log"
p.exists()
p.is_file()
p.suffix              # '.log'
p.stem                # 'app'
p.parent              # Path('/home/ada/logs')

# read / write whole files
text = p.read_text(encoding="utf-8")
p.write_text("hello\n", encoding="utf-8")
data = p.read_bytes()

# create / remove
Path("a/b/c").mkdir(parents=True, exist_ok=True)
p.unlink(missing_ok=True)

# walk a tree
for log in Path("/var/log").rglob("*.log"):
    print(log)

# atomic write
import os, tempfile
def atomic_write(path: Path, content: str) -> None:
    tmp = tempfile.NamedTemporaryFile("w", delete=False,
                                      dir=path.parent, encoding="utf-8")
    try:
        tmp.write(content); tmp.flush(); os.fsync(tmp.fileno())
    finally:
        tmp.close()
    os.replace(tmp.name, path)
```

Globbing:

```python
list(Path(".").glob("*.py"))            # one level
list(Path(".").rglob("*.py"))           # recursive
```

---

## Text and regex

```python
import re

# match
m = re.match(r"^(\w+)@(\S+)$", "ada@example.com")
m.group(1), m.group(2)             # 'ada', 'example.com'

# search / findall / finditer
re.search(r"\d{4}", "v2025-Q1")
re.findall(r"\b\w+\b", "two words")
for m in re.finditer(r"[A-Z]\w+", text):
    print(m.start(), m.group())

# substitute
re.sub(r"\s+", " ", text).strip()

# pre-compile for hot loops
PAT = re.compile(r"^ERROR\s+(\d+)\s+(.*)$", re.M)
for m in PAT.finditer(log):
    code, msg = m.groups()
```

String methods you'll use a lot:

```python
"Hello".lower()
"  x  ".strip()
"a,b,c".split(",")
",".join(["a","b","c"])
f"{name=} {count=}"            # debug-style f-string
```

---

## Structured data: JSON, YAML, TOML, CSV

```python
import json, yaml, csv, tomllib  # Python 3.11+

# JSON
data = json.loads(text)
text = json.dumps(data, indent=2, sort_keys=True)
data = json.load(open("f.json"))
json.dump(data, open("f.json","w"), indent=2)

# YAML (pip install pyyaml)
data = yaml.safe_load(open("f.yaml"))   # ALWAYS safe_load, never load
yaml.safe_dump(data, open("f.yaml","w"), sort_keys=False)

# TOML (read-only stdlib in 3.11+; write with tomli-w)
with open("pyproject.toml","rb") as f:
    cfg = tomllib.load(f)

# CSV
with open("data.csv", newline="") as f:
    reader = csv.DictReader(f)
    rows = [r for r in reader if r["status"] == "OK"]

with open("out.csv","w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["id","name","status"])
    w.writeheader()
    w.writerows(rows)
```

For dataframes (analytics, large files), reach for `pandas`.

---

## CLI tools

`click` is the friendlier choice; `argparse` is the stdlib option.

```python
# click
import click

@click.command()
@click.argument("path", type=click.Path(exists=True, dir_okay=False))
@click.option("--n", default=10, show_default=True, type=int)
@click.option("-v", "--verbose", is_flag=True)
def head(path, n, verbose):
    """Print the first N lines of PATH."""
    if verbose: click.echo(f"reading {path}", err=True)
    with open(path) as f:
        for i, line in enumerate(f):
            if i >= n: break
            click.echo(line.rstrip())

if __name__ == "__main__":
    head()
```

```python
# argparse
import argparse

def main():
    p = argparse.ArgumentParser(description="show first N lines")
    p.add_argument("path")
    p.add_argument("-n", type=int, default=10)
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args()
    ...

if __name__ == "__main__":
    main()
```

For a `git`-style tool with subcommands, `click.Group` or
`argparse.add_subparsers` both work; `click` ends up much shorter for
deep trees.

---

## Logging and observability

Use the stdlib `logging`. Don't print().

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger(__name__)

log.debug("started with %s", args)
log.info("connected to %s", host)
log.warning("retrying after %s", err)
log.error("failed: %s", err, exc_info=True)
```

Conventional levels: DEBUG (developers), INFO (operational), WARNING
(unexpected but recoverable), ERROR (operation failed), CRITICAL
(process can't continue).

For structured (JSON) logs in production, `structlog` is the popular
choice. For metrics, `prometheus_client`. For traces, `opentelemetry`.

```python
# structlog quickstart
import structlog
log = structlog.get_logger()
log.info("deploy_started", service="web", version="1.4.2")
```

---

## Testing with pytest

```python
# tests/test_deploy.py
import pytest
from myops.tasks.deploy import compute_target

def test_compute_target_default():
    assert compute_target("web") == "web-prod"

@pytest.mark.parametrize("env,expected", [
    ("prod", "web-prod"),
    ("staging", "web-stg"),
    ("dev", "web-dev"),
])
def test_compute_target_envs(env, expected):
    assert compute_target("web", env=env) == expected

@pytest.fixture
def fake_config(tmp_path):
    cfg = tmp_path / "config.yaml"
    cfg.write_text("env: test\n")
    return cfg

def test_loads_config(fake_config):
    assert load_config(fake_config)["env"] == "test"
```

Run:

```bash
pytest -q                       # quiet
pytest -k deploy                # name filter
pytest --maxfail=1 -x           # stop on first failure
pytest --cov=myops              # with pytest-cov
pytest -n auto                  # parallel with pytest-xdist
```

Mocking:

```python
from unittest.mock import patch, MagicMock

@patch("myops.tasks.deploy.requests.post")
def test_calls_api(mock_post):
    mock_post.return_value.status_code = 200
    deploy("web", "1.0")
    mock_post.assert_called_once()
```

`pyfakefs` (fake filesystem) and `responses` (HTTP mocking) are
worth knowing.

---

## HTTP and APIs

```python
import requests

r = requests.get("https://api.example.com/v1/items", timeout=10,
                 headers={"Authorization": f"Bearer {token}"})
r.raise_for_status()
items = r.json()

r = requests.post("https://api/v1/items", json={"name":"x"}, timeout=10)
```

Use a `Session` for repeated calls (connection reuse, default headers,
retries):

```python
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

s = requests.Session()
s.headers.update({"Authorization": f"Bearer {token}"})
retry = Retry(total=5, backoff_factor=0.5,
              status_forcelist=[429,500,502,503,504],
              allowed_methods=["GET","POST"])
s.mount("https://", HTTPAdapter(max_retries=retry))
```

`httpx` is a modern alternative with sync + async APIs. For high
throughput, async + `httpx.AsyncClient` or `aiohttp`.

---

## Config and secrets

- Plain config: YAML / TOML files, parsed at startup.
- Per-environment overrides: env vars with a default in code, e.g.
  `os.environ.get("PORT", "8080")`.
- Secrets: never check them in. Use the cloud's secret manager (AWS
  Secrets Manager, GCP Secret Manager, HashiCorp Vault) or `.env` +
  `python-dotenv` for local dev.
- `pydantic-settings` (or `dynaconf`) gives you a typed Settings object
  populated from env vars, files and defaults.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    api_url: str = "https://api.example.com"
    api_token: str             # required; from API_TOKEN env var
    log_level: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Docker and Kubernetes interaction

```python
# docker SDK
import docker
client = docker.from_env()
client.containers.run("alpine", "echo hi", remove=True)
for c in client.containers.list():
    print(c.short_id, c.status, c.image.tags)

# Kubernetes client
from kubernetes import client, config
config.load_kube_config()              # ~/.kube/config
v1 = client.CoreV1Api()
for p in v1.list_namespaced_pod("default").items:
    print(p.metadata.name, p.status.phase)
```

If you're already running inside a cluster, use
`config.load_incluster_config()` and the service account.

For higher-level cluster work, `kr8s` and `pykube-ng` are friendlier
than the auto-generated official client.

Calling `kubectl` via subprocess is also legitimate when you just need
to apply a YAML you already have:

```python
subprocess.run(["kubectl","apply","-f","manifest.yaml"], check=True)
```

---

## Cloud SDKs

### AWS — boto3

```python
import boto3

s3 = boto3.client("s3")
s3.upload_file("local.txt", "my-bucket", "remote.txt")
for obj in s3.list_objects_v2(Bucket="my-bucket").get("Contents", []):
    print(obj["Key"], obj["Size"])

ec2 = boto3.client("ec2")
ec2.start_instances(InstanceIds=["i-0abc..."])
```

### GCP

```python
from google.cloud import storage
client = storage.Client()
client.bucket("my-bucket").blob("remote.txt").upload_from_filename("local.txt")
```

### Azure

```python
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
cred = DefaultAzureCredential()
svc = BlobServiceClient(account_url="https://x.blob.core.windows.net", credential=cred)
```

Authentication: rely on the SDK's default credential chain (instance
metadata when on-cloud, env vars or local CLI cache otherwise). Don't
hard-code keys.

---

## IaC from Python

- **Terraform** is HCL, but you can drive it from Python with the
  `python-terraform` wrapper or just `subprocess.run(["terraform","apply",
  …], check=True)`. CDKTF (CDK for Terraform) lets you author HCL from
  Python.
- **Pulumi** is fully Python — define resources as Python objects.
- **Ansible** modules are Python; you can call playbooks via
  `ansible-runner` from Python code.

```python
# Pulumi snippet
import pulumi
import pulumi_aws as aws

bucket = aws.s3.Bucket("logs", versioning=aws.s3.BucketVersioningArgs(enabled=True))
pulumi.export("bucket_name", bucket.id)
```

For wrapping an existing Terraform project:

```python
subprocess.run(["terraform","-chdir=infra","init"], check=True)
subprocess.run(["terraform","-chdir=infra","apply","-auto-approve"], check=True)
```

---

## CI / CD touchpoints

- **GitHub Actions**: workflow YAML calls `python -m pip install -e
  .[dev]` then `pytest` and `mypy`.
- **GitLab CI**: similar, in `.gitlab-ci.yml`.
- **Jenkins**: `Jenkinsfile` with a `python` stage, or
  `pipenv`/`poetry`/`uv` step.

A representative GitHub Actions job for a Python tool:

```yaml
# .github/workflows/test.yml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: python -m pip install -U pip
      - run: python -m pip install -e '.[dev]'
      - run: ruff check .
      - run: mypy src
      - run: pytest --cov=src
```

For releases, tag-driven: build with `python -m build`, upload with
`twine upload`, or use `python-semantic-release` / `release-please`.

---

## Performance & gotchas

- The GIL means CPU-bound multithreading doesn't help. For CPU work,
  use `multiprocessing` or `concurrent.futures.ProcessPoolExecutor`.
  For I/O-bound work, threads or `asyncio` are fine.
- `subprocess.run(..., shell=True, …)` with f-strings is the most
  common foot-gun in ops Python. Use a list and avoid `shell=True`.
- Don't open files without specifying `encoding=`. Default differs
  across platforms (UTF-8 on Linux, sometimes cp1252 on Windows).
- `os.environ` is a dict — but mutating it is process-wide. Use
  `subprocess.run(..., env=…)` to scope changes to a child process.
- `pip install` without a virtualenv on a system Python is the road to
  pain. Always virtualenv.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError` after install | wrong interpreter | `python -m pip install …` (use the python you'll run with) |
| Tests pass locally, fail in CI | env-dependent path / time / locale | pin `LANG=C.UTF-8`, freeze the timezone, mock time |
| `subprocess` hangs | child waiting on stdin | pass `stdin=subprocess.DEVNULL` or `input=…` |
| `requests.get` hangs forever | no `timeout` | always set `timeout=` |
| YAML loading throws on `!!` tags | safe_load rejects custom tags | good — use `safe_load` and avoid them |
| Import works in REPL, not in script | `cwd` differs; package not on `PYTHONPATH` | install editable: `pip install -e .` |

---

## Recipe collection: subprocess patterns

The single most-used module in ops Python. Memorise these shapes and
you'll handle 95% of real cases.

### Capture output, raise on failure

```python
import subprocess

def run(cmd, **kw):
    """Run cmd as a list; capture stdout/stderr; raise on non-zero exit."""
    return subprocess.run(
        cmd,
        check=True,
        capture_output=True,
        text=True,
        **kw,
    )

r = run(["git", "rev-parse", "HEAD"])
sha = r.stdout.strip()
```

`check=True` raises `CalledProcessError` on non-zero exit. `text=True`
returns `str` instead of `bytes`. `capture_output=True` collects both
streams; if you only need stdout, use `stdout=subprocess.PIPE`.

### Stream output line-by-line as it arrives

```python
import subprocess

with subprocess.Popen(
    ["rsync", "-av", "/src/", "/dst/"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
) as p:
    for line in p.stdout:
        print(line.rstrip())
        # log it, parse it, whatever
if p.returncode != 0:
    raise RuntimeError(f"rsync failed: exit {p.returncode}")
```

`bufsize=1` enables line buffering; without it, output is block-buffered
and you see nothing until the child exits. Merging stderr into stdout
with `stderr=subprocess.STDOUT` keeps the lines in original order.

### Pipe one command into another (without `shell=True`)

```python
import subprocess

p1 = subprocess.Popen(["dpkg", "-l"], stdout=subprocess.PIPE)
p2 = subprocess.Popen(["grep", "linux-image"], stdin=p1.stdout,
                      stdout=subprocess.PIPE, text=True)
p1.stdout.close()  # let p1 receive SIGPIPE if p2 exits early
out, _ = p2.communicate()
```

Or, the often-cleaner shape: capture the first command's output and
feed it as `input=` to the second:

```python
listing = subprocess.run(["dpkg", "-l"], capture_output=True, text=True, check=True).stdout
matches = subprocess.run(["grep", "linux-image"], input=listing,
                          capture_output=True, text=True).stdout
```

### Run with a deadline

```python
import subprocess

try:
    r = subprocess.run(
        ["slow-thing", "--input", path],
        capture_output=True, text=True, timeout=30,
    )
except subprocess.TimeoutExpired as e:
    # e.stdout / e.stderr contain whatever was captured before the kill
    raise RuntimeError(f"slow-thing exceeded 30s") from e
```

`timeout=` raises after that many seconds and kills the child process.

### Run as a different user / with a clean env

```python
import os, subprocess

env = {
    "PATH": "/usr/local/bin:/usr/bin:/bin",
    "HOME": "/var/lib/myapp",
    "LC_ALL": "C.UTF-8",
}
subprocess.run(
    ["./deploy.sh", "v42"],
    env=env,                     # totally clean environment
    cwd="/opt/myapp",
    user="myapp",                # 3.9+
    group="myapp",
    check=True,
)
```

Pass an explicit `env=` to avoid leaking secrets via inherited environment.
The `user=` / `group=` args (Python 3.9+) drop privileges before exec —
useful when the parent runs as root.

### Send input to stdin

```python
key = subprocess.run(
    ["openssl", "rand", "-base64", "32"],
    capture_output=True, text=True, check=True,
).stdout.strip()

# pipe a value into another tool's stdin
subprocess.run(
    ["base64", "-d"],
    input="aGVsbG8=\n",
    text=True, check=True,
)
```

### Detached background process

```python
import subprocess

p = subprocess.Popen(
    ["./worker", "--config", "x.toml"],
    stdout=open("/var/log/worker.log", "ab"),
    stderr=subprocess.STDOUT,
    stdin=subprocess.DEVNULL,
    start_new_session=True,        # detach from parent's process group
)
print(f"started pid={p.pid}")
# parent can now exit; child keeps running
```

### Anti-pattern table

| Pattern | Problem | Fix |
| --- | --- | --- |
| `subprocess.run(f"grep {pat} {file}", shell=True)` | shell injection | use a list: `["grep", pat, file]` |
| `subprocess.call(...)` then check return code by hand | misses errors silently | use `run(..., check=True)` |
| Forgetting `text=True` | get `bytes`, accidentally compare to `str` | always set `text=True` for ops scripts |
| No `timeout=` on calls to remote / network tools | hangs forever | set a sensible deadline always |
| Reading `stdout` after `wait()` | deadlocks on large outputs | use `communicate()` or stream as it runs |

---

## Recipe collection: pathlib in practice

`pathlib.Path` is the modern way to handle paths. It's worth re-learning
the patterns explicitly because `os.path` muscle memory is sticky.

### Glob, recursive glob, filtered iteration

```python
from pathlib import Path

base = Path("/var/log")

# Direct children
for p in base.iterdir():
    if p.is_file():
        print(p.name, p.stat().st_size)

# Glob (top level only)
for p in base.glob("*.log"):
    ...

# Recursive glob
for p in base.rglob("*.gz"):
    ...

# Combined predicates
big = [p for p in base.rglob("*") if p.is_file() and p.stat().st_size > 100 * 1024 * 1024]
```

### Read / write text and bytes atomically

```python
from pathlib import Path

p = Path("config.toml")
text = p.read_text(encoding="utf-8")
p.write_text(new_text, encoding="utf-8")

# Atomic write: write to a sibling temp file, fsync, rename
import os, tempfile

def atomic_write_text(path: Path, content: str, encoding="utf-8"):
    path = Path(path)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding=encoding) as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)        # atomic on POSIX and Windows
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise
```

### Path manipulation idioms

```python
from pathlib import Path

p = Path("/var/log/nginx/access.log.1.gz")

p.name           # 'access.log.1.gz'
p.stem           # 'access.log.1'    — last dot only
p.suffix         # '.gz'
p.suffixes       # ['.log', '.1', '.gz']
p.parent         # PosixPath('/var/log/nginx')
p.parents[1]     # PosixPath('/var/log')
p.parts          # ('/', 'var', 'log', 'nginx', 'access.log.1.gz')

# Join (use / operator, not concatenation)
out = p.parent / (p.stem + ".rotated.gz")

# Replace a suffix
p.with_suffix(".bak")        # PosixPath('/var/log/nginx/access.log.1.bak')

# Test
p.exists(); p.is_file(); p.is_dir(); p.is_symlink()

# Resolve (absolute, follow symlinks; raises if missing on 3.11+ unless strict=False)
p.resolve(strict=False)

# Relative path
abs_log = Path("/var/log/app/foo.log")
abs_log.relative_to("/var/log")    # PosixPath('app/foo.log')
```

### Cross-platform home and config

```python
from pathlib import Path
import os

# User home
Path.home()

# XDG_CONFIG_HOME with fallback (Linux/macOS); on Windows use APPDATA
def app_config_dir(name: str) -> Path:
    if os.name == "nt":
        return Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")) / name
    base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return base / name

cfg_dir = app_config_dir("myapp")
cfg_dir.mkdir(parents=True, exist_ok=True)
```

### Walk a tree with predicates

```python
from pathlib import Path

def walk(root: Path, predicate):
    for p in Path(root).rglob("*"):
        if predicate(p):
            yield p

# All Python files modified in the last 7 days
import time
cutoff = time.time() - 7 * 86400
for p in walk(".", lambda p: p.is_file() and p.suffix == ".py" and p.stat().st_mtime > cutoff):
    print(p)
```

---

## Recipe collection: HTTP, retries, and rate limits

`requests` is the de-facto sync HTTP client. `httpx` is a modern
alternative with the same API plus async. Patterns below are written
against `requests`; translate trivially to `httpx`.

### Always set a timeout

```python
import requests

r = requests.get("https://api.example.com/v1/things", timeout=(3.05, 30))
# (connect_timeout, read_timeout). NEVER call requests without timeout.
r.raise_for_status()
data = r.json()
```

A bare `requests.get(url)` hangs forever if the server hangs. Make a
team rule: every call has a `timeout=`.

### Session with retries and connection pooling

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def make_session(
    retries=5,
    backoff=0.5,
    status_forcelist=(429, 500, 502, 503, 504),
    pool=20,
):
    s = requests.Session()
    retry = Retry(
        total=retries,
        backoff_factor=backoff,
        status_forcelist=status_forcelist,
        allowed_methods=("GET", "PUT", "DELETE", "HEAD", "OPTIONS", "POST"),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=pool, pool_maxsize=pool)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s

session = make_session()
session.headers.update({
    "User-Agent": "myapp/1.0 (+ops@example.com)",
    "Authorization": f"Bearer {os.environ['API_TOKEN']}",
})
r = session.get("https://api.example.com/v1/things", timeout=(3, 30))
```

`backoff_factor=0.5` produces sleeps of 0.5, 1, 2, 4, 8 seconds between
retries. `respect_retry_after_header=True` honours `Retry-After` headers
on 429/503 responses.

### Stream a large download

```python
import requests
from pathlib import Path

def download(url: str, dst: Path, chunk=64 * 1024):
    with requests.get(url, stream=True, timeout=(5, 60)) as r:
        r.raise_for_status()
        with open(dst, "wb") as f:
            for c in r.iter_content(chunk_size=chunk):
                f.write(c)
```

### Pagination — collect all pages

```python
def paginate(url: str, params=None):
    """Yield records from a paginated API that returns Link headers."""
    while url:
        r = session.get(url, params=params, timeout=(3, 30))
        r.raise_for_status()
        yield from r.json()["items"]
        url = r.links.get("next", {}).get("url")
        params = None    # only on first request

all_items = list(paginate("https://api.example.com/v1/items"))
```

### Token-bucket rate limit

```python
import time, threading

class RateLimiter:
    def __init__(self, rate_per_sec: float, burst: int):
        self.rate = rate_per_sec
        self.capacity = burst
        self.tokens = burst
        self.updated = time.monotonic()
        self.lock = threading.Lock()

    def acquire(self, n=1):
        while True:
            with self.lock:
                now = time.monotonic()
                self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
                self.updated = now
                if self.tokens >= n:
                    self.tokens -= n
                    return
                wait = (n - self.tokens) / self.rate
            time.sleep(wait)

limit = RateLimiter(rate_per_sec=10, burst=20)
for item in items:
    limit.acquire()
    session.post(url, json=item, timeout=(3, 30))
```

### Webhook signature verification

```python
import hashlib, hmac, secrets

def verify_sig(secret: bytes, body: bytes, signature_hex: str) -> bool:
    expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return secrets.compare_digest(expected, signature_hex)
```

`secrets.compare_digest` is the constant-time comparison you must use
for any HMAC check; `==` leaks timing.

---

## Recipe collection: text and structured data

### CSV in and out

```python
import csv
from pathlib import Path

# Read with header → list of dicts
with open("input.csv", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

# Filter and write
keep = [r for r in rows if int(r["amount"]) > 100]
with open("output.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(keep)
```

`newline=""` is required on all platforms. CSV files written without
it pick up extra blank lines on Windows.

### JSON with sane defaults

```python
import json
from pathlib import Path

# Read
data = json.loads(Path("config.json").read_text(encoding="utf-8"))

# Write — pretty, deterministic, UTF-8
Path("out.json").write_text(
    json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
    encoding="utf-8",
)

# Decode datetimes / Decimals (they aren't JSON natively)
import datetime, decimal

def default(o):
    if isinstance(o, (datetime.datetime, datetime.date)):
        return o.isoformat()
    if isinstance(o, decimal.Decimal):
        return str(o)
    raise TypeError(f"not JSON-serialisable: {type(o)}")

json.dumps(obj, default=default)
```

### YAML

```python
import yaml

# ALWAYS use safe_load; load() can execute arbitrary Python via tags
data = yaml.safe_load(Path("config.yml").read_text(encoding="utf-8"))

# Dump in block style with stable key order
print(yaml.safe_dump(data, default_flow_style=False, sort_keys=False))
```

### TOML

```python
# 3.11+
import tomllib
data = tomllib.loads(Path("pyproject.toml").read_text(encoding="utf-8"))
# Pre-3.11: pip install tomli, then `import tomli as tomllib`

# Writing TOML: pip install tomli-w
import tomli_w
Path("out.toml").write_bytes(tomli_w.dumps(data).encode("utf-8"))
```

### Templates with Jinja2

```python
from jinja2 import Environment, FileSystemLoader, select_autoescape

env = Environment(
    loader=FileSystemLoader("templates"),
    autoescape=select_autoescape(["html", "xml"]),
    keep_trailing_newline=True,
    trim_blocks=True,
    lstrip_blocks=True,
)
tpl = env.get_template("nginx.conf.j2")
rendered = tpl.render(servers=servers, upstream="api")
Path("/etc/nginx/conf.d/api.conf").write_text(rendered, encoding="utf-8")
```

`autoescape` matters when the output is HTML/XML and any input might
come from outside your script. Skip it for config files where literal
values are wanted.

---

## Recipe collection: pytest patterns

A short collection of fixtures and parametrisation patterns that come
up in ops codebases.

### tmp_path and capsys

```python
def test_writes_config(tmp_path):
    out = tmp_path / "config.yml"
    write_config(out, {"foo": "bar"})
    assert out.exists()
    assert "foo: bar" in out.read_text(encoding="utf-8")

def test_prints_warning(capsys):
    do_thing_with_warning()
    captured = capsys.readouterr()
    assert "WARNING" in captured.err
```

### Parametrise across cases

```python
import pytest

@pytest.mark.parametrize(
    "input,expected",
    [
        ("",         0),
        ("a",        1),
        ("a,b,c",    3),
        ("a, b, c",  3),     # whitespace tolerant
    ],
    ids=["empty", "single", "no-space", "with-space"],
)
def test_count_csv_fields(input, expected):
    assert count_csv_fields(input) == expected
```

### Fixture with dependency and finaliser

```python
import pytest, subprocess

@pytest.fixture(scope="session")
def docker_pg():
    """Spin up a Postgres container for the test session."""
    name = "test-pg"
    subprocess.run(
        ["docker", "run", "-d", "--rm", "--name", name,
         "-e", "POSTGRES_PASSWORD=test", "-p", "55432:5432",
         "postgres:16-alpine"],
        check=True,
    )
    try:
        wait_for_port("127.0.0.1", 55432, timeout=30)
        yield "postgresql://postgres:test@127.0.0.1:55432/postgres"
    finally:
        subprocess.run(["docker", "rm", "-f", name])

def test_query(docker_pg):
    import psycopg
    with psycopg.connect(docker_pg) as conn:
        assert conn.execute("select 1").fetchone() == (1,)
```

### Mocking subprocess and the clock

```python
from unittest.mock import patch
import subprocess

def test_calls_git(monkeypatch):
    calls = []
    def fake_run(cmd, **kw):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, stdout="abc123\n", stderr="")
    monkeypatch.setattr(subprocess, "run", fake_run)

    sha = current_sha()
    assert sha == "abc123"
    assert calls == [["git", "rev-parse", "HEAD"]]

def test_at_specific_time(monkeypatch):
    import datetime
    fixed = datetime.datetime(2026, 1, 1, 12, 0, tzinfo=datetime.timezone.utc)
    class FakeDT(datetime.datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed.astimezone(tz) if tz else fixed
    monkeypatch.setattr("yourmod.datetime", FakeDT)
    assert is_new_year() is True
```

### Skipping conditionally

```python
import os, sys, pytest

@pytest.mark.skipif(sys.platform == "win32", reason="POSIX-only")
def test_chmod():
    ...

@pytest.mark.skipif("CI" not in os.environ, reason="manual-only")
def test_against_real_aws():
    ...
```

### Shared config in `conftest.py`

```python
# conftest.py at the repo root
import os, pytest

@pytest.fixture(autouse=True)
def _utc_default(monkeypatch):
    """Force UTC for every test so date logic isn't host-timezone-dependent."""
    monkeypatch.setenv("TZ", "UTC")
    import time; time.tzset()
```

`autouse=True` applies the fixture to every test in scope without the
test having to ask for it. Use sparingly.

---

## Recipe collection: logging, structured logs, and observability

### A sane root logger

```python
import logging, sys, os

def configure_logging(level=None):
    level = level or os.environ.get("LOG_LEVEL", "INFO").upper()
    fmt = "%(asctime)s %(levelname)-7s %(name)s %(message)s"
    logging.basicConfig(level=level, format=fmt, datefmt="%Y-%m-%dT%H:%M:%S%z",
                         stream=sys.stderr)
    # Quiet noisy libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)

configure_logging()
log = logging.getLogger(__name__)
log.info("starting up")
```

### Structured JSON logs

```python
import json, logging, time

class JSONFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "ts":      time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime(record.created)),
            "level":   record.levelname,
            "logger":  record.name,
            "msg":     record.getMessage(),
        }
        # Allow arbitrary extra fields via logger.info("...", extra={"key": "value"})
        for k, v in record.__dict__.items():
            if k in ("msg", "args", "name", "levelname", "levelno", "pathname",
                      "filename", "module", "exc_info", "exc_text", "stack_info",
                      "lineno", "funcName", "created", "msecs", "relativeCreated",
                      "thread", "threadName", "processName", "process", "message"):
                continue
            payload[k] = v
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logging.basicConfig(handlers=[handler], level=logging.INFO)

log = logging.getLogger(__name__)
log.info("user login", extra={"user_id": 42, "ip": "10.0.0.5"})
```

### Per-request correlation IDs

```python
import contextvars, logging, uuid

_request_id = contextvars.ContextVar("request_id", default="-")

def new_request_id():
    rid = uuid.uuid4().hex[:12]
    _request_id.set(rid)
    return rid

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = _request_id.get()
        return True

logging.getLogger().addFilter(RequestIdFilter())
# Format string can now reference %(request_id)s
```

### Timing helper

```python
import contextlib, logging, time

log = logging.getLogger(__name__)

@contextlib.contextmanager
def timed(label, level=logging.INFO):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        log.log(level, f"{label} took {elapsed_ms:.1f} ms",
                extra={"event": "timed", "label": label, "ms": elapsed_ms})

with timed("fetch users"):
    users = api.fetch_users()
```

---

## Recipe collection: CLI building blocks

### argparse boilerplate

```python
import argparse, sys

def build_parser():
    p = argparse.ArgumentParser(
        prog="myop",
        description="Operate the things.",
    )
    p.add_argument("--config", "-c", default="config.yml", help="config file path")
    p.add_argument("--verbose", "-v", action="count", default=0, help="repeat for more")
    sub = p.add_subparsers(dest="cmd", required=True)

    do = sub.add_parser("deploy", help="deploy a release")
    do.add_argument("version")
    do.add_argument("--target", required=True)
    do.add_argument("--dry-run", action="store_true")

    return p

def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.cmd == "deploy":
        return cmd_deploy(args)
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

### Click — when you want decorators

```python
import click

@click.group()
@click.option("--config", "-c", default="config.yml", show_default=True)
@click.pass_context
def cli(ctx, config):
    ctx.obj = load_config(config)

@cli.command()
@click.argument("version")
@click.option("--target", required=True)
@click.option("--dry-run", is_flag=True)
@click.pass_obj
def deploy(cfg, version, target, dry_run):
    """Deploy VERSION to TARGET."""
    do_deploy(cfg, version, target, dry_run=dry_run)

if __name__ == "__main__":
    cli()
```

### Reading interactive input (with a default and confirm)

```python
def prompt(question: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default is not None else ""
    while True:
        ans = input(f"{question}{suffix}: ").strip()
        if ans:
            return ans
        if default is not None:
            return default

def confirm(question: str, default=False) -> bool:
    suffix = "[Y/n]" if default else "[y/N]"
    ans = input(f"{question} {suffix} ").strip().lower()
    if not ans:
        return default
    return ans in ("y", "yes")
```

### Reading secrets (no echo)

```python
import getpass
pw = getpass.getpass("Password: ")
```

---

## Recipe collection: cloud, containers, IaC

### boto3 with explicit credentials and a session

```python
import boto3
from botocore.config import Config

session = boto3.Session(profile_name="prod")  # or leave blank for default chain
s3 = session.client(
    "s3",
    region_name="us-east-1",
    config=Config(retries={"mode": "standard", "max_attempts": 5}),
)

# List a bucket, with paginator (handles continuation tokens)
paginator = s3.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket="my-bucket", Prefix="logs/"):
    for obj in page.get("Contents", []):
        print(obj["Key"], obj["Size"])
```

### Upload with retries and content-type

```python
import mimetypes

def upload(path, bucket, key):
    ct, _ = mimetypes.guess_type(path)
    s3.upload_file(
        Filename=str(path),
        Bucket=bucket,
        Key=key,
        ExtraArgs={"ContentType": ct or "application/octet-stream"},
    )
```

### Presigned URL

```python
url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": "my-bucket", "Key": "report.pdf"},
    ExpiresIn=900,
)
```

### Docker SDK — run a container, capture its logs

```python
import docker

client = docker.from_env()
container = client.containers.run(
    "alpine:3.20",
    command=["sh", "-c", "echo hello && sleep 1 && echo world"],
    detach=True,
    remove=False,
)
try:
    rc = container.wait()["StatusCode"]
    logs = container.logs().decode("utf-8")
    print(rc, logs)
finally:
    container.remove(force=True)
```

### Kubernetes client — pod listing, exec, scaling

```python
from kubernetes import client, config

config.load_kube_config()       # ~/.kube/config
# config.load_incluster_config()  # when running inside a pod

v1 = client.CoreV1Api()
apps = client.AppsV1Api()

# List pods in a namespace
for pod in v1.list_namespaced_pod("default").items:
    print(pod.metadata.name, pod.status.phase)

# Scale a Deployment
apps.patch_namespaced_deployment_scale(
    name="api",
    namespace="default",
    body={"spec": {"replicas": 6}},
)

# Exec into a pod
from kubernetes.stream import stream
out = stream(
    v1.connect_get_namespaced_pod_exec,
    "api-abc123", "default",
    command=["sh", "-c", "uname -a"],
    stderr=True, stdin=False, stdout=True, tty=False,
)
print(out)
```

### Templating a Helm-style values file

```python
import yaml, textwrap, subprocess
from pathlib import Path

values = {
    "image": {"repository": "myco/api", "tag": "v42"},
    "replicas": 6,
    "env": [{"name": "LOG_LEVEL", "value": "INFO"}],
}
Path("/tmp/values.yaml").write_text(yaml.safe_dump(values, sort_keys=False))

subprocess.run(
    ["helm", "upgrade", "--install", "api", "./charts/api",
     "--namespace", "default", "-f", "/tmp/values.yaml"],
    check=True,
)
```

### Driving Terraform from Python

```python
import json, subprocess
from pathlib import Path

def tf(*args, cwd="terraform"):
    return subprocess.run(["terraform", *args], cwd=cwd, check=True,
                          capture_output=True, text=True)

tf("init", "-input=false")
tf("plan", "-out=tfplan", "-input=false")
tf("apply", "-input=false", "-auto-approve", "tfplan")

# Read structured output
out = json.loads(tf("output", "-json").stdout)
api_url = out["api_url"]["value"]
```

For richer interactions look at `python-terraform` or `tftest`, but for
most ops scripts the subprocess shape above is the right amount of glue.

---

## Recipe collection: secrets and config

### A layered config loader (env > file > defaults)

```python
import os, yaml
from pathlib import Path

DEFAULTS = {
    "log_level": "INFO",
    "timeout":   30,
    "endpoint":  "https://api.example.com",
}

def load_config(path: Path | str = "config.yml") -> dict:
    data = dict(DEFAULTS)
    p = Path(path)
    if p.exists():
        data.update(yaml.safe_load(p.read_text(encoding="utf-8")) or {})
    # Env overrides — uppercase the key, prefix MYAPP_
    for k in list(data):
        v = os.environ.get(f"MYAPP_{k.upper()}")
        if v is not None:
            data[k] = v
    return data
```

### Pull a secret from a system keyring

```python
import keyring
keyring.set_password("myapp", "api-token", "s3cr3t")
tok = keyring.get_password("myapp", "api-token")
```

`keyring` reads from the OS-native store: macOS Keychain, Windows
Credential Manager, Secret Service / kwallet on Linux.

### Read AWS Parameter Store / Secrets Manager

```python
def get_param(name: str, decrypt=True) -> str:
    return session.client("ssm").get_parameter(
        Name=name, WithDecryption=decrypt,
    )["Parameter"]["Value"]

def get_secret(name: str) -> str:
    return session.client("secretsmanager").get_secret_value(SecretId=name)["SecretString"]
```

### Avoid leaking secrets in tracebacks

Configure logging to filter known secret keys:

```python
import logging, re

class SecretsFilter(logging.Filter):
    PATTERNS = [
        re.compile(r"(token|secret|password|api[_-]?key)\s*=\s*\S+", re.I),
        re.compile(r"AKIA[0-9A-Z]{16}"),                     # AWS access key
    ]
    REPLACEMENT = "***"

    def filter(self, record):
        msg = record.getMessage()
        for p in self.PATTERNS:
            msg = p.sub(self.REPLACEMENT, msg)
        record.msg = msg
        record.args = ()
        return True

logging.getLogger().addFilter(SecretsFilter())
```

This is a defense-in-depth measure; never substitute it for not putting
secrets in log messages in the first place.

---

## Recipe collection: parallelism

### Thread pool for I/O-bound work

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch(url):
    return requests.get(url, timeout=(3, 15)).status_code

with ThreadPoolExecutor(max_workers=32) as ex:
    futures = {ex.submit(fetch, u): u for u in urls}
    for fut in as_completed(futures):
        url = futures[fut]
        try:
            print(url, fut.result())
        except Exception as e:
            print(url, "ERROR", e)
```

### Process pool for CPU-bound work

```python
from concurrent.futures import ProcessPoolExecutor

def parse(blob: bytes) -> dict:
    # CPU-heavy; threads wouldn't help due to the GIL
    return heavy_parse(blob)

with ProcessPoolExecutor(max_workers=os.cpu_count()) as ex:
    results = list(ex.map(parse, blobs, chunksize=4))
```

### asyncio for high-concurrency I/O

```python
import asyncio, httpx

async def fetch(client, url):
    r = await client.get(url, timeout=15)
    return url, r.status_code

async def main(urls):
    async with httpx.AsyncClient(http2=True) as client:
        tasks = [fetch(client, u) for u in urls]
        for coro in asyncio.as_completed(tasks):
            print(await coro)

asyncio.run(main(urls))
```

A single asyncio loop will happily drive thousands of in-flight HTTP
requests without the per-thread overhead. The cost is that the whole
codepath must be async; mixing sync `requests` into an async function
defeats the purpose.

### Bounded concurrency with a semaphore

```python
sem = asyncio.Semaphore(50)
async def fetch_bounded(client, url):
    async with sem:
        return await client.get(url, timeout=15)
```

---

## Quick lookup: stdlib module → operational use

| Module | Use it for |
| --- | --- |
| `subprocess` | Run external commands |
| `pathlib` | Path manipulation, glob, simple read/write |
| `os` / `os.path` | Lower-level filesystem and process bits |
| `shutil` | High-level file ops: copy, move, archive, disk_usage, which |
| `tempfile` | Temp files, temp dirs (cleaned up automatically) |
| `argparse` | CLI parsing, stdlib-only |
| `logging` | Structured logging, no external dep |
| `json` / `csv` / `tomllib` | Built-in serializers |
| `re` | Regular expressions |
| `datetime` / `zoneinfo` | Time and timezone handling (3.9+ for zoneinfo) |
| `hashlib` / `hmac` / `secrets` | Hashing, MAC, cryptographic randomness |
| `concurrent.futures` | Thread / process pools, with a tidy API |
| `asyncio` | High-concurrency I/O |
| `socket` | Low-level networking; port checks |
| `http.server` | One-line static fileserver for debugging |
| `urllib.parse` | URL parsing without `requests` |
| `configparser` | Reading INI files |
| `signal` | Trap signals in long-running scripts |
| `contextlib` | `@contextmanager`, `ExitStack`, `suppress` |
| `dataclasses` | Lightweight typed records |
| `enum` | Symbolic constants |
| `functools` | `lru_cache`, `cached_property`, `reduce`, `partial` |
| `itertools` | `chain`, `groupby`, `islice`, `tee`, `pairwise` (3.10+) |
| `collections` | `Counter`, `defaultdict`, `deque`, `ChainMap` |
| `statistics` | mean, median, quantiles — basic stats without numpy |
| `traceback` | Format exceptions for logs |
| `unittest.mock` | Mocking inside tests, even with pytest |

If a stdlib module covers your need, prefer it over a third-party dep.
The fewer dependencies in an ops script, the longer it stays runnable
without maintenance.

---

## Recipe collection: provisioning, IaC orchestration, and CI/CD glue

A short collection of the patterns that come up when Python is the
glue between source control, the IaC tool, and the cloud target.
Each recipe is self-contained.

### Driving Terraform from a Python orchestrator

```python
import json, subprocess
from pathlib import Path

class TerraformRunner:
    def __init__(self, workdir: Path, env: dict | None = None):
        self.workdir = Path(workdir)
        self.env = env

    def _run(self, *args: str, capture: bool = True) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["terraform", *args],
            cwd=self.workdir,
            env=self.env,
            check=True,
            text=True,
            capture_output=capture,
        )

    def init(self, *extra: str) -> None:
        self._run("init", "-input=false", "-no-color", *extra, capture=False)

    def plan(self, var_file: Path | None = None, out: Path = Path("tfplan")) -> bool:
        args = ["plan", "-input=false", "-no-color", "-detailed-exitcode", f"-out={out}"]
        if var_file:
            args.append(f"-var-file={var_file}")
        try:
            self._run(*args, capture=False)
            return False  # exit 0 → no changes
        except subprocess.CalledProcessError as e:
            if e.returncode == 2:
                return True   # exit 2 → diff present
            raise

    def apply(self, plan: Path = Path("tfplan")) -> None:
        self._run("apply", "-input=false", "-no-color", str(plan), capture=False)

    def output(self) -> dict:
        r = self._run("output", "-json")
        return {k: v["value"] for k, v in json.loads(r.stdout).items()}

tf = TerraformRunner(Path("infra/prod"))
tf.init()
if tf.plan(var_file=Path("prod.tfvars")):
    tf.apply()
out = tf.output()
print(out["api_url"])
```

`-detailed-exitcode` is the key trick: code 0 = no diff, 1 = error,
2 = diff present. Ideal for CI gating.

### Pulumi from Python (when you want code, not HCL)

```python
import pulumi
import pulumi_aws as aws

config = pulumi.Config()
env    = config.require("env")
region = config.get("region") or "us-east-1"

bucket = aws.s3.BucketV2(
    f"app-{env}-data",
    tags={"Environment": env, "ManagedBy": "pulumi"},
)

aws.s3.BucketVersioningV2(
    f"app-{env}-data-versioning",
    bucket=bucket.id,
    versioning_configuration={"status": "Enabled"},
)

pulumi.export("bucket", bucket.id)
```

Pulumi is the "Python instead of HCL" story for Terraform-shaped work.
You get loops, conditionals, real types, and `import` — and you give
up the strict immutability guarantees of HCL planning.

### CDK (CloudFormation from Python)

```python
from aws_cdk import (
    App, Stack, Duration,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
)
from constructs import Construct

class ApiStack(Stack):
    def __init__(self, scope: Construct, id: str, **kw):
        super().__init__(scope, id, **kw)

        fn = _lambda.Function(
            self, "HelloFn",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=_lambda.Code.from_asset("./lambda"),
            timeout=Duration.seconds(10),
            memory_size=256,
        )
        apigw.LambdaRestApi(self, "HelloApi", handler=fn)

app = App()
ApiStack(app, "hello-prod", env={"region": "us-east-1"})
app.synth()
```

CDK synthesises CloudFormation from Python and applies it. Choice
between CDK / Terraform / Pulumi is mostly about which control plane
your team already operates.

### Driving Ansible from Python

```python
import subprocess, json
from pathlib import Path

def ansible_run(playbook: Path, inventory: Path, extra_vars: dict | None = None,
                check: bool = False) -> int:
    cmd = ["ansible-playbook", str(playbook), "-i", str(inventory)]
    if check:
        cmd.append("--check")
    if extra_vars:
        cmd += ["-e", json.dumps(extra_vars)]
    return subprocess.run(cmd, check=True).returncode

ansible_run(Path("site.yml"), Path("inventory/prod"),
            extra_vars={"version": "v42"}, check=True)   # dry run
ansible_run(Path("site.yml"), Path("inventory/prod"),
            extra_vars={"version": "v42"})              # apply
```

For deeper integration there's `ansible-runner` (a library wrapper
designed for this) but most teams stop at the subprocess shape above.

### Provisioning a single VM via cloud-init

```python
from textwrap import dedent
import base64

cloud_init = dedent("""\
    #cloud-config
    package_update: true
    packages:
      - nginx
      - jq
    write_files:
      - path: /etc/nginx/sites-available/default
        owner: root:root
        permissions: '0644'
        content: |
          server {
            listen 80 default_server;
            root /var/www/html;
          }
    runcmd:
      - systemctl enable --now nginx
""")
user_data = base64.b64encode(cloud_init.encode()).decode()

# Pass as -user-data to the cloud SDK call you're using
```

`#cloud-config` is the YAML format `cloud-init` understands. Writing
it from a Jinja2 template with rendered values is a common pattern.

### Detecting state drift from a CI job

```python
import subprocess, sys

def has_drift() -> bool:
    r = subprocess.run(
        ["terraform", "plan", "-detailed-exitcode", "-no-color",
         "-lock-timeout=60s"],
        cwd="infra/prod",
    )
    if r.returncode == 0:
        return False
    if r.returncode == 2:
        return True
    raise SystemExit("terraform plan failed")

if __name__ == "__main__":
    sys.exit(0 if not has_drift() else 1)
```

Run hourly; alert on non-zero exit. Catches the "someone made a
console change" scenario before it becomes an incident.

---

## Recipe collection: serverless / Function-as-a-Service patterns

Patterns for AWS Lambda, GCP Cloud Functions, and Azure Functions
written in Python.

### Minimal Lambda handler with structured logging

```python
import json, logging, os

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

def handler(event, context):
    logger.info("invoked", extra={
        "request_id": context.aws_request_id,
        "function":   context.function_name,
    })
    body = json.loads(event.get("body") or "{}")
    return {
        "statusCode": 200,
        "headers":   {"Content-Type": "application/json"},
        "body":      json.dumps({"ok": True, "received": body}),
    }
```

### Cold-start optimisation

Three things move the needle, in priority order:

1. **Initialisation outside the handler.** Module-level code runs once
   per cold start; per-invocation code runs every call. Move SDK
   client construction to module scope:
   ```python
   import boto3
   s3 = boto3.client("s3")     # one-time init

   def handler(event, context):
       return s3.get_object(...)
   ```
2. **Smaller deployment package.** Strip unused dependencies. For
   AWS, prefer Lambda layers for shared deps and the new container
   format if the package crosses 250 MB.
3. **Use provisioned concurrency** if cold starts matter for latency
   SLOs. Costs more; eliminates cold starts entirely.

### Idempotent handlers

Most function-platforms guarantee at-least-once delivery. Idempotency
must be in your code:

```python
import boto3, hashlib, time
from botocore.exceptions import ClientError

ddb = boto3.client("dynamodb")
TABLE = "idempotency-records"

def already_processed(key: str, ttl_sec: int = 3600) -> bool:
    try:
        ddb.put_item(
            TableName=TABLE,
            Item={
                "id":  {"S": key},
                "ttl": {"N": str(int(time.time()) + ttl_sec)},
            },
            ConditionExpression="attribute_not_exists(id)",
        )
        return False
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return True
        raise

def handler(event, context):
    key = hashlib.sha256(event["body"].encode()).hexdigest()
    if already_processed(key):
        return {"statusCode": 200, "body": "already-processed"}
    do_the_work(event)
    return {"statusCode": 200, "body": "ok"}
```

The "use DynamoDB with a conditional put" pattern works equivalently
on Cloud Firestore and Azure Cosmos.

### Long-running work — split into orchestrator + worker

Lambda's hard 15-minute timeout is the wall most workloads hit first.
The orchestration patterns:

- **Step Functions** state machine drives multiple short-lived
  Lambdas. Best for branching/retry-rich workflows.
- **SQS fan-out**: orchestrator publishes one message per work
  unit; a worker Lambda is the SQS consumer with `BatchSize=1`.
- **EventBridge Pipes**: source → enrichment Lambda → target. Good
  for streaming-shaped pipelines.
- **ECS / Fargate task** when the unit of work just doesn't fit in
  15 minutes. From your orchestrator Lambda, call
  `ecs.run_task(...)`.

### Local testing harness for a Lambda

```python
import json, importlib.util, sys
from pathlib import Path

def load_handler(path: Path):
    spec = importlib.util.spec_from_file_location("lambda_module", path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.handler

class FakeContext:
    aws_request_id = "test-req-1"
    function_name  = "test-fn"
    memory_limit_in_mb = 256
    def get_remaining_time_in_millis(self): return 30000

if __name__ == "__main__":
    handler = load_handler(Path(sys.argv[1]))
    event = json.loads(Path(sys.argv[2]).read_text())
    print(json.dumps(handler(event, FakeContext()), indent=2, default=str))
```

`python harness.py path/to/handler.py path/to/event.json` runs the
handler against a stored event payload — the kind you can copy out
of CloudWatch logs.

### Cost-aware logging

Function logs are billed by volume on every cloud. Practical rules:

- INFO at function start, summarising input and outcome at exit.
  That's two log lines per invocation.
- DEBUG behind an env flag, off by default in prod.
- Never log full request bodies for high-volume endpoints. Hash and
  log the hash, log the size, sample a percentage.

---

## Recipe collection: ML model serving from a Python service

The "wrap an sklearn or PyTorch model in an HTTP service" pattern,
done carefully enough not to embarrass yourself in production.

### Minimal FastAPI wrapper

```python
import os, joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

MODEL_PATH = os.environ.get("MODEL_PATH", "model.joblib")
model = joblib.load(MODEL_PATH)
classes = list(getattr(model, "classes_", []))

app = FastAPI(title="classifier", version=os.environ.get("VERSION", "dev"))

class Request(BaseModel):
    features: list[float]

@app.get("/healthz")
def healthz():
    return {"ok": True, "model": MODEL_PATH, "version": app.version}

@app.post("/predict")
def predict(req: Request):
    x = np.array([req.features])
    if x.shape[1] != model.n_features_in_:
        raise HTTPException(400, f"expected {model.n_features_in_} features")
    proba = model.predict_proba(x)[0].tolist()
    return {
        "label":  classes[int(np.argmax(proba))],
        "proba":  dict(zip(classes, proba)),
    }
```

Run with `uvicorn module:app --workers 4` behind a reverse proxy.

### Container packaging

```dockerfile
FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY model.joblib service.py ./
ENV MODEL_PATH=/app/model.joblib

EXPOSE 8000
CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Two production hardenings to add:

- A **non-root** user (`RUN useradd -r app && USER app`) so the
  container can run on locked-down clusters.
- A **`HEALTHCHECK`** instruction or matching Kubernetes liveness
  probe pointing at `/healthz`.

### Versioning and reproducibility

The minimum viable model-version metadata:

```python
META = {
    "model_path":   MODEL_PATH,
    "model_sha256": hashlib.sha256(Path(MODEL_PATH).read_bytes()).hexdigest(),
    "trained_at":   os.environ.get("TRAINED_AT"),
    "training_commit": os.environ.get("TRAINING_COMMIT"),
    "feature_names":   getattr(model, "feature_names_in_", None).tolist(),
    "version":       os.environ.get("VERSION", "dev"),
}
```

Expose it on `/version` or include it in every response. Without this,
a bad prediction six weeks from now is impossible to triage.

### Common ML-serving pitfalls

- **Train/serve skew.** The pipeline that produced training data and
  the pipeline that produces serve-time features must be the same
  code. If they aren't, instrument every transformation and log the
  inputs/outputs at the boundary.
- **Pickle compatibility.** `joblib`/`pickle` files are tied to the
  exact Python and library versions used to save them. Pin those in
  your container.
- **Memory pressure under concurrency.** A model that uses 800 MB
  per worker × 4 workers = 3.2 GB; cluster nodes need to allow it.
- **Latency tail.** P50 looks fine; P99 is the SLO. Add timeouts to
  every external call your handler makes.

---

## Recipe collection: case-study glue — site rebuilds, doc pipelines

Patterns that repeatedly come up in "convert this old thing to a new
thing" projects.

### Static-site rebuild loop (e.g. legacy → Hugo / Markdown)

```python
import re, html2text
from pathlib import Path
from urllib.parse import urlparse

t = html2text.HTML2Text()
t.body_width = 0          # don't re-wrap; preserve original line shape
t.ignore_links = False
t.ignore_images = False

def slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s.lower()).strip()
    return re.sub(r"\s+", "-", s)[:80]

def convert(html_path: Path, out_dir: Path) -> Path:
    html = html_path.read_text(encoding="utf-8", errors="replace")
    title_m = re.search(r"<title>(.+?)</title>", html, re.I | re.S)
    title = title_m.group(1).strip() if title_m else html_path.stem
    body = t.handle(html)
    front = (
        "---\n"
        f"title: \"{title}\"\n"
        f"slug:  \"{slugify(title)}\"\n"
        "---\n\n"
    )
    out = out_dir / f"{slugify(title)}.md"
    out.write_text(front + body, encoding="utf-8")
    return out

for src in Path("legacy").rglob("*.html"):
    convert(src, Path("content"))
```

Three things to plan for in any conversion:

- **URL preservation.** Map every old URL to the new one; serve a
  301 from the old. `htaccess` / nginx `map` directive / S3 redirect
  rules.
- **Image rewriting.** `<img src=>` paths usually need rewriting.
  Walk the converted Markdown after conversion and fix paths in a
  second pass.
- **Front-matter shape.** The target generator (Hugo, Jekyll,
  Eleventy, Astro) has its own conventions — `slug`, `date`,
  `taxonomies`, `aliases`. Generate them programmatically from the
  source rather than hand-editing.

### `aws s3 sync` from Python with content-type fixup

```python
import mimetypes, boto3
from pathlib import Path

s3 = boto3.client("s3")
mimetypes.add_type("text/css; charset=utf-8", ".css")
mimetypes.add_type("application/javascript; charset=utf-8", ".js")

def sync(src: Path, bucket: str, prefix: str = "") -> None:
    for p in src.rglob("*"):
        if not p.is_file():
            continue
        key = (prefix + str(p.relative_to(src))).lstrip("/")
        ct, _ = mimetypes.guess_type(p.name)
        s3.upload_file(
            str(p), bucket, key,
            ExtraArgs={
                "ContentType": ct or "application/octet-stream",
                "CacheControl": "public, max-age=300, must-revalidate",
            },
        )
```

`aws s3 sync` is faster but gets `ContentType` wrong for some assets;
this version is explicit about it.

### Diff before publish — refuse to deploy noise

```python
import subprocess, sys

r = subprocess.run(["git", "diff", "--stat", "HEAD~1", "HEAD"],
                   capture_output=True, text=True, check=True)
if "site/" not in r.stdout and "content/" not in r.stdout:
    print("no site changes since last commit; skipping deploy.")
    sys.exit(0)
```

A small guard that saves CI minutes and keeps invalidations cheap.

---

## Quick-lookup: the "where do I put this code?" table

| The thing you're building | Pattern |
| --- | --- |
| 50-line glue between two CLIs | bash one-shot in `bin/` |
| 200-line script with arg parsing | Python script + `argparse`, single file |
| Multiple subcommands | Python package + `click` group, installed with `pip install -e .` |
| HTTP service | FastAPI + uvicorn; container behind a reverse proxy |
| Background processor | `redis`/`sqs`/`celery` consumer; deployed as a Deployment + readiness probe |
| Periodic batch job | Kubernetes `CronJob` or AWS EventBridge → Lambda |
| Long-running ETL | Airflow / Dagster / Prefect DAG; or Step Functions for cloud-native |
| One-shot infra change | Pulumi/CDK/Terraform run from CI on merge |
| ML inference endpoint | FastAPI wrapper → container → K8s Deployment with HPA |
| Build-time tool only | `make` target calling a Python script; never deploy it |
| Fast-changing logic | feature flag + config file, **not** another redeploy path |
