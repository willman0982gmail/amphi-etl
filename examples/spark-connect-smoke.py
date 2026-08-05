#!/usr/bin/env python3
"""
S7 / S15 — Spark Connect live smoke harness.

Runs only when SPARK_CONNECT_URL (or SPARK_REMOTE) is set.
Exit 0 on success, 2 if skipped (no URL), 1 on failure.

Usage:
  export SPARK_CONNECT_URL=sc://localhost:15002
  # optional: SPARK_TOKEN, SPARK_USER, SPARK_PASSWORD, DATABRICKS_CLUSTER_ID
  python examples/spark-connect-smoke.py
"""
from __future__ import annotations

import os
import sys


def build_url() -> str:
    url = os.getenv("SPARK_CONNECT_URL") or os.getenv("SPARK_REMOTE") or ""
    url = url.strip()
    if not url:
        return ""

    token = os.getenv("SPARK_TOKEN", "").strip()
    user = os.getenv("SPARK_USER", "").strip()
    password = os.getenv("SPARK_PASSWORD", "").strip()
    cluster = os.getenv("DATABRICKS_CLUSTER_ID", "").strip()
    if not token and password:
        token = password

    def append(param: str, value: str) -> None:
        nonlocal url
        if not value or f"{param}=" in url:
            return
        base = url.rstrip("/")
        if "/;" in base or base.endswith(";"):
            url = (base if base.endswith(";") else base + ";") + f"{param}={value}"
        else:
            url = base + f"/;{param}={value}"

    if user:
        append("user_id", user)
    if token:
        append("token", token)
    if cluster:
        append("x-databricks-cluster-id", cluster)
    return url


def main() -> int:
    url = build_url()
    if not url:
        print(
            "SKIP: set SPARK_CONNECT_URL or SPARK_REMOTE to run live Connect smoke.",
            file=sys.stderr,
        )
        return 2

    try:
        from pyspark.sql import SparkSession
    except ImportError:
        print('FAIL: install pyspark[connect] first: pip install "pyspark[connect]"', file=sys.stderr)
        return 1

    app_name = os.getenv("SPARK_APP_NAME", "amphi-spark-connect-smoke")
    print(f"Connecting app={app_name} url_host={url.split(';')[0]} ...")

    try:
        spark = SparkSession.builder.appName(app_name).remote(url).getOrCreate()
        df = spark.sql("SELECT 1 AS n")
        pdf = df.limit(5).toPandas()
        assert list(pdf.columns) == ["n"] or "n" in pdf.columns
        assert len(pdf) == 1
        print("OK: SELECT 1 → pandas (1 row)")

        # Max-rows style guard
        big = spark.sql("SELECT id FROM range(100)")
        limited = big.limit(5).toPandas()
        assert len(limited) == 5
        print("OK: max rows limit(5) on range(100)")

        # Catalog smoke (best-effort)
        try:
            cats = spark.sql("SHOW CATALOGS").toPandas()
            print(f"OK: SHOW CATALOGS returned {len(cats)} row(s)")
        except Exception as exc:  # noqa: BLE001
            print(f"WARN: SHOW CATALOGS skipped ({exc})")

        try:
            namespaces = spark.sql("SHOW NAMESPACES").limit(20).toPandas()
            print(f"OK: SHOW NAMESPACES returned {len(namespaces)} row(s) (capped 20)")
        except Exception as exc:  # noqa: BLE001
            print(f"WARN: SHOW NAMESPACES skipped ({exc})")

        # Native transform-style path: temp view + SQL
        df.createOrReplaceTempView("amphi_smoke_src")
        transformed = spark.sql("SELECT n * 2 AS n2 FROM amphi_smoke_src")
        assert transformed.limit(1).collect()[0][0] == 2
        print("OK: temp view + spark.sql transform")

        # Native ops chain (mirrors Spark Filter / WithColumn / OrderBy / Limit)
        from pyspark.sql import functions as F

        ops = (
            spark.sql(
                "SELECT id AS n, CASE WHEN id % 2 = 0 THEN 'ok' ELSE 'skip' END AS status FROM range(20)"
            )
            .filter("status = 'ok'")
            .withColumn("n2", F.expr("n * 2"))
            .select("n", "n2", "status")
            .orderBy(F.col("n").desc())
            .limit(5)
        )
        ops_pdf = ops.toPandas()
        assert len(ops_pdf) == 5
        assert list(ops_pdf["n"]) == [18, 16, 14, 12, 10]
        print("OK: native ops chain filter→withColumn→select→orderBy→limit")

        # Join / union smoke
        left = spark.sql("SELECT id, 'L' AS side FROM range(3)")
        right = spark.sql("SELECT id, 'R' AS side FROM range(2, 5)")
        joined = left.join(right, on="id", how="inner")
        assert joined.count() == 1
        united = left.unionByName(right).distinct()
        assert united.count() == 5
        print("OK: join + unionByName/distinct")

        # Aggregate / rename / cast / fillna smoke
        sales = spark.sql(
            "SELECT 'east' AS region, CAST(id AS DOUBLE) AS amount FROM range(5)"
        )
        sales2 = sales.withColumn("amount", F.col("amount").cast("double")).fillna(
            0, subset=["amount"]
        )
        agged = sales2.groupBy("region").agg(
            F.sum("amount").alias("total"), F.count("amount").alias("n")
        )
        renamed = agged.withColumnRenamed("total", "region_total").withColumnRenamed(
            "n", "row_count"
        )
        assert renamed.count() == 1
        row = renamed.collect()[0]
        assert row["region_total"] == 10.0  # 0+1+2+3+4
        assert row["row_count"] == 5
        print("OK: cast→fillna→groupBy/agg→rename")

        # Explode + window smoke
        nested = spark.sql("SELECT id, array(id, id + 1) AS tags FROM range(2)")
        exploded = nested.select("*", F.explode(F.col("tags")).alias("tag")).drop("tags")
        assert exploded.count() == 4
        from pyspark.sql.window import Window

        ranked = exploded.withColumn(
            "rn", F.row_number().over(Window.partitionBy("id").orderBy(F.col("tag").desc()))
        )
        assert ranked.filter("rn = 1").count() == 2
        print("OK: explode + window row_number")

        # Unpivot / concat / coalesce / generate id
        wide = spark.sql(
            "SELECT 1 AS id, 10 AS jan, 20 AS feb UNION ALL SELECT 2, 11, 21"
        )
        tall = wide.unpivot(["id"], ["jan", "feb"], "month", "amount")
        assert tall.count() == 4
        named = tall.withColumn(
            "key", F.concat_ws("-", F.col("id").cast("string"), F.col("month"))
        )
        filled = named.withColumn(
            "amt2", F.coalesce(F.col("amount"), F.lit(0))
        ).withColumn("rid", F.monotonically_increasing_id())
        assert "key" in filled.columns and filled.filter("amt2 is null").count() == 0
        print("OK: unpivot→concat_ws→coalesce→generate id")

        # File write (cluster-local /tmp; best-effort)
        out_path = os.getenv("SPARK_SMOKE_WRITE_PATH", "/tmp/amphi-spark-connect-smoke.parquet")
        try:
            transformed.write.mode("overwrite").format("parquet").save(out_path)
            print(f"OK: wrote parquet to {out_path}")
        except Exception as exc:  # noqa: BLE001
            print(f"WARN: parquet write skipped ({exc})")

        print("Spark Connect live smoke: PASS")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
