# Spark SQL Input — Usage Guide

Use the **Spark SQL Input** component (palette: **Inputs → Spark**) to run Spark SQL against a **Spark Connect** endpoint and continue in Amphi with a **pandas** DataFrame.

Related: [spark-sql-input-design.md](../docs/spark-sql-input-design.md) · [spark-sql-input-stories.md](../docs/spark-sql-input-stories.md)

---

## Prerequisites

1. A reachable **Spark Connect** server (example: `sc://spark-connect:15002`).
2. In the Jupyter kernel / Amphi environment:
   ```bash
   pip install "pyspark[connect]"
   ```
3. **Client ≈ server** Spark/PySpark version. Prefer **3.5+**. Mismatched majors often fail with opaque Connect errors.

Amphi will also emit a dependency install hint for `pyspark[connect]` when the pipeline runs (via `provideDependencies`).

---

## Quick start

1. Drag **Spark SQL Input** onto the canvas.
2. Set **Spark Connect URL** (or set env `SPARK_CONNECT_URL`).
3. Choose **SQL Query** and enter e.g.:
   ```sql
   SELECT *
   FROM samples.nyctaxi.trips
   LIMIT 1000
   ```
4. Keep **Max rows** at `10000` (or lower for exploration).
5. Connect a **Filter** / **CSV File Output** (or any pandas transform) downstream.
6. Run the pipeline.

### Table shortcut

Set **Query method** to **Table Name** and enter `catalog.schema.table` (or `schema.table`).  
Generated SQL is `SELECT * FROM \`...\`` plus `.limit(Max rows)`.

---

## Authentication

| Mode | Behavior |
|---|---|
| **None** | Uses URL only; still honors `SPARK_TOKEN` if present in the environment |
| **Token** | Uses form token as fallback for `SPARK_TOKEN`; appended to Connect URL as `/;token=...` when missing |
| **Username / Password** | Uses `SPARK_USER` / `SPARK_PASSWORD` (form fallbacks); maps to Connect URL `user_id=` and `token=` (password also falls back via `SPARK_TOKEN` if set) |
| **OAuth (deferred)** | Not implemented in Amphi codegen — shows guidance; generate fails with a clear error |
| **Kerberos (deferred)** | Not implemented — use `kinit` / gateway outside Amphi; generate fails with a clear error |

### Kerberos / OAuth (workarounds)

Amphi does **not** ship Kerberos ticket UI or Databricks OAuth wizards. Options today:

1. Prefer **Token** (PAT) or **Username/Password** URL-param gateways.
2. Obtain credentials outside Amphi (e.g. `kinit`, vendor CLI / SDK session), then point Connect at an already-authorized endpoint or inject `SPARK_CONNECT_URL` / `SPARK_TOKEN` via Env/Connection.
3. Databricks: use Provider=**Databricks** + Auth=**Token** (PAT) + cluster id — not interactive OAuth.

See also design doc deferred items (Kerberos / OAuth wizards).

### Provider presets

| Provider | URL shape | Extra |
|---|---|---|
| **Generic** | `sc://host:15002` | Optional token / userpass |
| **Databricks** | `sc://{workspace}:443` | Set Auth=**Token** (PAT); set **Databricks cluster ID** → `x-databricks-cluster-id=`; env `SPARK_REMOTE`, `DATABRICKS_CLUSTER_ID` |

**Recommended for shared environments:** put secrets in **EnvFile** / **Connection** / process env — do **not** commit tokens or passwords inside `.ampln`.

| Variable | Purpose |
|---|---|
| `SPARK_CONNECT_URL` | Remote URL (preferred) |
| `SPARK_REMOTE` | Fallback URL (Databricks Connect convention) |
| `SPARK_TOKEN` | Optional token (also used as password fallback for userpass) |
| `SPARK_USER` | Optional username (userpass → `user_id=`) |
| `SPARK_PASSWORD` | Optional password (userpass → `token=`) |
| `DATABRICKS_CLUSTER_ID` | Databricks cluster id URL param |
| `SPARK_APP_NAME` | Optional app name |

Connection node: use type/tag **SparkConnect** with the same key names.

### Secret handling (S8.4)

- Prefer Env/Connection over form fields for production pipelines.
- Form password/token fields are stored in the pipeline JSON if filled — treat `.ampln` as secret-bearing when that happens.
- Generated code never `print`s tokens or secret-bearing URLs.
- Repo samples and docs use empty env fallbacks only.

---

## Shared Spark Connect Session (optional)

For multiple Spark SQL Inputs in one pipeline:

1. Add **Spark Connect Session** (Configuration palette).
2. Configure URL/auth once on the Session node.
3. Leave Spark SQL Input **Spark session** mode on **Auto** (advanced) — codegen reuses global `spark` and skips per-node `remote()`.
4. Prefer **Env/Connection** for secrets.

Do **not** rely on automatic `spark.stop()`; restart the kernel when switching clusters. Optional **Spark Session Stop** (confirm gate) can emit `spark.stop()` after pipeline code when you intentionally tear down the session.

---

## Sample pipelines

```text
[Spark Connect Session]
[Spark SQL Input] --> [Filter] --> [CSV File Output]
```

Native:

```text
[Spark Connect Session]
[Spark SQL (native)] --> [Spark Filter] --> [Spark Select Columns] --> [Spark Order By] --> [Spark Limit] --> [Spark File Output]
[+ optional Spark Session Stop]
```

