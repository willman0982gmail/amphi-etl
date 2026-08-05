#!/usr/bin/env node
/**
 * S4.8 / S7.1 — codegen golden checks (no JupyterLab runtime required).
 * Usage (from package root after build:lib, or via tsx):
 *   npx tsx src/components/inputs/spark/runCodegenChecks.ts
 */
import assert from 'assert';
import {
  generateSparkSqlInputCode,
  generateSparkSessionBuilderCode,
  generateSparkSqlNativeCode,
  generateSparkToPandasCode,
  generateSparkTableOutputCode,
  generateSparkFileOutputCode,
  generateSparkSessionStopCode,
  generateSparkSqlTransformCode,
  generateSparkLimitCode,
  generateSparkDropDuplicatesCode,
  generateSparkSelectColumnsCode,
  generateSparkFilterCode,
  generateSparkOrderByCode,
  generateSparkRepartitionCode,
  generateSparkSampleCode,
  generateSparkWithColumnCode,
  generateSparkCacheCode,
  generateSparkDropColumnsCode,
  generateSparkDistinctCode,
  generateSparkUnionCode,
  generateSparkJoinCode,
  generateSparkAggregateCode,
  generateSparkRenameColumnsCode,
  generateSparkFillNaCode,
  generateSparkCastCode,
  generateSparkFileInputCode,
  generateSparkExplodeCode,
  generateSparkWindowCode,
  generateSparkPivotCode,
  generateSparkUnpivotCode,
  generateSparkConcatColumnsCode,
  generateSparkGenerateIdCode,
  generateSparkCoalesceCode,
  generateSparkWhenCode,
  generateSparkStringReplaceCode,
  generateSparkTrimCode,
  generateSparkSubstringCode,
  generateSparkDateTruncCode,
  generateSparkSetOpCode,
  generateSparkDateFormatCode,
  generateSparkArrayOpsCode,
  generateSparkCaseFoldCode,
  generateSparkRoundCode,
  generateSparkHashCode,
  generateSparkDateAddCode,
  generateSparkLengthCode,
  generateSparkSplitCode,
  generateSparkAbsCode,
  generateSparkGreatestCode,
  generateSparkDateDiffCode,
  generateSparkUnixTimeCode,
  generateSparkMathCode,
  generateSparkInstrCode,
  generateSparkReverseRepeatCode,
  generateSparkIsNullCode,
  generateSparkStructGetCode,
  generateSparkApproxCountDistinctCode,
  generateSparkDescribeCode,
  generateSparkCheckpointCode,
  parseSparkAggregations,
  resolveSparkSql,
  sparkSqlProvideDependencies,
  sparkSqlProvideImports
} from './sparkSqlCodegen';
import {
  appendTokenToConnectUrl,
  extractTrailingLimit,
  hasMultipleSqlStatements,
  isValidTableIdentifier,
  parseMaxRows,
  quoteTableIdentifier,
  resolveEffectiveMaxRows,
  resolveQualifiedTableName
} from './sparkSqlUtils';
import {
  formatQualifiedTableName,
  sqlShowCatalogs,
  sqlShowNamespaces,
  sqlShowTables
} from './sparkCatalogDiscovery';

assert.deepStrictEqual(sparkSqlProvideDependencies(), ['pyspark[connect]']);
assert.ok(sparkSqlProvideImports().some(i => i.includes('SparkSession')));

assert.strictEqual(isValidTableIdentifier('schema.trips'), true);
assert.strictEqual(isValidTableIdentifier('a;b'), false);
assert.strictEqual(quoteTableIdentifier('schema.trips'), '`schema`.`trips`');
assert.strictEqual(hasMultipleSqlStatements('SELECT 1; SELECT 2'), true);
assert.strictEqual(parseMaxRows('0'), 10000);
assert.strictEqual(extractTrailingLimit('SELECT * FROM t LIMIT 100'), 100);
assert.strictEqual(resolveEffectiveMaxRows(10000, 'SELECT * FROM t LIMIT 100'), 100);
assert.strictEqual(
  appendTokenToConnectUrl('sc://host:15002', 'abc'),
  'sc://host:15002/;token=abc'
);

const queryCode = generateSparkSqlInputCode(
  {
    tsCFinputSparkConnectUrl: 'sc://localhost:15002',
    tsCFinputAppName: 'test-app',
    tsCFradioAuthMethod: 'none',
    tsCFradioQueryMethod: 'query',
    tsCFcodeTextareaSqlQuery: JSON.stringify({
      code: 'SELECT * FROM t LIMIT 100',
      instructions: ''
    }),
    tsCFinputMaxRows: '10000'
  },
  'df_spark'
);
assert.ok(queryCode.includes('.remote(_spark_url)'));
assert.ok(queryCode.includes('getOrCreate()'));
assert.ok(queryCode.includes('spark.sql'));
assert.ok(queryCode.includes('toPandas()'));
assert.ok(queryCode.includes('_max_rows = 100'));
assert.ok(queryCode.includes('RuntimeError'));
assert.ok(queryCode.includes('SPARK_CONNECT_URL'));

const tableCode = generateSparkSqlInputCode(
  {
    tsCFinputSparkConnectUrl: 'sc://host:15002',
    tsCFradioAuthMethod: 'none',
    tsCFradioQueryMethod: 'table',
    tsCFinputTableName: 'schema.trips',
    tsCFinputMaxRows: '5'
  },
  'df_tbl'
);
assert.ok(tableCode.includes('SELECT * FROM `schema`.`trips`'));
assert.ok(tableCode.includes('_max_rows = 5'));

const tokenCode = generateSparkSqlInputCode(
  {
    tsCFinputSparkConnectUrl: 'sc://host:15002',
    tsCFradioAuthMethod: 'token',
    tsCFinputToken: 'secret',
    tsCFradioQueryMethod: 'query',
    tsCFcodeTextareaSqlQuery: 'SELECT 1',
    tsCFinputMaxRows: '10'
  },
  'df_tok'
);
assert.ok(tokenCode.includes('SPARK_TOKEN'));
assert.ok(tokenCode.includes('secret'));

