/**
 * Pure codegen for Spark SQL Input / Spark Connect Session (no Lab/React imports).
 */
import {
  escapePyDouble,
  escapePyTripleSql,
  hasMultipleSqlStatements,
  isValidTableIdentifier,
  parseMaxRows,
  parseSqlFromConfigValue,
  parseTableNameValue,
  quoteTableIdentifier,
  resolveEffectiveMaxRows,
  resolveQualifiedTableName
} from './sparkSqlUtils';

export function resolveSparkSql(config: any): string {
  if (config.tsCFradioQueryMethod === 'table') {
    const tableName = resolveQualifiedTableName(config);
    if (!isValidTableIdentifier(tableName)) {
      throw new Error(
        'Spark SQL Input: invalid or empty table name. Use table, schema.table, or catalog.schema.table (no semicolons).'
      );
    }
    return `SELECT * FROM ${quoteTableIdentifier(tableName)}`;
  }

  const sql = parseSqlFromConfigValue(config.tsCFcodeTextareaSqlQuery);
  if (!sql) {
    throw new Error('Spark SQL Input: SQL query is empty.');
  }
  if (hasMultipleSqlStatements(sql)) {
    throw new Error(
      'Spark SQL Input: multiple SQL statements are not supported. Provide a single statement.'
    );
  }
  return sql.replace(/;+\s*$/, '');
}

export function shouldUseSharedSparkSession(config: any): boolean {
  const mode = config.tsCFradioSessionMode || 'auto';
  if (mode === 'local') {
    return false;
  }
  if (mode === 'shared') {
    return true;
  }
  // auto
  return config._amphiHasSparkSession === true;
}

/** Append a Connect URL param if missing. Emitted as Python. */
function appendUrlParamPython(paramKey: string, valueExpr: string): string {
  return `
if ${valueExpr} and "${paramKey}=" not in _spark_url:
    _base = _spark_url.rstrip("/")
    if "/;" in _base or _base.endswith(";"):
        _spark_url = (_base if _base.endswith(";") else _base + ";") + "${paramKey}=" + ${valueExpr}
    else:
        _spark_url = _base + "/;${paramKey}=" + ${valueExpr}
`;
}

/**
 * Emit Python that merges auth into the Connect URL.
 * Spark Connect commonly accepts URL params: user_id, token.
 * userpass maps username→user_id and password→token (gateway pattern).
 */
function authUrlPythonBlock(config: any): string {
  const auth = config.tsCFradioAuthMethod || 'none';
  if (auth === 'oauth' || auth === 'kerberos') {
    throw new Error(
      `Spark Connect: Authentication="${auth}" is not supported in Amphi codegen yet. ` +
        'Use Token or Username/Password (URL params), or configure vendor auth outside Amphi ' +
        '(see examples/spark-sql-input.md § Authentication — Kerberos / OAuth).'
    );
  }
  const provider = config.tsCFradioProvider || 'generic';
  const tokenFallback =
    auth === 'token' || provider === 'databricks'
      ? escapePyDouble(config.tsCFinputToken || '')
      : '';
  const userFallback =
    auth === 'userpass' ? escapePyDouble(config.tsCFinputUserName || '') : '';
  const passFallback =
    auth === 'userpass' ? escapePyDouble(config.tsCFinputPassword || '') : '';
  const clusterFallback =
    provider === 'databricks'
      ? escapePyDouble(config.tsCFinputDatabricksClusterId || '')
      : '';

  let block = '';

  if (auth === 'userpass') {
    block += `
_user = os.getenv("SPARK_USER", "${userFallback}")
_password = os.getenv("SPARK_PASSWORD", "${passFallback}")
# Prefer dedicated password env; fall back to SPARK_TOKEN if set
_token = os.getenv("SPARK_TOKEN", _password if _password else "")
${appendUrlParamPython('user_id', '_user')}
${appendUrlParamPython('token', '_token')}
`;
  } else {
    block += `
_token = os.getenv("SPARK_TOKEN", "${tokenFallback}")
${appendUrlParamPython('token', '_token')}
`;
  }

  if (provider === 'databricks') {
    block += `
_cluster_id = os.getenv("DATABRICKS_CLUSTER_ID", "${clusterFallback}")
${appendUrlParamPython('x-databricks-cluster-id', '_cluster_id')}
`;
  }

  return block;
}

function connectUrlPythonAssign(config: any): string {
  const urlFallback = escapePyDouble(
    config.tsCFinputSparkConnectUrl ||
      (config.tsCFradioProvider === 'databricks'
        ? 'sc://your-workspace.cloud.databricks.com:443'
        : 'sc://localhost:15002')
  );
  // Prefer SPARK_CONNECT_URL; fall back to Databricks SPARK_REMOTE
  return `
_spark_url = os.getenv("SPARK_CONNECT_URL") or os.getenv("SPARK_REMOTE", "${urlFallback}")
`;
}

/** Build SparkSession via Connect and assign to global name `spark`. */
export function generateSparkSessionBuilderCode(config: any): string {
  const appName = escapePyDouble(
    config.tsCFinputAppName || 'amphi-spark-sql-input'
  );
  const urlAssign = connectUrlPythonAssign(config);
  const authBlock = authUrlPythonBlock(config);

  return `
# Spark Connect Session
${urlAssign}_app_name = os.getenv("SPARK_APP_NAME", "${appName}")
${authBlock}
try:
    spark = (
        SparkSession.builder
        .appName(_app_name)
        .remote(_spark_url)
        .getOrCreate()
    )
except Exception as _amphi_spark_err:
    raise RuntimeError(
        "Spark Connect Session failed (Connect URL / auth). "
        "Check SPARK_CONNECT_URL (or SPARK_REMOTE), token/user/cluster, client≈server PySpark version (3.5+). "
        f"Underlying error: {_amphi_spark_err}"
    ) from _amphi_spark_err
`;
}

function generateSparkSqlBodyCode(
  config: any,
  outputName: string,
  options: { collectToPandas?: boolean } = {}
): string {
  const collectToPandas = options.collectToPandas !== false;
  const sql = resolveSparkSql(config);
  const formMax = parseMaxRows(config.tsCFinputMaxRows, 10000);
  const maxRows = resolveEffectiveMaxRows(formMax, sql);
  const sqlEscaped = escapePyTripleSql(sql);

  const collect = collectToPandas
    ? `
    ${outputName} = ${outputName}.toPandas().convert_dtypes()
`
    : `
    # Keep Spark DataFrame (no toPandas); downstream must be Spark-aware
`;

  return `
    ${outputName} = spark.sql("""
${sqlEscaped}
    """)

    _max_rows = ${maxRows}
    if _max_rows > 0:
        ${outputName} = ${outputName}.limit(_max_rows)
${collect}`;
}

export function generateSparkSqlInputCode(
  config: any,
  outputName: string
): string {
  return generateSparkSqlCode(config, outputName, { collectToPandas: true });
}

/** S12.2 — Spark SQL without collecting to pandas (`spark_df_input`). */
export function generateSparkSqlNativeCode(
  config: any,
  outputName: string
): string {
  return generateSparkSqlCode(config, outputName, { collectToPandas: false });
}

function generateSparkSqlCode(
  config: any,
  outputName: string,
  options: { collectToPandas: boolean }
): string {
  const label = options.collectToPandas
    ? 'Spark SQL Input (Spark Connect → pandas)'
    : 'Spark SQL Input native (Spark Connect → Spark DataFrame)';

  if (shouldUseSharedSparkSession(config)) {
    const body = generateSparkSqlBodyCode(config, outputName, options);
    return `
# ${label.replace('Spark Connect →', 'shared session →')}
try:
${body}
except Exception as _amphi_spark_err:
    raise RuntimeError(
        "Spark SQL Input failed (shared session / SQL). "
        "Ensure a Spark Connect Session node ran first, and check the SQL. "
        f"Underlying error: {_amphi_spark_err}"
    ) from _amphi_spark_err
`;
  }

  const appName = escapePyDouble(
    config.tsCFinputAppName || 'amphi-spark-sql-input'
  );
  const authBlock = authUrlPythonBlock(config);
  const body = generateSparkSqlBodyCode(config, outputName, options);

  return `
# ${label}
${connectUrlPythonAssign(config)}_app_name = os.getenv("SPARK_APP_NAME", "${appName}")
${authBlock}
try:
    spark = (
        SparkSession.builder
        .appName(_app_name)
        .remote(_spark_url)
        .getOrCreate()
    )
${body}
except Exception as _amphi_spark_err:
    raise RuntimeError(
        "Spark SQL Input failed (Connect URL / auth / SQL). "
        "Check SPARK_CONNECT_URL (or SPARK_REMOTE), token/user/cluster, client≈server PySpark version (3.5+), and the SQL. "
        f"Underlying error: {_amphi_spark_err}"
    ) from _amphi_spark_err
`;
}

export function sparkSqlProvideDependencies(): string[] {
  return ['pyspark[connect]'];
}

export function sparkSqlProvideImports(): string[] {
  return ['from pyspark.sql import SparkSession', 'import os'];
}

/** S14.1 — collect Spark DF to pandas. */
export function generateSparkToPandasCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const maxRows = parseMaxRows(config.tsCFinputMaxRows, 10000);
  return `
# Spark to Pandas
_max_rows = ${maxRows}
${outputName} = ${inputName}
if _max_rows > 0:
    ${outputName} = ${outputName}.limit(_max_rows)
${outputName} = ${outputName}.toPandas().convert_dtypes()
`;
}

