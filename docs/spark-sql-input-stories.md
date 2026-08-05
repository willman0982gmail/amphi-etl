# Spark SQL Input — Stories and Subtasks

| Field | Value |
|---|---|
| Feature | Spark SQL Input (Spark Connect) |
| Design doc | [spark-sql-input-design.md](./spark-sql-input-design.md) |
| Status board | Use checkboxes below (`[ ]` / `[x]`) or link to your tracker (Jira/GitHub Issues) |
| Last updated | 2026-08-06 (S68 Checkpoint + registration cleanup) |

---

## How to use this document

- **Story**: user- or system-facing outcome; independently demoable where possible.
- **Subtask**: concrete engineering work required to complete the story.
- Suggested labels: `feature:spark-sql-input`, `area:components-core`, `phase:v1` / `phase:v2`.
- Suggested priority: P0 = v1 launch blockers; P1 = v1 polish; P2 = post-v1.

---

## Epic

**EPIC-1 — Spark SQL Input for Amphi**

Enable Amphi users to execute Spark SQL via Spark Connect and continue processing results in the existing pandas-based pipeline.

---

## Phase v1 (launch)

### Story S1 — Component scaffold and palette registration

**As a** pipeline author  
**I want** a **Spark SQL Input** component in the Amphi palette  
**So that** I can add Spark-backed data sources to a pipeline.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S1.1 | Create directory `inputs/spark/` under `pipeline-components-core` | P0 | [x] | |
| S1.2 | Implement `SparkSqlInput` class extending `BaseCoreComponent` with id `sparkSqlInput`, type `pandas_df_input`, category `inputs.Spark` | P0 | [x] | |
| S1.3 | Add default config object per design doc | P0 | [x] | |
| S1.4 | Add SVG icon and register in `icons.ts` | P0 | [x] | `spark-sql-input.svg` |
| S1.5 | Export from `components/index.ts` | P0 | [x] | |
| S1.6 | Register via `componentService.addComponent(SparkSqlInput.getInstance())` in `src/index.ts` | P0 | [x] | Place with other Inputs |
| S1.7 | Rebuild `@amphi/pipeline-components-core` / `jupyterlab-amphi` and verify component appears in UI | P0 | [x] | Built/installed into amphi_venv; `sparkSqlInput` present in labextension static; UI drag smoke still manual |

**Acceptance criteria**

- [x] Component visible under Inputs → Spark (or equivalent category rendering).
- [ ] Dragging onto canvas creates a node with expected title and icon. (manual)
- [x] No console errors on activation. (labextensions OK)

---

### Story S2 — Connection and authentication form (URL + optional token)

**As a** pipeline author  
**I want** to configure a Spark Connect URL and optional token  
**So that** I can reach my cluster securely without hardcoding secrets when using env/Connection.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S2.1 | Add form fields: Connect URL, auth method radio (`none`/`token`), token (password), app name | P0 | [x] | |
| S2.2 | Tag credential fields with `connection: "SparkConnect"` | P0 | [x] | |
| S2.3 | Wire defaults and conditional visibility (token only when auth=token) | P0 | [x] | |
| S2.4 | Add tooltips for URL format (`sc://host:port`) and env var names | P1 | [x] | |
| S2.5 | (Optional) Extend `Connection` settings presets for SparkConnect | P1 | [x] | Documented SparkConnect keys in Connection description (free-form; no dedicated preset UI) |
| S2.6 | Ensure generated code reads `SPARK_CONNECT_URL` / `SPARK_TOKEN` via `os.getenv` when env/Connection path is used | P0 | [x] | Always uses os.getenv with form fallbacks |

**Acceptance criteria**

- [x] User can save URL-only config.
- [x] User can save token auth config without token appearing in unrelated UI logs.
- [x] Connection-tagged fields work with existing Connection node mapping (if enabled in product).

---

### Story S3 — SQL query and table shortcut UX

**As a** pipeline author  
**I want** to run either a custom Spark SQL statement or a simple table read  
**So that** I can prototype quickly and still write full SQL when needed.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S3.1 | Add query method radio: `query` \| `table` | P0 | [x] | Default `query` |
| S3.2 | Add SQL `codeTextarea` (`mode: "sql"`) for query mode | P0 | [x] | Parse `{code}` JSON like DB inputs |
| S3.3 | Add table name input for table mode (`catalog.schema.table` supported) | P0 | [x] | |
| S3.4 | Implement identifier validation helper (reject empty / `;` multi-statement / illegal chars) | P0 | [x] | `isValidTableIdentifier` / `quoteTableIdentifier` |
| S3.5 | Table mode codegen: `SELECT * FROM <validated_identifier>` | P0 | [x] | |
| S3.6 | SQL placeholder example including `LIMIT` | P1 | [x] | |
| S3.7 | Explicitly **not** implementing live table browser in v1 | P2 | [x] | Deferred (see S10) |

**Acceptance criteria**

- [x] Query mode generates `spark.sql("""...""")` with user SQL.
- [x] Table mode generates a single SELECT from the provided name.
- [x] Invalid table identifiers fail at codegen or with a clear runtime/validation message.

---

### Story S4 — PySpark code generation (Connect session + SQL + pandas)

