# Build, Package, and Install Guide

**Target stack:** JupyterLab **4.5.9** + `jupyterlab-amphi` + `amphi-scheduler` (from this repository)

This guide covers building both Amphi packages from source, creating distributable wheels, and installing them into a clean virtual environment with JupyterLab 4.5.9.

> **Why build from source?**  
> Published PyPI wheels (e.g. `jupyterlab-amphi==0.9.7`) pin older `@jupyterlab/services` ranges and may show compatibility warnings on JupyterLab 4.5.x. Building from this repo against JupyterLab 4.5.9 produces matching labextensions. See [examples/README.md](../examples/README.md) for the full compatibility matrix.

### Automated script

Use the helper script to create `.venv`, install JupyterLab **4.5.9**, build/install `jupyterlab-amphi` + `amphi-scheduler`, and start Lab:

```bash
# From repository root
./scripts/build-install-jupyterlab-4.5.9.sh

# Build only (no JupyterLab process)
./scripts/build-install-jupyterlab-4.5.9.sh --no-start

# Use current Python env instead of ./.venv
./scripts/build-install-jupyterlab-4.5.9.sh --no-venv

# Corporate npm Artifactory mirror
./scripts/build-install-jupyterlab-4.5.9.sh --npm-registry "https://artifactory.example/artifactory/api/npm/<repo>/"

# Custom workspace / port
./scripts/build-install-jupyterlab-4.5.9.sh --notebook-dir "$HOME/workspace" --port 8889
```