/** S14.3 — write Spark DF to catalog table. */
export function generateSparkTableOutputCode(
  config: any,
  inputName: string
): string {
  let table = resolveQualifiedTableName(config);
  if (!table) {
    table = parseTableNameValue(config.tsCFinputTableName);
  }
  if (!isValidTableIdentifier(table)) {
    throw new Error(
      'Spark Table Output: invalid or empty table name. Use table, schema.table, or catalog.schema.table.'
    );
  }
  const plainName = escapePyDouble(table);
  const mode = escapePyDouble(config.tsCFradioWriteMode || 'overwrite');
  const method = config.tsCFradioWriteMethod || 'saveAsTable';

  if (method === 'insertInto') {
    return `
# Spark Table Output (insertInto)
${inputName}.write.insertInto("${plainName}")
print("Spark Table Output insertInto ${plainName}")
`;
  }

  return `
# Spark Table Output (saveAsTable)
(
    ${inputName}.write
    .mode("${mode}")
    .saveAsTable("${plainName}")
)
print("Spark Table Output saveAsTable ${plainName}")
`;
}

/** S12.3 / S16 — Spark DataFrameWriter to path (parquet/csv/json). */
export function generateSparkFileOutputCode(
  config: any,
  inputName: string
): string {
  const path = escapePyDouble(config.tsCFinputFilePath || 'output.parquet');
  const mode = escapePyDouble(config.tsCFradioWriteMode || 'overwrite');
  const format = String(config.tsCFradioFormat || 'parquet').toLowerCase();
  const allowed = ['parquet', 'csv', 'json'];
  const fmt = allowed.includes(format) ? format : 'parquet';
  const header =
    config.tsCFbooleanCsvHeader === true || config.tsCFbooleanCsvHeader === 'true';

  const partitionRaw = String(config.tsCFinputPartitionBy || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  for (const col of partitionRaw) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
      throw new Error(
        `Spark File Output: invalid partition column "${col}". Use simple identifiers, comma-separated.`
      );
    }
  }

  let writerChain = `
    ${inputName}.write
    .mode("${mode}")
    .format("${fmt}")`;
  if (fmt === 'csv' && header) {
    writerChain += `
    .option("header", "true")`;
  }
  if (partitionRaw.length > 0) {
    const cols = partitionRaw.map((c: string) => `"${escapePyDouble(c)}"`).join(', ');
    writerChain += `
    .partitionBy(${cols})`;
  }

  return `
# Spark File Output
(
${writerChain}
    .save("${path}")
)
print("Spark File Output wrote ${fmt} to ${path}")
`;
}

/** S15.4 / S16 — optional spark.stop() after pipeline code. */
export function generateSparkSessionStopCode(config: any): string {
  if (config.tsCFbooleanConfirmStop === true || config.tsCFbooleanConfirmStop === 'true') {
    return `
# Spark Session Stop
try:
    spark.stop()
    print("SparkSession stopped")
except NameError:
    print("No active SparkSession named spark to stop")
`;
  }
  return `
# Spark Session Stop (no-op)
# Enable "Confirm stop SparkSession" to call spark.stop(). Prefer kernel restart to switch clusters.
`;
}

/** S12.3 / S17 — temp view + spark.sql on an upstream Spark DataFrame. */
export function generateSparkSqlTransformCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const viewRaw = String(config.tsCFinputTempViewName || 'amphi_spark_in').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(viewRaw)) {
    throw new Error(
      'Spark SQL Transform: temp view name must be a simple SQL identifier (letters, digits, underscore).'
    );
  }
  const viewName = escapePyDouble(viewRaw);
  let sql = parseSqlFromConfigValue(config.tsCFcodeTextareaSqlQuery);
  if (!sql) {
    throw new Error('Spark SQL Transform: SQL query is empty.');
  }
  if (hasMultipleSqlStatements(sql)) {
    throw new Error(
      'Spark SQL Transform: multiple SQL statements are not supported.'
    );
  }
  sql = sql.replace(/;+\s*$/, '');
  const sqlEscaped = escapePyTripleSql(sql);

  return `
# Spark SQL Transform
try:
    spark
except NameError as _amphi_spark_err:
    raise RuntimeError(
        "Spark SQL Transform requires an active SparkSession named 'spark'."
    ) from _amphi_spark_err
${inputName}.createOrReplaceTempView("${viewName}")
try:
    ${outputName} = spark.sql("""
${sqlEscaped}
    """)
except Exception as _amphi_sql_err:
    raise RuntimeError(
        "Spark SQL Transform failed. Check the SQL and temp view name '${viewName}'."
    ) from _amphi_sql_err
`;
}

/** S21 — Spark DataFrame.limit (native). */
export function generateSparkLimitCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const maxRows = parseMaxRows(config.tsCFinputMaxRows, 1000);
  return `
# Spark Limit
${outputName} = ${inputName}.limit(${maxRows})
`;
}

/** S21 — Spark DataFrame.dropDuplicates (native). */
export function generateSparkDropDuplicatesCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const subsetRaw = String(config.tsCFinputSubsetColumns || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  for (const col of subsetRaw) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
      throw new Error(
        `Spark Drop Duplicates: invalid column "${col}". Use simple identifiers, comma-separated.`
      );
    }
  }
  if (subsetRaw.length === 0) {
    return `
# Spark Drop Duplicates
${outputName} = ${inputName}.dropDuplicates()
`;
  }
  const cols = subsetRaw.map((c: string) => `"${escapePyDouble(c)}"`).join(', ');
  return `
# Spark Drop Duplicates
${outputName} = ${inputName}.dropDuplicates([${cols}])
`;
}

/** S22 — Spark DataFrame.select (native). */
export function generateSparkSelectColumnsCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const colsRaw = String(config.tsCFinputColumns || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (colsRaw.length === 0) {
    throw new Error(
      'Spark Select Columns: provide at least one column name (comma-separated).'
    );
  }
  for (const col of colsRaw) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
      throw new Error(
        `Spark Select Columns: invalid column "${col}". Use simple identifiers, comma-separated.`
      );
    }
  }
  const cols = colsRaw.map((c: string) => `"${escapePyDouble(c)}"`).join(', ');
  return `
# Spark Select Columns
${outputName} = ${inputName}.select(${cols})
`;
}

/** S23 — Spark DataFrame.filter with a SQL expression string. */
export function generateSparkFilterCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const expr = String(config.tsCFinputFilterExpr || '').trim();
  if (!expr) {
    throw new Error('Spark Filter: filter expression is empty.');
  }
  if (hasMultipleSqlStatements(expr) || expr.includes(';')) {
    throw new Error(
      'Spark Filter: multiple statements / semicolons are not supported.'
    );
  }
  const escaped = escapePyDouble(expr);
  return `
# Spark Filter
${outputName} = ${inputName}.filter("${escaped}")
`;
}

/** S24 — Spark DataFrame.orderBy. */
export function generateSparkOrderByCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const colsRaw = String(config.tsCFinputOrderBy || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (colsRaw.length === 0) {
    throw new Error(
      'Spark Order By: provide at least one column name (comma-separated).'
    );
  }
  for (const col of colsRaw) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
      throw new Error(
        `Spark Order By: invalid column "${col}". Use simple identifiers, comma-separated.`
      );
    }
  }
  const desc =
    config.tsCFradioSortDirection === 'desc' ||
    config.tsCFradioSortDirection === 'DESC';
  const cols = colsRaw
    .map((c: string) => {
      const name = `"${escapePyDouble(c)}"`;
      return desc ? `${name}.desc()` : name;
    })
    .join(', ');
  // .desc() requires Column objects — use F.col when descending
  if (desc) {
    const fcols = colsRaw
      .map((c: string) => `__F.col("${escapePyDouble(c)}").desc()`)
      .join(', ');
    return `
# Spark Order By
from pyspark.sql import functions as __F
${outputName} = ${inputName}.orderBy(${fcols})
`;
  }
  return `
# Spark Order By
${outputName} = ${inputName}.orderBy(${cols})
`;
}

/** S25 — repartition or coalesce. */
export function generateSparkRepartitionCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioPartitionMode || 'repartition').toLowerCase();
  const n = parseInt(String(config.tsCFinputNumPartitions || ''), 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(
      'Spark Repartition: num partitions must be an integer >= 1.'
    );
  }
  if (mode === 'coalesce') {
    return `
# Spark Repartition (coalesce)
${outputName} = ${inputName}.coalesce(${n})
`;
  }
  const colsRaw = String(config.tsCFinputPartitionColumns || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  for (const col of colsRaw) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
      throw new Error(
        `Spark Repartition: invalid column "${col}". Use simple identifiers, comma-separated.`
      );
    }
  }
  if (colsRaw.length > 0) {
    const cols = colsRaw.map((c: string) => `"${escapePyDouble(c)}"`).join(', ');
    return `
# Spark Repartition
${outputName} = ${inputName}.repartition(${n}, ${cols})
`;
  }
  return `
# Spark Repartition
${outputName} = ${inputName}.repartition(${n})
`;
}

/** S25 — DataFrame.sample. */
export function generateSparkSampleCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const fraction = parseFloat(String(config.tsCFinputSampleFraction ?? '0.1'));
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1) {
    throw new Error(
      'Spark Sample: fraction must be a number in (0, 1].'
    );
  }
  const withReplacement =
    config.tsCFbooleanWithReplacement === true ||
    config.tsCFbooleanWithReplacement === 'true';
  const seedRaw = String(config.tsCFinputSampleSeed || '').trim();
  let seedArg = '';
  if (seedRaw) {
    const seed = parseInt(seedRaw, 10);
    if (!Number.isFinite(seed)) {
      throw new Error('Spark Sample: seed must be an integer when set.');
    }
    seedArg = `, seed=${seed}`;
  }
  return `
# Spark Sample
${outputName} = ${inputName}.sample(${withReplacement ? 'True' : 'False'}, ${fraction}${seedArg})
`;
}