**As a** pipeline runtime  
**I want** generated PySpark that uses Spark Connect and returns a pandas DataFrame  
**So that** downstream Amphi nodes execute unchanged.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S4.1 | Implement `provideImports` (`SparkSession`, `os`) | P0 | [x] | |
| S4.2 | Implement `provideDependencies` (`pyspark`) | P0 | [x] | Emits `pyspark[connect]` |
| S4.3 | Implement `generateComponentCode`: `builder.remote(url).getOrCreate()` | P0 | [x] | |
| S4.4 | Apply auth/token builder config block (version-confirmed API) | P0 | [x] | Token/userpass via Connect URL params (`/;token=`, `user_id=`) |
| S4.5 | Emit `spark.sql(...)` from query or table path | P0 | [x] | |
| S4.6 | Apply `.limit(max_rows)` when max rows > 0 | P0 | [x] | |
| S4.7 | Convert with `.toPandas().convert_dtypes()` into `outputName` | P0 | [x] | |
| S4.8 | Codegen snapshot / golden-string tests (if test harness exists) or checklist review | P1 | [x] | `jlpm test:spark-sql` / `runCodegenChecks.ts` |

**Acceptance criteria**

- [ ] Generated code runs in a notebook/kernel with PySpark Connect client installed against a live endpoint. (manual Connect)
- [x] Output variable is a pandas DataFrame usable by Filter / CSV Output. (codegen contract)
- [x] Session uses `getOrCreate()` (reuse within same kernel/remote).

---

### Story S5 — Memory / scale guards

**As a** pipeline author  
**I want** a Max rows control and clear warnings  
**So that** I am less likely to OOM the Jupyter client with `toPandas()`.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S5.1 | Add `tsCFinputMaxRows` field (default `10000`) | P0 | [x] | |
| S5.2 | Tooltip explaining client-side collection risk | P0 | [x] | |
| S5.3 | Always apply limit in table mode | P0 | [x] | Via shared max-rows limit() |
| S5.4 | Apply limit in query mode after `spark.sql` | P0 | [x] | |
| S5.5 | Component description mentions pandas conversion and Connect prerequisite | P1 | [x] | |

**Acceptance criteria**

- [x] Warning text visible in form without digging into docs.
- [ ] With Max rows = 5, collected frame has ≤ 5 rows for a larger source table. (live Connect)

---

### Story S6 — Documentation and developer notes

**As a** developer or advanced user  
**I want** clear docs for setup and limitations  
**So that** I can configure Spark Connect and understand v1 boundaries.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S6.1 | Keep `docs/spark-sql-input-design.md` updated when implementation drifts | P1 | [x] | |
| S6.2 | Add short usage section (Connect URL, deps, sample pipeline) — either in design doc appendix or `examples/` | P1 | [x] | `examples/spark-sql-input.md` |
| S6.3 | Document PySpark version alignment (client ≈ server, prefer 3.5+) | P1 | [x] | |
| S6.4 | Document non-goals (no local[*], no Spark DF lineage in v1) | P1 | [x] | |

**Acceptance criteria**

- [x] A new contributor can set up a minimal test using only the docs.

---

### Story S7 — Verification, QA, and release readiness

**As a** release owner  
**I want** smoke tests and a build/install path  
**So that** Spark SQL Input can ship with `jupyterlab-amphi`.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S7.1 | Manual matrix: URL only / token / bad URL / bad SQL / max rows / downstream transform | P0 | [x] | Codegen matrix + `examples/spark-connect-smoke.py` (live when URL set) |
| S7.2 | Confirm `provideDependencies` triggers install of `pyspark` in Amphi’s dependency flow | P0 | [x] | Emits `pyspark[connect]` |
| S7.3 | Build prod extension and install into target venv | P0 | [x] | amphi_venv JL 4.5.9; labextensions OK |
| S7.4 | Regression: existing Database Input / Connection unaffected | P1 | [x] | Connection description extended only; Database Input untouched |
| S7.5 | Changelog / release note blurb for next Amphi version | P1 | [x] | `CHANGELOG.md` Unreleased |

**Acceptance criteria**

- [ ] All P0 QA cases pass on at least one Spark Connect environment. (run `examples/spark-connect-smoke.py` when URL available)
- [x] Extension list remains healthy on supported JupyterLab.
- [x] Offline codegen matrix + smoke harness shipped.

---

## Phase v1.1 (hardening)

### Story S8 — Additional authentication methods

**As a** enterprise user  
**I want** username/password (or platform-required auth)  
**So that** I can connect to secured Connect gateways beyond token-only setups.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S8.1 | Confirm target platforms’ Connect auth mechanisms | P2 | [x] | Spike: OSS Connect often open or token/URL-param; gateways use `user_id`+`token`; Kerberos/Databricks OAuth deferred to S13 |
| S8.2 | Extend auth radio: `userpass` (and form fields) | P2 | [x] | Username + Password fields |
| S8.3 | Env vars for user/password; codegen without plaintext defaults in repo samples | P2 | [x] | `SPARK_USER` / `SPARK_PASSWORD`; docs samples empty |
| S8.4 | Security review of secret handling in `.ampln` | P2 | [x] | Documented: prefer Env/Connection; form secrets persist in pipeline JSON |

---

### Story S9 — SQL safety and ergonomics polish

**As a** pipeline author  
**I want** safer defaults around multi-statement SQL and LIMIT interaction  
**So that** generated jobs behave predictably.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S9.1 | Detect/reject multiple SQL statements | P2 | [x] | `hasMultipleSqlStatements` |
| S9.2 | Smarter LIMIT policy (min of SQL LIMIT vs Max rows) | P2 | [x] | `resolveEffectiveMaxRows` |
| S9.3 | Better error messages wrapping Connect failures | P2 | [x] | RuntimeError wrapper in codegen |

---

## Phase v2 (platform expansion)

### Story S10 — Catalog / table browser