The script prefers **`jlpm`**, falling back to **`npm`** for `install` and `run build:prod`. Run `./scripts/build-install-jupyterlab-4.5.9.sh --help` for all options.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Create a virtual environment](#2-create-a-virtual-environment)
3. [Install JupyterLab 4.5.9](#3-install-jupyterlab-459)
4. [Corporate network / npm registry (required behind Artifactory)](#4-corporate-network--npm-registry-required-behind-artifactory)
5. [Build and install jupyterlab-amphi](#5-build-and-install-jupyterlab-amphi)
6. [Build and install amphi-scheduler](#6-build-and-install-amphi-scheduler)
7. [Package wheels (optional)](#7-package-wheels-optional)
8. [Install from wheels (offline / deploy)](#8-install-from-wheels-offline--deploy)
9. [Verify the installation](#9-verify-the-installation)
10. [Launch JupyterLab](#10-launch-jupyterlab)
11. [Troubleshooting](#11-troubleshooting)
12. [Quick reference (copy-paste)](#12-quick-reference-copy-paste)

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Python** | 3.8+ (3.11 recommended) |
| **Node.js** | 18+ or 20 LTS (required for `jlpm` / frontend builds) |
| **Yarn** | Provided by JupyterLab as `jlpm` after JupyterLab is installed |
| **Git** | To clone this repository |
| **OS** | macOS, Linux, or Windows (PowerShell / Git Bash) |

Check versions:

```bash
python3 --version
node --version
npm --version
```

Clone the repository if you have not already:

```bash
git clone <your-fork-or-upstream-url> amphi-etl
cd amphi-etl
```

In the commands below, `REPO_ROOT` is the absolute path to this repository (the folder that contains `jupyterlab-amphi/` and `amphi-scheduler/`).

---

## 2. Create a virtual environment

Keep the virtual environment active throughout the build. The helper script uses **`.venv`** at the repo root (already listed in `.gitignore`).

### macOS / Linux

```bash
cd /path/to/amphi-etl   # REPO_ROOT
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
```

### Windows (PowerShell)

```powershell
cd C:\path\to\amphi-etl
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
```

### Conda (optional)

```bash
conda create -n amphi python=3.11 -y
conda activate amphi
python -m pip install --upgrade pip setuptools wheel
```

Confirm isolation:

```bash
which python    # macOS/Linux — should point inside the venv
# where python  # Windows
python -V
```

---

## 3. Install JupyterLab 4.5.9

Install the exact JupyterLab version first so `jlpm` and the extension build toolchain are available:

```bash
python -m pip install 'jupyterlab==4.5.9'
```

Optional but useful companion packages:

```bash
python -m pip install 'jupyterlab-git==0.52.0' 'jupyterlab-lsp==5.1.0' openpyxl
```

Confirm:

```bash
python -m jupyter lab --version
# Expected: 4.5.9

jlpm --version
# jlpm should be available after JupyterLab is installed
```

Also install the Python build backend used for packaging wheels:

```bash
python -m pip install build
```

---

## 4. Corporate network / npm registry (required behind Artifactory)

### Symptom

`pip install -e .` (or `pip install .`) fails while preparing metadata / building the JupyterLab extension:

```text
YN0001: RequestError: getaddrinfo ENOTFOUND registry.npmjs.org
subprocess.CalledProcessError: Command '['jlpm', 'install']' returned non-zero exit status 1
error: metadata-generation-failed
```

You may also see:

```text
INTERNAL ERROR: ... This package doesn't seem to be present in your lockfile; run "yarn install" to update the lockfile
```

### Root cause

| Tool | Registry used | Typical corporate setup |
|------|---------------|-------------------------|
| **pip** | Artifactory PyPI remote (works) | e.g. `https://artifactory.global.standardchartered.com/artifactory/api/pypi/pypi/simple` |
| **jlpm / Yarn** | Default `https://registry.npmjs.org` (fails) | DNS / firewall blocks public npm |

`hatch-jupyter-builder` runs `jlpm install` during `pip install -e .`. If Yarn cannot reach npm, the Python install fails (or reports success while frontend assets are incomplete — always verify with `jupyter labextension list`).

### Fix A — Point Yarn at the corporate npm Artifactory (preferred)

Ask your platform team for the **npm** (not PyPI) Artifactory repository URL. It often looks like:

```text
https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/
```

Configure **Yarn Berry** (used by `jlpm`) in each package that you build.

**Option 1 — user-level (applies to all projects):**

```bash
# After jupyterlab is installed so jlpm exists
jlpm config set npmRegistryServer "https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/"
```

**Option 2 — project-level (recommended; do not commit secrets):**

Edit or create `jupyterlab-amphi/.yarnrc.yml` and `amphi-scheduler/.yarnrc.yml`:

```yaml
nodeLinker: node-modules

# Corporate npm mirror (replace <npm-repo-name> with your Artifactory npm repo)
npmRegistryServer: "https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/"

# If Artifactory requires auth, also set (prefer env / yarn npm login — do not commit tokens):
# npmAuthIdent: "username:password_or_token"
# npmAlwaysAuth: true
```

Optional npm-compatible fallback (some tools still read this):

```bash
# ~/.npmrc or project .npmrc
registry=https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/
```

Authenticate if required:

```bash
# Interactive login against the mirror
jlpm npm login --registry "https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/"
```

Verify DNS / connectivity:

```bash
# Should resolve and return HTTP 200/401 (401 still means DNS works)
curl -I "https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/"

# This often fails behind the firewall — that is expected until you use Artifactory
# curl -I https://registry.npmjs.org
```

### Fix B — HTTP(S) proxy (if Artifactory npm is unavailable but proxy reaches public npm)

```bash
export HTTP_PROXY="http://<proxy-host>:<port>"
export HTTPS_PROXY="http://<proxy-host>:<port>"
export NO_PROXY="localhost,127.0.0.1,.standardchartered.com,artifactory.global.standardchartered.com"

# Yarn Berry also respects:
export NODE_EXTRA_CA_CERTS="/path/to/corp-root-ca.pem"   # if TLS inspection breaks Node
```

Then retry `jlpm install`.

### Fix C — Safe build order (avoid relying on pip to fetch npm packages)

Always build frontend assets **before** editable install, with registry/proxy already configured:

```bash
cd "$REPO_ROOT/jupyterlab-amphi"
jlpm install          # must succeed against Artifactory or proxy
jlpm build:prod       # produces amphi/*/static/...
python -m pip install -e .
```

If `jlpm install` fails, **do not** continue to `pip install -e .`. A later “Successfully installed jupyterlab-amphi” message can still mean labextensions were not built correctly.

After a failed or partial install, clean and retry:

```bash
cd "$REPO_ROOT/jupyterlab-amphi"
rm -rf node_modules .yarn/cache .yarn/install-state.gz
# keep yarn.lock unless you intentionally refresh it
jlpm install
jlpm build:prod
python -m pip install -e .
```

### Lockfile warning

```text
This package doesn't seem to be present in your lockfile; run "yarn install" to update the lockfile
```

This usually follows a **failed / interrupted** `jlpm install` (network error), not a real permanent lockfile bug. Fix registry access first, then re-run `jlpm install`. Only run `YARN_ENABLE_IMMUTABLE_INSTALLS=false jlpm install` if you intentionally need to refresh `yarn.lock`.

---

## 5. Build and install jupyterlab-amphi

`jupyterlab-amphi` is the foundation (pipeline editor, components, console, metadata panel). Install it **before** `amphi-scheduler`.

> Complete [§4 Corporate network / npm registry](#4-corporate-network--npm-registry-required-behind-artifactory) first if `registry.npmjs.org` is blocked.

### 5.1 Development / editable install (recommended for local work)

```bash
cd "$REPO_ROOT/jupyterlab-amphi"

# Install Python runtime deps declared by the package
python -m pip install -r requirements.txt

# Install JS workspace deps and build production assets (must succeed)
jlpm install
jlpm build:prod

# Editable install into the active venv
python -m pip install -e .
```

Notes:

- `requirements.txt` includes `jupyterlab>=4.4.0,<5` and a trailing `.` (local package). With JupyterLab 4.5.9 already pinned, pip keeps that version.
- `jlpm build:prod` runs Lerna production builds for all packages under `packages/`.
- Editable install (`-e .`) links the package so later rebuilds are picked up after you re-run `jlpm build:prod` and restart Lab.
- `pip install -e .` may invoke `jlpm` again via `hatch-jupyter-builder`; keep the npm registry configured so that step does not fail.

### 5.2 Non-editable (regular) install

```bash
cd "$REPO_ROOT/jupyterlab-amphi"
jlpm install
jlpm build:prod
python -m pip install .
```

### 5.3 What gets installed

| Layer | Content |
|-------|---------|
| Python package | `jupyterlab-amphi` |
| Labextensions | `@amphi/pipeline-editor`, `@amphi/pipeline-components-*`, `@amphi/pipeline-console`, `@amphi/pipeline-metadata-panel`, etc. under `share/jupyter/labextensions/@amphi/` |

---

## 6. Build and install amphi-scheduler

`amphi-scheduler` depends on JupyterLab and on `jupyterlab-amphi` for `.ampln` code generation (`pipeline-editor:generate-code`).

### 6.1 Development / editable install

```bash
cd "$REPO_ROOT/amphi-scheduler"

python -m pip install -r requirements.txt

jlpm install
jlpm build:prod

python -m pip install -e .
```

Python dependencies pulled in by the package include **APScheduler** and **SQLAlchemy** (declared in `pyproject.toml`).

### 6.2 Non-editable install

```bash
cd "$REPO_ROOT/amphi-scheduler"
jlpm install
jlpm build:prod
python -m pip install .
```

### 6.3 What gets installed

| Layer | Content |
|-------|---------|
| Python package | `amphi-scheduler` / `pipeline_scheduler` server extension |
| Labextension | `@amphi/pipeline-scheduler` |
| Server config | Enables `pipeline_scheduler` via Jupyter config.d |

---

## 7. Package wheels (optional)

Use this when you need artifacts to copy to another machine, archive a release, or install without rebuilding TypeScript on the target host.

### 7.1 Package jupyterlab-amphi

```bash
cd "$REPO_ROOT/jupyterlab-amphi"

# Ensure a clean production frontend build
jlpm install
jlpm build:prod

# Create wheel + sdist under dist/
python -m build
```

Artifacts:

```text
jupyterlab-amphi/dist/jupyterlab_amphi-<version>-py3-none-any.whl
jupyterlab-amphi/dist/jupyterlab_amphi-<version>.tar.gz
```

### 7.2 Package amphi-scheduler

```bash
cd "$REPO_ROOT/amphi-scheduler"

jlpm install
jlpm build:prod
python -m build
```

Artifacts:

```text
amphi-scheduler/dist/amphi_scheduler-<version>-py3-none-any.whl
amphi-scheduler/dist/amphi_scheduler-<version>.tar.gz
```

### 7.3 Collect artifacts (optional)

```bash
mkdir -p "$REPO_ROOT/dist-packages"
cp jupyterlab-amphi/dist/*.whl amphi-scheduler/dist/*.whl "$REPO_ROOT/dist-packages/"
ls -la "$REPO_ROOT/dist-packages/"
```

These steps mirror the CI flow in `.github/workflows/pypi-publish.yml` (`jlpm install` → `jlpm build:prod` → `python -m build`).

---

## 8. Install from wheels (offline / deploy)

On a machine that already has JupyterLab 4.5.9 (or install it first):

```bash
source /path/to/amphi-etl/.venv/bin/activate
python -m pip install 'jupyterlab==4.5.9'

# Install in dependency order
python -m pip install /path/to/jupyterlab_amphi-*-py3-none-any.whl
python -m pip install /path/to/amphi_scheduler-*-py3-none-any.whl
```

Or from a directory of wheels:

```bash
python -m pip install --no-index --find-links="$REPO_ROOT/dist-packages" jupyterlab-amphi amphi-scheduler
```

> Prefer wheels built against the same JupyterLab major/minor you run in production (here: 4.5.9).  
> Wheel install does **not** need npm access on the target host (frontend assets are already inside the wheel).

---

## 9. Verify the installation

```bash
# Package versions
python -m pip show jupyterlab jupyterlab-amphi amphi-scheduler

# Frontend extensions (all @amphi/* should be OK)
python -m jupyter labextension list --verbose

# Server extensions (pipeline_scheduler should be enabled)
python -m jupyter server extension list
```

Expected highlights:

- `jupyterlab` → **4.5.9**
- `@amphi/pipeline-editor` → **OK**
- `@amphi/pipeline-scheduler` → **OK**
- Server extension `pipeline_scheduler` → enabled

If optional packages were installed:

```bash
python -m jupyter server extension enable jupyterlab_git --sys-prefix
python -m jupyter server extension enable jupyter_lsp --sys-prefix
```




---

## 10. Launch JupyterLab

```bash
# Replace with your workspace (pipelines, data files)
jupyter lab --notebook-dir=/path/to/your/workspace --ContentManager.allow_hidden=True
```

Windows example:

```powershell
jupyter lab --notebook-dir=C:\path\to\your\workspace --ContentManager.allow_hidden=True
```

After start:

1. Confirm Amphi pipeline editor opens `.ampln` files.
2. Open **Command Palette** → **Amphi** → **Pipeline Scheduler** (left sidebar panel).
3. Scheduler DB is created under `<workspace>/.amphi/scheduler.sqlite`.

Clear the browser cache if extensions were reinstalled and the UI looks stale.

---

## 11. Troubleshooting

| Issue | What to do |
|-------|------------|
| `ENOTFOUND registry.npmjs.org` / `jlpm install` fails | pip uses Artifactory; Yarn still hits public npm. Configure corporate npm registry or proxy — see [§4](#4-corporate-network--npm-registry-required-behind-artifactory). |
| `metadata-generation-failed` / `Command '['jlpm', 'install']'` | Same as above: hatch runs `jlpm` during `pip install -e .`. Fix Yarn registry, then pre-run `jlpm install && jlpm build:prod` before pip. |
| `Successfully installed` but Lab extension missing/broken | Treat as failed build. Re-run `jlpm build:prod`, reinstall, then `jupyter labextension list --verbose`. |
| Lockfile / workspace INTERNAL ERROR | Usually a cascade from failed `jlpm install`. Fix network, remove `node_modules`, re-run `jlpm install`. |
| `jlpm: command not found` | Install JupyterLab first (`pip install jupyterlab==4.5.9`), then retry. |
| Extension “not compatible” / `@jupyterlab/services` conflict | Rebuild from this repo (do not use older PyPI wheels on JL 4.5.9). |
| Scheduler panel missing | Confirm `amphi-scheduler` is installed and `pipeline_scheduler` is listed under `jupyter server extension list`. |
| Build fails in `node_modules` | Delete `node_modules` and Yarn install state, then `jlpm install` again. Use Node 18/20. |
| Wrong Python packages | Ensure the venv is activated (`which python` / `where python`). |
| Editable install not updating UI | Re-run `jlpm build:prod`, restart JupyterLab, hard-refresh the browser. |
| Mixing Elyra + Amphi | Both may register a conflicting document factory; see [examples/README.md](../examples/README.md) (Amphi + Elyra section). Prefer separate environments. |
| TLS / corporate CA errors from Node | Set `NODE_EXTRA_CA_CERTS` to your corp root CA PEM path. |

### Recover from the Artifactory / npm DNS failure

```bash
# 1) Configure Yarn (example — replace with your real npm Artifactory URL)
cd "$REPO_ROOT/jupyterlab-amphi"
# edit .yarnrc.yml → set npmRegistryServer, or:
jlpm config set npmRegistryServer "https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/"

# 2) Clean partial Yarn state
rm -rf node_modules .yarn/cache .yarn/install-state.gz

# 3) Install + build JS first (must succeed)
jlpm install
jlpm build:prod

# 4) Then Python editable install
python -m pip install -e .

# 5) Repeat for scheduler
cd "$REPO_ROOT/amphi-scheduler"
# same npmRegistryServer in .yarnrc.yml
rm -rf node_modules .yarn/cache .yarn/install-state.gz
jlpm install && jlpm build:prod
python -m pip install -e .

# 6) Verify
python -m jupyter labextension list --verbose
```

Clean rebuild for one package (when registry already works):

```bash
cd "$REPO_ROOT/jupyterlab-amphi"   # or amphi-scheduler
jlpm clean:all                     # if available / if needed
rm -rf node_modules dist
jlpm install
jlpm build:prod
python -m pip install -e .
```

---

## 12. Quick reference (copy-paste)

**Preferred (script):**

```bash
cd /path/to/amphi-etl
./scripts/build-install-jupyterlab-4.5.9.sh
# or: ./scripts/build-install-jupyterlab-4.5.9.sh --no-start
```

End-to-end setup on macOS/Linux with JupyterLab **4.5.9** (manual):

```bash
# 0) Repo + venv
cd /path/to/amphi-etl
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel build

# 1) JupyterLab 4.5.9
python -m pip install 'jupyterlab==4.5.9'

# 1b) Corporate npm (REQUIRED if registry.npmjs.org is blocked)
# Replace <npm-repo-name> with your Artifactory npm repository
export NPM_MIRROR="https://artifactory.global.standardchartered.com/artifactory/api/npm/<npm-repo-name>/"
# Write into both packages' .yarnrc.yml, or:
#   jlpm config set npmRegistryServer "$NPM_MIRROR"

# 2) jupyterlab-amphi
cd jupyterlab-amphi
python -m pip install -r requirements.txt
jlpm install && jlpm build:prod   # must succeed before pip
python -m pip install -e .

# 3) amphi-scheduler
cd ../amphi-scheduler
python -m pip install -r requirements.txt
jlpm install && jlpm build:prod
python -m pip install -e .

# 4) Verify
python -m jupyter lab --version
python -m jupyter labextension list --verbose
python -m jupyter server extension list

# 5) Run
jupyter lab --notebook-dir="$HOME/workspace" --ContentManager.allow_hidden=True
```

### Package-only (wheels)

```bash
cd /path/to/amphi-etl
source .venv/bin/activate
python -m pip install 'jupyterlab==4.5.9' build

cd jupyterlab-amphi && jlpm install && jlpm build:prod && python -m build
cd ../amphi-scheduler && jlpm install && jlpm build:prod && python -m build

# Later / elsewhere (no npm needed on target):
python -m pip install jupyterlab-amphi/dist/*.whl
python -m pip install amphi-scheduler/dist/*.whl
```

---

## Related documentation

| Document | Description |
|----------|-------------|
| [scripts/build-install-jupyterlab-4.5.9.sh](../scripts/build-install-jupyterlab-4.5.9.sh) | Automated build / install / start script |
| [BUILDING.md](../BUILDING.md) | General source-build notes (jupyterlab-amphi + amphi-etl) |
| [RELEASING.md](../RELEASING.md) | Tag-based PyPI release process |
| [examples/README.md](../examples/README.md) | JupyterLab 4.4 / 4.5 / 4.6 compatibility matrix and example envs |
| [docs/amphi-scheduler-user-guide.md](./amphi-scheduler-user-guide.md) | Scheduler UI, API, and runtime behavior |
| [AGENT.md](../AGENT.md) | Architecture overview |

---

## Install order summary

```text
1. Create & activate venv
2. pip install jupyterlab==4.5.9
3. Configure Yarn npmRegistryServer (corporate Artifactory) if public npm is blocked
4. jlpm install && jlpm build:prod && pip install -e .   # jupyterlab-amphi
5. jlpm install && jlpm build:prod && pip install -e .   # amphi-scheduler
6. Verify labextensions / server extensions
7. Launch JupyterLab
```

Do not reverse steps 4 and 5: the scheduler expects the Amphi pipeline editor for `.ampln` scheduling.  
Do not run `pip install -e .` until `jlpm install` succeeds against your npm mirror.