const userpassCode = generateSparkSqlInputCode(
  {
    tsCFinputSparkConnectUrl: 'sc://host:15002',
    tsCFradioAuthMethod: 'userpass',
    tsCFinputUserName: 'alice',
    tsCFinputPassword: 'pw',
    tsCFradioQueryMethod: 'query',
    tsCFcodeTextareaSqlQuery: 'SELECT 1',
    tsCFinputMaxRows: '10'
  },
  'df_up'
);
assert.ok(userpassCode.includes('SPARK_USER'));
assert.ok(userpassCode.includes('SPARK_PASSWORD'));
assert.ok(userpassCode.includes('user_id='));
assert.ok(userpassCode.includes('alice'));

const sharedCode = generateSparkSqlInputCode(
  {
    tsCFradioSessionMode: 'auto',
    _amphiHasSparkSession: true,
    tsCFradioQueryMethod: 'query',
    tsCFcodeTextareaSqlQuery: 'SELECT 1',
    tsCFinputMaxRows: '10'
  },
  'df_shared'
);
assert.ok(sharedCode.includes('shared session'));
assert.ok(!sharedCode.includes('.remote(_spark_url)'));
assert.ok(sharedCode.includes('spark.sql'));

const sessionCode = generateSparkSessionBuilderCode({
  tsCFinputSparkConnectUrl: 'sc://host:15002',
  tsCFradioAuthMethod: 'none',
  tsCFinputAppName: 'sess'
});
assert.ok(sessionCode.includes('Spark Connect Session'));
assert.ok(sessionCode.includes('.remote(_spark_url)'));
assert.ok(sessionCode.includes('spark ='));

const databricksCode = generateSparkSqlInputCode(
  {
    tsCFinputSparkConnectUrl: 'sc://dbc.cloud.databricks.com:443',
    tsCFradioProvider: 'databricks',
    tsCFinputDatabricksClusterId: 'abc-123',
    tsCFradioAuthMethod: 'token',
    tsCFinputToken: 'dapiXXX',
    tsCFradioQueryMethod: 'query',
    tsCFcodeTextareaSqlQuery: 'SELECT 1',
    tsCFinputMaxRows: '10'
  },
  'df_dbx'
);
assert.ok(databricksCode.includes('SPARK_REMOTE'));
assert.ok(databricksCode.includes('DATABRICKS_CLUSTER_ID'));
assert.ok(databricksCode.includes('x-databricks-cluster-id'));
assert.ok(databricksCode.includes('abc-123'));

const nativeCode = generateSparkSqlNativeCode(
  {
    tsCFradioAuthMethod: 'none',
    tsCFradioQueryMethod: 'query',
    tsCFcodeTextareaSqlQuery: 'SELECT 1',
    tsCFinputMaxRows: '5'
  },
  'df_native'
);
assert.ok(!nativeCode.includes('toPandas()'));
assert.ok(nativeCode.includes('spark.sql'));
assert.ok(nativeCode.includes('Keep Spark DataFrame'));

assert.strictEqual(sqlShowCatalogs(), 'SHOW CATALOGS');
assert.strictEqual(sqlShowNamespaces('main'), 'SHOW NAMESPACES IN `main`');
assert.strictEqual(sqlShowTables('default', 'main'), 'SHOW TABLES IN `main`.`default`');
assert.strictEqual(formatQualifiedTableName('main', 'default', 't'), 'main.default.t');

assert.strictEqual(
  resolveQualifiedTableName({
    tsCFinputCatalog: 'main',
    tsCFinputSchema: 'default',
    tsCFinputTableName: { value: 'trips' }
  }),
  'main.default.trips'
);
assert.ok(
  resolveSparkSql({
    tsCFradioQueryMethod: 'table',
    tsCFinputSchema: 's',
    tsCFinputTableName: { value: 't' }
  }).includes('`s`.`t`')
);

const bridgeCode = generateSparkToPandasCode(
  { tsCFinputMaxRows: '5' },
  'df_spark',
  'df_pd'
);
assert.ok(bridgeCode.includes('toPandas()'));
assert.ok(bridgeCode.includes('_max_rows = 5'));

const tblCode = generateSparkTableOutputCode(
  {
    tsCFinputSchema: 's',
    tsCFinputTableName: 'dest',
    tsCFradioWriteMethod: 'saveAsTable',
    tsCFradioWriteMode: 'overwrite'
  },
  'df_spark'
);
assert.ok(tblCode.includes('saveAsTable'));
assert.ok(tblCode.includes('s.dest'));

const fileCsv = generateSparkFileOutputCode(
  {
    tsCFinputFilePath: '/tmp/out.csv',
    tsCFradioWriteMode: 'overwrite',
    tsCFradioFormat: 'csv',
    tsCFbooleanCsvHeader: true
  },
  'df_spark'
);
assert.ok(fileCsv.includes('.format("csv")'));
assert.ok(fileCsv.includes('.option("header", "true")'));
assert.ok(fileCsv.includes('/tmp/out.csv'));

const fileParquet = generateSparkFileOutputCode(
  {
    tsCFinputFilePath: 'out.parquet',
    tsCFradioFormat: 'parquet'
  },
  'df_spark'
);
assert.ok(fileParquet.includes('.format("parquet")'));
assert.ok(!fileParquet.includes('.option("header"'));

const stopNoop = generateSparkSessionStopCode({ tsCFbooleanConfirmStop: false });
assert.ok(stopNoop.includes('no-op'));
assert.ok(!stopNoop.includes('spark.stop()\n'));

const stopYes = generateSparkSessionStopCode({ tsCFbooleanConfirmStop: true });
assert.ok(stopYes.includes('spark.stop()'));
assert.ok(stopYes.includes('NameError'));