**As a** analyst  
**I want** to browse catalogs/schemas/tables over Connect  
**So that** I do not need to memorize fully qualified names.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S10.1 | Spike: metadata APIs available via Spark Connect for target Spark versions | P2 | [x] | See design §18.5 — prefer SHOW CATALOGS/NAMESPACES/TABLES |
| S10.2 | Design UI for catalog → schema → table | P2 | [x] | See design §18.6 sketch |
| S10.3 | Implement discovery queries + caching | P2 | [x] | SQL helpers + Retrieve UI path |
| S10.4 | Integrate with table mode field | P2 | [x] | `sparkTable` form + catalog/schema + `retrieveSparkTableList` |

---

### Story S11 — Shared Spark Session settings node

**As a** pipeline author  
**I want** one shared Spark Connect session for multiple SQL inputs  
**So that** I configure auth once and reuse it.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S11.1 | Design settings component `SparkConnectSession` | P2 | [x] | Design §18.7 — type `spark_session`, one per pipeline |
| S11.2 | Codegen: define global `spark` once; inputs reference it | P2 | [x] | Component + CodeGenerator/Dagster hooks; Auto/Shared/Local mode |
| S11.3 | Migration path from per-node `getOrCreate()` | P2 | [x] | Default Auto; existing pipelines unchanged without Session node |
| S11.4 | Optional session stop / cleanup guidance | P2 | [x] | No auto-stop; docs + component description |

---

### Story S12 — Optional Spark DataFrame output and Spark component family

**As a** data engineer  
**I want** to keep data on Spark without collecting to pandas  
**So that** I can build larger Spark-native pipelines in Amphi.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S12.1 | Decide component type model for Spark DF (`spark_df_input` or flag) | P2 | [x] | Design §18.9 — new `spark_df_*` types; no pandas flag |
| S12.2 | Optional skip `toPandas` in Spark SQL Input | P2 | [x] | Sibling `SparkSqlNativeInput` (`spark_df_input`); display via `.show(20)` |
| S12.3 | Minimal Spark transform (e.g. SQL transform) and/or Spark write output | P2 | [x] | `SparkSqlTransform` + `SparkParquetOutput` (`sparkFileOutput`) |
| S12.4 | Metadata panel support for Spark DF inspection | P2 | [x] | Run-until uses `.show(20)` for `spark_df_*` |

---

### Story S13 — Cloud / vendor presets (e.g. Databricks)

**As a** cloud user  
**I want** guided Connect URL / auth presets  
**So that** vendor-specific endpoints are easier to configure.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S13.1 | Research Databricks Connect / Spark Connect URL patterns used by customers | P2 | [x] | Design §18.10 — `sc://ws:443/;token=;x-databricks-cluster-id=` |
| S13.2 | Add provider preset dropdown (Generic / Databricks / …) | P2 | [x] | Provider radio + cluster id; `SPARK_REMOTE` / `DATABRICKS_CLUSTER_ID` |
| S13.3 | Docs for each preset | P2 | [x] | `examples/spark-sql-input.md` + design §18.10 |

---

### Story S14 — Spark ↔ pandas bridge and table write (v2.1)

**As a** data engineer  
**I want** to collect Spark results to pandas and write tables back to the catalog  
**So that** I can mix Spark-native steps with existing Amphi pandas components.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S14.1 | `SparkToPandas` bridge (`spark_df_to_pandas_processor`) | P2 | [x] | Max rows + toPandas |
| S14.2 | Connection rules: spark → bridge → pandas | P2 | [x] | pipeline-editor + CodeGenerator display |
| S14.3 | `SparkTableOutput` saveAsTable / insertInto | P2 | [x] | `spark_df_output` |
| S14.4 | Catalog/Schema Retrieve (SHOW CATALOGS / NAMESPACES) | P2 | [x] | sparkTable fields on inputs |
| S14.5 | Operator runbook | P2 | [x] | `examples/spark-connect-runbook.md` |
| S14.6 | `PandasToSpark` reverse bridge | P2 | [x] | Requires active `spark` session |

---

### Story S15 — Hardening, samples, and operator tooling

**As a** developer / operator  
**I want** sample pipelines, a live smoke harness, clearer Connection presets, and session cleanup  
**So that** Spark SQL Input is easier to verify and operate without tribal knowledge.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S15.1 | Live Connect smoke script (`examples/spark-connect-smoke.py`) | P1 | [x] | Exit 2 if no URL; 0/1 on run |
| S15.2 | Sample `.ampln` pipeline | P1 | [x] | `examples/pipelines/spark-sql-sample.ampln` |
| S15.3 | Connection `connectionVariableName` → `SPARK_*` labels | P1 | [x] | Selecting SparkConnect prefills env-style names |
| S15.4 | `SparkSessionStop` settings node | P2 | [x] | Emitted after pipeline code; confirm gate |
| S15.5 | Distinct icons (session / bridge) | P2 | [x] | |
| S15.6 | Docs link smoke + sample from usage/runbook | P1 | [x] | |

---

### Story S16 — Native/output form parity and write polish

**As a** pipeline author  
**I want** Native Input Connection keys and catalog Retrieve to match pandas Spark SQL Input, plus safer CSV writes and tested session-stop codegen  
**So that** Spark-native pipelines are as operable as the pandas path.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S16.1 | Native Input `connectionVariableName` + form/tooltips parity | P1 | [x] | Align with `SparkSqlInput` |
| S16.2 | Spark File Output CSV header option + pure codegen | P1 | [x] | `generateSparkFileOutputCode` |
| S16.3 | Session stop pure codegen + golden checks | P1 | [x] | `generateSparkSessionStopCode` |
| S16.4 | Spark Table Output catalog Retrieve (`sparkTable` fields) | P1 | [x] | Uses Session / env probe |
| S16.5 | Native sample `.ampln` (session → native → transform → file) | P1 | [x] | `examples/pipelines/spark-native-sample.ampln` |