/** S26 — withColumn from a SQL expression. */
export function generateSparkWithColumnCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const colName = String(config.tsCFinputColumnName || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(colName)) {
    throw new Error(
      'Spark With Column: column name must be a simple SQL identifier.'
    );
  }
  const expr = String(config.tsCFinputColumnExpr || '').trim();
  if (!expr) {
    throw new Error('Spark With Column: expression is empty.');
  }
  if (hasMultipleSqlStatements(expr) || expr.includes(';')) {
    throw new Error(
      'Spark With Column: multiple statements / semicolons are not supported.'
    );
  }
  return `
# Spark With Column
from pyspark.sql import functions as __F
${outputName} = ${inputName}.withColumn("${escapePyDouble(colName)}", __F.expr("${escapePyDouble(expr)}"))
`;
}

/** S28 — cache / persist / unpersist. */
export function generateSparkCacheCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioCacheMode || 'cache').toLowerCase();
  if (mode === 'unpersist') {
    return `
# Spark Cache (unpersist)
${outputName} = ${inputName}
${outputName}.unpersist()
`;
  }
  if (mode === 'persist') {
    const level = String(config.tsCFradioStorageLevel || 'MEMORY_AND_DISK');
    const allowed = [
      'MEMORY_ONLY',
      'MEMORY_AND_DISK',
      'DISK_ONLY',
      'MEMORY_ONLY_SER',
      'MEMORY_AND_DISK_SER'
    ];
    if (!allowed.includes(level)) {
      throw new Error(
        `Spark Cache: unsupported storage level "${level}".`
      );
    }
    return `
# Spark Cache (persist)
from pyspark import StorageLevel
${outputName} = ${inputName}.persist(StorageLevel.${level})
`;
  }
  return `
# Spark Cache
${outputName} = ${inputName}.cache()
`;
}

function parseSimpleColumnList(
  raw: string,
  label: string
): string[] {
  const cols = String(raw || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  for (const col of cols) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
      throw new Error(
        `${label}: invalid column "${col}". Use simple identifiers, comma-separated.`
      );
    }
  }
  return cols;
}

/** S29 — drop columns. */
export function generateSparkDropColumnsCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const cols = parseSimpleColumnList(config.tsCFinputColumns, 'Spark Drop Columns');
  if (cols.length === 0) {
    throw new Error(
      'Spark Drop Columns: provide at least one column name (comma-separated).'
    );
  }
  const listed = cols.map((c: string) => `"${escapePyDouble(c)}"`).join(', ');
  return `
# Spark Drop Columns
${outputName} = ${inputName}.drop(${listed})
`;
}

/** S29 — distinct rows. */
export function generateSparkDistinctCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  return `
# Spark Distinct
${outputName} = ${inputName}.distinct()
`;
}

/** S30 — union / unionByName of two Spark DataFrames. */
export function generateSparkUnionCode(
  config: any,
  inputName1: string,
  inputName2: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioUnionMode || 'unionByName').toLowerCase();
  if (mode === 'union') {
    return `
# Spark Union
${outputName} = ${inputName1}.union(${inputName2})
`;
  }
  const allowMissing =
    config.tsCFbooleanAllowMissingColumns === true ||
    config.tsCFbooleanAllowMissingColumns === 'true';
  if (allowMissing) {
    return `
# Spark Union (unionByName, allowMissingColumns)
${outputName} = ${inputName1}.unionByName(${inputName2}, allowMissingColumns=True)
`;
  }
  return `
# Spark Union (unionByName)
${outputName} = ${inputName1}.unionByName(${inputName2})
`;
}

/** S30 — join two Spark DataFrames. */
export function generateSparkJoinCode(
  config: any,
  inputName1: string,
  inputName2: string,
  outputName: string
): string {
  const how = String(config.tsCFradioJoinType || 'inner').toLowerCase();
  const allowedHow = ['inner', 'left', 'right', 'outer', 'left_semi', 'left_anti', 'cross'];
  if (!allowedHow.includes(how)) {
    throw new Error(
      `Spark Join: unsupported join type "${how}". Use one of ${allowedHow.join(', ')}.`
    );
  }
  if (how === 'cross') {
    return `
# Spark Join (cross)
${outputName} = ${inputName1}.crossJoin(${inputName2})
`;
  }
  const onCols = parseSimpleColumnList(config.tsCFinputJoinColumns, 'Spark Join');
  if (onCols.length === 0) {
    throw new Error(
      'Spark Join: provide at least one join column (comma-separated), or use cross join.'
    );
  }
  const onArg =
    onCols.length === 1
      ? `"${escapePyDouble(onCols[0])}"`
      : `[${onCols.map((c: string) => `"${escapePyDouble(c)}"`).join(', ')}]`;
  return `
# Spark Join (${how})
${outputName} = ${inputName1}.join(${inputName2}, on=${onArg}, how="${escapePyDouble(how)}")
`;
}

const SPARK_AGG_OPS: Record<string, string> = {
  min: 'min',
  max: 'max',
  sum: 'sum',
  avg: 'avg',
  mean: 'avg',
  count: 'count',
  countdistinct: 'countDistinct',
  nunique: 'countDistinct',
  first: 'first',
  last: 'last',
  std: 'stddev',
  stddev: 'stddev',
  var: 'variance',
  variance: 'variance'
};

export type SparkAggSpec = { op: string; column: string; alias: string };

/** Parse lines/entries like `sum:amount`, `count:id:cnt`, `avg:price as avg_price`. */
export function parseSparkAggregations(raw: string): SparkAggSpec[] {
  const text = String(raw || '').trim();
  if (!text) {
    return [];
  }
  const chunks = text
    .split(/[\n,]+/)
    .map((s: string) => s.trim())
    .filter(Boolean);
  const specs: SparkAggSpec[] = [];
  for (const chunk of chunks) {
    const asMatch = chunk.match(
      /^([A-Za-z_]+)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i
    );
    const colonMatch = chunk.match(
      /^([A-Za-z_]+)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([A-Za-z_][A-Za-z0-9_]*))?$/
    );
    const m = asMatch || colonMatch;
    if (!m) {
      throw new Error(
        `Spark Aggregate: invalid aggregation "${chunk}". Use op:column, op:column:alias, or op:column as alias.`
      );
    }
    const opKey = m[1].toLowerCase();
    const fn = SPARK_AGG_OPS[opKey];
    if (!fn) {
      throw new Error(
        `Spark Aggregate: unsupported op "${m[1]}". Use one of: ${Object.keys(SPARK_AGG_OPS).join(', ')}.`
      );
    }
    const column = m[2];
    const alias =
      m[3] ||
      `${column}_${opKey}`.replace(/[^A-Za-z0-9_]/g, '_');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
      throw new Error(`Spark Aggregate: invalid alias "${alias}".`);
    }
    specs.push({ op: fn, column, alias });
  }
  return specs;
}

/** S31 — groupBy + agg (or global agg when group-by empty). */
export function generateSparkAggregateCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const groupCols = parseSimpleColumnList(
    config.tsCFinputGroupByColumns || '',
    'Spark Aggregate group-by'
  );
  const specs = parseSparkAggregations(config.tsCFtextareaAggregations);
  if (specs.length === 0) {
    throw new Error(
      'Spark Aggregate: provide at least one aggregation (e.g. sum:amount or count:id:cnt).'
    );
  }
  const aggArgs = specs
    .map(
      (s: SparkAggSpec) =>
        `F.${s.op}("${escapePyDouble(s.column)}").alias("${escapePyDouble(s.alias)}")`
    )
    .join(', ');
  if (groupCols.length === 0) {
    return `
# Spark Aggregate (global)
from pyspark.sql import functions as F
${outputName} = ${inputName}.agg(${aggArgs})
`;
  }
  const groupArg = groupCols
    .map((c: string) => `"${escapePyDouble(c)}"`)
    .join(', ');
  return `
# Spark Aggregate
from pyspark.sql import functions as F
${outputName} = ${inputName}.groupBy(${groupArg}).agg(${aggArgs})
`;
}

/** Parse `old:new` pairs (comma or newline separated). */
export function parseSparkRenameMappings(
  raw: string
): Array<{ from: string; to: string }> {
  const text = String(raw || '').trim();
  if (!text) {
    return [];
  }
  const chunks = text
    .split(/[\n,]+/)
    .map((s: string) => s.trim())
    .filter(Boolean);
  const pairs: Array<{ from: string; to: string }> = [];
  for (const chunk of chunks) {
    const m = chunk.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/
    );
    if (!m) {
      throw new Error(
        `Spark Rename Columns: invalid mapping "${chunk}". Use old:new (comma or newline separated).`
      );
    }
    if (m[1] === m[2]) {
      throw new Error(
        `Spark Rename Columns: "${m[1]}" renames to itself; remove redundant mappings.`
      );
    }
    pairs.push({ from: m[1], to: m[2] });
  }
  return pairs;
}

/** S32 — chained withColumnRenamed. */
export function generateSparkRenameColumnsCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const pairs = parseSparkRenameMappings(config.tsCFtextareaRenameMappings);
  if (pairs.length === 0) {
    throw new Error(
      'Spark Rename Columns: provide at least one mapping (old:new).'
    );
  }
  let expr = inputName;
  for (const p of pairs) {
    expr = `${expr}.withColumnRenamed("${escapePyDouble(p.from)}", "${escapePyDouble(p.to)}")`;
  }
  return `
# Spark Rename Columns
${outputName} = ${expr}
`;
}

const SPARK_FILL_MODES = ['value', 'dropna_any', 'dropna_all'] as const;

