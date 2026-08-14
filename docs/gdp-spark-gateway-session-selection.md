# GDP Spark Gateway Session Selection — Design Recommendation

| Field | Value |
|---|---|
| Status | Implemented (phased) — Browse MVP + Create New deep-link; live Gateway QA open |
| Related | [spark-sql-input-user-guideline.md](./spark-sql-input-user-guideline.md), [spark-sql-input-design.md](./spark-sql-input-design.md), [examples/spark-sql-input.md](../examples/spark-sql-input.md), [gdp-spark-gateway-session-selection-stories.md](./gdp-spark-gateway-session-selection-stories.md) |
| Audience | Product / eng deciding how Amphi should pick among multiple Spark Connect sessions |
| Date | 2026-08-14 |

---

## 1. Context

### 1.1 GDP Spark Gateway

In **GDP Spark Gateway**, a single **namespace** can host multiple long-lived **Spark Connect** sessions (e.g. `Test2`, `KyleTest`, shared tenant connects). The portal UI (**Select Tenant Connect**) lets users:

- Filter by **browsing namespace**
- See **Ready** / **Stopped** sessions
- Separate **My Tenant Connects** vs **Tenant Shared**
- Inspect driver/executor size and idle timeout
- **Select** a session or **Create New**

### 1.2 How sessions differ on the wire

For **External** access, sessions often share the **same gateway host**. Routing uses a **Connect ID** embedded in the Connect URL, for example:

```text
sc://spark-connect-dedicated-jwt-poc-df....:443/;token=<TOKEN>;x-gdp-connect-id:<CONNECT_ID>
```

| Session | Differentiation |
|---------|-----------------|
| External URL | Same host; unique `;x-gdp-connect-id:…` |
| Internal URL | Usually distinct `*.svc:15002` names; Connect ID often unnecessary on-cluster |

Amphi today has **no** dedicated GDP Connect ID field (only Databricks `x-databricks-cluster-id`). The supported approach is to put the **full** gateway External string into **Spark Connect URL** / `SPARK_CONNECT_URL`.

### 1.3 Amphi today

- **Spark SQL Input** groups credential fields under **SparkConnect Connection** and offers **Select Connection**.
- That dropdown lists **Connection nodes** on the current `.ampln` with `connectionType === "SparkConnect"` — it does **not** call GDP Gateway.
- Multiple endpoints ⇒ multiple Connection nodes (or manual URL edits / env injection). See the user guideline.

---

## 2. Design question

If Amphi should **auto-fetch** GDP Spark Gateway session lists, should we:

1. Embed a full **Select Tenant Connect**-like UI inside **Spark SQL Input**, or  
2. **Optimize the existing** Connection / Session UX and keep Input focused on SQL?

Also: **must Configuration → Connection change?**

---

## 3. Separation of concerns

| Layer | Responsibility |
|-------|----------------|
| **GDP Spark Gateway** | Session lifecycle: create, Ready/Stopped, Connect ID, sizing, visibility |
| **Amphi Spark SQL Input** | Query: SQL / table shortcut, max rows, pandas vs native, session reuse mode |

Picking *which* Connect session to use is a **connection / session binding** problem, not a SQL-editor problem.

Embedding the full Gateway picker only inside Spark SQL Input would:

- Duplicate UI across Spark SQL Input, Native Input, File Input, Session, etc.
- Mix “remote session catalog” with Amphi’s local Connection model
- Couple Gateway API, auth, and paging tightly to one component form

---

## 4. Industry practice

| Product / pattern | Approach |
|-------------------|----------|
| **Databricks** | Choose cluster in the workspace; notebooks/jobs reference cluster id — query UI is not the cluster directory |
| **Snowflake / BigQuery consoles** | Connections / accounts in settings; editors bind to an existing connection |
| **Airflow / Prefect** | Central Connection / Block store; tasks reference `conn_id` |
| **dbt** | Targets in `profiles.yml`; models do not discover warehouses |
| **Spark Magic / Livy** | Endpoint in kernel/config; cells only run SQL |
| **Amphi (existing)** | DB: Connection + Retrieve tables; Spark table mode: `SHOW …` over Connect — not a Gateway session API |