const nativeShared = generateSparkSqlNativeCode(
  {
    tsCFradioQueryMethod: 'query',
    tsCFcodeTextareaSqlQuery: { code: 'SELECT 1 AS n', instructions: '' },
    tsCFinputMaxRows: '50',
    tsCFradioSessionMode: 'shared',
    _amphiHasSparkSession: true
  },
  'sdf'
);
assert.ok(!nativeShared.includes('.remote('));
assert.ok(nativeShared.includes('spark.sql'));
assert.ok(!nativeShared.includes('toPandas()'));

const xform = generateSparkSqlTransformCode(
  {
    tsCFinputTempViewName: 'amphi_src',
    tsCFcodeTextareaSqlQuery: { code: 'SELECT * FROM amphi_src', instructions: '' }
  },
  'sdf_in',
  'sdf_out'
);
assert.ok(xform.includes('createOrReplaceTempView("amphi_src")'));
assert.ok(xform.includes('spark.sql'));
assert.ok(xform.includes('RuntimeError'));

assert.throws(() =>
  generateSparkSqlTransformCode(
    { tsCFinputTempViewName: 'bad-name', tsCFcodeTextareaSqlQuery: 'SELECT 1' },
    'a',
    'b'
  )
);

const filePart = generateSparkFileOutputCode(
  {
    tsCFinputFilePath: '/tmp/p',
    tsCFradioFormat: 'parquet',
    tsCFinputPartitionBy: 'year, month'
  },
  'df_spark'
);
assert.ok(filePart.includes('.partitionBy("year", "month")'));

const limitCode = generateSparkLimitCode({ tsCFinputMaxRows: '25' }, 'sdf', 'sdf_lim');
assert.ok(limitCode.includes('.limit(25)'));

const dedupeAll = generateSparkDropDuplicatesCode({}, 'sdf', 'sdf_d');
assert.ok(dedupeAll.includes('.dropDuplicates()'));
const dedupeSub = generateSparkDropDuplicatesCode(
  { tsCFinputSubsetColumns: 'id, name' },
  'sdf',
  'sdf_d'
);
assert.ok(dedupeSub.includes('.dropDuplicates(["id", "name"])'));
assert.throws(() =>
  generateSparkDropDuplicatesCode({ tsCFinputSubsetColumns: 'bad-col' }, 'a', 'b')
);

const selectCode = generateSparkSelectColumnsCode(
  { tsCFinputColumns: 'id, label' },
  'sdf',
  'sdf_s'
);
assert.ok(selectCode.includes('.select("id", "label")'));
assert.throws(() => generateSparkSelectColumnsCode({ tsCFinputColumns: '' }, 'a', 'b'));

const filterCode = generateSparkFilterCode(
  { tsCFinputFilterExpr: "status = 'ok' AND n > 0" },
  'sdf',
  'sdf_f'
);
assert.ok(filterCode.includes('.filter("status = \'ok\' AND n > 0")'));
assert.throws(() => generateSparkFilterCode({ tsCFinputFilterExpr: '' }, 'a', 'b'));
assert.throws(() =>
  generateSparkFilterCode({ tsCFinputFilterExpr: 'a > 1; b > 2' }, 'a', 'b')
);

const orderAsc = generateSparkOrderByCode(
  { tsCFinputOrderBy: 'n, status', tsCFradioSortDirection: 'asc' },
  'sdf',
  'sdf_o'
);
assert.ok(orderAsc.includes('.orderBy("n", "status")'));
const orderDesc = generateSparkOrderByCode(
  { tsCFinputOrderBy: 'n', tsCFradioSortDirection: 'desc' },
  'sdf',
  'sdf_o'
);
assert.ok(orderDesc.includes('__F.col("n").desc()'));
assert.throws(() => generateSparkOrderByCode({ tsCFinputOrderBy: '' }, 'a', 'b'));

const repart = generateSparkRepartitionCode(
  { tsCFradioPartitionMode: 'repartition', tsCFinputNumPartitions: '8' },
  'sdf',
  'sdf_r'
);
assert.ok(repart.includes('.repartition(8)'));
const coal = generateSparkRepartitionCode(
  { tsCFradioPartitionMode: 'coalesce', tsCFinputNumPartitions: '2' },
  'sdf',
  'sdf_c'
);
assert.ok(coal.includes('.coalesce(2)'));
const repartCols = generateSparkRepartitionCode(
  {
    tsCFradioPartitionMode: 'repartition',
    tsCFinputNumPartitions: '4',
    tsCFinputPartitionColumns: 'year, month'
  },
  'sdf',
  'sdf_rc'
);
assert.ok(repartCols.includes('.repartition(4, "year", "month")'));

const sampleCode = generateSparkSampleCode(
  {
    tsCFinputSampleFraction: '0.25',
    tsCFbooleanWithReplacement: false,
    tsCFinputSampleSeed: '42'
  },
  'sdf',
  'sdf_s'
);
assert.ok(sampleCode.includes('.sample(False, 0.25, seed=42)'));

const withCol = generateSparkWithColumnCode(
  { tsCFinputColumnName: 'n2', tsCFinputColumnExpr: 'n * 2' },
  'sdf',
  'sdf_w'
);
assert.ok(withCol.includes('withColumn("n2"'));
assert.ok(withCol.includes('__F.expr("n * 2")'));

const cacheCode = generateSparkCacheCode({ tsCFradioCacheMode: 'cache' }, 'sdf', 'sdf_c');
assert.ok(cacheCode.includes('.cache()'));
const persistCode = generateSparkCacheCode(
  { tsCFradioCacheMode: 'persist', tsCFradioStorageLevel: 'MEMORY_ONLY' },
  'sdf',
  'sdf_p'
);
assert.ok(persistCode.includes('StorageLevel.MEMORY_ONLY'));
const unpersistCode = generateSparkCacheCode(
  { tsCFradioCacheMode: 'unpersist' },
  'sdf',
  'sdf_u'
);
assert.ok(unpersistCode.includes('.unpersist()'));

const dropCols = generateSparkDropColumnsCode(
  { tsCFinputColumns: 'a, b' },
  'sdf',
  'sdf_d'
);
assert.ok(dropCols.includes('.drop("a", "b")'));
const distinctCode = generateSparkDistinctCode({}, 'sdf', 'sdf_di');
assert.ok(distinctCode.includes('.distinct()'));