**Acceptance criteria**

- [x] Offline codegen checks cover file CSV header and session stop.
- [x] Native sample pipeline JSON is valid.
- [ ] Manual open of native sample in editor. (optional UI)

---

### Story S17 — Transform hardening and partitioned writes

**As a** data engineer  
**I want** clearer Spark SQL Transform failures and optional `partitionBy` on file writes  
**So that** native Spark pipelines are safer to operate and write partitioned datasets.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S17.1 | Extract `generateSparkSqlTransformCode` + session/SQL error wrappers | P1 | [x] | |
| S17.2 | Spark File Output `partitionBy` (comma-separated columns) | P1 | [x] | Advanced field |
| S17.3 | Golden checks for transform + partitionBy | P1 | [x] | |

**Acceptance criteria**

- [x] Transform throws at codegen for bad view name / empty / multi-SQL.
- [x] File output emits `.partitionBy(...)` when configured.

---

### Story S18 — Dagster export parity for Spark session stop

**As a** Dagster user  
**I want** Spark Session Stop to appear in Dagster-exported code the same way as local runs  
**So that** optional `spark.stop()` cleanup is not dropped on export.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S18.1 | `BaseCodeGenerator.getSparkSessionStopCode` | P1 | [x] | |
| S18.2 | Append stop code in `CodeGeneratorDagster` after job defs | P1 | [x] | Mirrors local CodeGenerator order |

**Acceptance criteria**

- [x] Dagster export includes session-stop codegen when a stop node is present.

---

### Story S19 — Bridge sample pipeline and richer live smoke

**As a** developer / operator  
**I want** a mixed Spark↔pandas sample pipeline and a stronger Connect smoke script  
**So that** bridge flows and catalog/write paths are easier to verify.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S19.1 | Bridge sample `.ampln` | P1 | [x] | `examples/pipelines/spark-bridge-sample.ampln` |
| S19.2 | Smoke: SHOW NAMESPACES + temp-view transform + parquet write | P1 | [x] | Write best-effort / warn |
| S19.3 | Link samples from README / runbook | P1 | [x] | |

**Acceptance criteria**

- [x] Bridge sample JSON validates.
- [x] Smoke still exits 2 without URL; richer checks when URL is set.

---

### Story S20 — Docs sync for shipped Spark family

**As a** new contributor  
**I want** usage/design docs to match the shipped Spark Connect component family  
**So that** I do not follow outdated “v1 does not support catalog / Spark DF” guidance.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S20.1 | Refresh `examples/spark-sql-input.md` samples + limits | P1 | [x] | |
| S20.2 | Design revision note: catalog Retrieve implemented | P2 | [x] | |

**Acceptance criteria**

- [x] Usage guide lists native / bridge / file / table / session stop and sample `.ampln` files.

---

### Story S21 — Catalog Retrieve cache + native Limit / DropDuplicates

**As a** pipeline author  
**I want** catalog Retrieve results to stick across form opens, table picks to become fully qualified names, and simple Spark DF processors for limit/dedupe  
**So that** browsing catalogs is less chatty and native pipelines need less ad-hoc SQL for common ops.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S21.1 | In-memory Retrieve cache keyed by node + catalog/schema/query | P1 | [x] | `sparkCatalogCache.ts`; invalidate tables on scope change |
| S21.2 | Selecting a table composes `catalog.schema.table` when scoped | P1 | [x] | Design §18.6 |
| S21.3 | `SparkLimit` processor | P1 | [x] | `spark_df_processor` |
| S21.4 | `SparkDropDuplicates` processor | P1 | [x] | Optional subset columns |
| S21.5 | Golden / cache unit checks | P1 | [x] | `jlpm test:spark-sql` + `jlpm test:spark-catalog-cache` |

**Acceptance criteria**

- [x] Cache restores last Retrieve without a kernel round-trip until Refresh.
- [x] Limit / DropDuplicates codegen covered by offline checks.

---

### Story S22 — Spark Select Columns processor

**As a** data engineer  
**I want** a native column-projection node  
**So that** I can drop unused columns before writes or Spark→pandas without writing SQL.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S22.1 | `SparkSelectColumns` (`spark_df_processor`) | P1 | [x] | |
| S22.2 | Codegen + golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Empty / invalid column lists throw at codegen.
- [x] Emits `df.select("a", "b")`.

---

### Story S23 — Spark Filter processor

**As a** data engineer  
**I want** a native filter node with a SQL expression  
**So that** I can drop rows before writes or collects without a full Spark SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S23.1 | `SparkFilter` (`spark_df_processor`) | P1 | [x] | `df.filter("…")` |
| S23.2 | Reject empty / multi-statement expressions | P1 | [x] | |
| S23.3 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `.filter("expr")` with escaped quotes.
- [x] Semicolons / empty expr fail at codegen.

---

### Story S24 — Spark Order By processor

**As a** data engineer  
**I want** a native sort node  
**So that** I can order Spark DataFrames before Limit or writes without writing SQL.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S24.1 | `SparkOrderBy` (`spark_df_processor`) | P1 | [x] | asc / desc |
| S24.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Asc emits `orderBy("a", "b")`; desc uses `F.col(...).desc()`.

---

### Story S25 — Spark Repartition and Sample

**As a** data engineer  
**I want** native repartition/coalesce and sample nodes  
**So that** I can tune partitions and explore subsets without SQL.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S25.1 | `SparkRepartition` (repartition / coalesce) | P1 | [x] | Optional hash columns |
| S25.2 | `SparkSample` (fraction / replacement / seed) | P1 | [x] | |
| S25.3 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Invalid partition count / fraction throw at codegen.