**Principle:** discover and bind connections in a **configuration** layer; component forms reference a connection id / resolved URL and focus on workload parameters.

---

## 5. Recommendation

**Do not** make a full in-Input **Select Tenant Connect** clone the primary design.

**Do** extend the **configuration layer** (Connection, optionally Spark Connect Session) with Gateway browsing, and keep Spark SQL Input on **Select Connection** + SQL settings.

```text
┌─────────────────────────────────────────────────────────┐
│  GDP Spark Gateway API (list / get session → URL + id)  │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Amphi session-binding layer (preferred home)             │
│  • Enhanced SparkConnect Connection, and/or                 │
│  • Spark Connect Session “Browse Gateway…”                │
│  Output: full SPARK_CONNECT_URL (incl. x-gdp-connect-id)  │
│          + optional display name / connect-id metadata      │
└───────────────────────────┬─────────────────────────────┘
                            │ Select Connection / shared spark
┌───────────────────────────▼─────────────────────────────┐
│  Spark SQL Input / Native / File …                        │
│  Pick saved Connection or rely on Session; set SQL / limits │
└─────────────────────────────────────────────────────────┘
```

### UX options

| Option | Verdict |
|--------|---------|
| **A.** Full Select Tenant Connect inside Spark SQL Input only | **Not recommended** as the main path |
| **B.** Optimize **Select Connection** + Gateway **Browse** on Connection/Session | **Recommended** |
| **C.** Secondary **Browse…** shortcut on Input that opens the same modal | Optional convenience; still writes Connection/Session |

**Recommended primary path (B):**

1. Configuration → **Connection** (`SparkConnect`) gains **Browse GDP sessions…** (or Provider = `GDP Gateway`).
2. Modal mirrors Gateway IA: namespace, Ready/Stopped, My vs Shared, select session → **write back** `SPARK_CONNECT_URL` (full External string including `x-gdp-connect-id`) and optional token via env.
3. Spark SQL Input keeps top-right **Select Connection** to switch among saved bindings.
4. Optionally the same Browse on **Spark Connect Session** for one shared `spark` across nodes.

Manual URL entry and multi-Connection switching remain supported; Gateway discovery is an enhancement, not a replacement.

---

## 6. Should Configuration → Connection change?

**Yes — extend Connection (and optionally Session).** That is the correct home for session discovery and binding.

| Change | Rationale |
|--------|-----------|
| **Extend Connection** | Session list is a **connection profile**; same layer as Postgres/Snowflake Connections; one bind, reuse on Input / Session / File |
| **Optionally enhance Spark Connect Session** | Browse can also populate Session for “one session, many queries” |
| **Do not only change Spark SQL Input** | Native/File/other Spark nodes need the same endpoint selection |

### Suggested Connection increments

1. **Provider / preset:** `Generic` | `Databricks` | `GDP Gateway` (or Browse without changing type).
2. **Gateway settings (advanced):** API base URL, default namespace, how to obtain auth (env / JupyterHub / portal SSO).
3. **Browse modal:** namespace, Ready/Stopped, My / Shared (aligned with Select Tenant Connect).
4. **Write variables:**
   - `SPARK_CONNECT_URL` = full External URL (including `;x-gdp-connect-id:…`)
   - Optional metadata: `GDP_CONNECT_ID`, `GDP_CONNECT_NAME` (display; runtime truth is the URL)
5. **Secrets:** keep PAT/token in env / `.env`; Browse selects session identity, avoids clear-text secrets in `.ampln` when possible.

Amphi does **not** need a dedicated `x-gdp-connect-id` form field unless product wants Databricks-style split fields; a **complete URL** is enough and stays compatible with current codegen (`SparkSession.builder.remote(...)`).

---

## 7. Connecting to different sessions (current + target)

