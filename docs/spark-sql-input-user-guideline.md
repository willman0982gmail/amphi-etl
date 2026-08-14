# Spark SQL Input — User Guideline

**Spark SQL Input** runs Spark SQL against a remote cluster over **Spark Connect** and collects the result into a **pandas DataFrame**, so you can chain it with existing Amphi nodes such as Filter and CSV File Output.

Related docs:

- [examples/spark-sql-input.md](../examples/spark-sql-input.md) — Usage guide and samples
- [spark-sql-input-design.md](./spark-sql-input-design.md) — Design specification
- [spark-sql-input-stories.md](./spark-sql-input-stories.md) — Stories / delivery tracking
- [gdp-spark-gateway-session-selection.md](./gdp-spark-gateway-session-selection.md) — GDP Gateway multi-session / Connect ID / Browse UX recommendation

---

## What it does

```text
Amphi canvas → generated PySpark code → Jupyter kernel (Connect client)
       → sc:// remote Spark Connect → cluster executes SQL
       → toPandas() → pandas DataFrame → downstream nodes
```

- Compute runs on remote Spark; Amphi does **not** start `local[*]` or YARN from this component.
- Output type is `pandas_df_input`, so it connects directly to pandas-oriented components.
- Dependency: install `pip install "pyspark[connect]"` in the kernel environment. Keep the client version close to the cluster (prefer **3.5+**).

If you want to keep a Spark DataFrame (no `toPandas()`), use the sibling component **Spark SQL (native)** instead.

---

## SparkConnect Connection (top of the form)

The **SparkConnect Connection** card at the top of Spark SQL Input is **not** a list of remote Spark clusters. It lists **saved Amphi Connection nodes** on the current pipeline whose type is `SparkConnect`. Use it to fill URL / token fields once and reuse them, instead of hard-coding secrets in the component form.

### What it does

Fields tagged with `connection: 'SparkConnect'` (Provider, URL, Auth, Token, User/Password, Cluster ID, App Name, etc.) are grouped into a card titled **SparkConnect Connection**.

The **Select Connection** dropdown:

1. Finds all **Connection** nodes on the current `.ampln` canvas where `connectionType === "SparkConnect"`.
2. On select, copies that Connection’s variables (e.g. `SPARK_CONNECT_URL`, `SPARK_TOKEN`) into the matching form fields (often as `{VAR_NAME}`).
3. At codegen time, the Connection node emits `os.getenv(...)` / `.env` loading; the Input then references those variables.

Purpose: **credential reuse / central management** — not remote discovery of Spark Connect endpoints.

### Where the list comes from

The list is built only from **Connection nodes on the current pipeline**:

```text
PipelineService.getConnections(pipelineJson)
  → filter node.type === 'connection'
  → group by connectionType
  → UI shows optionsConnections['SparkConnect']
```

Clicking **Select Connection** refreshes via `fetchConnections`.  
If there are no Connection nodes, the dropdown is **empty** — that is expected.

There is **no** API that lists “Spark Connect connections” from a remote cluster.

### How to create a connection so the list is populated

1. Open the palette → **Configuration** → drag **Connection** onto the canvas.
2. Open the Connection node → **Select connection type** → choose **`SparkConnect`**  
   (types are auto-aggregated from component fields with `connection: 'SparkConnect'`).
3. Set a clear **Connection Name** (this is what appears in the dropdown, e.g. `prod-spark`).
4. Prefer **Values to fetch from**:
   - **Environment Variables from .env file** (recommended), or
   - **Environment Variables**  
   Avoid clear-text values when possible.
5. Fill the Variables table (pre-filled after choosing SparkConnect), for example:

| Name | Purpose |
|------|---------|
| `SPARK_CONNECT_URL` | e.g. `sc://host:15002` |
| `SPARK_REMOTE` | Databricks fallback URL |
| `SPARK_TOKEN` | Token / PAT |
| `SPARK_USER` / `SPARK_PASSWORD` | Username/password mode |
| `DATABRICKS_CLUSTER_ID` | Databricks cluster ID |
| `SPARK_APP_NAME` | Optional app name |

