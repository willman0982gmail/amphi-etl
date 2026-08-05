# Amphi ETL — JupyterLab Compatibility & Example Environments

This document summarizes JupyterLab version compatibility for the Amphi ETL project (`jupyterlab-amphi`, `amphi-etl`, `amphi-scheduler`) and provides example virtual-environment setup commands.

**Also see:** [Spark SQL Input usage](./spark-sql-input.md) · [Spark Connect runbook](./spark-connect-runbook.md) · [pandas sample](./pipelines/spark-sql-sample.ampln) · [native sample](./pipelines/spark-native-sample.ampln) · [native ops sample](./pipelines/spark-native-ops-sample.ampln) · [join/union sample](./pipelines/spark-join-union-sample.ampln) · [agg/rename sample](./pipelines/spark-agg-rename-sample.ampln) · [reshape sample](./pipelines/spark-reshape-sample.ampln) · [bridge sample](./pipelines/spark-bridge-sample.ampln) · [live smoke](./spark-connect-smoke.py)

Review date: **2026-08-05**

---

## Executive Summary

| JupyterLab version | Prebuilt PyPI (`jupyterlab-amphi==0.9.7`) | Source build from this repo |
|---|---|---|
| **4.4.x** (e.g. 4.4.9 / 4.4.10) | **Supported** — all extensions report OK | **Supported** (`jupyterlab>=4.4.0,<5`) |
| **4.5.x** (e.g. 4.5.8–4.5.10) | **Partial** — `@amphi/pipeline-editor` services pin conflict | **Supported** after rebuild |
| **4.6.x** (e.g. 4.6.0–4.6.2) | **Not supported** — services + `@jupyter/ydoc` v4 conflict | **Supported** after rebuild (`@jupyter/ydoc` `^3 \|\| ^4`) |

**Bottom line:** This repository targets **`jupyterlab>=4.4.0,<5`** (4.4.x / 4.5.x / 4.6.x). Build `jupyterlab-amphi` and `amphi-scheduler` from source and install into the test venv. The published PyPI wheel `jupyterlab-amphi==0.9.7` still carries older frontend pins and is only fully compatible with JupyterLab **4.4.x** until a new release is published.

---

## Compatibility Review

### Python-level constraints

`jupyterlab-amphi`, `amphi-scheduler`, and `amphi-etl` declare:

```toml
jupyterlab>=4.4.0,<5
```

Updated in:

- `jupyterlab-amphi/pyproject.toml`
- `jupyterlab-amphi/requirements.txt` (`notebook>=7.4.0,<8`)
- `amphi-scheduler/pyproject.toml`
- `amphi-scheduler/requirements.txt`
- `amphi-scheduler/packages/pipeline-scheduler/pyproject.toml`
- `amphi-etl/pyproject.toml`, `requirements.txt`, `setup.py`, frontend `package.json` files, Dockerfiles
- Root `requirements.txt`
- CI build workflow (`.github/workflows/pypi-publish.yml`)

**Upstream sync (2026-08-05):** This monorepo tracks `https://github.com/amphi-ai/amphi-etl.git` (`main` @ `b3c215a`). The standalone `amphi-ai/jupyterlab-amphi` repo resolves to the same commit. PyPI wheels (`jupyterlab-amphi==0.9.7`, `amphi-etl==0.9.8`, `amphi-scheduler==0.9.7`) are older published artifacts than current `main` source; prefer building from this repo for JL 4.5/4.6.

### Frontend (TypeScript) dependencies

Source packages declare ranges that cover JupyterLab 4.4–4.6:

- `@jupyterlab/*` packages use `^4.4.0` (and `@jupyterlab/apputils` `^4.5.0`, matching JL 4.4+ packaging).
- `@jupyterlab/services` uses `^7.4.0` (covers JL 4.4 → 7.4, JL 4.5 → 7.5, JL 4.6 → 7.6).
- `@jupyterlab/coreutils` uses `^6.4.0`.
- `@jupyter/ydoc` uses `^3.0.0 || ^4.0.0` (JL 4.4/4.5 ship ydoc 3; JL 4.6 ships ydoc 4). Shared as a singleton from the host in `@amphi/pipeline-components-manager`.
- `@jupyterlab/rendermime-interfaces` resolution stays on the 3.x line (`^3.12.0`), matching JupyterLab itself.

### Root cause of the 4.5.x / 4.6.x PyPI incompatibility