const unionCode = generateSparkUnionCode(
  { tsCFradioUnionMode: 'unionByName', tsCFbooleanAllowMissingColumns: true },
  'l',
  'r',
  'u'
);
assert.ok(unionCode.includes('unionByName(r, allowMissingColumns=True)'));
const unionPos = generateSparkUnionCode(
  { tsCFradioUnionMode: 'union' },
  'l',
  'r',
  'u'
);
assert.ok(unionPos.includes('.union(r)'));

const joinCode = generateSparkJoinCode(
  { tsCFradioJoinType: 'left', tsCFinputJoinColumns: 'id' },
  'l',
  'r',
  'j'
);
assert.ok(joinCode.includes('.join(r, on="id", how="left")'));
const joinMulti = generateSparkJoinCode(
  { tsCFradioJoinType: 'inner', tsCFinputJoinColumns: 'a, b' },
  'l',
  'r',
  'j'
);
assert.ok(joinMulti.includes('on=["a", "b"]'));
const cross = generateSparkJoinCode(
  { tsCFradioJoinType: 'cross' },
  'l',
  'r',
  'j'
);
assert.ok(cross.includes('.crossJoin(r)'));
assert.throws(() =>
  generateSparkJoinCode({ tsCFradioJoinType: 'inner', tsCFinputJoinColumns: '' }, 'l', 'r', 'j')
);

assert.deepStrictEqual(parseSparkAggregations('sum:amount, count:id:cnt'), [
  { op: 'sum', column: 'amount', alias: 'amount_sum' },
  { op: 'count', column: 'id', alias: 'cnt' }
]);
const aggCode = generateSparkAggregateCode(
  {
    tsCFinputGroupByColumns: 'region',
    tsCFtextareaAggregations: 'sum:amount\navg:price as avg_price'
  },
  'sdf',
  'sdf_agg'
);
assert.ok(aggCode.includes('.groupBy("region").agg('));
assert.ok(aggCode.includes('F.sum("amount").alias("amount_sum")'));
assert.ok(aggCode.includes('F.avg("price").alias("avg_price")'));
const aggGlobal = generateSparkAggregateCode(
  { tsCFtextareaAggregations: 'count:id' },
  'sdf',
  'sdf_g'
);
assert.ok(aggGlobal.includes('.agg(F.count("id").alias("id_count"))'));
assert.ok(!aggGlobal.includes('groupBy'));
assert.throws(() =>
  generateSparkAggregateCode({ tsCFtextareaAggregations: '' }, 'sdf', 'o')
);
assert.throws(() =>
  generateSparkAggregateCode(
    { tsCFtextareaAggregations: 'bogus:amount' },
    'sdf',
    'o'
  )
);

const renameCode = generateSparkRenameColumnsCode(
  { tsCFtextareaRenameMappings: 'a:alpha\nb:beta' },
  'sdf',
  'sdf_r'
);
assert.ok(
  renameCode.includes(
    '.withColumnRenamed("a", "alpha").withColumnRenamed("b", "beta")'
  )
);
assert.throws(() =>
  generateSparkRenameColumnsCode({ tsCFtextareaRenameMappings: '' }, 'sdf', 'o')
);
assert.throws(() =>
  generateSparkRenameColumnsCode(
    { tsCFtextareaRenameMappings: 'a:a' },
    'sdf',
    'o'
  )
);

const fillCode = generateSparkFillNaCode(
  { tsCFradioFillMode: 'value', tsCFinputFillValue: '0', tsCFinputColumns: 'a' },
  'sdf',
  'sdf_f'
);
assert.ok(fillCode.includes('.fillna(0, subset=["a"])'));
const dropNa = generateSparkFillNaCode(
  { tsCFradioFillMode: 'dropna_any', tsCFinputColumns: '' },
  'sdf',
  'sdf_n'
);
assert.ok(dropNa.includes('.dropna(how="any")'));
assert.throws(() =>
  generateSparkFillNaCode({ tsCFradioFillMode: 'value', tsCFinputFillValue: '' }, 'sdf', 'o')
);

const castCode = generateSparkCastCode(
  { tsCFtextareaCastMappings: 'amount:double\nid:long' },
  'sdf',
  'sdf_c'
);
assert.ok(castCode.includes('F.col("amount").cast("double")'));
assert.ok(castCode.includes('F.col("id").cast("long")'));
const castDec = generateSparkCastCode(
  { tsCFtextareaCastMappings: 'price:decimal(10,2)' },
  'sdf',
  'sdf_d'
);
assert.ok(castDec.includes('cast("decimal(10,2)")'));
assert.throws(() =>
  generateSparkCastCode({ tsCFtextareaCastMappings: 'x:bogus' }, 'sdf', 'o')
);

const fileInShared = generateSparkFileInputCode(
  {
    tsCFinputFilePath: '/data/in.parquet',
    tsCFradioFormat: 'parquet',
    tsCFinputMaxRows: '100',
    tsCFradioSessionMode: 'shared',
    _amphiHasSparkSession: true
  },
  'sdf_fi'
);
assert.ok(fileInShared.includes('spark.read.format("parquet").load("/data/in.parquet")'));
assert.ok(fileInShared.includes('_max_rows = 100'));
assert.ok(!fileInShared.includes('.remote('));
const fileInCsv = generateSparkFileInputCode(
  {
    tsCFinputFilePath: '/tmp/a.csv',
    tsCFradioFormat: 'csv',
    tsCFbooleanCsvHeader: true,
    tsCFinputMaxRows: '10',
    tsCFradioSessionMode: 'local',
    tsCFinputSparkConnectUrl: 'sc://localhost:15002',
    tsCFradioAuthMethod: 'none'
  },
  'sdf_csv'
);
assert.ok(fileInCsv.includes('.option("header", "true")'));
assert.ok(fileInCsv.includes('.remote(_spark_url)'));
assert.throws(() =>
  generateSparkFileInputCode({ tsCFinputFilePath: '', tsCFradioFormat: 'parquet' }, 'o')
);