6. Return to **Spark SQL Input** → **Select Connection** → pick the name → fields fill automatically.

### Configuration → Connection vs Configuration → Spark Connect Session

Both live under **Configuration**, but they play different roles for Spark SQL Input:

| | **Connection** | **Spark Connect Session** |
|--|----------------|---------------------------|
| **What it is** | Generic **connection profile**: stores URL / token (and other) variables | Spark-specific **session** node: creates / reuses a global `spark` |
| **What it produces** | Python variables (e.g. `SPARK_CONNECT_URL = os.getenv(...)`) | `SparkSession.builder.remote(...).getOrCreate()` → global `spark` |
| **Does it connect to the cluster?** | No — only prepares configuration | Yes — establishes the Connect session |
| **Relation to Spark SQL Input** | Top **Select Connection** fills Input form fields | With Input **Spark session** = Auto / Shared, Input reuses this `spark` and skips its own `.remote()` |
| **Best for** | Reusing the same secrets across components (DB, Spark, …) | Sharing one session across multiple Spark nodes |
| **Multiple endpoints** | Create multiple Connection nodes and switch | Usually one Session per pipeline (pointing at the endpoint in use) |

#### What each does for Spark SQL Input

**Connection**

- Does not run SQL and does not build a `SparkSession`
- On select, fills `SPARK_CONNECT_URL`, `SPARK_TOKEN`, etc. into the Input
- Answers: **which environment / where credentials live**

**Spark Connect Session**

- Emits code that builds a shared `spark` first
- With Auto/Shared, Input runs `spark.sql(...)` without creating a per-node session
- Answers: **where the session is created and how multiple Spark nodes share it**

#### How to use them together

```text
[Connection: prod-spark]     ← store URL + token (many profiles OK)
        ↓ Select Connection
[Spark Connect Session]      ← build global spark from the same URL
        ↓ Auto / Shared
[Spark SQL Input] → SQL …    ← query only; Select Connection and/or rely on Session
```

| Scenario | Recommendation |
|----------|----------------|
| Single Input, occasional URL edits | Fill Input only, or use Connection alone |
| Several Spark nodes, same cluster | Connection (optional) + **Session** + Input Auto |
| Several GDP Connect sessions to switch | **Multiple Connections**; Session/Input select the active one |

**One-line summary:** Connection = **what to connect with**; Spark Connect Session = **already connected and sharing `spark`**.

You can use both together: Session and Input URL/token fields can both be filled from the same SparkConnect Connection.

### Summary

- **Role:** select a saved SparkConnect Connection to populate URL/auth fields.
- **List source:** only Connection nodes with type `SparkConnect` on the current pipeline; create a Connection first, then refresh Select Connection.
- **Not:** a remote catalog of cluster “connections”.
- **Session node:** optional shared `SparkSession`; complementary to Connection, not a replacement for the Select Connection list.

### Connections are per-pipeline (not shared across `.ampln`)

Amphi **Connection** nodes live on the canvas of **one** pipeline file. They are **not** a workspace-global store shared automatically across other `.ampln` files.

| Need | Approach |
|------|----------|
| Same endpoint in several pipelines | Duplicate a Connection in each `.ampln`, **or** share via env / `.env` (`SPARK_CONNECT_URL`, `SPARK_TOKEN`, …) |
| Switch sessions inside one pipeline | Multiple SparkConnect Connection nodes + **Select Connection** |
| Discover GDP Gateway sessions | Connection → **Browse GDP sessions…** (when Gateway is configured), then Select Connection on Inputs |

To reuse credentials across pipelines without copying secrets into each file, put values in environment variables or a shared `.env` and point each Connection’s fetch method at env.

### Browse GDP sessions (P1+)

When Lab PageConfig enables Gateway Browse (`gdpSparkGatewayUrl` or fixture mode):