Starting with JupyterLab 4.5, the bundled `@jupyterlab/services` version moved to the **7.5.x** line. The prebuilt `@amphi/pipeline-editor@0.9.7` wheel still declares a dependency on **7.4.x**, causing JupyterLab's extension compatibility check to fail. JupyterLab 4.6 additionally requires `@jupyter/ydoc` **v4**, which older Amphi builds that declare only `^3` reject.

Verified with `jupyter labextension list --verbose` (PyPI 0.9.7):

```
"@amphi/pipeline-editor@0.9.7" is not compatible with the current JupyterLab
Conflicting Dependencies:
JupyterLab              Extension              Package
>=7.5.9 <7.6.0          >=7.4.5 <7.5.0         @jupyterlab/services   (JL 4.5.9)
>=7.5.10 <7.6.0         >=7.4.5 <7.5.0         @jupyterlab/services   (JL 4.5.10)
>=7.6.0 <7.7.0          >=7.4.5 <7.5.0         @jupyterlab/services   (JL 4.6.x)
```

### JupyterLab 4.6.x — what was fixed in source

| Area | Status | Notes |
|---|---|---|
| `@jupyterlab/services` range | **Fixed** — `^7.4.0` | Covers 7.4 / 7.5 / 7.6 |
| `@jupyter/ydoc` v3 vs v4 | **Fixed** — `^3 \|\| ^4` + shared singleton | Used by `CodeTextareaMirror` (`YFile`) |
| Host API surface | **OK for Amphi** | No reliance on JL 4.6-only dirty-state APIs beyond optional Mirror editor |

