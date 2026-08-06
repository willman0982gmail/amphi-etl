# Build, Package, and Install Guide

**Target stack:** JupyterLab **4.5.9** + `jupyterlab-amphi` + `amphi-scheduler` (from this repository)

This guide covers building both Amphi packages from source, creating distributable wheels, and installing them into a clean virtual environment with JupyterLab 4.5.9.

> **Why build from source?**  
> Published PyPI wheels (e.g. `jupyterlab-amphi==0.9.7`) pin older `@jupyterlab/services` ranges and may show compatibility warnings on JupyterLab 4.5.x. Building from this repo against JupyterLab 4.5.9 produces matching labextensions. See [examples/README.md](../examples/README.md) for the full compatibility matrix.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Create a virtual environment](#2-create-a-virtual-environment)
3. [Install JupyterLab 4.5.9](#3-install-jupyterlab-459)
4. [Build and install jupyterlab-amphi](#4-build-and-install-jupyterlab-amphi)
5. [Build and install amphi-scheduler](#5-build-and-install-amphi-scheduler)
6. [Package wheels (optional)](#6-package-wheels-optional)
7. [Install from wheels (offline / deploy)](#7-install-from-wheels-offline--deploy)
8. [Verify the installation](#8-verify-the-installation)
9. [Launch JupyterLab](#9-launch-jupyterlab)
10. [Troubleshooting](#10-troubleshooting)
11. [Quick reference (copy-paste)](#11-quick-reference-copy-paste)

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

Keep the venv activated for every subsequent step.

### macOS / Linux

```bash
cd /path/to/amphi-etl   # REPO_ROOT
python3 -m venv amphi_venv
source amphi_venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
```

### Windows (PowerShell)

```powershell
cd C:\path\to\amphi-etl
python -m venv amphi_venv
.\amphi_venv\Scripts\Activate.ps1
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

## 4. Build and install jupyterlab-amphi

`jupyterlab-amphi` is the foundation (pipeline editor, components, console, metadata panel). Install it **before** `amphi-scheduler`.

### 4.1 Development / editable install (recommended for local work)

```bash
cd "$REPO_ROOT/jupyterlab-amphi"

# Install Python runtime deps declared by the package
python -m pip install -r requirements.txt

# Install JS workspace deps and build production assets
jlpm install
jlpm build:prod

# Editable install into the active venv
python -m pip install -e .
```

Notes:

- `requirements.txt` includes `jupyterlab>=4.4.0,<5` and a trailing `.` (local package). With JupyterLab 4.5.9 already pinned, pip keeps that version.
- `jlpm build:prod` runs Lerna production builds for all packages under `packages/`.
- Editable install (`-e .`) links the package so later rebuilds are picked up after you re-run `jlpm build:prod` and restart Lab.

### 4.2 Non-editable (regular) install

```bash
cd "$REPO_ROOT/jupyterlab-amphi"
jlpm install
jlpm build:prod
python -m pip install .
```

### 4.3 What gets installed

| Layer | Content |
|-------|---------|
| Python package | `jupyterlab-amphi` |
| Labextensions | `@amphi/pipeline-editor`, `@amphi/pipeline-components-*`, `@amphi/pipeline-console`, `@amphi/pipeline-metadata-panel`, etc. under `share/jupyter/labextensions/@amphi/` |

---

## 5. Build and install amphi-scheduler

`amphi-scheduler` depends on JupyterLab and on `jupyterlab-amphi` for `.ampln` code generation (`pipeline-editor:generate-code`).

### 5.1 Development / editable install

```bash
cd "$REPO_ROOT/amphi-scheduler"

python -m pip install -r requirements.txt

jlpm install
jlpm build:prod

python -m pip install -e .
```

Python dependencies pulled in by the package include **APScheduler** and **SQLAlchemy** (declared in `pyproject.toml`).

### 5.2 Non-editable install

```bash
cd "$REPO_ROOT/amphi-scheduler"
jlpm install
jlpm build:prod
python -m pip install .
```

### 5.3 What gets installed

| Layer | Content |
|-------|---------|
| Python package | `amphi-scheduler` / `pipeline_scheduler` server extension |
| Labextension | `@amphi/pipeline-scheduler` |
| Server config | Enables `pipeline_scheduler` via Jupyter config.d |

---

## 6. Package wheels (optional)

Use this when you need artifacts to copy to another machine, archive a release, or install without rebuilding TypeScript on the target host.

### 6.1 Package jupyterlab-amphi

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

### 6.2 Package amphi-scheduler

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

### 6.3 Collect artifacts (optional)

```bash
mkdir -p "$REPO_ROOT/dist-packages"
cp jupyterlab-amphi/dist/*.whl amphi-scheduler/dist/*.whl "$REPO_ROOT/dist-packages/"
ls -la "$REPO_ROOT/dist-packages/"
```

These steps mirror the CI flow in `.github/workflows/pypi-publish.yml` (`jlpm install` → `jlpm build:prod` → `python -m build`).

---

## 7. Install from wheels (offline / deploy)

On a machine that already has JupyterLab 4.5.9 (or install it first):

```bash
source /path/to/amphi_venv/bin/activate
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

---

## 8. Verify the installation

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

## 9. Launch JupyterLab

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

## 10. Troubleshooting

| Issue | What to do |
|-------|------------|
| `jlpm: command not found` | Install JupyterLab first (`pip install jupyterlab==4.5.9`), then retry. |
| Extension “not compatible” / `@jupyterlab/services` conflict | Rebuild from this repo (do not use older PyPI wheels on JL 4.5.9). |
| Scheduler panel missing | Confirm `amphi-scheduler` is installed and `pipeline_scheduler` is listed under `jupyter server extension list`. |
| Build fails in `node_modules` | Delete `node_modules` and lock-related caches, then `jlpm install` again. Use Node 18/20. |
| Wrong Python packages | Ensure the venv is activated (`which python` / `where python`). |
| Editable install not updating UI | Re-run `jlpm build:prod`, restart JupyterLab, hard-refresh the browser. |
| Mixing Elyra + Amphi | Both may register a conflicting document factory; see [examples/README.md](../examples/README.md) (Amphi + Elyra section). Prefer separate environments. |

Clean rebuild for one package:

```bash
cd "$REPO_ROOT/jupyterlab-amphi"   # or amphi-scheduler
jlpm clean:all                     # if available / if needed
rm -rf node_modules dist
jlpm install
jlpm build:prod
python -m pip install -e .
```

---

## 11. Quick reference (copy-paste)

End-to-end setup on macOS/Linux with JupyterLab **4.5.9**:

```bash
# 0) Repo + venv
cd /path/to/amphi-etl
python3 -m venv amphi_venv
source amphi_venv/bin/activate
python -m pip install --upgrade pip setuptools wheel build

# 1) JupyterLab 4.5.9
python -m pip install 'jupyterlab==4.5.9'

# 2) jupyterlab-amphi
cd jupyterlab-amphi
python -m pip install -r requirements.txt
jlpm install && jlpm build:prod
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
source amphi_venv/bin/activate
python -m pip install 'jupyterlab==4.5.9' build

cd jupyterlab-amphi && jlpm install && jlpm build:prod && python -m build
cd ../amphi-scheduler && jlpm install && jlpm build:prod && python -m build

# Later / elsewhere:
python -m pip install jupyterlab-amphi/dist/*.whl
python -m pip install amphi-scheduler/dist/*.whl
```

---

## Related documentation

| Document | Description |
|----------|-------------|
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
3. Build + install jupyterlab-amphi
4. Build + install amphi-scheduler
5. Verify labextensions / server extensions
6. Launch JupyterLab
```

Do not reverse steps 3 and 4: the scheduler expects the Amphi pipeline editor for `.ampln` scheduling.