### Today (no Gateway API)

| Path | How |
|------|-----|
| External | Paste full External string (host + token + `x-gdp-connect-id`) into URL / `SPARK_CONNECT_URL` |
| Internal | Use per-session `sc://<name>-….svc:15002/` |
| UI switch | One SparkConnect **Connection** node per session → **Select Connection** |

### Target (with Gateway browse)

```text
User selects “Test2” in Browse modal
  → client returns external sc://gateway:443/;…;x-gdp-connect-id:…
  → Connection.variables.SPARK_CONNECT_URL = that string
  → Input Select Connection → fields resolve to {SPARK_CONNECT_URL} / filled URL
  → codegen: SparkSession.builder.remote(os.getenv("SPARK_CONNECT_URL", …))
```

---

## 8. Implementation outline

### 8.1 Shared module (first)

- `GdpSparkGatewayClient`: `listSessions({ limit, offset, namespace?, status? })`, `getSession(id)`
- Confirmed list API: `GET {base}/api/v1/connects?limit=50&offset=0` with `Authorization: Bearer <JWT>`
- Response: `{ items: [...], total }` with `connect_id`, `state`, `visibility` (`private`|`shared`), `driver`/`executor` objects, `idle_timeout_minutes` — **no** `sc://` URLs in list
- Build External URL: `sc://{gdpSparkConnectExternalHost}:443/;x-gdp-connect-id:{connect_id}`
- Config PageConfig: `gdpSparkGatewayUrl`, `gdpSparkGatewayAuthToken`, `gdpSparkConnectExternalHost`, `gdpSparkGatewayNamespace`
- Call Gateway REST from Lab frontend or a thin Jupyter server proxy (same client; point base URL at proxy if CORS/SSO requires it)

### 8.2 UI

- Shared modal component: `SparkGatewaySessionPicker` (IA aligned with Select Tenant Connect)
- Primary host: **Connection.ConfigForm**; secondary: **SparkConnectSession**
- Spark SQL Input: **no** full-page clone; optional **Browse…** opens the same modal and updates Connection / URL fields

### 8.3 Security and operations

- Call Gateway as the **user**; do not embed tenant-admin secrets in the extension
- Prefer connection name + env references in `.ampln`; Connect ID may live inside the URL or as non-secret metadata
- Disable or warn on **Stopped** sessions; prompt to start in Gateway if needed
- Short TTL cache on list; explicit **Refresh**
- Never commit live JWTs, real gateway hostnames, or raw connect IDs from captures — use redacted fixtures only

### 8.4 Phased delivery

| Phase | Scope |
|-------|--------|
| **P0** | Document External + Connect ID; multi-session ⇒ multi-Connection or full URL (current behavior) |
| **P1** | Gateway client + Connection **Browse…** writing `SPARK_CONNECT_URL` |
| **P2** | Same Browse on Session; Input shortcut; My vs Shared grouping |
| **P3** | Optional deep-link **Create New** to Gateway; idle/stop status sync |

---

## 9. Decision summary

| Question | Recommendation |
|----------|----------------|
| Full Select Tenant Connect inside spark-sql-input? | **No** as the primary design |
| Optimize existing UI? | **Yes** — strengthen **Select Connection** + **Browse Gateway** on Connection/Session |
| Change Configuration → Connection? | **Yes** — primary place for session discovery and binding; Session can be enhanced in parallel; Input stays query-focused |

This matches Databricks / Airflow / dbt-style layering, preserves Amphi’s `connection: 'SparkConnect'` model and “full URL including Connect ID” runtime, and benefits **all** Spark components—not only Spark SQL Input.

---

## 10. Related reading

- [spark-sql-input-user-guideline.md](./spark-sql-input-user-guideline.md) — SparkConnect Connection card, multi-Connection switching, env vars
- [spark-sql-input-design.md](./spark-sql-input-design.md) §9 — Connection and credentials
- [examples/spark-sql-input.md](../examples/spark-sql-input.md) — Usage and auth presets