const explodeCode = generateSparkExplodeCode(
  {
    tsCFinputExplodeColumn: 'tags',
    tsCFradioExplodeMode: 'explode',
    tsCFinputValueAlias: 'tag',
    tsCFbooleanDropOriginal: true
  },
  'sdf',
  'sdf_e'
);
assert.ok(explodeCode.includes('F.explode(F.col("tags")).alias("tag")'));
assert.ok(explodeCode.includes('.drop("tags")'));
const posExplode = generateSparkExplodeCode(
  {
    tsCFinputExplodeColumn: 'arr',
    tsCFradioExplodeMode: 'posexplode',
    tsCFinputValueAlias: 'val',
    tsCFinputPosAlias: 'i',
    tsCFbooleanDropOriginal: false
  },
  'sdf',
  'sdf_p'
);
assert.ok(posExplode.includes('F.posexplode(F.col("arr")).alias("i", "val")'));
assert.ok(!posExplode.includes('.drop('));
assert.throws(() =>
  generateSparkExplodeCode({ tsCFinputExplodeColumn: '' }, 'sdf', 'o')
);

const windowCode = generateSparkWindowCode(
  {
    tsCFradioWindowFn: 'row_number',
    tsCFinputPartitionBy: 'region',
    tsCFinputOrderBy: 'ts',
    tsCFradioOrderDirection: 'desc',
    tsCFinputResultColumn: 'rn'
  },
  'sdf',
  'sdf_w'
);
assert.ok(windowCode.includes('Window.partitionBy("region")'));
assert.ok(windowCode.includes('F.col("ts").desc()'));
assert.ok(windowCode.includes('F.row_number().over(_w)'));
assert.ok(windowCode.includes('withColumn("rn"'));
const lagCode = generateSparkWindowCode(
  {
    tsCFradioWindowFn: 'lag',
    tsCFinputOrderBy: 'ts',
    tsCFinputValueColumn: 'amount',
    tsCFinputOffset: '1',
    tsCFinputResultColumn: 'prev'
  },
  'sdf',
  'sdf_l'
);
assert.ok(lagCode.includes('F.lag(F.col("amount"), 1).over(_w)'));
assert.throws(() =>
  generateSparkWindowCode(
    { tsCFradioWindowFn: 'row_number', tsCFinputOrderBy: '', tsCFinputResultColumn: 'rn' },
    'sdf',
    'o'
  )
);

const pivotCode = generateSparkPivotCode(
  {
    tsCFinputGroupByColumns: 'date',
    tsCFinputPivotColumn: 'cat',
    tsCFinputPivotValues: 'A, B',
    tsCFradioAggFunc: 'sum',
    tsCFinputValueColumn: 'amount'
  },
  'sdf',
  'sdf_p'
);
assert.ok(pivotCode.includes('.groupBy("date")'));
assert.ok(pivotCode.includes('.pivot("cat", ["A", "B"])'));
assert.ok(pivotCode.includes('F.sum(F.col("amount"))'));
assert.throws(() =>
  generateSparkPivotCode(
    {
      tsCFinputGroupByColumns: '',
      tsCFinputPivotColumn: 'cat',
      tsCFradioAggFunc: 'sum',
      tsCFinputValueColumn: 'amount'
    },
    'sdf',
    'o'
  )
);

const unpivotCode = generateSparkUnpivotCode(
  {
    tsCFinputIdColumns: 'id',
    tsCFinputValueColumns: 'jan, feb',
    tsCFinputVariableColumn: 'month',
    tsCFinputValueColumnName: 'amount'
  },
  'sdf',
  'sdf_u'
);
assert.ok(unpivotCode.includes('.unpivot('));
assert.ok(unpivotCode.includes('["id"]'));
assert.ok(unpivotCode.includes('["jan", "feb"]'));
assert.ok(unpivotCode.includes('"month"'));
assert.throws(() =>
  generateSparkUnpivotCode(
    { tsCFinputIdColumns: 'id', tsCFinputValueColumns: '' },
    'sdf',
    'o'
  )
);

const concatCode = generateSparkConcatColumnsCode(
  {
    tsCFinputColumns: 'a, b',
    tsCFinputNewColumnName: 'ab',
    tsCFinputSeparator: '-'
  },
  'sdf',
  'sdf_c'
);
assert.ok(concatCode.includes('F.concat_ws("-"'));
assert.ok(concatCode.includes('withColumn("ab"'));
const concatNoSep = generateSparkConcatColumnsCode(
  { tsCFinputColumns: 'a, b', tsCFinputNewColumnName: 'ab', tsCFinputSeparator: '' },
  'sdf',
  'sdf_c2'
);
assert.ok(concatNoSep.includes('F.concat('));
assert.throws(() =>
  generateSparkConcatColumnsCode(
    { tsCFinputColumns: 'a', tsCFinputNewColumnName: 'x' },
    'sdf',
    'o'
  )
);

const genId = generateSparkGenerateIdCode(
  {
    tsCFradioIdMode: 'row_number',
    tsCFinputRowIdName: 'rid',
    tsCFinputStartingValue: '1'
  },
  'sdf',
  'sdf_id'
);
assert.ok(genId.includes('F.row_number().over(_w)'));
assert.ok(genId.includes('"rid"'));
assert.ok(genId.includes('.withColumn('));
const monoId = generateSparkGenerateIdCode(
  {
    tsCFradioIdMode: 'monotonically_increasing_id',
    tsCFinputRowIdName: 'mid'
  },
  'sdf',
  'sdf_m'
);
assert.ok(monoId.includes('F.monotonically_increasing_id()'));

const coalCode = generateSparkCoalesceCode(
  {
    tsCFinputColumns: 'a, b, c',
    tsCFinputNewColumnName: 'x',
    tsCFbooleanDropSources: true
  },
  'sdf',
  'sdf_co'
);
assert.ok(coalCode.includes('F.coalesce(F.col("a"), F.col("b"), F.col("c"))'));
assert.ok(coalCode.includes('.drop("a", "b", "c")'));
assert.throws(() =>
  generateSparkCoalesceCode({ tsCFinputColumns: 'a' }, 'sdf', 'o')
);