| Where | What Browse does |
|-------|------------------|
| **Connection** (SparkConnect) — **primary** | Writes `SPARK_CONNECT_URL` (+ optional `GDP_CONNECT_ID` / `GDP_CONNECT_NAME`); best for reuse via **Select Connection** |
| **Spark Connect Session** | Fills Session URL so multiple Inputs share one `spark` |
| **Spark SQL Input / Native / File Input** | Optional shortcut that fills **this node’s** URL only — prefer Connection when other nodes need the same session |

Typical GDP flow:

1. Configure PageConfig: gateway URL, Bearer token, `gdpSparkConnectExternalHost`.
2. Add **Connection** → type SparkConnect → **Browse GDP sessions…** → Select Ready session.
3. Prefer fetch method **env / .env** for `SPARK_TOKEN` (see [examples/gdp-spark-connect.env](../examples/gdp-spark-connect.env)).
4. Name Connections `gdp-<env>-<session>` (e.g. `gdp-dev-Test2`).
5. On **Spark Connect Session** and/or Inputs: **Select Connection**, or Browse on Session for a shared `spark`.
6. Leave Input session mode on **Auto**.

Connection vs Session with Browse: Connection stores the profile; Session builds the shared `SparkSession`. Browse on either uses the same modal — it does **not** embed a full Select Tenant Connect page inside the SQL form.

### Do you need multiple SparkConnect Connections in the `.ampln`?

**Not always.** It depends how you switch endpoints. Multiple Spark Connect services in a remote namespace **do not** appear automatically under **Select Connection**. Amphi only sees Connection nodes on the canvas (or values you type / inject via env).

Keep these two ideas separate:

| | Multiple Spark Connect endpoints in a remote namespace | SparkConnect Connection nodes in `.ampln` |
|--|------------------------------------------------------|-------------------------------------------|
| What they are | Real cluster / service URLs (`sc://…`) | Saved URL/token configs for this pipeline |
| Auto-discovered by Amphi? | **No** | Only Connection nodes on the canvas |
| Relationship | Addresses you can actually reach | Aliases you register locally for switching |

#### When to create multiple Connections

**Create one Connection per endpoint** if you often switch inside the same pipeline via **Select Connection**, for example:

```text
Connection: spark-ns-a   → SPARK_CONNECT_URL=sc://a...:443
Connection: spark-ns-b   → SPARK_CONNECT_URL=sc://b...:443
```

Then open Spark SQL Input → **Select Connection** → pick `spark-ns-a` / `spark-ns-b`.  
In that workflow, **yes — each endpoint you want in the dropdown needs its own Connection node** (stored in the `.ampln`).

#### When one Connection (or none) is enough

| Scenario | Approach |
|----------|----------|
| Pipeline always talks to one endpoint | **One** Connection, or even none — set env / type the URL |
| Same graph, different Connect per deploy (CI / env) | **One** Connection; inject `SPARK_CONNECT_URL` (and token) via `.env` / process env |
| Separate pipelines per environment | One Connection per `.ampln` (e.g. `dev.ampln` / `prod.ampln`) |
| Quick one-off test of a URL | Type URL/Token in the form; no Connection required |

Remote namespace has 10 Spark Connect services but this pipeline only ever uses one → you do **not** need 10 Connection nodes.

#### Practical guidance

| Need | Recommendation |
|------|----------------|
| Frequent UI switching among Connect endpoints | Multiple SparkConnect Connection nodes in the `.ampln` |
| One graph; environment decides the endpoint | Single Connection + env / `.env` |
| Temporary trial of a URL | Manual URL/Token; Connection optional |

**Bottom line:** Multiple Spark Connect endpoints in a remote namespace does **not** mean you must create the same number of Connections in the `.ampln`. Create multiple Connections only when you want to **pick among them with Select Connection**; otherwise one Connection (or env-only) is enough.

### How to switch among several Connect endpoints in the UI

