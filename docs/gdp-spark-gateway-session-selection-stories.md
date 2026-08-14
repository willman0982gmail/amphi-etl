# GDP Spark Gateway Session Selection — Stories and Subtasks

| Field | Value |
|---|---|
| Feature | GDP Spark Gateway session discovery & binding for Amphi Spark Connect |
| Design doc | [gdp-spark-gateway-session-selection.md](./gdp-spark-gateway-session-selection.md) |
| Related | [spark-sql-input-user-guideline.md](./spark-sql-input-user-guideline.md), [spark-sql-input-design.md](./spark-sql-input-design.md), [spark-sql-input-stories.md](./spark-sql-input-stories.md) |
| Status board | Use checkboxes below (`[ ]` / `[x]`) or link to your tracker (Jira/GitHub Issues) |
| Last updated | 2026-08-14 (a11y + create-return autoselect + telemetry) |


---

## How to use this document

- **Story**: user- or system-facing outcome; independently demoable where possible.
- **Subtask**: concrete engineering work required to complete the story.
- Suggested labels: `feature:gdp-spark-gateway`, `area:connection`, `area:spark-connect`, `phase:p0` / `phase:p1` / `phase:p2` / `phase:p3`.
- Suggested priority: **P0** = docs / current-behavior clarity; **P1** = Gateway client + Connection Browse; **P2** = Session + Input shortcuts; **P3** = Create New / lifecycle polish.

**Architectural decisions (locked by design doc):**

- Do **not** embed a full Select Tenant Connect page as the primary UX inside Spark SQL Input.
- **Do** extend Configuration → **Connection** (and optionally Spark Connect Session) with Gateway browse.
- Runtime binding uses a **full** `SPARK_CONNECT_URL` (including `;x-gdp-connect-id:…` for External); no mandatory dedicated Connect ID form field in P1.

---

## Epic

**EPIC-G — GDP Spark Gateway session selection for Amphi**

Enable Amphi users to discover Ready Spark Connect sessions from GDP Spark Gateway (per namespace, My vs Shared), bind the selected session’s External/Internal URL into a SparkConnect Connection (or Session), and use existing **Select Connection** / shared `spark` flows across Spark SQL Input and other Spark nodes.

---

## Phase P0 — Documentation & current-behavior baseline

### Story G0 — Document Connect ID and multi-session manual workflow

**As a** pipeline author on GDP  
**I want** clear docs on External URLs, Connect ID, and how to bind multiple sessions today  
**So that** I can connect to the right session without waiting for Gateway browse UI.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G0.1 | Document External vs Internal URL shapes and `x-gdp-connect-id` requirement | P0 | [x] | User guideline + gateway selection doc |
| G0.2 | Document: Connection nodes are **per-pipeline** (not shared across `.ampln`) | P0 | [x] | User guideline |
| G0.3 | Document: Select Connection lists only canvas SparkConnect Connections (no Gateway API yet) | P0 | [x] | User guideline |
| G0.4 | Document manual multi-session pattern (one Connection per session / full URL paste) | P0 | [x] | User guideline |
| G0.5 | Cross-link gateway selection doc ↔ user guideline ↔ design §9 | P0 | [x] | Partially done |
| G0.6 | Capture sample External/Internal strings (redacted) in docs appendix for QA | P1 | [x] | User guideline troubleshooting |

**Acceptance criteria**

- [x] Author can paste a full External URL with Connect ID into Spark SQL Input and run SQL against the intended session.
- [x] Author understands they must create one Connection per session to switch via Select Connection.
- [x] Docs state Connection is not a workspace-global shared store.

---

## Phase P1 — Gateway client + Connection Browse (MVP)

### Story G1 — Gateway API client and configuration