/** S33 — fillna constant or dropna. */
export function generateSparkFillNaCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioFillMode || 'value').toLowerCase();
  if (!SPARK_FILL_MODES.includes(mode as (typeof SPARK_FILL_MODES)[number])) {
    throw new Error(
      `Spark Fill Na: unsupported mode "${mode}". Use value, dropna_any, or dropna_all.`
    );
  }
  const subset = parseSimpleColumnList(
    config.tsCFinputColumns || '',
    'Spark Fill Na columns'
  );
  const subsetArg =
    subset.length > 0
      ? `, subset=[${subset.map((c: string) => `"${escapePyDouble(c)}"`).join(', ')}]`
      : '';

  if (mode === 'dropna_any') {
    return `
# Spark Drop Na (any)
${outputName} = ${inputName}.dropna(how="any"${subsetArg})
`;
  }
  if (mode === 'dropna_all') {
    return `
# Spark Drop Na (all)
${outputName} = ${inputName}.dropna(how="all"${subsetArg})
`;
  }

  const fillRaw = String(config.tsCFinputFillValue ?? '').trim();
  if (fillRaw === '') {
    throw new Error(
      'Spark Fill Na: provide a fill value for mode=value (string, number, or true/false/null).'
    );
  }
  let fillExpr: string;
  const lower = fillRaw.toLowerCase();
  if (lower === 'null' || lower === 'none') {
    fillExpr = 'None';
  } else if (lower === 'true') {
    fillExpr = 'True';
  } else if (lower === 'false') {
    fillExpr = 'False';
  } else if (/^-?\d+$/.test(fillRaw)) {
    fillExpr = fillRaw;
  } else if (/^-?\d+\.\d+$/.test(fillRaw)) {
    fillExpr = fillRaw;
  } else {
    fillExpr = `"${escapePyDouble(fillRaw)}"`;
  }
  return `
# Spark Fill Na
${outputName} = ${inputName}.fillna(${fillExpr}${subsetArg})
`;
}

/** Split on commas/newlines outside parentheses. */
function splitMappingChunks(raw: string): string[] {
  const text = String(raw || '');
  const chunks: string[] = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') {
      depth += 1;
      buf += ch;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      buf += ch;
      continue;
    }
    if ((ch === ',' || ch === '\n') && depth === 0) {
      const piece = buf.trim();
      if (piece) {
        chunks.push(piece);
      }
      buf = '';
      continue;
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last) {
    chunks.push(last);
  }
  return chunks;
}

const SPARK_CAST_TYPES = new Set([
  'string',
  'boolean',
  'byte',
  'short',
  'int',
  'integer',
  'long',
  'float',
  'double',
  'decimal',
  'date',
  'timestamp',
  'binary'
]);

/** S34 — cast columns: col:type pairs. */
export function generateSparkCastCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const text = String(config.tsCFtextareaCastMappings || '').trim();
  if (!text) {
    throw new Error(
      'Spark Cast: provide at least one mapping (column:type), e.g. amount:double.'
    );
  }
  const chunks = splitMappingChunks(text);
  const casts: Array<{ column: string; typeName: string }> = [];
  for (const chunk of chunks) {
    const m = chunk.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?)$/
    );
    if (!m) {
      throw new Error(
        `Spark Cast: invalid mapping "${chunk}". Use column:type (e.g. amount:double or price:decimal(10,2)).`
      );
    }
    const typeName = m[2];
    const typeBase = typeName.toLowerCase().replace(/\(.*\)$/, '');
    if (!SPARK_CAST_TYPES.has(typeBase)) {
      throw new Error(
        `Spark Cast: unsupported type "${typeName}". Use string, boolean, byte, short, int, long, float, double, decimal[(p,s)], date, timestamp, binary.`
      );
    }
    if (typeBase === 'decimal' && /\(/.test(typeName)) {
      if (!/^decimal\(\d+\s*,\s*\d+\)$/i.test(typeName)) {
        throw new Error(
          `Spark Cast: invalid decimal type "${typeName}". Use decimal(precision,scale).`
        );
      }
    }
    casts.push({ column: m[1], typeName });
  }
  let expr = inputName;
  for (const c of casts) {
    expr = `${expr}.withColumn("${escapePyDouble(c.column)}", F.col("${escapePyDouble(c.column)}").cast("${escapePyDouble(c.typeName)}"))`;
  }
  return `
# Spark Cast
from pyspark.sql import functions as F
${outputName} = ${expr}
`;
}

/** S35 — spark.read parquet/csv/json → Spark DataFrame. */
export function generateSparkFileInputCode(
  config: any,
  outputName: string
): string {
  const pathRaw = String(config.tsCFinputFilePath || '').trim();
  if (!pathRaw) {
    throw new Error('Spark File Input: path is required.');
  }
  if (pathRaw.includes('"') || pathRaw.includes('\n') || pathRaw.includes('\0')) {
    throw new Error('Spark File Input: path contains illegal characters.');
  }
  const path = escapePyDouble(pathRaw);
  const format = String(config.tsCFradioFormat || 'parquet').toLowerCase();
  const allowed = ['parquet', 'csv', 'json'];
  if (!allowed.includes(format)) {
    throw new Error(
      `Spark File Input: unsupported format "${format}". Use parquet, csv, or json.`
    );
  }
  const header =
    config.tsCFbooleanCsvHeader === true || config.tsCFbooleanCsvHeader === 'true';
  const maxRows = parseMaxRows(config.tsCFinputMaxRows, 10000);

  let readerChain = `spark.read.format("${format}")`;
  if (format === 'csv' && header) {
    readerChain += `.option("header", "true")`;
  }
  const body = `
    ${outputName} = ${readerChain}.load("${path}")
    _max_rows = ${maxRows}
    if _max_rows > 0:
        ${outputName} = ${outputName}.limit(_max_rows)
`;

  if (shouldUseSharedSparkSession(config)) {
    return `
# Spark File Input (shared session)
try:
${body}
except Exception as _amphi_spark_err:
    raise RuntimeError(
        "Spark File Input failed (shared session / path / format). "
        "Ensure a Spark Connect Session node ran first, and check the cluster path. "
        f"Underlying error: {_amphi_spark_err}"
    ) from _amphi_spark_err
`;
  }

  const appName = escapePyDouble(
    config.tsCFinputAppName || 'amphi-spark-sql-input'
  );
  const authBlock = authUrlPythonBlock(config);
  return `
# Spark File Input
${connectUrlPythonAssign(config)}_app_name = os.getenv("SPARK_APP_NAME", "${appName}")
${authBlock}
try:
    spark = (
        SparkSession.builder
        .appName(_app_name)
        .remote(_spark_url)
        .getOrCreate()
    )
${body}
except Exception as _amphi_spark_err:
    raise RuntimeError(
        "Spark File Input failed (Connect URL / auth / path / format). "
        "Check SPARK_CONNECT_URL, credentials, and that the path is visible to the cluster. "
        f"Underlying error: {_amphi_spark_err}"
    ) from _amphi_spark_err
`;
}

const SPARK_EXPLODE_MODES = [
  'explode',
  'explode_outer',
  'posexplode',
  'posexplode_outer'
] as const;

/** S36 — explode / posexplode array or map columns. */
export function generateSparkExplodeCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = String(config.tsCFinputExplodeColumn || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
    throw new Error(
      'Spark Explode: column must be a simple identifier.'
    );
  }
  const mode = String(config.tsCFradioExplodeMode || 'explode').toLowerCase();
  if (
    !SPARK_EXPLODE_MODES.includes(mode as (typeof SPARK_EXPLODE_MODES)[number])
  ) {
    throw new Error(
      `Spark Explode: unsupported mode "${mode}". Use explode, explode_outer, posexplode, or posexplode_outer.`
    );
  }
  const valueAliasRaw = String(config.tsCFinputValueAlias || col).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(valueAliasRaw)) {
    throw new Error('Spark Explode: value alias must be a simple identifier.');
  }
  const valueAlias = escapePyDouble(valueAliasRaw);
  const dropOriginal =
    config.tsCFbooleanDropOriginal === true ||
    config.tsCFbooleanDropOriginal === 'true';
  const colEsc = escapePyDouble(col);

  let selectExpr: string;
  if (mode === 'explode' || mode === 'explode_outer') {
    const fn = mode === 'explode_outer' ? 'explode_outer' : 'explode';
    selectExpr = `F.${fn}(F.col("${colEsc}")).alias("${valueAlias}")`;
  } else {
    const posAliasRaw = String(config.tsCFinputPosAlias || 'pos').trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(posAliasRaw)) {
      throw new Error('Spark Explode: position alias must be a simple identifier.');
    }
    const posAlias = escapePyDouble(posAliasRaw);
    const fn = mode === 'posexplode_outer' ? 'posexplode_outer' : 'posexplode';
    selectExpr = `F.${fn}(F.col("${colEsc}")).alias("${posAlias}", "${valueAlias}")`;
  }

  const dropLine = dropOriginal
    ? `\n${outputName} = ${outputName}.drop("${colEsc}")`
    : '';

  return `
# Spark Explode (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.select("*", ${selectExpr})${dropLine}
`;
}

const SPARK_WINDOW_FNS = new Set([
  'row_number',
  'rank',
  'dense_rank',
  'percent_rank',
  'ntile',
  'lag',
  'lead',
  'sum',
  'avg',
  'min',
  'max',
  'count'
]);