const whenCode = generateSparkWhenCode(
  {
    tsCFinputCondition: "status = 'ok'",
    tsCFinputThenExpr: "'pass'",
    tsCFinputElseExpr: "'fail'",
    tsCFinputResultColumn: 'flag'
  },
  'sdf',
  'sdf_w'
);
assert.ok(whenCode.includes('F.when(F.expr('));
assert.ok(whenCode.includes('.otherwise(F.expr('));
assert.ok(whenCode.includes('withColumn("flag"'));
assert.throws(() =>
  generateSparkWhenCode(
    {
      tsCFinputCondition: '',
      tsCFinputThenExpr: '1',
      tsCFinputResultColumn: 'x'
    },
    'sdf',
    'o'
  )
);

const replaceCode = generateSparkStringReplaceCode(
  {
    tsCFinputColumn: 'name',
    tsCFinputPattern: 'foo',
    tsCFinputReplacement: 'bar',
    tsCFbooleanUseRegex: false,
    tsCFinputResultColumn: 'name2'
  },
  'sdf',
  'sdf_r'
);
assert.ok(replaceCode.includes('F.regexp_replace'));
assert.ok(replaceCode.includes('withColumn("name2"'));
const replaceRe = generateSparkStringReplaceCode(
  {
    tsCFinputColumn: 'name',
    tsCFinputPattern: '\\d+',
    tsCFinputReplacement: 'N',
    tsCFbooleanUseRegex: true
  },
  'sdf',
  'sdf_re'
);
assert.ok(replaceRe.includes('regexp_replace'));
assert.throws(() =>
  generateSparkStringReplaceCode(
    { tsCFinputColumn: 'name', tsCFinputPattern: '' },
    'sdf',
    'o'
  )
);

const trimCode = generateSparkTrimCode(
  {
    tsCFinputColumn: 'name',
    tsCFradioTrimMode: 'both',
    tsCFinputResultColumn: 'name_t'
  },
  'sdf',
  'sdf_t'
);
assert.ok(trimCode.includes('F.trim(F.col("name"))'));
const ltrimCode = generateSparkTrimCode(
  {
    tsCFinputColumn: 'name',
    tsCFradioTrimMode: 'leading',
    tsCFinputTrimChars: '_'
  },
  'sdf',
  'sdf_lt'
);
assert.ok(ltrimCode.includes('F.ltrim("_", F.col("name"))'));

const substrCode = generateSparkSubstringCode(
  {
    tsCFinputColumn: 'code',
    tsCFinputPosition: '1',
    tsCFinputLength: '3',
    tsCFinputResultColumn: 'prefix'
  },
  'sdf',
  'sdf_s'
);
assert.ok(substrCode.includes('F.substring(F.col("code"), 1, 3)'));
const substrRest = generateSparkSubstringCode(
  { tsCFinputColumn: 'code', tsCFinputPosition: '2', tsCFinputLength: '' },
  'sdf',
  'sdf_s2'
);
assert.ok(substrRest.includes('F.expr("substr(code, 2)")'));
assert.throws(() =>
  generateSparkSubstringCode(
    { tsCFinputColumn: 'code', tsCFinputPosition: '0' },
    'sdf',
    'o'
  )
);

const dateTrunc = generateSparkDateTruncCode(
  {
    tsCFinputColumn: 'ts',
    tsCFselectTruncUnit: 'month',
    tsCFinputResultColumn: 'month_start'
  },
  'sdf',
  'sdf_dt'
);
assert.ok(dateTrunc.includes('F.date_trunc("month", F.col("ts"))'));
assert.ok(dateTrunc.includes('"month_start"'));
assert.ok(dateTrunc.includes('.withColumn('));
assert.throws(() =>
  generateSparkDateTruncCode(
    { tsCFinputColumn: 'ts', tsCFselectTruncUnit: 'fortnight' },
    'sdf',
    'o'
  )
);

const setOp = generateSparkSetOpCode(
  { tsCFradioSetOp: 'exceptAll' },
  'l',
  'r',
  'out'
);
assert.ok(setOp.includes('l.exceptAll(r)'));
const setIntersect = generateSparkSetOpCode(
  { tsCFradioSetOp: 'intersect' },
  'l',
  'r',
  'out'
);
assert.ok(setIntersect.includes('l.intersect(r)'));
assert.throws(() =>
  generateSparkSetOpCode({ tsCFradioSetOp: 'union' }, 'l', 'r', 'o')
);

const dateFmt = generateSparkDateFormatCode(
  {
    tsCFradioDateMode: 'to_date',
    tsCFinputColumn: 's',
    tsCFinputFormat: 'yyyy-MM-dd',
    tsCFinputResultColumn: 'd'
  },
  'sdf',
  'sdf_df'
);
assert.ok(dateFmt.includes('F.to_date(F.col("s"), "yyyy-MM-dd")'));
const dateFmtOut = generateSparkDateFormatCode(
  {
    tsCFradioDateMode: 'date_format',
    tsCFinputColumn: 'ts',
    tsCFinputFormat: 'yyyy-MM',
    tsCFinputResultColumn: 'ym'
  },
  'sdf',
  'o'
);
assert.ok(dateFmtOut.includes('F.date_format(F.col("ts"), "yyyy-MM")'));

const arrSize = generateSparkArrayOpsCode(
  { tsCFradioArrayOp: 'size', tsCFinputColumn: 'tags', tsCFinputResultColumn: 'n' },
  'sdf',
  'o'
);
assert.ok(arrSize.includes('F.size(F.col("tags"))'));
const arrContains = generateSparkArrayOpsCode(
  {
    tsCFradioArrayOp: 'contains',
    tsCFinputColumn: 'tags',
    tsCFinputContainsValue: 'x',
    tsCFinputResultColumn: 'has_x'
  },
  'sdf',
  'o'
);
assert.ok(arrContains.includes('F.array_contains(F.col("tags"), "x")'));
const arrGet = generateSparkArrayOpsCode(
  {
    tsCFradioArrayOp: 'get',
    tsCFinputColumn: 'tags',
    tsCFinputArrayIndex: '1',
    tsCFinputResultColumn: 't1'
  },
  'sdf',
  'o'
);
assert.ok(arrGet.includes('F.col("tags")[1]'));