---

### Story S26 — Spark With Column

**As a** data engineer  
**I want** to add/replace a column with a SQL expression  
**So that** light derived columns do not require a full SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S26.1 | `SparkWithColumn` via `F.expr` | P1 | [x] | |
| S26.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `withColumn` + `F.expr`; rejects empty / multi-statement expr.

---

### Story S27 — Deferred auth UX + native ops sample

**As a** operator  
**I want** OAuth/Kerberos called out as deferred (with clear codegen errors) and a sample using native processors  
**So that** unsupported auth is not silently misconfigured and ops chains are demoable.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S27.1 | Auth radio: OAuth / Kerberos deferred + info banner | P1 | [x] | Input / Native / Session |
| S27.2 | Codegen rejects oauth/kerberos with actionable message | P1 | [x] | |
| S27.3 | Docs section for Kerberos / OAuth workarounds | P1 | [x] | `examples/spark-sql-input.md` |
| S27.4 | Native ops sample `.ampln` | P1 | [x] | `spark-native-ops-sample.ampln` |

**Acceptance criteria**

- [x] Selecting deferred auth fails at codegen (not at runtime with opaque Connect errors).
- [x] Ops sample JSON validates.

---

### Story S28 — Spark Cache + richer live smoke ops chain

**As a** data engineer / operator  
**I want** cache/persist/unpersist on Spark DFs and a smoke path that exercises native ops  
**So that** repeated actions over Connect are cheaper to verify.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S28.1 | `SparkCache` processor | P1 | [x] | cache / persist / unpersist |
| S28.2 | Smoke: filter→withColumn→select→orderBy→limit | P1 | [x] | `examples/spark-connect-smoke.py` |
| S28.3 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Cache modes emit `.cache()` / `.persist(StorageLevel…)` / `.unpersist()`.
- [x] Smoke still exits 2 without URL.

---

### Story S29 — Spark Drop Columns and Distinct

**As a** data engineer  
**I want** drop-columns and distinct nodes  
**So that** schema cleanup does not require SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S29.1 | `SparkDropColumns` | P1 | [x] | |
| S29.2 | `SparkDistinct` | P1 | [x] | |
| S29.3 | Transform icon for new processors | P2 | [x] | `spark-transform.svg` |

**Acceptance criteria**

- [x] Golden checks for drop / distinct.

---

### Story S30 — Spark Join and Union (dual-input)

**As a** data engineer  
**I want** to join or union two Spark DataFrames on the canvas  
**So that** multi-source native pipelines are possible without leaving Amphi.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S30.1 | Type `spark_df_double_processor` in CodeGenerator + handles | P0 | [x] | BaseCodeGenerator + renderer + Dagster |
| S30.2 | `SparkJoin` | P1 | [x] | inner/left/right/outer/semi/anti/cross |
| S30.3 | `SparkUnion` | P1 | [x] | union / unionByName |
| S30.4 | Join/union sample `.ampln` | P1 | [x] | `spark-join-union-sample.ampln` |
| S30.5 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Dual handles `in1`/`in2` render for spark double processors.
- [x] Codegen emits join/union with two input names.

---

### Story S31 — Spark Aggregate (GroupBy)

**As a** data engineer  
**I want** a native group-by / aggregate node  
**So that** summaries do not require a full Spark SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S31.1 | `SparkAggregate` (`spark_df_processor`) | P1 | [x] | groupBy + F.agg; empty group-by → global agg |
| S31.2 | Aggregation DSL `op:column[:alias]` | P1 | [x] | Also `op:column as alias` |
| S31.3 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `groupBy(...).agg(F.sum(...).alias(...))` (or `.agg` alone).
- [x] Empty / unknown ops fail at codegen.

---

### Story S32 — Spark Rename Columns

**As a** data engineer  
**I want** to rename Spark columns without SQL  
**So that** schema cleanup stays on the canvas.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S32.1 | `SparkRenameColumns` | P1 | [x] | `old:new` mappings |
| S32.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits chained `withColumnRenamed`.
- [x] Identity / empty mappings fail at codegen.

---

### Story S33 — Spark Fill Na / Drop Na

**As a** data engineer  
**I want** fillna / dropna on Spark DFs  
**So that** null handling does not require SQL.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S33.1 | `SparkFillNa` (value / dropna any|all) | P1 | [x] | Optional column subset |
| S33.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Constant fill and dropna modes emit correct PySpark.

---

### Story S34 — Spark Cast

**As a** data engineer  
**I want** to cast columns to Spark SQL types  
**So that** type fixes stay native before writes or aggregates.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S34.1 | `SparkCast` (`column:type` mappings) | P1 | [x] | Includes `decimal(p,s)` |
| S34.2 | Sample `.ampln` (cast → fill → agg → rename) | P1 | [x] | `spark-agg-rename-sample.ampln` |
| S34.3 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `withColumn` + `cast`; rejects unknown types.
- [x] Sample JSON validates.

---

### Story S35 — Spark File Input

**As a** data engineer  
**I want** to read parquet/csv/json via Spark Connect  
**So that** native pipelines can start from cluster files without SQL.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S35.1 | `SparkFileInput` (`spark_df_input`) | P1 | [x] | parquet/csv/json + max rows |
| S35.2 | Shared / local session parity with native SQL input | P1 | [x] | |
| S35.3 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `spark.read.format(...).load(...)` with optional CSV header and limit.
- [x] Empty path / bad format fail at codegen.

---

### Story S36 — Spark Explode