/** S37 — window function over partition/order. */
export function generateSparkWindowCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const fn = String(config.tsCFradioWindowFn || 'row_number').toLowerCase();
  if (!SPARK_WINDOW_FNS.has(fn)) {
    throw new Error(
      `Spark Window: unsupported function "${fn}". Use ${[...SPARK_WINDOW_FNS].join(', ')}.`
    );
  }
  const outCol = String(config.tsCFinputResultColumn || 'w').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error('Spark Window: result column must be a simple identifier.');
  }
  const partitionCols = parseSimpleColumnList(
    config.tsCFinputPartitionBy || '',
    'Spark Window partitionBy'
  );
  const orderCols = parseSimpleColumnList(
    config.tsCFinputOrderBy || '',
    'Spark Window orderBy'
  );
  const orderDesc =
    config.tsCFradioOrderDirection === 'desc' ||
    config.tsCFradioOrderDirection === 'DESC';

  let windowChain = 'Window';
  if (partitionCols.length > 0) {
    windowChain += `.partitionBy(${partitionCols
      .map((c: string) => `"${escapePyDouble(c)}"`)
      .join(', ')})`;
  }
  if (orderCols.length > 0) {
    if (orderDesc) {
      windowChain += `.orderBy(${orderCols
        .map((c: string) => `F.col("${escapePyDouble(c)}").desc()`)
        .join(', ')})`;
    } else {
      windowChain += `.orderBy(${orderCols
        .map((c: string) => `"${escapePyDouble(c)}"`)
        .join(', ')})`;
    }
  }

  let fnExpr: string;
  if (fn === 'row_number' || fn === 'rank' || fn === 'dense_rank' || fn === 'percent_rank') {
    if (orderCols.length === 0) {
      throw new Error(
        `Spark Window: ${fn} requires Order by columns.`
      );
    }
    const rankingFn =
      fn === 'dense_rank'
        ? 'dense_rank'
        : fn === 'percent_rank'
          ? 'percent_rank'
          : fn;
    fnExpr = `F.${rankingFn}()`;
  } else if (fn === 'ntile') {
    if (orderCols.length === 0) {
      throw new Error('Spark Window: ntile requires Order by columns.');
    }
    const buckets = parseInt(String(config.tsCFinputNtileBuckets || '4'), 10);
    if (!Number.isFinite(buckets) || buckets < 1) {
      throw new Error('Spark Window: ntile buckets must be an integer >= 1.');
    }
    fnExpr = `F.ntile(${buckets})`;
  } else if (fn === 'lag' || fn === 'lead') {
    const valueCol = String(config.tsCFinputValueColumn || '').trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(valueCol)) {
      throw new Error(`Spark Window: ${fn} requires a value column.`);
    }
    if (orderCols.length === 0) {
      throw new Error(`Spark Window: ${fn} requires Order by columns.`);
    }
    const offset = parseInt(String(config.tsCFinputOffset || '1'), 10);
    if (!Number.isFinite(offset) || offset < 1) {
      throw new Error(`Spark Window: ${fn} offset must be an integer >= 1.`);
    }
    fnExpr = `F.${fn}(F.col("${escapePyDouble(valueCol)}"), ${offset})`;
  } else {
    // sum/avg/min/max/count
    const valueCol = String(config.tsCFinputValueColumn || '').trim();
    if (fn === 'count' && (valueCol === '*' || valueCol === '')) {
      fnExpr = 'F.count(F.lit(1))';
    } else {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(valueCol)) {
        throw new Error(`Spark Window: ${fn} requires a value column.`);
      }
      fnExpr = `F.${fn}(F.col("${escapePyDouble(valueCol)}"))`;
    }
  }

  return `
# Spark Window (${fn})
from pyspark.sql import functions as F
from pyspark.sql.window import Window
_w = ${windowChain}
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${fnExpr}.over(_w))
`;
}

const SPARK_PIVOT_AGGS = new Set(['sum', 'avg', 'mean', 'min', 'max', 'count']);

/** S38 — groupBy + pivot + agg. */
export function generateSparkPivotCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const groupCols = parseSimpleColumnList(
    config.tsCFinputGroupByColumns || '',
    'Spark Pivot group-by'
  );
  if (groupCols.length === 0) {
    throw new Error(
      'Spark Pivot: provide at least one group-by column.'
    );
  }
  const pivotCol = String(config.tsCFinputPivotColumn || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(pivotCol)) {
    throw new Error('Spark Pivot: pivot column must be a simple identifier.');
  }
  const agg = String(config.tsCFradioAggFunc || 'sum').toLowerCase();
  const aggFn = agg === 'mean' ? 'avg' : agg;
  if (!SPARK_PIVOT_AGGS.has(agg) && aggFn !== 'avg') {
    throw new Error(
      `Spark Pivot: unsupported aggregation "${agg}". Use sum, avg/mean, min, max, count.`
    );
  }
  const valueCol = String(config.tsCFinputValueColumn || '').trim();
  if (aggFn !== 'count' || (valueCol && valueCol !== '*')) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(valueCol)) {
      throw new Error('Spark Pivot: value column must be a simple identifier.');
    }
  }

  const valuesRaw = String(config.tsCFinputPivotValues || '').trim();
  let pivotValuesArg = '';
  if (valuesRaw) {
    const vals = valuesRaw
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (vals.length === 0) {
      throw new Error('Spark Pivot: pivot values list is empty after parsing.');
    }
    for (const v of vals) {
      if (/[\n\r"]/.test(v)) {
        throw new Error(`Spark Pivot: invalid pivot value "${v}".`);
      }
    }
    pivotValuesArg = `, [${vals.map((v: string) => `"${escapePyDouble(v)}"`).join(', ')}]`;
  }

  const groupArg = groupCols
    .map((c: string) => `"${escapePyDouble(c)}"`)
    .join(', ');
  let aggExpr: string;
  if (aggFn === 'count' && (!valueCol || valueCol === '*')) {
    aggExpr = 'F.count(F.lit(1))';
  } else {
    aggExpr = `F.${aggFn}(F.col("${escapePyDouble(valueCol)}"))`;
  }

  return `
# Spark Pivot
from pyspark.sql import functions as F
${outputName} = (
    ${inputName}
    .groupBy(${groupArg})
    .pivot("${escapePyDouble(pivotCol)}"${pivotValuesArg})
    .agg(${aggExpr})
)
`;
}

/** S39 — unpivot / melt (Spark 3.4+ DataFrame.unpivot). */
export function generateSparkUnpivotCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const idCols = parseSimpleColumnList(
    config.tsCFinputIdColumns || '',
    'Spark Unpivot id columns'
  );
  const valueCols = parseSimpleColumnList(
    config.tsCFinputValueColumns || '',
    'Spark Unpivot value columns'
  );
  if (valueCols.length === 0) {
    throw new Error(
      'Spark Unpivot: provide at least one value column to unpivot.'
    );
  }
  const varName = String(config.tsCFinputVariableColumn || 'variable').trim();
  const valName = String(config.tsCFinputValueColumnName || 'value').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(varName)) {
    throw new Error('Spark Unpivot: variable column name must be a simple identifier.');
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(valName)) {
    throw new Error('Spark Unpivot: value column name must be a simple identifier.');
  }
  const idsArg =
    idCols.length === 0
      ? '[]'
      : `[${idCols.map((c: string) => `"${escapePyDouble(c)}"`).join(', ')}]`;
  const valsArg = `[${valueCols.map((c: string) => `"${escapePyDouble(c)}"`).join(', ')}]`;
  return `
# Spark Unpivot
${outputName} = ${inputName}.unpivot(
    ${idsArg},
    ${valsArg},
    "${escapePyDouble(varName)}",
    "${escapePyDouble(valName)}"
)
`;
}

/** S40 — concat / concat_ws into a new column. */
export function generateSparkConcatColumnsCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const cols = parseSimpleColumnList(
    config.tsCFinputColumns || '',
    'Spark Concat Columns'
  );
  if (cols.length < 2) {
    throw new Error(
      'Spark Concat Columns: provide at least two columns (comma-separated).'
    );
  }
  const outCol = String(config.tsCFinputNewColumnName || 'concat_col').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error(
      'Spark Concat Columns: new column name must be a simple identifier.'
    );
  }
  const sep = String(config.tsCFinputSeparator ?? '');
  const colArgs = cols
    .map((c: string) => `F.col("${escapePyDouble(c)}").cast("string")`)
    .join(', ');
  const expr =
    sep.length > 0
      ? `F.concat_ws("${escapePyDouble(sep)}", ${colArgs})`
      : `F.concat(${colArgs})`;
  return `
# Spark Concat Columns
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S41 — add a row id column. */
export function generateSparkGenerateIdCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const colName = String(config.tsCFinputRowIdName || 'id').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(colName)) {
    throw new Error(
      'Spark Generate ID: column name must be a simple identifier.'
    );
  }
  const mode = String(config.tsCFradioIdMode || 'row_number').toLowerCase();
  if (mode === 'monotonically_increasing_id') {
    return `
# Spark Generate ID (monotonically_increasing_id)
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(colName)}", F.monotonically_increasing_id())
`;
  }
  if (mode !== 'row_number') {
    throw new Error(
      'Spark Generate ID: mode must be row_number or monotonically_increasing_id.'
    );
  }
  const startRaw = String(config.tsCFinputStartingValue ?? '1').trim();
  const start = parseInt(startRaw, 10);
  if (!Number.isFinite(start)) {
    throw new Error('Spark Generate ID: starting value must be an integer.');
  }
  const offset = start - 1;
  const offsetExpr = offset === 0 ? '' : ` + ${offset}`;
  return `