Bridge:

```text
[Spark Connect Session]
[Spark SQL (native)] --> [Spark to Pandas] --> [Console]
                       └──────────────────> [Pandas to Spark] --> [Spark File Output]
```

Files under `examples/pipelines/`: `spark-sql-sample.ampln`, `spark-native-sample.ampln`, `spark-bridge-sample.ampln`, `spark-native-ops-sample.ampln`, `spark-join-union-sample.ampln`, `spark-agg-rename-sample.ampln`, `spark-reshape-sample.ampln`.

Generated shape (pandas path, simplified):

```python
from pyspark.sql import SparkSession
import os

_spark_url = os.getenv("SPARK_CONNECT_URL", "sc://localhost:15002")
_app_name = os.getenv("SPARK_APP_NAME", "amphi-spark-sql-input")
_token = os.getenv("SPARK_TOKEN", "")
# token may be merged into _spark_url as /;token=...

spark = SparkSession.builder.appName(_app_name).remote(_spark_url).getOrCreate()
df = spark.sql("""SELECT * FROM t LIMIT 100""")
df = df.limit(100)          # effective max rows
df = df.toPandas().convert_dtypes()
```

---

## Native Spark lineage

- **Spark SQL (native)** — same Connect/SQL UX but keeps a Spark DataFrame (`spark_df_input`).
- **Spark File Input** — read parquet/csv/json with `spark.read` (`spark_df_input`).
- **Spark SQL Transform** — register upstream DF as a temp view and run SQL (`spark_df_processor`).
- **Spark Limit** / **Drop Duplicates** / **Select Columns** / **Drop Columns** / **Filter** / **Order By** / **Repartition** / **Sample** / **With Column** / **Cache** / **Distinct** / **Aggregate** / **Rename Columns** / **Fill Na** / **Cast** / **Explode** / **Window** / **Pivot** / **Unpivot** / **Concat Columns** / **Generate ID** / **Coalesce** / **When** / **String Replace** / **Trim** / **Substring** / **Date Trunc** / **Date Format** / **Array Ops** / **Case Fold** / **Round** / **Hash** / **Date Add** / **Length** / **Split** / **Abs** / **Greatest** / **Date Diff** / **Unix Time** / **Math** / **Instr** / **Reverse-Repeat** / **Is Null** / **Struct Get** / **Approx Count Distinct** — single-input native DF ops.
- **Spark Join** / **Spark Union** / **Spark Set Op** — dual-input (`in1`/`in2`) native combine ops.
- **Spark to Pandas** — collect to pandas for Filter / CSV / etc. (`spark_df_to_pandas_processor`).
- **Pandas to Spark** — `spark.createDataFrame` (needs Session / active `spark`).
- **Spark File Output** — write parquet/csv/json with `DataFrameWriter` (`spark_df_output`); optional CSV header and `partitionBy`.
- **Spark Table Output** — `saveAsTable` / `insertInto` (`spark_df_output`); Catalog/Schema/Table Retrieve supported.
- **Spark Session Stop** — optional `spark.stop()` after pipeline code (confirm gate).
- Connect `spark_df_*` nodes to each other; use **Spark to Pandas** to enter the pandas world.
- Prefer a **Spark Connect Session** when chaining multiple native nodes.

See also [spark-connect-runbook.md](./spark-connect-runbook.md).

### Table browser (Retrieve)

In **Table Name** mode, use **Retrieve** on Catalog (`SHOW CATALOGS`), Schema (`SHOW NAMESPACES`), and Table (`SHOW TABLES`). Amphi uses Spark Connect (reuses a Session node when present). Successful Retrieve results are cached in the form until you Refresh or change Catalog/Schema. Selecting a short table name with Catalog/Schema set stores a fully qualified `catalog.schema.table` value.

---

## Limits and safety

- Pandas Spark SQL Input collects with **`toPandas()`** into the Jupyter client — large results can OOM the kernel.
- **Max rows** always applies `.limit(N)` (on Spark DF for native; before collect for pandas).
- If SQL already ends with `LIMIT k`, effective limit is **`min(Max rows, k)`**.
- **One SQL statement only** (no `SELECT ...; SELECT ...`).
- No `local[*]` / YARN master UI; Kerberos / Databricks OAuth wizards remain deferred.

---

## Developer checks

From `jupyterlab-amphi/packages/pipeline-components-core`:

```bash
jlpm test:spark-sql
```

This runs codegen golden checks without a live cluster.

Live smoke (optional):

```bash
export SPARK_CONNECT_URL=sc://localhost:15002
python examples/spark-connect-smoke.py
```

Exit `2` if no URL (skip), `0` pass, `1` fail.

---

## Troubleshooting

| Symptom | What to check |
|---|---|
| Connection refused | URL/host/port; Connect server running; network/firewall |
| Auth errors | `SPARK_TOKEN` / `SPARK_USER`+`SPARK_PASSWORD` / form fields; URL already containing `token=` or `user_id=` |
| Version / gRPC errors | Align PySpark client with cluster (3.5+ recommended) |
| Empty / wrong data | SQL, catalog names, Max rows |
| `Installation of pyspark[connect] failed` | Install manually in the kernel env; check proxy/pip |
| Retrieve fails | Add a Spark Connect Session (or set `SPARK_CONNECT_URL`); check auth |