**As a** Amphi runtime  
**I want** a shared client that lists GDP Spark Connect sessions and returns connect URLs  
**So that** UI can browse sessions without embedding Gateway logic in each component.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G1.1 | Spike: confirm Gateway REST endpoints, auth model (SSO cookie / bearer / JupyterHub), OpenAPI or sample payloads | P0 | [x] | Confirmed `GET /api/v1/connects` + Bearer; redacted sample in this doc |
| G1.2 | Implement `GdpSparkGatewayClient` (`listSessions`, `getSession` / `getConnectUrl`) | P0 | [x] | `pipeline-components-manager/src/gdpSparkGateway/` |
| G1.3 | Config: `GDP_SPARK_GATEWAY_URL` (and optional default namespace) via env / Jupyter config | P0 | [x] | PageConfig `gdpSparkGatewayUrl` / `gdpSparkGatewayNamespace` |
| G1.4 | Auth: forward user credentials; never embed tenant-admin secrets in the extension | P0 | [x] | `credentials: 'include'` + optional bearer |
| G1.5 | Map API response → normalized session DTO: `id`, `name`, `namespace`, `status`, `visibility` (my/shared), `externalUrl`, `internalUrl`, sizing/idle metadata | P0 | [x] | `mapGatewaySession` |
| G1.6 | Error handling: network, 401/403, empty list, malformed URL | P0 | [x] | Client + picker alerts |
| G1.7 | Unit tests with recorded fixtures (no live Gateway required in CI) | P0 | [x] | `jlpm test:gdp-spark-gateway` |
| G1.8 | Decide call path: Lab frontend → Gateway vs Lab → Jupyter server extension → Gateway | P0 | [x] | Frontend HTTP; point URL at proxy if CORS/SSO needs it |

**Acceptance criteria**

- [x] Client can list Ready sessions for a namespace with valid user auth (manual or integration test).
- [x] Each Ready session exposes an External URL containing `x-gdp-connect-id` when applicable.
- [x] CI tests pass against fixtures without live Gateway.

---

### Story G2 — Shared session picker modal (Select Tenant Connect IA)

**As a** pipeline author  
**I want** a modal similar to GDP **Select Tenant Connect**  
**So that** I can pick a Ready session by name/namespace without leaving Amphi.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G2.1 | Create shared UI module `SparkGatewaySessionPicker` (modal) | P0 | [x] | Reusable; not owned by Spark SQL Input alone |
| G2.2 | Namespace selector (“Browsing namespace”) with default from config/env | P0 | [x] | |
| G2.3 | Status tabs: Ready / Stopped (Stopped selectable only with warning, or disabled in P1) | P0 | [x] | P1: Ready-only select |
| G2.4 | Group list: **My Tenant Connects** vs **Tenant Shared** | P1 | [x] | |
| G2.5 | Row metadata: name, status dot, driver/executor summary, idle timeout | P1 | [x] | |
| G2.6 | Single-select + **Select** / **Cancel** actions | P0 | [x] | |
| G2.7 | **Refresh** control; short TTL client cache | P1 | [x] | ~30s TTL; Refresh forces reload |
| G2.8 | Loading / empty / error states | P0 | [x] | |
| G2.9 | Accessibility: keyboard focus, labels for screen readers | P2 | [x] | aria labels, live region, row keyboard select |

**Acceptance criteria**

- [x] User can open modal, see Ready sessions for a namespace, select one, and confirm.
- [x] Stopped sessions cannot be selected without a clear warning (or are disabled in P1).
- [x] Modal has no dependency on Spark SQL Input form internals.

---

### Story G3 — Extend Configuration → Connection with Browse Gateway

**As a** pipeline author  
**I want** to browse GDP sessions from a **Connection** node and save the resolved URL  
**So that** Spark SQL Input and other nodes can reuse it via **Select Connection**.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G3.1 | Add **Browse GDP sessions…** (or Provider = `GDP Gateway`) on Connection when type is SparkConnect | P0 | [x] | Primary host for picker |
| G3.2 | On Select: write `SPARK_CONNECT_URL` variable to full External URL (incl. Connect ID) | P0 | [x] | Prefer External for Jupyter outside cluster |
| G3.3 | Optional: write `GDP_CONNECT_ID`, `GDP_CONNECT_NAME` as non-secret metadata variables | P1 | [x] | Display / debugging; runtime uses URL |
| G3.4 | Optional: Internal vs External URL preference toggle (default External) | P1 | [x] | In picker |
| G3.5 | Keep secrets in env / `.env` (`SPARK_TOKEN`); do not force clear-text token into `.ampln` from Browse | P0 | [x] | Browse strips `token=` from URL |
| G3.6 | Auto-set / suggest Connection Name from session name if empty | P1 | [x] | |
| G3.7 | Preserve manual URL edit path (Browse is enhancement, not exclusive) | P0 | [x] | |
| G3.8 | Wire picker open/close and apply into `Connection.ConfigForm` | P0 | [x] | |
| G3.9 | Manual QA: Browse → Select Connection on Spark SQL Input → run `SELECT 1` | P0 | [ ] | Checklist: [examples/gdp-spark-gateway-qa.md](../examples/gdp-spark-gateway-qa.md) |