# Spark Generate ID (row_number)
from pyspark.sql import functions as F
from pyspark.sql.window import Window
_w = Window.orderBy(F.monotonically_increasing_id())
${outputName} = ${inputName}.withColumn(
    "${escapePyDouble(colName)}",
    F.row_number().over(_w)${offsetExpr}
)
`;
}

/** S42 — coalesce multiple columns into one. */
export function generateSparkCoalesceCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const cols = parseSimpleColumnList(
    config.tsCFinputColumns || '',
    'Spark Coalesce'
  );
  if (cols.length < 2) {
    throw new Error(
      'Spark Coalesce: provide at least two columns (comma-separated).'
    );
  }
  const outCol = String(config.tsCFinputNewColumnName || cols[0]).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error(
      'Spark Coalesce: result column name must be a simple identifier.'
    );
  }
  const dropSource =
    config.tsCFbooleanDropSources === true ||
    config.tsCFbooleanDropSources === 'true';
  const args = cols
    .map((c: string) => `F.col("${escapePyDouble(c)}")`)
    .join(', ');
  const dropCols = cols.filter((c: string) => c !== outCol);
  const dropLine =
    dropSource && dropCols.length > 0
      ? `\n${outputName} = ${outputName}.drop(${dropCols
          .map((c: string) => `"${escapePyDouble(c)}"`)
          .join(', ')})`
      : '';
  return `
# Spark Coalesce
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", F.coalesce(${args}))${dropLine}
`;
}

/** S43 — when/otherwise (single condition) via F.when. */
export function generateSparkWhenCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const condition = String(config.tsCFinputCondition || '').trim();
  if (!condition) {
    throw new Error('Spark When: condition expression is required.');
  }
  if (hasMultipleSqlStatements(condition) || condition.includes(';')) {
    throw new Error(
      'Spark When: condition must be a single expression (no semicolons).'
    );
  }
  const thenExpr = String(config.tsCFinputThenExpr || '').trim();
  if (!thenExpr) {
    throw new Error('Spark When: then expression is required.');
  }
  if (hasMultipleSqlStatements(thenExpr) || thenExpr.includes(';')) {
    throw new Error('Spark When: then expression must be a single expression.');
  }
  const elseExpr = String(config.tsCFinputElseExpr || '').trim();
  if (elseExpr && (hasMultipleSqlStatements(elseExpr) || elseExpr.includes(';'))) {
    throw new Error('Spark When: else expression must be a single expression.');
  }
  const outCol = String(config.tsCFinputResultColumn || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error('Spark When: result column must be a simple identifier.');
  }
  let whenChain = `F.when(F.expr("${escapePyDouble(condition)}"), F.expr("${escapePyDouble(thenExpr)}"))`;
  if (elseExpr) {
    whenChain += `.otherwise(F.expr("${escapePyDouble(elseExpr)}"))`;
  }
  return `
# Spark When
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${whenChain})
`;
}

/** S44 — string replace on a column. */
export function generateSparkStringReplaceCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = String(config.tsCFinputColumn || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
    throw new Error('Spark String Replace: column must be a simple identifier.');
  }
  const pattern = String(config.tsCFinputPattern ?? '');
  if (pattern === '') {
    throw new Error('Spark String Replace: search pattern is required.');
  }
  const replacement = String(config.tsCFinputReplacement ?? '');
  const useRegex =
    config.tsCFbooleanUseRegex === true || config.tsCFbooleanUseRegex === 'true';
  const outCol = String(config.tsCFinputResultColumn || col).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error(
      'Spark String Replace: result column must be a simple identifier.'
    );
  }
  const expr = useRegex
    ? `F.regexp_replace(F.col("${escapePyDouble(col)}"), "${escapePyDouble(pattern)}", "${escapePyDouble(replacement)}")`
    : `F.regexp_replace(F.col("${escapePyDouble(col)}"), "${escapePyDouble(
        pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      )}", "${escapePyDouble(replacement)}")`;
  return `
# Spark String Replace${useRegex ? ' (regex)' : ''}
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

const SPARK_TRIM_MODES = ['both', 'leading', 'trailing'] as const;

/** S45 — trim whitespace (or custom chars) on a string column. */
export function generateSparkTrimCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = String(config.tsCFinputColumn || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
    throw new Error('Spark Trim: column must be a simple identifier.');
  }
  const mode = String(config.tsCFradioTrimMode || 'both').toLowerCase();
  if (!SPARK_TRIM_MODES.includes(mode as (typeof SPARK_TRIM_MODES)[number])) {
    throw new Error(
      'Spark Trim: mode must be both, leading, or trailing.'
    );
  }
  const outCol = String(config.tsCFinputResultColumn || col).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error('Spark Trim: result column must be a simple identifier.');
  }
  const trimChars = String(config.tsCFinputTrimChars ?? '');
  let expr: string;
  if (mode === 'leading') {
    expr = trimChars
      ? `F.ltrim("${escapePyDouble(trimChars)}", F.col("${escapePyDouble(col)}"))`
      : `F.ltrim(F.col("${escapePyDouble(col)}"))`;
  } else if (mode === 'trailing') {
    expr = trimChars
      ? `F.rtrim("${escapePyDouble(trimChars)}", F.col("${escapePyDouble(col)}"))`
      : `F.rtrim(F.col("${escapePyDouble(col)}"))`;
  } else {
    expr = trimChars
      ? `F.trim("${escapePyDouble(trimChars)}", F.col("${escapePyDouble(col)}"))`
      : `F.trim(F.col("${escapePyDouble(col)}"))`;
  }
  return `
# Spark Trim (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S46 — substring(col, pos, len). */
export function generateSparkSubstringCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = String(config.tsCFinputColumn || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
    throw new Error('Spark Substring: column must be a simple identifier.');
  }
  const pos = parseInt(String(config.tsCFinputPosition ?? '1'), 10);
  if (!Number.isFinite(pos) || pos === 0) {
    throw new Error(
      'Spark Substring: position must be a non-zero integer (1-based; negative counts from end).'
    );
  }
  const lenRaw = String(config.tsCFinputLength ?? '').trim();
  let expr: string;
  if (lenRaw) {
    const len = parseInt(lenRaw, 10);
    if (!Number.isFinite(len) || len < 1) {
      throw new Error('Spark Substring: length must be an integer >= 1 when set.');
    }
    expr = `F.substring(F.col("${escapePyDouble(col)}"), ${pos}, ${len})`;
  } else {
    // 2-arg substr keeps the remainder of the string
    expr = `F.expr("substr(${escapePyDouble(col)}, ${pos})")`;
  }
  const outCol = String(config.tsCFinputResultColumn || col).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error(
      'Spark Substring: result column must be a simple identifier.'
    );
  }
  return `
# Spark Substring
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

const SPARK_DATE_TRUNC_UNITS = new Set([
  'year',
  'yyyy',
  'yy',
  'quarter',
  'month',
  'mon',
  'mm',
  'week',
  'day',
  'dd',
  'hour',
  'minute',
  'second'
]);

/** S47 — date_trunc on a timestamp/date column. */
export function generateSparkDateTruncCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = String(config.tsCFinputColumn || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
    throw new Error('Spark Date Trunc: column must be a simple identifier.');
  }
  const unit = String(config.tsCFselectTruncUnit || 'day').toLowerCase();
  if (!SPARK_DATE_TRUNC_UNITS.has(unit)) {
    throw new Error(
      `Spark Date Trunc: unsupported unit "${unit}". Use year, quarter, month, week, day, hour, minute, or second.`
    );
  }
  const outCol = String(config.tsCFinputResultColumn || col).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outCol)) {
    throw new Error(
      'Spark Date Trunc: result column must be a simple identifier.'
    );
  }
  return `
# Spark Date Trunc (${unit})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn(
    "${escapePyDouble(outCol)}",
    F.date_trunc("${escapePyDouble(unit)}", F.col("${escapePyDouble(col)}"))
)
`;
}

/** S48 — intersect / except of two Spark DataFrames. */
export function generateSparkSetOpCode(
  config: any,
  inputName1: string,
  inputName2: string,
  outputName: string
): string {
  const op = String(config.tsCFradioSetOp || 'intersect').toLowerCase();
  const methodMap: Record<string, string> = {
    intersect: 'intersect',
    intersectall: 'intersectAll',
    except: 'except',
    exceptall: 'exceptAll'
  };
  const method = methodMap[op];
  if (!method) {
    throw new Error(
      `Spark Set Op: unsupported op "${op}". Use intersect, intersectAll, except, or exceptAll.`
    );
  }
  return `
# Spark Set Op (${method})
${outputName} = ${inputName1}.${method}(${inputName2})
`;
}

function requireSimpleCol(raw: string, label: string): string {
  const col = String(raw || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
    throw new Error(`${label}: column must be a simple identifier.`);
  }
  return col;
}

function resolveResultCol(raw: string, fallback: string, label: string): string {
  const out = String(raw || fallback).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(out)) {
    throw new Error(`${label}: result column must be a simple identifier.`);
  }
  return out;
}

/** S49 — date_format or to_date / to_timestamp. */
export function generateSparkDateFormatCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioDateMode || 'date_format').toLowerCase();
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Date Format');
  const fmt = String(config.tsCFinputFormat || '').trim();
  if (!fmt) {
    throw new Error(
      'Spark Date Format: format pattern is required (e.g. yyyy-MM-dd).'
    );
  }
  if (/[\n\r"]/.test(fmt)) {
    throw new Error('Spark Date Format: format contains illegal characters.');
  }
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    col,
    'Spark Date Format'
  );
  let expr: string;
  if (mode === 'date_format') {
    expr = `F.date_format(F.col("${escapePyDouble(col)}"), "${escapePyDouble(fmt)}")`;
  } else if (mode === 'to_date') {
    expr = `F.to_date(F.col("${escapePyDouble(col)}"), "${escapePyDouble(fmt)}")`;
  } else if (mode === 'to_timestamp') {
    expr = `F.to_timestamp(F.col("${escapePyDouble(col)}"), "${escapePyDouble(fmt)}")`;
  } else {
    throw new Error(
      'Spark Date Format: mode must be date_format, to_date, or to_timestamp.'
    );
  }
  return `