1. Add one **Connection** (Configuration palette) per endpoint; set type **SparkConnect** and a distinct **Connection Name** (e.g. `dev-spark`, `prod-spark`).
2. Fill variables (`SPARK_CONNECT_URL`, `SPARK_TOKEN`, …) — prefer `.env` / Env Variables over clear text.
3. On **Spark SQL Input**, use the top-right **Select Connection** dropdown to choose which saved connection fills Provider / URL / Auth / Token.
4. Use **Remove Connection** in the dropdown footer to clear the binding and edit fields manually again.

| UI control | Role when you have multiple Connect endpoints |
|------------|-----------------------------------------------|
| **Select Connection** | **Primary switch** between saved SparkConnect Connections |
| Provider / URL / Auth / Token | Auto-filled from the selected Connection; manual edits are for ad-hoc overrides |
| SQL / Max rows / Session | Independent of which Connect endpoint you selected |

If **Select Connection** stays empty, the pipeline has no `SparkConnect` Connection nodes yet — create them first. This is not remote service discovery.

---

## How to fill each option

### 1. Provider

| Value | Meaning | When to use |
|---|---|---|
| **Generic** | Open-source / generic Spark Connect | Self-hosted Connect, e.g. `sc://host:15002` |
| **Databricks** | Databricks-style Connect URL | Databricks Workspace; requires Token + Cluster ID |

---

### 2. Spark Connect URL

- **Generic example:** `sc://localhost:15002` or `sc://spark-connect:15002`
- **Databricks example:** `sc://xxx.cloud.databricks.com:443`
- **GDP Spark Gateway External (multi-session):** paste the **full** External string, including Connect ID:

```text
sc://spark-connect-dedicated-<ns>.example.com:443/;token=<TOKEN>;x-gdp-connect-id:<CONNECT_ID>
```

  Sessions in the same namespace often share the gateway host; **`x-gdp-connect-id` selects which session**. Internal cluster URLs usually omit Connect ID.
- **Recommended:** use environment variables / Connection instead of hard-coding in `.ampln`
  - `SPARK_CONNECT_URL` (preferred)
  - or `SPARK_REMOTE` (Databricks Connect convention)

For Connection nodes, use type/tag **SparkConnect** with key `SPARK_CONNECT_URL`. When GDP Gateway Browse is configured, open the Connection modal → **Browse GDP sessions…** to fill the URL (token stays in env).

There is **no** dedicated GDP Connect ID form field in Amphi (P1): the full URL is enough for codegen.

---

### 3. Databricks cluster ID (Provider = Databricks only)

- Enter the cluster ID; it is appended to the URL as `x-databricks-cluster-id=...`
- Prefer env / Connection: `DATABRICKS_CLUSTER_ID`

---

### 4. Authentication

| Mode | Behavior | How to fill |
|---|---|---|
| **None** | URL only; still honors `SPARK_TOKEN` if present in the environment | Open / unauthenticated Connect endpoints |
| **Token** | Access token / Databricks PAT | Fill **Access token**, or set `SPARK_TOKEN` (preferred) |
| **Username / Password** | Mapped to Connect URL `user_id=` / `token=` | Fill username/password, or `SPARK_USER` + `SPARK_PASSWORD` |
| **OAuth / Kerberos** | **Not implemented** | Do not select; use external `kinit` / vendor SDK, then inject URL/Token |

**Production tip:** put tokens and passwords in Env / Connection — do not commit them inside pipeline files.

---

### 5. Access token / Username / Password

- Shown based on the selected auth mode.
- Password-style fields are stored in `.ampln` if filled — treat those pipelines as secret-bearing.
- Matching variables: `SPARK_TOKEN`, `SPARK_USER`, `SPARK_PASSWORD`

---

### 6. Application name (advanced)

- Passed to `SparkSession.appName`; default `amphi-spark-sql-input`
- Can also use `SPARK_APP_NAME`

---

### 7. Query method

#### A. SQL Query (recommended)

Enter full Spark SQL in **SQL Query**, for example:

```sql
SELECT *
FROM samples.nyctaxi.trips
LIMIT 1000
```

Notes:

- **One statement only** (no `SELECT ...; SELECT ...`)
- Prefer filtering and projection in SQL to reduce `toPandas()` memory pressure

#### B. Table Name (shortcut)

