# Spark Connect — Operator Runbook

Short reference for configuring Amphi Spark components against common environments.

Related: [spark-sql-input.md](./spark-sql-input.md) · [design](../docs/spark-sql-input-design.md)

---

## Smoke (live Connect)

```bash
export SPARK_CONNECT_URL=sc://localhost:15002
# optional: SPARK_TOKEN / SPARK_REMOTE / DATABRICKS_CLUSTER_ID
python examples/spark-connect-smoke.py
```

Exit codes: `0` pass · `1` fail · `2` skipped (no URL set).

Sample pipelines:
- Pandas path: [pipelines/spark-sql-sample.ampln](./pipelines/spark-sql-sample.ampln)
- Native path (session → native SQL → transform → file): [pipelines/spark-native-sample.ampln](./pipelines/spark-native-sample.ampln)
- Bridge path (native → Spark→Pandas → Console / Pandas→Spark → file): [pipelines/spark-bridge-sample.ampln](./pipelines/spark-bridge-sample.ampln)
- Native ops (filter → withColumn → select → order → limit → file): [pipelines/spark-native-ops-sample.ampln](./pipelines/spark-native-ops-sample.ampln)
- Join / Union: [pipelines/spark-join-union-sample.ampln](./pipelines/spark-join-union-sample.ampln)
- Aggregate / Rename / Cast / Fill: [pipelines/spark-agg-rename-sample.ampln](./pipelines/spark-agg-rename-sample.ampln)
- Reshape (concat → unpivot → row id): [pipelines/spark-reshape-sample.ampln](./pipelines/spark-reshape-sample.ampln)

---

## Environment variables

| Variable | Typical use |
|---|---|
| `SPARK_CONNECT_URL` | Preferred Connect URL (`sc://host:15002`) |
| `SPARK_REMOTE` | Databricks / alternate Connect string |
| `SPARK_TOKEN` | Bearer / PAT |
| `SPARK_USER` / `SPARK_PASSWORD` | Gateway userpass → URL `user_id` / `token` |
| `DATABRICKS_CLUSTER_ID` | Appended as `x-databricks-cluster-id=` |
| `SPARK_APP_NAME` | `SparkSession.appName` |

Prefer **Env File** / **Connection** (type SparkConnect) over form secrets.

---

## URL recipes

### Local / OSS Connect

```text
sc://localhost:15002
```

Auth: **None** (or Token if your gateway requires it).

### Databricks Connect string

```text
sc://<workspace>.cloud.databricks.com:443
```

Provider: **Databricks** · Auth: **Token** (PAT) · Cluster ID: from Compute UI.  
Full string equivalent:

```text
sc://<workspace>:443/;token=<PAT>;x-databricks-cluster-id=<id>
```

---

## Recommended pipeline shapes

**Exploration (pandas):**

```text
Spark SQL Input → Filter → CSV File Output
```

**Native Spark then pandas:**

```text
Spark Connect Session
       ↓
Spark SQL (native) → Spark SQL Transform → Spark to Pandas → Filter
```

**Pandas into Spark:**

```text
Spark Connect Session + CsvFileInput → Pandas to Spark → Spark Table Output
```

**Write back to Spark:**

```text
Spark SQL (native) → Spark File Output
Spark SQL (native) → Spark Table Output
```

---

## Client / server versions

Install matching client:

```bash
pip install "pyspark[connect]"
```

Keep **client ≈ server** (prefer **3.5+**). Mismatched majors often fail with opaque gRPC errors.

---

## Smoke checklist (live cluster)

1. URL-only query `SELECT 1`
2. Token / Databricks preset
3. Bad URL → clear RuntimeError wrapper
4. Bad SQL → clear error
5. Max rows = 5 on a larger table
6. Table mode Retrieve (SHOW TABLES)
7. Downstream Filter (pandas path) or Spark to Pandas (native path)