# Spark Date Format (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S50 — array size / contains / get. */
export function generateSparkArrayOpsCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioArrayOp || 'size').toLowerCase();
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Array Ops');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    mode === 'size' ? `${col}_size` : col,
    'Spark Array Ops'
  );
  let expr: string;
  if (mode === 'size') {
    expr = `F.size(F.col("${escapePyDouble(col)}"))`;
  } else if (mode === 'contains') {
    const value = String(config.tsCFinputContainsValue ?? '');
    if (value === '') {
      throw new Error('Spark Array Ops: contains value is required.');
    }
    // numeric / bool / string literal
    let lit: string;
    const lower = value.toLowerCase();
    if (lower === 'true') lit = 'True';
    else if (lower === 'false') lit = 'False';
    else if (/^-?\d+$/.test(value)) lit = value;
    else if (/^-?\d+\.\d+$/.test(value)) lit = value;
    else lit = `"${escapePyDouble(value)}"`;
    expr = `F.array_contains(F.col("${escapePyDouble(col)}"), ${lit})`;
  } else if (mode === 'get') {
    const idx = parseInt(String(config.tsCFinputArrayIndex ?? '0'), 10);
    if (!Number.isFinite(idx) || idx < 0) {
      throw new Error('Spark Array Ops: get index must be an integer >= 0.');
    }
    expr = `F.col("${escapePyDouble(col)}")[${idx}]`;
  } else {
    throw new Error(
      'Spark Array Ops: mode must be size, contains, or get.'
    );
  }
  return `
# Spark Array Ops (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S51 — upper / lower / initcap. */
export function generateSparkCaseFoldCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioCaseMode || 'upper').toLowerCase();
  const fnMap: Record<string, string> = {
    upper: 'upper',
    lower: 'lower',
    initcap: 'initcap'
  };
  const fn = fnMap[mode];
  if (!fn) {
    throw new Error(
      'Spark Case Fold: mode must be upper, lower, or initcap.'
    );
  }
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Case Fold');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    col,
    'Spark Case Fold'
  );
  return `
# Spark Case Fold (${fn})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn(
    "${escapePyDouble(outCol)}",
    F.${fn}(F.col("${escapePyDouble(col)}"))
)
`;
}

/** S52 — round / bround / ceil / floor. */
export function generateSparkRoundCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioRoundMode || 'round').toLowerCase();
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Round');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    col,
    'Spark Round'
  );
  let expr: string;
  if (mode === 'ceil' || mode === 'floor') {
    expr = `F.${mode}(F.col("${escapePyDouble(col)}"))`;
  } else if (mode === 'round' || mode === 'bround') {
    const scale = parseInt(String(config.tsCFinputScale ?? '0'), 10);
    if (!Number.isFinite(scale)) {
      throw new Error('Spark Round: scale must be an integer.');
    }
    expr = `F.${mode}(F.col("${escapePyDouble(col)}"), ${scale})`;
  } else {
    throw new Error(
      'Spark Round: mode must be round, bround, ceil, or floor.'
    );
  }
  return `
# Spark Round (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S53 — md5 / sha2 / hash / xxhash64. */
export function generateSparkHashCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioHashMode || 'md5').toLowerCase();
  const cols = parseSimpleColumnList(
    config.tsCFinputColumns || '',
    'Spark Hash'
  );
  if (cols.length === 0) {
    throw new Error('Spark Hash: provide at least one column.');
  }
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    'hash_val',
    'Spark Hash'
  );
  const colArgs = cols
    .map((c: string) => `F.col("${escapePyDouble(c)}")`)
    .join(', ');
  let expr: string;
  if (mode === 'md5') {
    if (cols.length !== 1) {
      throw new Error('Spark Hash: md5 requires exactly one column.');
    }
    expr = `F.md5(F.col("${escapePyDouble(cols[0])}").cast("string"))`;
  } else if (mode === 'sha2') {
    if (cols.length !== 1) {
      throw new Error('Spark Hash: sha2 requires exactly one column.');
    }
    const bits = parseInt(String(config.tsCFinputShaBits || '256'), 10);
    if (![224, 256, 384, 512].includes(bits)) {
      throw new Error('Spark Hash: sha2 bits must be 224, 256, 384, or 512.');
    }
    expr = `F.sha2(F.col("${escapePyDouble(cols[0])}").cast("string"), ${bits})`;
  } else if (mode === 'hash') {
    expr = `F.hash(${colArgs})`;
  } else if (mode === 'xxhash64') {
    expr = `F.xxhash64(${colArgs})`;
  } else {
    throw new Error(
      'Spark Hash: mode must be md5, sha2, hash, or xxhash64.'
    );
  }
  return `
# Spark Hash (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S54 — date_add / date_sub / add_months. */
export function generateSparkDateAddCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioDateAddMode || 'date_add').toLowerCase();
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Date Add');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    col,
    'Spark Date Add'
  );
  const amount = parseInt(String(config.tsCFinputAmount ?? '1'), 10);
  if (!Number.isFinite(amount)) {
    throw new Error('Spark Date Add: amount must be an integer.');
  }
  let expr: string;
  if (mode === 'date_add') {
    expr = `F.date_add(F.col("${escapePyDouble(col)}"), ${amount})`;
  } else if (mode === 'date_sub') {
    expr = `F.date_sub(F.col("${escapePyDouble(col)}"), ${amount})`;
  } else if (mode === 'add_months') {
    expr = `F.add_months(F.col("${escapePyDouble(col)}"), ${amount})`;
  } else {
    throw new Error(
      'Spark Date Add: mode must be date_add, date_sub, or add_months.'
    );
  }
  return `
# Spark Date Add (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S55 — length / octet_length / bit_length. */
export function generateSparkLengthCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioLengthMode || 'length').toLowerCase();
  const fnMap: Record<string, string> = {
    length: 'length',
    octet_length: 'octet_length',
    bit_length: 'bit_length'
  };
  const fn = fnMap[mode];
  if (!fn) {
    throw new Error(
      'Spark Length: mode must be length, octet_length, or bit_length.'
    );
  }
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Length');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    `${col}_len`,
    'Spark Length'
  );
  return `
# Spark Length (${fn})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn(
    "${escapePyDouble(outCol)}",
    F.${fn}(F.col("${escapePyDouble(col)}"))
)
`;
}

/** S56 — split string into array. */
export function generateSparkSplitCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Split');
  const sep = String(config.tsCFinputSeparator ?? '');
  if (sep === '') {
    throw new Error('Spark Split: separator is required.');
  }
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    `${col}_parts`,
    'Spark Split'
  );
  const limitRaw = String(config.tsCFinputSplitLimit ?? '').trim();
  let expr: string;
  if (limitRaw) {
    const limit = parseInt(limitRaw, 10);
    if (!Number.isFinite(limit) || limit < -1) {
      throw new Error(
        'Spark Split: limit must be an integer >= -1 when set.'
      );
    }
    expr = `F.split(F.col("${escapePyDouble(col)}"), "${escapePyDouble(sep)}", ${limit})`;
  } else {
    expr = `F.split(F.col("${escapePyDouble(col)}"), "${escapePyDouble(sep)}")`;
  }
  return `
# Spark Split
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S57 — abs / signum. */
export function generateSparkAbsCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioAbsMode || 'abs').toLowerCase();
  if (mode !== 'abs' && mode !== 'signum') {
    throw new Error('Spark Abs: mode must be abs or signum.');
  }
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Abs');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    col,
    'Spark Abs'
  );
  return `
# Spark Abs (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn(
    "${escapePyDouble(outCol)}",
    F.${mode}(F.col("${escapePyDouble(col)}"))
)
`;
}

/** S58 — greatest / least across columns. */
export function generateSparkGreatestCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioGreatestMode || 'greatest').toLowerCase();
  if (mode !== 'greatest' && mode !== 'least') {
    throw new Error('Spark Greatest: mode must be greatest or least.');
  }
  const cols = parseSimpleColumnList(
    config.tsCFinputColumns || '',
    'Spark Greatest'
  );
  if (cols.length < 2) {
    throw new Error(
      'Spark Greatest: provide at least two columns (comma-separated).'
    );
  }
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    mode,
    'Spark Greatest'
  );
  const args = cols
    .map((c: string) => `F.col("${escapePyDouble(c)}")`)
    .join(', ');
  return `
# Spark ${mode}
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", F.${mode}(${args}))
`;
}

/** S59 — months_between / datediff. */
export function generateSparkDateDiffCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioDateDiffMode || 'datediff').toLowerCase();
  const endCol = requireSimpleCol(config.tsCFinputEndColumn, 'Spark Date Diff end');
  const startCol = requireSimpleCol(
    config.tsCFinputStartColumn,
    'Spark Date Diff start'
  );
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    'date_diff',
    'Spark Date Diff'
  );
  let expr: string;
  if (mode === 'datediff') {
    expr = `F.datediff(F.col("${escapePyDouble(endCol)}"), F.col("${escapePyDouble(startCol)}"))`;
  } else if (mode === 'months_between') {
    const roundOff =
      config.tsCFbooleanRoundOff === true ||
      config.tsCFbooleanRoundOff === 'true';
    expr = `F.months_between(F.col("${escapePyDouble(endCol)}"), F.col("${escapePyDouble(startCol)}"), ${
      roundOff ? 'True' : 'False'
    })`;
  } else {
    throw new Error(
      'Spark Date Diff: mode must be datediff or months_between.'
    );
  }
  return `