**As a** data engineer  
**I want** to explode array/map columns on Spark DFs  
**So that** nested list data can be flattened without SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S36.1 | `SparkExplode` (explode / outer / posexplode) | P1 | [x] | Optional drop original |
| S36.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `select("*", F.explode(...))` (and variants).
- [x] Invalid column / mode fail at codegen.

---

### Story S37 — Spark Window

**As a** data engineer  
**I want** window functions (row_number, rank, lag, running agg)  
**So that** analytic rankings stay native without SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S37.1 | `SparkWindow` processor | P1 | [x] | partitionBy / orderBy + fn |
| S37.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `Window.partitionBy/orderBy` + `F.<fn>().over(_w)`.
- [x] Ranking / lag without order-by fail at codegen.

---

### Story S38 — Spark Pivot

**As a** data engineer  
**I want** a native pivot node  
**So that** wide tables can be built without SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S38.1 | `SparkPivot` (groupBy + pivot + agg) | P1 | [x] | Optional explicit pivot values |
| S38.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `groupBy(...).pivot(...).agg(F.sum(...))`.
- [x] Empty group-by fails at codegen.

---

### Story S39 — Spark Unpivot

**As a** data engineer  
**I want** to melt wide columns into variable/value rows  
**So that** unpivot does not require SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S39.1 | `SparkUnpivot` via `DataFrame.unpivot` | P1 | [x] | Spark 3.4+ |
| S39.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `.unpivot(ids, values, var, val)`.
- [x] Empty value columns fail at codegen.

---

### Story S40 — Spark Concat Columns

**As a** data engineer  
**I want** to concatenate columns with an optional separator  
**So that** derived string keys stay on the Spark path.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S40.1 | `SparkConcatColumns` (`concat` / `concat_ws`) | P1 | [x] | |
| S40.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.concat_ws` when separator set; else `F.concat`.
- [x] Fewer than two columns fails at codegen.

---

### Story S41 — Spark Generate ID

**As a** data engineer  
**I want** a row-id column on Spark DFs  
**So that** joins and window keys are easy to materialize.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S41.1 | `SparkGenerateId` (row_number / monotonically_increasing_id) | P1 | [x] | |
| S41.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Sequential mode emits `row_number` over `monotonically_increasing_id` order.
- [x] Mono mode emits `F.monotonically_increasing_id()`.

---

### Story S42 — Spark Coalesce

**As a** data engineer  
**I want** first-non-null across columns  
**So that** fallback fills stay native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S42.1 | `SparkCoalesce` | P1 | [x] | Optional drop sources |
| S42.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.coalesce(...)`.
- [x] Fewer than two columns fails at codegen.

---

### Story S43 — Spark When / Otherwise

**As a** data engineer  
**I want** conditional column assignment without SQL Transform  
**So that** simple case logic stays on the canvas.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S43.1 | `SparkWhen` (`F.when` / `otherwise`) | P1 | [x] | Condition/then/else as SQL expr |
| S43.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.when(F.expr(...), F.expr(...)).otherwise(...)`.
- [x] Empty condition / multi-statement fail at codegen.

---

### Story S44 — Spark String Replace

**As a** data engineer  
**I want** literal or regex string replace on Spark columns  
**So that** cleanup does not require SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S44.1 | `SparkStringReplace` via `regexp_replace` | P1 | [x] | Literal mode escapes pattern |
| S44.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.regexp_replace`; empty pattern fails at codegen.

---

### Story S45 — Spark Trim

**As a** data engineer  
**I want** trim / ltrim / rtrim on Spark string columns  
**So that** whitespace cleanup stays native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S45.1 | `SparkTrim` | P1 | [x] | Optional custom trim chars |
| S45.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.trim` / `F.ltrim` / `F.rtrim`.

---

### Story S46 — Spark Substring

**As a** data engineer  
**I want** substring extraction without SQL Transform  
**So that** key prefixes/suffixes are easy to derive.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S46.1 | `SparkSubstring` | P1 | [x] | Optional length → `substr` 2-arg |
| S46.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.substring` with length, or `F.expr("substr(...)")` without.
- [x] Position 0 fails at codegen.

---

### Story S47 — Spark Date Trunc

**As a** data engineer  
**I want** to truncate timestamps to day/month/…  
**So that** time bucketing does not require SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S47.1 | `SparkDateTrunc` | P1 | [x] | `F.date_trunc` |
| S47.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.date_trunc(unit, col)`; bad unit fails at codegen.

---

### Story S48 — Spark Set Op (Intersect / Except)

**As a** data engineer  
**I want** intersect / except of two Spark DataFrames  
**So that** set differences stay on the canvas beside Join/Union.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S48.1 | `SparkSetOp` (`spark_df_double_processor`) | P1 | [x] | intersect / except (+ All) |
| S48.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `intersect` / `intersectAll` / `except` / `exceptAll` with two inputs.

---

### Story S49 — Spark Date Format / Parse

**As a** data engineer  
**I want** to format or parse dates on Spark DFs  
**So that** string↔date conversions stay native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S49.1 | `SparkDateFormat` (date_format / to_date / to_timestamp) | P1 | [x] | |
| S49.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits the selected F.date_format / to_date / to_timestamp call.
- [x] Empty format fails at codegen.

---

### Story S50 — Spark Array Ops

**As a** data engineer  
**I want** size / contains / get on array columns  
**So that** nested list checks do not require SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S50.1 | `SparkArrayOps` | P1 | [x] | size / array_contains / index |
| S50.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.size` / `F.array_contains` / `col[i]`.

---

### Story S51 — Spark Case Fold