const caseFold = generateSparkCaseFoldCode(
  { tsCFradioCaseMode: 'lower', tsCFinputColumn: 'name' },
  'sdf',
  'o'
);
assert.ok(caseFold.includes('F.lower(F.col("name"))'));

const roundCode = generateSparkRoundCode(
  {
    tsCFradioRoundMode: 'round',
    tsCFinputColumn: 'amt',
    tsCFinputScale: '2',
    tsCFinputResultColumn: 'amt2'
  },
  'sdf',
  'o'
);
assert.ok(roundCode.includes('F.round(F.col("amt"), 2)'));
const ceilCode = generateSparkRoundCode(
  { tsCFradioRoundMode: 'ceil', tsCFinputColumn: 'amt' },
  'sdf',
  'o'
);
assert.ok(ceilCode.includes('F.ceil(F.col("amt"))'));

const hashMd5 = generateSparkHashCode(
  {
    tsCFradioHashMode: 'md5',
    tsCFinputColumns: 'email',
    tsCFinputResultColumn: 'h'
  },
  'sdf',
  'o'
);
assert.ok(hashMd5.includes('F.md5('));
const hashMulti = generateSparkHashCode(
  {
    tsCFradioHashMode: 'hash',
    tsCFinputColumns: 'a, b',
    tsCFinputResultColumn: 'h'
  },
  'sdf',
  'o'
);
assert.ok(hashMulti.includes('F.hash(F.col("a"), F.col("b"))'));

const dateAdd = generateSparkDateAddCode(
  {
    tsCFradioDateAddMode: 'add_months',
    tsCFinputColumn: 'd',
    tsCFinputAmount: '3',
    tsCFinputResultColumn: 'd3'
  },
  'sdf',
  'o'
);
assert.ok(dateAdd.includes('F.add_months(F.col("d"), 3)'));
assert.throws(() =>
  generateSparkDateFormatCode(
    { tsCFradioDateMode: 'to_date', tsCFinputColumn: 's', tsCFinputFormat: '' },
    'sdf',
    'o'
  )
);

const lenCode = generateSparkLengthCode(
  { tsCFradioLengthMode: 'length', tsCFinputColumn: 's', tsCFinputResultColumn: 'n' },
  'sdf',
  'o'
);
assert.ok(lenCode.includes('F.length(F.col("s"))'));
const splitCode = generateSparkSplitCode(
  {
    tsCFinputColumn: 'path',
    tsCFinputSeparator: '/',
    tsCFinputResultColumn: 'parts'
  },
  'sdf',
  'o'
);
assert.ok(splitCode.includes('F.split(F.col("path"), "/")'));
const absCode = generateSparkAbsCode(
  { tsCFradioAbsMode: 'abs', tsCFinputColumn: 'x' },
  'sdf',
  'o'
);
assert.ok(absCode.includes('F.abs(F.col("x"))'));
const greatest = generateSparkGreatestCode(
  {
    tsCFradioGreatestMode: 'least',
    tsCFinputColumns: 'a, b',
    tsCFinputResultColumn: 'm'
  },
  'sdf',
  'o'
);
assert.ok(greatest.includes('F.least(F.col("a"), F.col("b"))'));
const dateDiff = generateSparkDateDiffCode(
  {
    tsCFradioDateDiffMode: 'datediff',
    tsCFinputEndColumn: 'e',
    tsCFinputStartColumn: 's',
    tsCFinputResultColumn: 'd'
  },
  'sdf',
  'o'
);
assert.ok(dateDiff.includes('F.datediff(F.col("e"), F.col("s"))'));
const unixNow = generateSparkUnixTimeCode(
  { tsCFradioUnixMode: 'current_timestamp', tsCFinputResultColumn: 'now_ts' },
  'sdf',
  'o'
);
assert.ok(unixNow.includes('F.current_timestamp()'));
const unixTs = generateSparkUnixTimeCode(
  {
    tsCFradioUnixMode: 'unix_timestamp',
    tsCFinputColumn: 's',
    tsCFinputFormat: 'yyyy-MM-dd',
    tsCFinputResultColumn: 'u'
  },
  'sdf',
  'o'
);
assert.ok(unixTs.includes('F.unix_timestamp(F.col("s"), "yyyy-MM-dd")'));
assert.throws(() =>
  generateSparkSplitCode({ tsCFinputColumn: 'p', tsCFinputSeparator: '' }, 'sdf', 'o')
);

const mathPow = generateSparkMathCode(
  {
    tsCFradioMathMode: 'pow',
    tsCFinputColumn: 'x',
    tsCFinputExponent: '3',
    tsCFinputResultColumn: 'x3'
  },
  'sdf',
  'o'
);
assert.ok(mathPow.includes('F.pow(F.col("x"), 3)'));
const instrCode = generateSparkInstrCode(
  {
    tsCFradioInstrMode: 'instr',
    tsCFinputColumn: 's',
    tsCFinputSubstring: 'ab',
    tsCFinputResultColumn: 'p'
  },
  'sdf',
  'o'
);
assert.ok(instrCode.includes('F.instr(F.col("s"), "ab")'));
const revCode = generateSparkReverseRepeatCode(
  { tsCFradioRevMode: 'reverse', tsCFinputColumn: 's' },
  'sdf',
  'o'
);
assert.ok(revCode.includes('F.reverse(F.col("s"))'));
const isNull = generateSparkIsNullCode(
  {
    tsCFradioNullMode: 'isnan',
    tsCFinputColumn: 'x',
    tsCFinputResultColumn: 'x_nan'
  },
  'sdf',
  'o'
);
assert.ok(isNull.includes('F.isnan(F.col("x"))'));
const structGet = generateSparkStructGetCode(
  {
    tsCFinputColumn: 'payload',
    tsCFinputFieldName: 'id',
    tsCFinputResultColumn: 'pid'
  },
  'sdf',
  'o'
);
assert.ok(structGet.includes('.getField("id")'));
const approx = generateSparkApproxCountDistinctCode(
  {
    tsCFinputColumn: 'uid',
    tsCFinputGroupByColumns: 'region',
    tsCFinputResultColumn: 'n'
  },
  'sdf',
  'o'
);
assert.ok(approx.includes('.groupBy("region").agg('));
assert.ok(approx.includes('F.approx_count_distinct(F.col("uid"))'));

