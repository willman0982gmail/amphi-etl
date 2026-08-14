# GDP Spark Gateway Browse — Manual QA checklist

Use after enabling Browse (PageConfig or fixture mode). Keep tokens out of screenshots and commits.

## Prerequisites

| Item | Example / notes |
|------|-----------------|
| PageConfig `gdpSparkGatewayUrl` | `https://<GATEWAY_HOST>` |
| PageConfig `gdpSparkGatewayAuthToken` | Bearer JWT from portal (short-lived) |
| PageConfig `gdpSparkConnectExternalHost` | External Spark Connect hostname (no `sc://`) |
| Optional Create New | `gdpSparkGatewayPortalUrl` or `gdpSparkGatewayCreateUrlTemplate` with `{namespace}` |
| Offline UI only | `gdpSparkGatewayUseFixture=true` (no live connect) |

## G3.9 / G4.1 — Connection Browse → SQL

1. Add **Connection** (SparkConnect) → **Browse GDP sessions…** → Select a Ready session.
2. Confirm `SPARK_CONNECT_URL` contains `x-gdp-connect-id:` (token not written by Browse).
3. Set `SPARK_TOKEN` via Env / `.env` (see [gdp-spark-connect.env](./gdp-spark-connect.env)).
4. Add **Spark SQL Input** → **Select Connection** → SQL `SELECT 1`.
5. Run pipeline; expect success against the chosen session.

## G5.4 — Session Browse + shared spark

1. **Spark Connect Session** → Browse → Select Ready session.
2. Two **Spark SQL Input** nodes with session mode **Auto**.
3. Run both; both should reuse the shared `spark` without separate remotes.

## G8 — Create New deep-link

1. Open Browse → **Create New…** (requires portal PageConfig).
2. Create/start a session in the portal.
3. Return to the Amphi tab (focus/visibility): list force-refreshes and auto-selects a new Ready session when detected; confirm with **Select**.
4. If nothing new appears yet, start the session in the portal, then click **Refresh**.

## G4.1 — URL shape smoke (without full UI)

```bash
# Redacted pattern only — substitute real host / connect id / token locally
export SPARK_CONNECT_URL='sc://spark-connect-dedicated.example.com:443/;x-gdp-connect-id:REDACTED'
export SPARK_TOKEN='***'
python - <<'PY'
from pyspark.sql import SparkSession
import os
url = os.environ["SPARK_CONNECT_URL"]
# append token if your gateway requires it in the URL
if "token=" not in url and os.environ.get("SPARK_TOKEN"):
    url = url.rstrip("/")
    url = (url if url.endswith(";") else url + ";") + "token=" + os.environ["SPARK_TOKEN"]
spark = SparkSession.builder.remote(url).getOrCreate()
print(spark.sql("SELECT 1 AS n").collect())
PY
```

Mark stories G3.9 / G4.1 / G5.4 `[x]` only after the matching live run succeeds.