**As a** data engineer  
**I want** upper / lower / initcap  
**So that** case normalization stays on the canvas.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S51.1 | `SparkCaseFold` | P1 | [x] | |
| S51.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.upper` / `F.lower` / `F.initcap`.

---

### Story S52 — Spark Round

**As a** data engineer  
**I want** round / ceil / floor on numeric columns  
**So that** numeric cleanup stays native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S52.1 | `SparkRound` | P1 | [x] | round / bround / ceil / floor |
| S52.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits the selected rounding function.

---

### Story S53 — Spark Hash

**As a** data engineer  
**I want** md5 / sha2 / hash helpers  
**So that** anonymization keys are easy to materialize.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S53.1 | `SparkHash` | P1 | [x] | md5 / sha2 / hash / xxhash64 |
| S53.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] md5/sha2 require one column; hash accepts multiple.

---

### Story S54 — Spark Date Add

**As a** data engineer  
**I want** date_add / date_sub / add_months  
**So that** relative date shifts stay native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S54.1 | `SparkDateAdd` | P1 | [x] | |
| S54.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Emits `F.date_add` / `date_sub` / `add_months`.

---

### Story S55 — Spark Length

**As a** data engineer  
**I want** string length helpers  
**So that** length checks stay native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S55.1 | `SparkLength` | P1 | [x] | length / octet_length / bit_length |
| S55.2 | Golden checks | P1 | [x] | |

---

### Story S56 — Spark Split

**As a** data engineer  
**I want** to split strings into arrays  
**So that** tokenization stays on the canvas.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S56.1 | `SparkSplit` | P1 | [x] | Optional limit |
| S56.2 | Golden checks | P1 | [x] | |

---

### Story S57 — Spark Abs

**As a** data engineer  
**I want** abs / signum  
**So that** numeric sign cleanup stays native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S57.1 | `SparkAbs` | P1 | [x] | |
| S57.2 | Golden checks | P1 | [x] | |

---

### Story S58 — Spark Greatest / Least

**As a** data engineer  
**I want** row-wise greatest/least  
**So that** multi-column comparisons stay native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S58.1 | `SparkGreatest` | P1 | [x] | |
| S58.2 | Golden checks | P1 | [x] | |

---

### Story S59 — Spark Date Diff

**As a** data engineer  
**I want** datediff / months_between  
**So that** interval math stays native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S59.1 | `SparkDateDiff` | P1 | [x] | |
| S59.2 | Golden checks | P1 | [x] | |

---

### Story S60 — Spark Unix Time

**As a** data engineer  
**I want** unix_timestamp / from_unixtime / current_*  
**So that** epoch conversions stay native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S60.1 | `SparkUnixTime` | P1 | [x] | |
| S60.2 | Golden checks | P1 | [x] | |

---

### Story S61 — Spark Math

**As a** data engineer  
**I want** sqrt / log / pow helpers  
**So that** numeric transforms stay native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S61.1 | `SparkMath` | P1 | [x] | sqrt/exp/log/log10/log2/pow |
| S61.2 | Golden checks | P1 | [x] | |

---

### Story S62 — Spark Instr

**As a** data engineer  
**I want** instr / locate  
**So that** substring search stays native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S62.1 | `SparkInstr` | P1 | [x] | |
| S62.2 | Golden checks | P1 | [x] | |

---

### Story S63 — Spark Reverse / Repeat

**As a** data engineer  
**I want** reverse / repeat string ops  
**So that** string shaping stays native.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S63.1 | `SparkReverseRepeat` | P1 | [x] | |
| S63.2 | Golden checks | P1 | [x] | |

---

### Story S64 — Spark Is Null

**As a** data engineer  
**I want** isnull / isnotnull / isnan flags  
**So that** null diagnostics stay on the canvas.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S64.1 | `SparkIsNull` | P1 | [x] | |
| S64.2 | Golden checks | P1 | [x] | |

---

### Story S65 — Spark Struct Get

**As a** data engineer  
**I want** to extract struct fields  
**So that** nested payloads are usable without SQL Transform.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S65.1 | `SparkStructGet` | P1 | [x] | getField |
| S65.2 | Golden checks | P1 | [x] | |

---

### Story S66 — Spark Approx Count Distinct

**As a** data engineer  
**I want** HyperLogLog distinct counts  
**So that** cardinality estimates stay native at scale.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S66.1 | `SparkApproxCountDistinct` | P1 | [x] | Optional groupBy + rsd |
| S66.2 | Golden checks | P1 | [x] | |

---

### Story S67 — Spark Describe / Summary

**As a** data engineer  
**I want** `describe()` / `summary()` as a native Spark node  
**So that** I can profile columns without collecting to pandas first.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S67.1 | `SparkDescribe` processor (`describe` / `summary`) | P1 | [x] | Optional column list + summary stats |
| S67.2 | Golden checks | P1 | [x] | |

**Acceptance criteria**

- [x] Empty columns → `.describe()` / `.summary()`.
- [x] Column list and summary stats validated at codegen.

---

### Story S68 — Spark Checkpoint + registration cleanup

**As a** data engineer / maintainer  
**I want** DataFrame checkpointing and a clean palette registration  
**So that** expensive lineages can be truncated and components are not double-registered.

| ID | Subtask | Priority | Status | Notes / owner |
|---|---|---|---|---|
| S68.1 | `SparkCheckpoint` processor (eager + optional checkpoint dir) | P1 | [x] | |
| S68.2 | Remove duplicate Settings / Annotation registration in `src/index.ts` | P0 | [x] | Was registering Env/Connection/Session/Annotation twice |
| S68.3 | Spark File Input deferred-auth info banner (S27 parity) | P1 | [x] | |
| S68.4 | Golden checks for checkpoint | P1 | [x] | |

**Acceptance criteria**

- [x] Palette activates without duplicate Annotation / Session instances.
- [x] Checkpoint codegen emits `.checkpoint(True|False)` and optional `setCheckpointDir`.

---

## Dependency graph (v1)

```text
S1 Scaffold ──► S2 Form/Auth ──► S4 Codegen ──► S7 QA
                 │                  ▲
                 └──────► S3 SQL UX ┘
                            │
                            └──────► S5 Guards
