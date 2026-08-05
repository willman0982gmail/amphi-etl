# Changelog

## Unreleased

### Changed

- **JupyterLab compatibility:** `jupyterlab-amphi`, `amphi-scheduler`, and `amphi-etl` now target **`jupyterlab>=4.4.0,<5`** (4.4.x / 4.5.x / 4.6.x). Frontend packages widen `@jupyterlab/*` to `^4.4.0`, `@jupyterlab/services` to `^7.4.0`, and `@jupyter/ydoc` to `^3 || ^4` (singleton-shared) so JupyterLab 4.6’s ydoc 4 no longer conflicts with Amphi’s component manager. `amphi-scheduler` also aligns `react-dom` to `^18.2.0` (was `^17`, which failed JupyterLab’s compatibility check). `amphi-etl` theme/UI packages and Docker/requirements pins aligned to the same range.

### Added

- **Spark SQL Input** (`sparkSqlInput`): JupyterLab Amphi component under Inputs → Spark that runs Spark SQL via Spark Connect and loads results as a pandas DataFrame (`toPandas()` + `convert_dtypes()`).
  - Connect URL + auth: none / token / username+password (env: `SPARK_CONNECT_URL`, `SPARK_TOKEN`, `SPARK_USER`, `SPARK_PASSWORD`, `SPARK_APP_NAME`)
  - SQL query or table-name shortcut
  - Max rows guard with `min(Max rows, SQL LIMIT)`
  - Optional shared session via **Spark Connect Session** (`sparkConnectSession`) + Auto/Shared/Local mode
  - Provider presets: Generic / Databricks (`SPARK_REMOTE`, `DATABRICKS_CLUSTER_ID`)
  - **Spark SQL (native)** (`sparkSqlNativeInput`, `spark_df_input`) keeps a Spark DataFrame (no `toPandas`)
  - **Spark File Input** (`sparkFileInput`, `spark_df_input`) reads parquet/csv/json via `spark.read`
  - **Spark SQL Transform** (`sparkSqlTransform`, `spark_df_processor`) for native Spark SQL on temp views
  - **Spark File Output** (`sparkFileOutput`, `spark_df_output`) parquet/csv/json via DataFrameWriter
  - **Spark to Pandas** / **Pandas to Spark** bridges for mixed pipelines
  - **Spark Table Output** (`sparkTableOutput`) via `saveAsTable` / `insertInto`
  - Catalog / schema / table **Retrieve** (`SHOW CATALOGS` / `NAMESPACES` / `TABLES`)
  - **Spark Session Stop** (`sparkSessionStop`) optional `spark.stop()` (confirm gate)
  - **Spark Limit** / **Drop Duplicates** / **Select / Drop Columns** / **Filter** / **Order By** / **Repartition** / **Sample** / **With Column** / **Cache** / **Distinct** / **Join** / **Union** / **Aggregate** / **Rename Columns** / **Fill Na** / **Cast** / **Explode** / **Window** / **Pivot** / **Unpivot** / **Concat Columns** / **Generate ID** / **Coalesce** / **When** / **String Replace** / **Trim** / **Substring** / **Date Trunc** / **Set Op** / **Date Format** / **Array Ops** / **Case Fold** / **Round** / **Hash** / **Date Add** / **Length** / **Split** / **Abs** / **Greatest** / **Date Diff** / **Unix Time** / **Math** / **Instr** / **Reverse-Repeat** / **Is Null** / **Struct Get** / **Approx Count Distinct** / **Describe** / **Checkpoint** native processors
  - Dual-input Spark handles (`spark_df_double_processor`) in CodeGenerator / renderer / Dagster
  - Catalog Retrieve in-memory cache + FQN composition on table select
  - OAuth / Kerberos auth options marked deferred (codegen rejects with guidance)
  - Sample pipelines: `spark-sql-sample.ampln`, `spark-native-sample.ampln`, `spark-bridge-sample.ampln`, `spark-native-ops-sample.ampln`, `spark-join-union-sample.ampln`, `spark-agg-rename-sample.ampln`, `spark-reshape-sample.ampln`
  - Spark File Output CSV header + optional `partitionBy`; Session Stop / File / Transform covered by offline codegen checks
  - Dagster export appends Spark Session Stop after job definitions (parity with local CodeGenerator)
  - Live smoke: `examples/spark-connect-smoke.py`
  - Runbook: `examples/spark-connect-runbook.md`
  - Dependency hint: `pyspark[connect]`
  - Docs: `docs/spark-sql-input-design.md`, `docs/spark-sql-input-stories.md`, `examples/spark-sql-input.md`
  - Developer check: `jlpm test:spark-sql` in `pipeline-components-core`