Equivalent to `SELECT * FROM <table>`, then applies Max rows via `.limit()`.

| Field | Description |
|---|---|
| **Catalog** | Optional; Retrieve → `SHOW CATALOGS` |
| **Schema / namespace** | Optional; Retrieve → `SHOW NAMESPACES` |
| **Table name** | Required; Retrieve → `SHOW TABLES`, or type `catalog.schema.table` |

If a **Spark Connect Session** node is present, Retrieve reuses that session. Selecting a short table name with Catalog/Schema set stores a fully qualified `catalog.schema.table` value.

---

### 8. Max rows

- Default **10000**
- Results are collected with `toPandas()` into the Jupyter client — large results can OOM the kernel
- If SQL already ends with `LIMIT k`, the effective limit is **`min(Max rows, k)`**
- For exploration, lower it (e.g. `1000`)

---

### 9. Spark session (advanced)

| Mode | Meaning |
|---|---|
| **Auto** (default) | Reuse global `spark` from a **Spark Connect Session** node when present; otherwise `getOrCreate()` on this node |
| **Always use shared Session** | Requires a Session node; always reuse it |
| **Per-node getOrCreate()** | Always create/reuse a session on this node |

For multiple Spark SQL Inputs: add **Spark Connect Session**, configure URL/auth once there, and leave Input session mode on **Auto**.

---

## Recommended setups

**Local / generic Connect (no auth):**

1. Provider = Generic
2. URL = `sc://localhost:15002`
3. Auth = None
4. Query method = SQL Query, with SQL + `LIMIT`
5. Max rows = `10000`
6. Session = Auto

**Databricks:**

1. Provider = Databricks
2. URL = `sc://<workspace>:443` (or `SPARK_REMOTE`)
3. Auth = Token; PAT via `SPARK_TOKEN`
4. Cluster ID via `DATABRICKS_CLUSTER_ID`
5. Enter SQL or pick a table

**GDP Spark Gateway (Browse):**

1. Enable Browse via PageConfig (see below).
2. Connection → Browse → pick Ready session (External URL with Connect ID).
3. Optional: Spark Connect Session → Select Connection (or Browse) → shared `spark`.
4. Spark SQL Input → Select Connection / Auto session → SQL Query.
5. Keep tokens in `.env` — see [examples/gdp-spark-connect.env](../examples/gdp-spark-connect.env).

**Shared session for multiple nodes:**

```text
[Spark Connect Session]  (configure URL/auth once here)
[Spark SQL Input] → [Filter] → [CSV File Output]
```

---

## Usage notes

1. The Connect endpoint must be reachable; open firewall ports (commonly 15002, or Databricks 443).
2. Align the PySpark Connect client with the cluster version.
3. The pandas path pulls results into the kernel — for large data, limit in SQL or switch to the **Spark SQL (native)** lineage.
4. Do not rely on automatic `spark.stop()` when switching clusters; restart the kernel if needed, or use **Spark Session Stop**.

---

## Troubleshooting (GDP Spark Gateway)

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Reach gateway host but query hits wrong session / auth fails | Missing or wrong `x-gdp-connect-id` on External URL | Copy the **full** External URL from Gateway (or Browse), including `;x-gdp-connect-id:…` |
| Connect fails after session was Stopped | Bound URL points at a stopped Tenant Connect | Start the session in Gateway, Refresh Browse, re-Select |
| Works on-cluster but not from Jupyter | Used **Internal** `*.svc` URL from outside the cluster | Prefer **External** URL for Lab outside the cluster |
| Select Connection empty | No SparkConnect Connection on **this** `.ampln` | Add Connection on the same canvas (Connections are not shared across pipelines) |
| Browse GDP sessions… disabled | Gateway not configured | Set PageConfig `gdpSparkGatewayUrl` (or enable `gdpSparkGatewayUseFixture` for local fixtures) |
| 401/403 from Browse | Missing/expired Bearer JWT or SSO | Refresh portal token / set `gdpSparkGatewayAuthToken`; ensure Lab can reach Gateway host |
| URL missing after Browse | No External host configured | Set `gdpSparkConnectExternalHost` (list API returns `connect_id` only) |