See the [JupyterLab 4.6 migration guide](https://jupyterlab.readthedocs.io/en/stable/extension/extension_migration.html) for host-side ydoc dirty-state changes.

---

## Recommendations

### For users installing from PyPI

- **`jupyterlab-amphi==0.9.7`:** Prefer **JupyterLab 4.4.x** (fully compatible), or accept the `@amphi/pipeline-editor` warning on 4.5+/4.6 until a new wheel is published.
- **JupyterLab 4.5.x / 4.6.x:** Build and install from this repository (see below), or wait for a PyPI release that includes the dependency updates.

### For developers building from source (JupyterLab 4.4–4.6)

Rebuild both packages against any supported JupyterLab 4.4+:

```shell
python -m pip install 'jupyterlab>=4.4.0,<5'

cd jupyterlab-amphi
jlpm install
jlpm build:prod
python -m pip install .

cd ../amphi-scheduler
jlpm install
jlpm build:prod
python -m pip install .
```

Then verify:

```shell
python -m jupyter labextension list --verbose
```

All `@amphi/*` extensions (including `@amphi/pipeline-scheduler`) should report **OK**.

---

## Example Environments

### JupyterLab 4.4.x environment (recommended for PyPI install)

```shell
cd ~/gdp
rm -rf jupyterlab_venv
python -m venv jupyterlab_venv
source jupyterlab_venv/bin/activate

python -m pip install --upgrade pip
python -m pip uninstall jupyterlab-amphi elyra voila jupyterlab-lsp jupyterlab-git jupyterlab
python -m pip uninstall openpyxl pandas matplotlib folium ipywidgets plotly dotenv psycopg2-binary seaborn
python -m pip install --upgrade \
  'jupyterlab==4.4.9' \
  'jupyterlab-git==0.52.0' \
  'jupyterlab-lsp==5.1.0' \
  'jupyterlab-amphi==0.9.7' \
  'elyra==4.1.1' \
  'voila==0.5.12'
python -m pip install --upgrade openpyxl pandas matplotlib folium ipywidgets plotly dotenv psycopg2-binary seaborn
python -m jupyter server extension enable jupyterlab_git --sys-prefix
python -m jupyter server extension enable jupyter_lsp --sys-prefix
python -m jupyter server extension enable elyra --sys-prefix
python -m jupyter server extension enable voila.server_extension --sys-prefix
python -m jupyter labextension list
python -m jupyter lab build
python -m jupyter lab --debug --LabApp.extension_manager=readonly
```

### Amphi environment with JupyterLab 4.5.9 (source install)

Recommended for local testing of this repo (including `amphi-scheduler`):

```shell
cd ~/gdp
rm -rf amphi_venv
python -m venv amphi_venv
source amphi_venv/bin/activate

python -m pip install --upgrade pip
python -m pip install 'jupyterlab==4.5.9' 'jupyterlab-git==0.52.0' 'jupyterlab-lsp==5.1.0' openpyxl

# Build & install Amphi + Scheduler from this repository
cd /path/to/gdp-amphi-etl/jupyterlab-amphi
jlpm install && jlpm build:prod && python -m pip install -e .

cd ../amphi-scheduler
jlpm install && jlpm build:prod && python -m pip install -e .

python -m jupyter server extension enable jupyterlab_git --sys-prefix
python -m jupyter server extension enable jupyter_lsp --sys-prefix
python -m jupyter labextension list --verbose
```

All `@amphi/*` extensions (including `@amphi/pipeline-scheduler`) should show `OK`.

---

---

## Amphi + Elyra Conflict: `.ampln` Opens in Elyra Pipeline Editor

### Symptom

After installing both `jupyterlab-amphi` and `elyra`, double-clicking an Amphi pipeline (`.ampln`) opens the Elyra pipeline editor (or fails), instead of the Amphi canvas.

### Root cause

Both extensions register a JupyterLab document widget factory with the **same name**:

| Extension | Factory name | File extension |
|---|---|---|
| Elyra (`@elyra/pipeline-editor-extension`) | `"Pipeline Editor"` | `.pipeline` |
| Amphi (`@amphi/pipeline-editor`, before fix) | `"Pipeline Editor"` | `.ampln` |

JupyterLab's `DocumentRegistry.addWidgetFactory()` treats a duplicate factory name as a **no-op** (logs a warning and skips registration). Whichever extension loads first wins. Amphi then associates `.ampln` with the factory name `"Pipeline Editor"`, so JupyterLab opens Elyra's editor for Amphi files.

Relevant Amphi code: `jupyterlab-amphi/packages/pipeline-editor/src/index.ts` (`PIPELINE_FACTORY`).

### Solution A — Code fix (recommended, permanent)

Rename Amphi's widget factory so it no longer collides with Elyra. This is already applied in this repository:

```ts
// jupyterlab-amphi/packages/pipeline-editor/src/index.ts
const PIPELINE_FACTORY = 'Amphi Pipeline Editor';
```

Rebuild and reinstall from source:

```shell
cd jupyterlab-amphi
jlpm install
jlpm build:prod
python -m pip install .
```

After restarting JupyterLab, `.ampln` should open with **Amphi Pipeline Editor**, and Elyra `.pipeline` files remain unaffected.

Until a new PyPI release includes this change, use Solution B or C with the published wheel.

### Solution B — Immediate workaround (no rebuild)

1. In the file browser, **right-click** the `.ampln` file → **Open With**.
2. If Amphi registered successfully (load-order dependent), choose **Pipeline Editor** / Amphi; otherwise only Elyra or JSON may appear.
3. Prefer opening via Amphi's launcher / "New Pipeline" command, which can pass an explicit factory name.

If Amphi's factory was skipped entirely, Open With will not show a working Amphi editor — use Solution C or A.

### Solution C — Disable Elyra pipeline editor only

If you need Amphi pipelines and can live without Elyra's visual pipeline editor (other Elyra features may still be usable depending on package layout):

```shell
# Disable Elyra's frontend pipeline editor extension (Lab 4)
jupyter labextension disable @elyra/pipeline-editor-extension
```

Or uninstall Elyra when Amphi pipelines are the primary workflow:

```shell
python -m pip uninstall elyra
```

Re-enable later if needed:

```shell
jupyter labextension enable @elyra/pipeline-editor-extension
```

### Solution D — Separate environments (safest for mixed use)

Keep Amphi and Elyra in different virtual environments (as in the example setups above). This avoids DocumentRegistry collisions entirely.

### Verification

After applying a fix, restart JupyterLab and check the browser console / server logs for:

```text
Widget factory "Pipeline Editor" already registered
```

That warning should no longer appear for Amphi after Solution A. Then:

1. Double-click a `.ampln` file → Amphi canvas opens.
2. Double-click a `.pipeline` file → Elyra editor still opens (if Elyra is installed).

---

## References

- [JupyterLab Extension Migration Guide](https://jupyterlab.readthedocs.io/en/stable/extension/extension_migration.html)
- [JupyterLab 4.5 → 4.6 migration notes](https://jupyterlab.readthedocs.io/en/stable/extension/extension_migration.html#jupyterlab-4-5-to-4-6)
- [Amphi BUILDING.md](../BUILDING.md) — building from source
- [Amphi AGENT.md](../AGENT.md) — project architecture overview
- [Elyra pipeline-editor registration](https://github.com/elyra-ai/elyra/blob/main/packages/pipeline-editor/src/index.ts) — uses factory name `"Pipeline Editor"`