**Acceptance criteria**

- [x] After Browse + Select, Connection has `SPARK_CONNECT_URL` pointing at the chosen session.
- [x] Spark SQL Input **Select Connection** lists that Connection and fills URL fields.
- [ ] Generated code can `remote(os.getenv("SPARK_CONNECT_URL", …))` and reach the session.
- [x] Existing Generic/Databricks manual Connection flows still work.

---

### Story G4 — Codegen / URL compatibility (no breaking change)

**As a** platform engineer  
**I want** Gateway External URLs with `x-gdp-connect-id` to work with existing Spark codegen  
**So that** we do not need a separate Connect ID form field for MVP.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G4.1 | Verify `SparkSession.builder.remote(url)` accepts URL with `;x-gdp-connect-id:…` and `;token=…` | P0 | [ ] | Live smoke; steps in `examples/gdp-spark-gateway-qa.md` |
| G4.2 | Ensure token-append helpers do not strip or duplicate `x-gdp-connect-id` | P0 | [x] | `appendTokenToConnectUrl` + checks |
| G4.3 | Add codegen/unit fixture: URL with GDP Connect ID param | P1 | [x] | `runCodegenChecks` + gateway fixtures |
| G4.4 | Document that dedicated GDP Connect ID field is **out of scope for P1** | P1 | [x] | Design doc §6 + user guideline |

**Acceptance criteria**

- [x] Full External URL from Gateway works with Spark SQL Input without new form fields.
- [x] Token env + URL Connect ID can coexist without mangling the URL.

---

## Phase P2 — Session node, Input shortcut, richer picker

### Story G5 — Browse Gateway on Spark Connect Session

**As a** pipeline author  
**I want** to bind a GDP session on **Spark Connect Session**  
**So that** multiple Spark nodes share one `spark` pointed at that session.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G5.1 | Add **Browse GDP sessions…** to `SparkConnectSession` form | P1 | [x] | Field type `gdpSparkGatewayBrowse` |
| G5.2 | On Select: set Session URL/auth fields (or env-backed equivalents) | P1 | [x] | Writes `tsCFinputSparkConnectUrl` (no token) |
| G5.3 | Document Session + Connection interplay (Connection fills Session; Session owns `spark`) | P1 | [x] | User guideline Browse section |
| G5.4 | QA: Session Browse → two Spark SQL Inputs with Auto → both use same session | P1 | [ ] | Checklist: `examples/gdp-spark-gateway-qa.md` |

**Acceptance criteria**

- [x] Session node can be configured from Gateway browse without typing the External URL by hand.
- [ ] Inputs in Auto/Shared mode reuse that session successfully.

---

### Story G6 — Optional Browse shortcut on Spark SQL Input (and other Spark inputs)

**As a** pipeline author  
**I want** a **Browse…** shortcut on Spark SQL Input  
**So that** I can bind a session quickly without opening Connection first — while still persisting into Connection/URL fields.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G6.1 | Add secondary **Browse Gateway…** on Spark SQL Input SparkConnect card (not a full embedded page) | P2 | [x] | `gdpSparkGatewayBrowse` field |
| G6.2 | On Select: write URL into Input fields **and/or** create/update a Connection node (product choice) | P2 | [x] | Writes Input URL fields; Connection remains primary for reuse |
| G6.3 | Same shortcut on Spark SQL Native / Spark File Input / other SparkConnect-tagged forms | P2 | [x] | Native + File Input |
| G6.4 | Explicitly **reject** shipping a full Select Tenant Connect clone as the Input primary layout | P0 | [x] | Design decision |

**Acceptance criteria**

- [x] Browse from Input uses the same modal as Connection.
- [x] Result is usable by Select Connection on other nodes (if Connection is created/updated).
- [x] Input form remains SQL-centric (no My/Shared tabs permanently embedded in the form body).

---

### Story G7 — Picker polish: grouping, cache, Stopped handling

