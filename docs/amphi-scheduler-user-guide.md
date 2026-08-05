# Amphi Scheduler — JupyterLab user guide

## 1. How it appears in the UI

| Surface | Behavior |
|--------|----------|
| **Left sidebar** | Auto-opens on Lab start as a closable left panel (`amphi-pipeline-scheduler`) titled **Pipeline Scheduler**, with `schedulerIcon` (`style/icons/scheduler.svg`). |
| **Command** | `pipeline-scheduler:open` — label **Pipeline Scheduler**, caption *Schedule Amphi pipelines*. |
| **Command palette** | Category **Amphi** → **Pipeline Scheduler**. |
| **Launcher / menus** | **None** — no launcher tile, no main-menu entry. |
| **Panel UI** | Ant Design tabs: **Tasks** (job list) and **Monitoring** (run history). Primary accent `#5F9B97`. Pipeline paths show the Amphi brand icon. |

Plugin: `@amphi/pipeline-scheduler:plugin` (`autoStart: true`).

---

## 2. Create / schedule a `.ampln` job

1. Open the sidebar (or Command Palette → Amphi → Pipeline Scheduler).
2. **Tasks** → **New Task**.
3. Fill the modal:
   - **Task Name** (required)
   - **Pipeline Path** — folder button opens a file browser filtered to `.ampln` / `.py` (optional “show all files”)
   - **Schedule Type**:
     - **Date** — One-time / Daily / Weekly / Monthly (+ datetime), or Every X Days
     - **Interval** — seconds
     - **Cron** — e.g. `*/5 * * * *`
     - **Trigger** — AND/OR conditions on other jobs’ success/failure
4. **Submit**.

**What happens for `.ampln`:** frontend loads the file, runs `pipeline-editor:generate-code`, and POSTs `python_code` plus `pipeline_path` to the server. Backend prefers `python_code` for execution; path is kept for display.

**Per-job actions:** Run now, Edit, Delete. List refreshes every **30s**.

**Monitoring tab:** run history (schedule / manual / trigger), view logs, delete one run or clear all.

---

## 3. Settings / config / API

**Persistence:** `<workspace>/.amphi/scheduler.sqlite` (APScheduler + run history). Workspace = Jupyter `preferred_dir` / `root_dir` / cwd. Also creates `.amphi/components/` and a default `config.toml`.

**Settings schema** (`schema/extension.json`): optional `dbPath` — **not wired**; DB path is fixed as above.

**Server enablement** (`schema/amphi-scheduler.json` → Jupyter config.d):

```json
"ServerApp.jpserver_extensions.pipeline_scheduler": true
```

**REST base:** `{baseUrl}/pipeline-scheduler/`

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/jobs` | List / create-or-update (edit = POST with `id`) |
| GET/DELETE/PUT | `/jobs/{id}` | Get / delete / update |
| POST | `/run/{id}` | Run now |
| GET/DELETE | `/runs`, `/runs/{id}` | Monitoring |
| GET | `/config` | Workspace dir |
| GET/POST | `/components-config` | `.amphi/config.toml` |
| POST/DELETE | `/components-file` | Custom component files |

Defaults on create: `max_instances=2`, `coalesce=true`, `misfire_grace_time=60`.

---

## 4. Prerequisites

- **JupyterLab** `>=4.4.0,<5`
- **`jupyterlab-amphi`** (pipeline editor) — required for `.ampln` codegen via `pipeline-editor:generate-code`
- **`amphi-scheduler`** pip package — labextension `@amphi/pipeline-scheduler` + server extension `pipeline_scheduler`
- Python deps: **APScheduler**, **SQLAlchemy**
- Python available on PATH for subprocess runs (`python <file>` or `python -c`)

Typical install (from repo / `examples/README.md`):

```bash
pip install 'jupyterlab>=4.4.0,<5'
# build & install jupyterlab-amphi, then:
cd amphi-scheduler && jlpm install && jlpm build:prod && pip install -e .
```

---

## 5. Existing docs

| Path | Content |
|------|---------|
| `/Users/bl44001/gdp/repo/gdp-amphi-etl/amphi-scheduler/AGENT.md` | Best internal guide: architecture, UI, API, flows, gaps |
| `/Users/bl44001/gdp/repo/gdp-amphi-etl/amphi-scheduler/README.md` | Generic Amphi/JupyterLab install (not scheduler-specific) |
| `/Users/bl44001/gdp/repo/gdp-amphi-etl/amphi-scheduler/packages/pipeline-scheduler/README.md` | Stale (“Table Browser Snowflake”) — ignore |
| `/Users/bl44001/gdp/repo/gdp-amphi-etl/examples/README.md` | JL compatibility + how to build/install `amphi-scheduler` with Amphi |

No dedicated end-user “how to schedule” doc beyond `AGENT.md` and this UI behavior.