# Spark Date Diff (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S60 — unix_timestamp / from_unixtime / current_timestamp. */
export function generateSparkUnixTimeCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioUnixMode || 'unix_timestamp').toLowerCase();
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    mode === 'current_timestamp' ? 'now_ts' : 'unix_ts',
    'Spark Unix Time'
  );
  let expr: string;
  if (mode === 'current_timestamp') {
    expr = 'F.current_timestamp()';
  } else if (mode === 'current_date') {
    expr = 'F.current_date()';
  } else if (mode === 'unix_timestamp') {
    const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Unix Time');
    const fmt = String(config.tsCFinputFormat || '').trim();
    expr = fmt
      ? `F.unix_timestamp(F.col("${escapePyDouble(col)}"), "${escapePyDouble(fmt)}")`
      : `F.unix_timestamp(F.col("${escapePyDouble(col)}"))`;
  } else if (mode === 'from_unixtime') {
    const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Unix Time');
    const fmt = String(config.tsCFinputFormat || '').trim();
    expr = fmt
      ? `F.from_unixtime(F.col("${escapePyDouble(col)}"), "${escapePyDouble(fmt)}")`
      : `F.from_unixtime(F.col("${escapePyDouble(col)}"))`;
  } else {
    throw new Error(
      'Spark Unix Time: mode must be unix_timestamp, from_unixtime, current_timestamp, or current_date.'
    );
  }
  return `
# Spark Unix Time (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S61 — pow / sqrt / log / exp / log10. */
export function generateSparkMathCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioMathMode || 'sqrt').toLowerCase();
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Math');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    col,
    'Spark Math'
  );
  let expr: string;
  if (mode === 'sqrt' || mode === 'exp' || mode === 'log' || mode === 'log10' || mode === 'log2') {
    expr = `F.${mode}(F.col("${escapePyDouble(col)}"))`;
  } else if (mode === 'pow') {
    const expRaw = String(config.tsCFinputExponent ?? '2').trim();
    const exp = parseFloat(expRaw);
    if (!Number.isFinite(exp)) {
      throw new Error('Spark Math: exponent must be a number.');
    }
    expr = `F.pow(F.col("${escapePyDouble(col)}"), ${exp})`;
  } else {
    throw new Error(
      'Spark Math: mode must be sqrt, exp, log, log10, log2, or pow.'
    );
  }
  return `
# Spark Math (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S62 — instr / locate. */
export function generateSparkInstrCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioInstrMode || 'instr').toLowerCase();
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Instr');
  const substr = String(config.tsCFinputSubstring ?? '');
  if (substr === '') {
    throw new Error('Spark Instr: search substring is required.');
  }
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    `${col}_pos`,
    'Spark Instr'
  );
  let expr: string;
  if (mode === 'instr') {
    expr = `F.instr(F.col("${escapePyDouble(col)}"), "${escapePyDouble(substr)}")`;
  } else if (mode === 'locate') {
    const posRaw = String(config.tsCFinputStartPos ?? '').trim();
    if (posRaw) {
      const pos = parseInt(posRaw, 10);
      if (!Number.isFinite(pos) || pos < 1) {
        throw new Error('Spark Instr: locate start position must be >= 1.');
      }
      expr = `F.locate("${escapePyDouble(substr)}", F.col("${escapePyDouble(col)}"), ${pos})`;
    } else {
      expr = `F.locate("${escapePyDouble(substr)}", F.col("${escapePyDouble(col)}"))`;
    }
  } else {
    throw new Error('Spark Instr: mode must be instr or locate.');
  }
  return `
# Spark Instr (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S63 — reverse / repeat. */
export function generateSparkReverseRepeatCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioRevMode || 'reverse').toLowerCase();
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Reverse Repeat');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    col,
    'Spark Reverse Repeat'
  );
  let expr: string;
  if (mode === 'reverse') {
    expr = `F.reverse(F.col("${escapePyDouble(col)}"))`;
  } else if (mode === 'repeat') {
    const n = parseInt(String(config.tsCFinputRepeatN ?? '2'), 10);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('Spark Reverse Repeat: repeat count must be >= 0.');
    }
    expr = `F.repeat(F.col("${escapePyDouble(col)}"), ${n})`;
  } else {
    throw new Error(
      'Spark Reverse Repeat: mode must be reverse or repeat.'
    );
  }
  return `
# Spark Reverse/Repeat (${mode})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn("${escapePyDouble(outCol)}", ${expr})
`;
}

/** S64 — isnull / isnotnull / isnan as boolean column. */
export function generateSparkIsNullCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioNullMode || 'isnull').toLowerCase();
  const fnMap: Record<string, string> = {
    isnull: 'isnull',
    isnotnull: 'isnotnull',
    isnan: 'isnan'
  };
  const fn = fnMap[mode];
  if (!fn) {
    throw new Error(
      'Spark Is Null: mode must be isnull, isnotnull, or isnan.'
    );
  }
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Is Null');
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    `${col}_${fn}`,
    'Spark Is Null'
  );
  return `
# Spark Is Null (${fn})
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn(
    "${escapePyDouble(outCol)}",
    F.${fn}(F.col("${escapePyDouble(col)}"))
)
`;
}

/** S65 — get struct field via col.getField or bracket. */
export function generateSparkStructGetCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = requireSimpleCol(config.tsCFinputColumn, 'Spark Struct Get');
  const field = String(config.tsCFinputFieldName || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) {
    throw new Error(
      'Spark Struct Get: field name must be a simple identifier.'
    );
  }
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    field,
    'Spark Struct Get'
  );
  return `
# Spark Struct Get
from pyspark.sql import functions as F
${outputName} = ${inputName}.withColumn(
    "${escapePyDouble(outCol)}",
    F.col("${escapePyDouble(col)}").getField("${escapePyDouble(field)}")
)
`;
}

/** S66 — approx_count_distinct. */
export function generateSparkApproxCountDistinctCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const col = requireSimpleCol(
    config.tsCFinputColumn,
    'Spark Approx Count Distinct'
  );
  const groupCols = parseSimpleColumnList(
    config.tsCFinputGroupByColumns || '',
    'Spark Approx Count Distinct group-by'
  );
  const outCol = resolveResultCol(
    config.tsCFinputResultColumn,
    `${col}_approx_n`,
    'Spark Approx Count Distinct'
  );
  const rsdRaw = String(config.tsCFinputRsd ?? '').trim();
  let approxExpr = `F.approx_count_distinct(F.col("${escapePyDouble(col)}"))`;
  if (rsdRaw) {
    const rsd = parseFloat(rsdRaw);
    if (!Number.isFinite(rsd) || rsd <= 0 || rsd >= 1) {
      throw new Error(
        'Spark Approx Count Distinct: rsd must be in (0, 1) when set.'
      );
    }
    approxExpr = `F.approx_count_distinct(F.col("${escapePyDouble(col)}"), ${rsd})`;
  }
  if (groupCols.length === 0) {
    return `
# Spark Approx Count Distinct (global)
from pyspark.sql import functions as F
${outputName} = ${inputName}.agg(${approxExpr}.alias("${escapePyDouble(outCol)}"))
`;
  }
  const groupArg = groupCols
    .map((c: string) => `"${escapePyDouble(c)}"`)
    .join(', ');
  return `
# Spark Approx Count Distinct
from pyspark.sql import functions as F
${outputName} = ${inputName}.groupBy(${groupArg}).agg(${approxExpr}.alias("${escapePyDouble(outCol)}"))
`;
}

/** S67 — describe / summary stats DataFrame. */
export function generateSparkDescribeCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const mode = String(config.tsCFradioDescribeMode || 'describe').trim();
  const cols = parseSimpleColumnList(
    config.tsCFinputColumns || '',
    'Spark Describe columns'
  );
  const colArg =
    cols.length > 0
      ? cols.map((c: string) => `"${escapePyDouble(c)}"`).join(', ')
      : '';
  if (mode === 'summary') {
    const statsRaw = String(config.tsCFinputSummaryStats || '').trim();
    let statsArg = '';
    if (statsRaw) {
      const stats = statsRaw
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (stats.length === 0) {
        throw new Error('Spark Describe: summary stats list is empty.');
      }
      for (const s of stats) {
        if (!/^[A-Za-z0-9_%]+$/.test(s)) {
          throw new Error(
            `Spark Describe: invalid summary statistic "${s}".`
          );
        }
      }
      statsArg = stats.map((s: string) => `"${escapePyDouble(s)}"`).join(', ');
    }
    if (colArg && statsArg) {
      return `
# Spark Summary
${outputName} = ${inputName}.select(${colArg}).summary(${statsArg})
`;
    }
    if (colArg) {
      return `
# Spark Summary
${outputName} = ${inputName}.select(${colArg}).summary()
`;
    }
    if (statsArg) {
      return `
# Spark Summary
${outputName} = ${inputName}.summary(${statsArg})
`;
    }
    return `
# Spark Summary
${outputName} = ${inputName}.summary()
`;
  }
  if (mode !== 'describe') {
    throw new Error(
      'Spark Describe: mode must be describe or summary.'
    );
  }
  if (colArg) {
    return `
# Spark Describe
${outputName} = ${inputName}.describe(${colArg})
`;
  }
  return `
# Spark Describe
${outputName} = ${inputName}.describe()
`;
}

/** S68 — DataFrame.checkpoint (requires spark.sparkContext.setCheckpointDir). */
export function generateSparkCheckpointCode(
  config: any,
  inputName: string,
  outputName: string
): string {
  const eager =
    String(config.tsCFbooleanEager ?? config.tsCFradioEager ?? 'true')
      .trim()
      .toLowerCase() !== 'false';
  const dir = String(config.tsCFinputCheckpointDir || '').trim();
  const setDir = dir
    ? `spark.sparkContext.setCheckpointDir("${escapePyDouble(dir)}")\n`
    : '';
  return `
# Spark Checkpoint
${setDir}${outputName} = ${inputName}.checkpoint(${eager ? 'True' : 'False'})
`;
}