const describeAll = generateSparkDescribeCode(
  { tsCFradioDescribeMode: 'describe', tsCFinputColumns: '' },
  'sdf',
  'o'
);
assert.ok(describeAll.includes('.describe()'));

const describeCols = generateSparkDescribeCode(
  { tsCFradioDescribeMode: 'describe', tsCFinputColumns: 'age, fare' },
  'sdf',
  'o'
);
assert.ok(describeCols.includes('.describe("age", "fare")'));

const summary = generateSparkDescribeCode(
  {
    tsCFradioDescribeMode: 'summary',
    tsCFinputColumns: 'age',
    tsCFinputSummaryStats: 'count, mean, 50%'
  },
  'sdf',
  'o'
);
assert.ok(summary.includes('.select("age").summary("count", "mean", "50%")'));

const checkpoint = generateSparkCheckpointCode(
  { tsCFbooleanEager: true, tsCFinputCheckpointDir: '/tmp/cp' },
  'sdf',
  'o'
);
assert.ok(checkpoint.includes('setCheckpointDir("/tmp/cp")'));
assert.ok(checkpoint.includes('.checkpoint(True)'));

assert.throws(() =>
  generateSparkInstrCode(
    { tsCFradioInstrMode: 'instr', tsCFinputColumn: 's', tsCFinputSubstring: '' },
    'sdf',
    'o'
  )
);

assert.throws(() =>
  generateSparkSqlInputCode(
    {
      tsCFradioAuthMethod: 'oauth',
      tsCFradioQueryMethod: 'query',
      tsCFcodeTextareaSqlQuery: 'SELECT 1',
      tsCFinputMaxRows: '10'
    },
    'df_x'
  )
);
assert.throws(() =>
  generateSparkSqlInputCode(
    {
      tsCFradioAuthMethod: 'kerberos',
      tsCFradioQueryMethod: 'query',
      tsCFcodeTextareaSqlQuery: 'SELECT 1',
      tsCFinputMaxRows: '10'
    },
    'df_x'
  )
);

assert.throws(() =>
  generateSparkFileOutputCode(
    {
      tsCFinputFilePath: '/tmp/p',
      tsCFradioFormat: 'parquet',
      tsCFinputPartitionBy: 'year;drop'
    },
    'df_spark'
  )
);

assert.throws(() =>
  generateSparkSqlInputCode(
    {
      tsCFradioQueryMethod: 'table',
      tsCFinputTableName: 'bad;drop',
      tsCFinputMaxRows: '10'
    },
    'df_x'
  )
);

assert.throws(() =>
  generateSparkSqlInputCode(
    {
      tsCFradioQueryMethod: 'query',
      tsCFcodeTextareaSqlQuery: 'SELECT 1; SELECT 2',
      tsCFinputMaxRows: '10'
    },
    'df_x'
  )
);

console.log('SparkSqlInput codegen golden checks: OK');
console.log('S7.1 codegen matrix:');
console.log('  [x] URL-only emits remote + getenv');
console.log('  [x] token auth emits SPARK_TOKEN fallback');
console.log('  [x] userpass auth emits SPARK_USER/SPARK_PASSWORD + user_id');
console.log('  [x] shared session skips remote(); session builder emits spark=');
console.log('  [x] databricks preset emits SPARK_REMOTE + cluster id');
console.log('  [x] bad table / multi-SQL throw at codegen');
console.log('  [x] max rows + min(SQL LIMIT)');
console.log('  [x] provideDependencies => pyspark[connect]');
console.log('  [x] SparkToPandas bridge + Spark Table Output');
console.log('  [x] Spark File Output CSV header option');
console.log('  [x] Spark Session Stop confirm / no-op');
console.log('  [x] Native Input shared session skips remote()');
console.log('  [x] Spark SQL Transform + partitionBy file output');
console.log('  [x] Spark Limit + Drop Duplicates');
console.log('  [x] Spark Select Columns');
console.log('  [x] Spark Filter');
console.log('  [x] Spark Order By');
console.log('  [x] Spark Repartition / Sample / WithColumn');
console.log('  [x] Spark Cache persist/unpersist');
console.log('  [x] Spark Drop Columns / Distinct / Union / Join');
console.log('  [x] Spark Aggregate / Rename Columns');
console.log('  [x] Spark Fill Na / Cast');
console.log('  [x] Spark File Input');
console.log('  [x] Spark Explode');
console.log('  [x] Spark Window');
console.log('  [x] Spark Pivot');
console.log('  [x] Spark Unpivot / Concat / Generate ID / Coalesce');
console.log('  [x] Spark When / String Replace');
console.log('  [x] Spark Trim / Substring');
console.log('  [x] Spark Date Trunc / Set Op');
console.log('  [x] Spark Date Format / Array Ops / Case / Round / Hash / Date Add');
console.log('  [x] Spark Length / Split / Abs / Greatest / Date Diff / Unix Time');
console.log('  [x] Spark Math / Instr / Reverse / IsNull / StructGet / ApproxDistinct');
console.log('  [x] Spark Describe / Checkpoint');
console.log('  [x] oauth/kerberos auth rejected at codegen');
console.log('  [ ] live Connect cluster (manual)');
console.log('  [ ] UI downstream Filter/CSV (manual)');