S6 Docs parallel after S4 API stabilizes
```

---

## Suggested implementation order

1. **S1** scaffold + icon + register  
2. **S2 + S3** form complete  
3. **S4 + S5** codegen + limits  
4. **S7** smoke against real Connect  
5. **S6** finalize docs  
6. Backlog: **S8–S13**

---

## Progress summary

| Story | Phase | P0 remaining | Status |
|---|---|---|---|
| S1 Scaffold | v1 | Manual UI drag smoke | Done (built/installed; UI drag optional) |
| S2 Auth form | v1 | — | Done (incl. Connection key docs) |
| S3 SQL/table UX | v1 | — | Done |
| S4 Codegen | v1 | Live Connect | Done (goldens OK) |
| S5 Guards | v1 | — | Done |
| S6 Docs | v1 | — | Done |
| S7 QA/release | v1 | Live Connect matrix | Mostly done (codegen + build/install) |
| S8 Auth userpass | v1.1 | — | Done |
| S9 SQL polish | v1.1 | — | Done |
| S10 Catalog browser | v2 | — | Done (Retrieve over Connect) |
| S11 Shared session | v2 | — | Done |
| S12 Spark DF family | v2 | — | Native + transform + file output done |
| S13 Vendor presets | v2 | — | Databricks preset done |
| S14 Bridge + table write | v2.1 | — | Done |
| S15 Hardening / samples | v2.1 | Live Connect (optional) | Done (smoke harness ready) |
| S16 Native/output polish | v2.1 | Manual UI open (optional) | Done |
| S17 Transform / partitionBy | v2.1 | — | Done |
| S18 Dagster session stop | v2.1 | — | Done |
| S19 Bridge sample / smoke | v2.1 | Live Connect (optional) | Done |
| S20 Docs sync | v2.1 | — | Done |
| S21 Catalog cache + Limit/Dedupe | v2.1 | — | Done |
| S22 Spark Select Columns | v2.1 | — | Done |
| S23 Spark Filter | v2.1 | — | Done |
| S24 Spark Order By | v2.1 | — | Done |
| S25 Repartition / Sample | v2.1 | — | Done |
| S26 With Column | v2.1 | — | Done |
| S27 Deferred auth + ops sample | v2.1 | — | Done |
| S28 Cache + smoke ops chain | v2.1 | Live Connect (optional) | Done |
| S29 Drop Columns / Distinct | v2.1 | — | Done |
| S30 Join / Union dual-input | v2.1 | — | Done |
| S31 Aggregate | v2.1 | — | Done |
| S32 Rename Columns | v2.1 | — | Done |
| S33 Fill Na / Drop Na | v2.1 | — | Done |
| S34 Cast + agg sample | v2.1 | — | Done |
| S35 Spark File Input | v2.1 | — | Done |
| S36 Spark Explode | v2.1 | — | Done |
| S37 Spark Window | v2.1 | — | Done |
| S38 Spark Pivot | v2.1 | — | Done |
| S39 Unpivot | v2.1 | — | Done |
| S40 Concat Columns | v2.1 | — | Done |
| S41 Generate ID | v2.1 | — | Done |
| S42 Coalesce | v2.1 | — | Done |
| S43 When / Otherwise | v2.1 | — | Done |
| S44 String Replace | v2.1 | — | Done |
| S45 Trim | v2.1 | — | Done |
| S46 Substring | v2.1 | — | Done |
| S47 Date Trunc | v2.1 | — | Done |
| S48 Set Op (Intersect/Except) | v2.1 | — | Done |
| S49 Date Format / Parse | v2.1 | — | Done |
| S50 Array Ops | v2.1 | — | Done |
| S51 Case Fold | v2.1 | — | Done |
| S52 Round | v2.1 | — | Done |
| S53 Hash | v2.1 | — | Done |
| S54 Date Add | v2.1 | — | Done |
| S55 Length | v2.1 | — | Done |
| S56 Split | v2.1 | — | Done |
| S57 Abs | v2.1 | — | Done |
| S58 Greatest / Least | v2.1 | — | Done |
| S59 Date Diff | v2.1 | — | Done |
| S60 Unix Time | v2.1 | — | Done |
| S61 Math | v2.1 | — | Done |
| S62 Instr | v2.1 | — | Done |
| S63 Reverse / Repeat | v2.1 | — | Done |
| S64 Is Null | v2.1 | — | Done |
| S65 Struct Get | v2.1 | — | Done |
| S66 Approx Count Distinct | v2.1 | — | Done |
| S67 Spark Describe / Summary | v2.1 | — | Done |
| S68 Checkpoint + registration cleanup | v2.1 | — | Done |

Update the Status column and checkboxes as work completes. When creating GitHub/Jira issues, use story ids (`S1`, `S4.2`, …) in titles for traceability.

### Remaining (blocked / manual)

| Item | Notes |
|---|---|
| Live Spark Connect QA | Set `SPARK_CONNECT_URL` and run `examples/spark-connect-smoke.py` |
| UI drag smoke | Manual in JupyterLab (Lab 4.5.9 on :8890) |
| Kerberos / Databricks OAuth wizards | Intentionally deferred (S27 stubs + codegen reject) |