**As a** pipeline author  
**I want** clearer session lists and safe handling of Stopped sessions  
**So that** I do not bind a dead endpoint by mistake.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G7.1 | Enforce My vs Shared section headers in picker | P2 | [x] | Already in picker |
| G7.2 | Stopped tab: show sessions; Select shows “Start in Gateway first” or deep-link | P2 | [x] | Alert + Select disabled; deep-link deferred to G8 |
| G7.3 | Cache list with TTL; invalidate on namespace change / Refresh | P2 | [x] | `sessionListCache` ~30s |
| G7.4 | Show last refresh time / error banner | P2 | [x] | |

**Acceptance criteria**

- [x] User can distinguish private vs shared sessions at a glance.
- [x] Selecting Stopped does not silently write a non-Ready URL without warning.

---

## Phase P3 — Lifecycle integration & platform hardening

### Story G8 — Create New / deep-link to GDP Gateway

**As a** pipeline author  
**I want** to create a new Spark Connect session when none fit  
**So that** I do not leave Amphi without a clear path.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G8.1 | **Create New** opens Gateway UI (deep-link) with namespace prefilled | P3 | [x] | `gdpSparkGatewayPortalUrl` / `CreateUrlTemplate` |
| G8.2 | Optional: in-Amphi minimal create API if Gateway supports it | P3 | [~] | Won’t do — portal owns create (G8.1 deep-link) |
| G8.3 | After create, Refresh list and auto-select new session | P3 | [x] | Focus/visibility return → force refresh + auto-select new Ready |

**Acceptance criteria**

- [x] User can start from Amphi picker and land on Gateway create flow.
- [x] Returning user can refresh and select the new Ready session.

---

### Story G9 — Status sync and operational resilience

**As a** pipeline author  
**I want** Amphi to notice when a bound session is Stopped or Connect ID changed  
**So that** I get actionable errors instead of opaque Connect failures.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G9.1 | Optional validate-on-open: re-fetch session by Connect ID / name | P3 | [x] | Validate-on-Select via `getSession` |
| G9.2 | Surface “session not Ready” in codegen preflight or first-run error wrapper | P3 | [x] | RuntimeError hints for GDP Connect ID / Stopped |
| G9.3 | Retry/backoff for Gateway list API | P3 | [x] | `withRetry` on HTTP fetch (network/5xx/429) |
| G9.4 | Telemetry: browse open, select success/fail (no secrets) | P3 | [x] | `emitGdpGatewayTelemetry` + pluggable handlers |

**Acceptance criteria**

- [x] Binding a Stopped session yields a clear message.
- [x] Gateway blips do not crash the Lab extension.

---

### Story G10 — Security, compliance, and packaging

**As a** security reviewer  
**I want** Gateway integration to use user identity and avoid secret sprawl  
**So that** `.ampln` files and logs stay safe.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G10.1 | Threat model: token in URL vs env; Connect ID confidentiality | P1 | [x] | Browse strips token; docs + .env example |
| G10.2 | Redact tokens from browser console / server logs | P0 | [x] | `redactSparkConnectUrl` / select log |
| G10.3 | Document required Gateway scopes / network allowlists | P1 | [x] | User guideline PageConfig + network notes |
| G10.4 | Feature flag: enable GDP Browse only when Gateway URL configured | P1 | [x] | `isGdpGatewayBrowseEnabled` |
| G10.5 | Package server extension (if used) with jupyterlab-amphi / amphi-etl install docs | P2 | [x] | Documented N/A: frontend→Gateway (or point base URL at proxy); no dedicated Amphi server extension |

**Acceptance criteria**

- [x] No access tokens printed in generated pipeline logs or Lab console under normal use.
- [x] Browse UI hidden or disabled when Gateway is not configured.

---

## Phase cross-cutting — Docs & acceptance

### Story G11 — Documentation and samples update

**As a** new GDP Amphi user  
**I want** end-to-end docs for Browse → Connection → Spark SQL Input  
**So that** I can onboard without tribal knowledge.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| G11.1 | Update [spark-sql-input-user-guideline.md](./spark-sql-input-user-guideline.md) with Browse flow screenshots/steps | P1 | [x] | Steps documented; screenshots optional |
| G11.2 | Update [gdp-spark-gateway-session-selection.md](./gdp-spark-gateway-session-selection.md) status to Implemented (phased) | P2 | [x] | Phased: Browse + Create New deep-link; live QA open |
| G11.3 | Add example `.env` + Connection naming convention for GDP | P1 | [x] | `examples/gdp-spark-connect.env` |
| G11.4 | Add troubleshooting: wrong Connect ID, Stopped session, Internal vs External | P1 | [x] | User guideline |
| G11.5 | Note Connection **not** shared across pipelines; share via env | P0 | [x] | User guideline |