### Sample URL shapes (redacted)

```text
# External (Jupyter / outside cluster) — Connect ID required when host is shared
sc://spark-connect-dedicated-jwt-poc-df.example.com:443/;token=***;x-gdp-connect-id:connect-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee

# Internal (in-cluster) — distinct service name; Connect ID often optional
sc://spark-connect-test2.jwt-poc-df.svc.cluster.local:15002
```

---

## Environment variables quick reference

| Variable | Purpose |
|---|---|
| `SPARK_CONNECT_URL` | Remote URL (preferred; may include `x-gdp-connect-id`) |
| `SPARK_REMOTE` | Fallback URL (Databricks Connect convention) |
| `SPARK_TOKEN` | Optional token (also password fallback for userpass) |
| `SPARK_USER` | Optional username (userpass → `user_id=`) |
| `SPARK_PASSWORD` | Optional password (userpass → `token=`) |
| `DATABRICKS_CLUSTER_ID` | Databricks cluster id URL param |
| `SPARK_APP_NAME` | Optional app name |
| `GDP_CONNECT_ID` | Optional metadata from Browse (runtime uses URL) |
| `GDP_CONNECT_NAME` | Optional session display name from Browse |

Connection node: use type/tag **SparkConnect** with the same key names as above.

### GDP Gateway Browse configuration (Lab PageConfig)

Browse stays **disabled** until PageConfig is set. For local UI smoke (no live Gateway):

```bash
source .venv/bin/activate
jupyter lab --config=examples/jupyter_gdp_gateway_pageconfig.py
# or via install script:
./scripts/build-install-jupyterlab-4.5.9.sh --gdp-gateway-fixture
```

That config sets `gdpSparkGatewayUseFixture=true` (see [examples/jupyter_gdp_gateway_pageconfig.py](../examples/jupyter_gdp_gateway_pageconfig.py)). Hard-refresh the browser after restart.

| PageConfig key | Purpose |
|----------------|---------|
| `gdpSparkGatewayUrl` | Gateway API base URL (enables Browse), e.g. `https://<GATEWAY_HOST>` |
| `gdpSparkGatewayAuthToken` | Bearer JWT for `Authorization` (required for direct Gateway calls; never commit real tokens) |
| `gdpSparkConnectExternalHost` | Hostname used to build `sc://…:443/;x-gdp-connect-id:…` (list API returns `connect_id` only) |
| `gdpSparkGatewayPortalUrl` | Portal UI base for **Create New…** deep-link |
| `gdpSparkGatewayCreateUrlTemplate` | Optional full URL with `{namespace}` placeholder |
| `gdpSparkGatewayNamespace` | Optional default namespace filter |
| `gdpSparkGatewayUseFixture` | `true` — use recorded fixtures (CI / offline) |
| `gdpSparkGatewayUrlPreference` | `external` (default) or `internal` |

List API used by Browse: `GET {gdpSparkGatewayUrl}/api/v1/connects?limit=50&offset=0`.

**Network / auth allowlist (G10.3):** Lab browser (or Jupyter proxy) must reach the Gateway API host over HTTPS; callers need a user Bearer JWT (or SSO cookie via proxy). No tenant-admin secrets in the extension. Spark Connect External host (`gdpSparkConnectExternalHost`:443) must be reachable from the kernel for `SparkSession.remote`. Exact OAuth scopes are portal-specific — use the same token the Gateway UI uses for `/api/v1/connects`.

**Server extension (G10.5):** Amphi does **not** ship a dedicated GDP Gateway Jupyter server extension. The Lab frontend calls Gateway HTTP directly. If CORS/SSO blocks the browser, point `gdpSparkGatewayUrl` at a Jupyter **proxy** base URL that forwards `/api/v1/connects` (same client code).

Manual QA steps: [examples/gdp-spark-gateway-qa.md](../examples/gdp-spark-gateway-qa.md).