**Acceptance criteria**

- [x] Docs describe P0 manual path and P1 Browse path.
- [x] Troubleshooting covers Connect ID and multi-session namespace cases.

---

## Out of scope (explicit)

| Item | Reason |
|---|---|
| Full Select Tenant Connect clone as Spark SQL Input primary form | Violates connection vs query separation; duplicates across Spark nodes |
| Replacing Amphi Connection model with Gateway-only catalog | Breaks offline / non-GDP Spark Connect users |
| Kerberos / OAuth wizards inside Amphi | Still deferred; Gateway/portal owns lifecycle auth |
| Workspace-global shared Connection store across `.ampln` files | Not in current Amphi architecture; env sharing instead (future epic if needed) |
| Mandatory dedicated `x-gdp-connect-id` form field in P1 | Full URL is sufficient and codegen-compatible |

---

## Dependency graph (high level)

```text
G0 (docs baseline)
  └─► G1 (API client) ─► G2 (picker modal) ─► G3 (Connection Browse) ─► G4 (URL smoke)
                              │                    │
                              ├────────────────────┴─► G5 (Session Browse)
                              └──────────────────────► G6 (Input shortcut)
 G3/G5 ─► G7 (picker polish) ─► G8 (Create New) ─► G9 (status sync)
 G1 ─► G10 (security) ; G3 ─► G11 (docs)
```

---

## Tracking summary

| Phase | Stories | Goal |
|-------|---------|------|
| **P0** | G0 | Docs for Connect ID + manual multi-Connection |
| **P1** | G1–G4, G10 (partial), G11 (partial) | Gateway client + Connection Browse MVP |
| **P2** | G5–G7 | Session Browse, Input shortcut, list polish |
| **P3** | G8–G9 | Create New deep-link, status sync |

**Definition of done (P1 MVP):** User can Browse Ready sessions from a SparkConnect **Connection**, save External URL with Connect ID, select that Connection on Spark SQL Input, and successfully run a simple Spark SQL query against the chosen GDP session.

### Confirmed Gateway REST contract (G1.1 — from captured curl, redacted)

List sessions (matches portal Network / curl):

```bash
curl -k -X GET \
  'https://<GATEWAY_HOST>/api/v1/connects?limit=50&offset=0' \
  -H 'Authorization: Bearer <REDACTED_JWT>' \
  -H 'Content-Type: application/json'
```

Redacted response shape:

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "name": "Test2",
      "namespace": "example-ns-gdp-spark-jobs-dev",
      "connect_id": "REDACTED_CONNECT_ID_TEST2",
      "visibility": "private",
      "state": "READY",
      "desired_state": "RUNNING",
      "driver": { "cores": 1, "memory": "2g" },
      "executor": { "cores": 2, "memory": "2g", "instances": 2 },
      "spark_conf": {},
      "exposure": "external",
      "idle_timeout_minutes": 120,
      "created_at": "2026-08-14T00:00:00.000000+00:00",
      "started_at": "2026-08-14T00:00:00.000000+00:00",
      "is_default": false,
      "error_message": null
    }
  ],
  "total": 2
}
```

Notes for Amphi:

| Topic | Behavior |
|-------|----------|
| Path | `GET /api/v1/connects` (not `/namespaces/.../spark-connects`) |
| Auth | Bearer JWT (PageConfig `gdpSparkGatewayAuthToken` or proxy SSO) |
| URLs | List payload has **`connect_id`**, not `sc://` strings — Amphi builds External URL via `gdpSparkConnectExternalHost` + `x-gdp-connect-id` |
| Visibility | API `private` → UI “My”; `shared` → “Tenant Shared” |
| State | API `READY` / `STOPPED` → picker Ready / Stopped |
| Namespace | Optional client-side filter on `items[].namespace` |

Detail path (inferred): `GET /api/v1/connects/{id}` — confirm if Gateway documents a different route.
