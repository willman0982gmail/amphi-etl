import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import {
  generateSparkSqlInputCode,
  generateSparkSessionBuilderCode,
  sparkSqlProvideDependencies,
  sparkSqlProvideImports
} from './sparkSqlCodegen';
import { isValidTableIdentifier, quoteTableIdentifier } from './sparkSqlUtils';

/**
 * Spark SQL Input — run Spark SQL via Spark Connect and load results as pandas.
 * Design: docs/spark-sql-input-design.md
 */
export class SparkSqlInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputSparkConnectUrl: 'sc://localhost:15002',
      tsCFinputAppName: 'amphi-spark-sql-input',
      tsCFradioProvider: 'generic',
      tsCFinputDatabricksClusterId: '',
      tsCFradioAuthMethod: 'none',
      tsCFinputToken: '',
      tsCFinputUserName: '',
      tsCFinputPassword: '',
      tsCFradioQueryMethod: 'query',
      tsCFinputCatalog: '',
      tsCFinputSchema: '',
      tsCFinputTableName: '',
      tsCFcodeTextareaSqlQuery: '',
      tsCFinputMaxRows: '10000',
      tsCFradioSessionMode: 'auto'
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Provider',
          id: 'tsCFradioProvider',
          tooltip:
            'Generic OSS Spark Connect, or Databricks Connect URL shape (workspace:443 + PAT + cluster id). For Databricks prefer Auth=Token and SPARK_REMOTE / DATABRICKS_CLUSTER_ID env vars.',
          options: [
            { value: 'generic', label: 'Generic' },
            { value: 'databricks', label: 'Databricks' }
          ],
          connection: 'SparkConnect'
        },
        {
          type: 'input',
          label: 'Spark Connect URL',
          id: 'tsCFinputSparkConnectUrl',
          placeholder: 'sc://host:15002',
          tooltip:
            'Spark Connect remote. Generic: sc://host:15002. Databricks: sc://workspace.cloud.databricks.com:443. Prefer SPARK_CONNECT_URL or SPARK_REMOTE. Connection keys: SPARK_CONNECT_URL, SPARK_REMOTE, SPARK_TOKEN, SPARK_USER, SPARK_PASSWORD, DATABRICKS_CLUSTER_ID, SPARK_APP_NAME.',
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_CONNECT_URL'
        },
        {
          type: 'input',
          label: 'Databricks cluster ID',
          id: 'tsCFinputDatabricksClusterId',
          placeholder: 'cluster-id',
          connection: 'SparkConnect',
          connectionVariableName: 'DATABRICKS_CLUSTER_ID',
          condition: { tsCFradioProvider: 'databricks' },
          tooltip:
            'Appended as x-databricks-cluster-id=. Prefer DATABRICKS_CLUSTER_ID via Env/Connection.'
        },
        {
          type: 'radio',
          label: 'Authentication',
          id: 'tsCFradioAuthMethod',
          tooltip:
            'None for open Connect endpoints; Token for access-token gateways and Databricks PAT; Username/Password for gateways that accept user_id + token/password URL params.',
          options: [
            { value: 'none', label: 'None' },
            { value: 'token', label: 'Token' },
            { value: 'userpass', label: 'Username / Password' },
            { value: 'oauth', label: 'OAuth (deferred)' },
            { value: 'kerberos', label: 'Kerberos (deferred)' }
          ],
          connection: 'SparkConnect'
        },
        {
          type: 'info',
          id: 'tsCFinfoAuthDeferred',
          label: 'Deferred auth',
          text:
            'OAuth and Kerberos wizards are not implemented. Prefer Token / Username-Password URL params, or configure vendor SDK / kinit outside Amphi. See examples/spark-sql-input.md.',
          condition: { tsCFradioAuthMethod: ['oauth', 'kerberos'] }
        },
        {
          type: 'input',
          label: 'Access token',
          id: 'tsCFinputToken',
          placeholder: 'Enter access token',
          inputType: 'password',
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_TOKEN',
          condition: { tsCFradioAuthMethod: 'token' },
          tooltip: 'Prefer SPARK_TOKEN via Env/Connection when possible. Do not commit tokens in .ampln.'
        },
        {
          type: 'input',
          label: 'Username',
          id: 'tsCFinputUserName',
          placeholder: 'Enter username',
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_USER',
          condition: { tsCFradioAuthMethod: 'userpass' },
          tooltip: 'Prefer SPARK_USER via Env/Connection. Mapped to Connect URL user_id=.'
        },
        {
          type: 'input',
          label: 'Password',
          id: 'tsCFinputPassword',
          placeholder: 'Enter password',
          inputType: 'password',
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_PASSWORD',
          condition: { tsCFradioAuthMethod: 'userpass' },
          tooltip:
            'Prefer SPARK_PASSWORD (or SPARK_TOKEN) via Env/Connection. Mapped to Connect URL token=. Do not commit passwords in .ampln.'
        },
        {
          type: 'input',
          label: 'Application name',
          id: 'tsCFinputAppName',
          placeholder: 'amphi-spark-sql-input',
          advanced: true,
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_APP_NAME',
          tooltip: 'Passed to SparkSession.appName. Can also use SPARK_APP_NAME.'
        },
        {
          type: 'radio',
          label: 'Query method',
          id: 'tsCFradioQueryMethod',
          tooltip:
            'Use SQL Query for full Spark SQL, or Table Name as a shortcut for SELECT * FROM table.',
          options: [
            { value: 'query', label: 'SQL Query' },
            { value: 'table', label: 'Table Name' }
          ]
        },
        {
          type: 'codeTextarea',
          label: 'SQL Query',
          id: 'tsCFcodeTextareaSqlQuery',
          height: '150px',
          mode: 'sql',
          placeholder: 'SELECT *\nFROM samples.nyctaxi.trips\nLIMIT 1000',
          condition: { tsCFradioQueryMethod: 'query' },
          tooltip:
            'Spark SQL executed via spark.sql(). Prefer filtering and projection in SQL. Single statement only.'
        },
        {
          type: 'sparkTable',
          label: 'Catalog',
          id: 'tsCFinputCatalog',
          placeholder: 'optional catalog',
          condition: { tsCFradioQueryMethod: 'table' },
          query: 'SHOW CATALOGS',
          tooltip: 'Optional. Retrieve lists catalogs via SHOW CATALOGS over Connect.'
        },
        {
          type: 'sparkTable',
          label: 'Schema / namespace',
          id: 'tsCFinputSchema',
          placeholder: 'default',
          condition: { tsCFradioQueryMethod: 'table' },
          query: 'SHOW NAMESPACES',
          tooltip:
            'Optional. Retrieve lists namespaces (SHOW NAMESPACES). If Catalog is set, scoped listing uses Catalog+Schema for tables.'
        },
        {
          type: 'sparkTable',
          label: 'Table name',
          id: 'tsCFinputTableName',
          placeholder: 'Select or type table name',
          condition: { tsCFradioQueryMethod: 'table' },
          tooltip:
            'Click Retrieve to list tables over Spark Connect (uses Session node if present). Fill Schema/Catalog above to scope SHOW TABLES. Or type a fully qualified name.'
        },
        {
          type: 'input',
          label: 'Max rows',
          id: 'tsCFinputMaxRows',
          placeholder: '10000',
          tooltip:
            'Results are collected into the Jupyter client with toPandas(). Large results can exhaust memory. Prefer filtering and projection in SQL. Effective limit is min(Max rows, SQL LIMIT) when both are set.'
        },
        {
          type: 'radio',
          label: 'Spark session',
          id: 'tsCFradioSessionMode',
          advanced: true,
          options: [
            { value: 'auto', label: 'Auto (shared if Session node present)' },
            { value: 'shared', label: 'Always use shared Session' },
            { value: 'local', label: 'Per-node getOrCreate()' }
          ],
          tooltip:
            'Auto uses the global `spark` from a Spark Connect Session settings node when one exists; otherwise creates a session on this node. Shared requires a Session node. Local always creates/reuses via getOrCreate on this node.'
        }
      ]
    };

    const description =
      'Run Spark SQL against a Spark Connect endpoint and load the result as a pandas DataFrame. Requires a reachable Spark Connect server and a matching PySpark client (pip install "pyspark[connect]"; client ≈ server, prefer 3.5+).';

    super(
      'Spark SQL Input',
      'sparkSqlInput',
      description,
      'pandas_df_input',
      [],
      'inputs.Spark',
      sparkSqlInputIcon,
      defaultConfig,
      form
    );
  }

  public provideDependencies({ config }): string[] {
    return sparkSqlProvideDependencies();
  }

  public provideImports({ config }): string[] {
    return sparkSqlProvideImports();
  }

  public static isValidTableIdentifier = isValidTableIdentifier;
  public static quoteTableIdentifier = quoteTableIdentifier;

  public generateComponentCode({ config, outputName }): string {
    return generateSparkSqlInputCode(config, outputName);
  }

  /** Used by RequestService.retrieveSparkTableList when no Session node is present. */
  public generateSparkConnectProbeCode({ config }): string {
    return generateSparkSessionBuilderCode(config);
  }
}

export {
  appendTokenToConnectUrl,
  isValidTableIdentifier,
  quoteTableIdentifier,
  hasMultipleSqlStatements,
  extractTrailingLimit,
  resolveEffectiveMaxRows,
  parseMaxRows,
  resolveQualifiedTableName,
  parseTableNameValue
} from './sparkSqlUtils';

export {
  generateSparkSqlInputCode,
  generateSparkSqlNativeCode,
  generateSparkSessionBuilderCode,
  resolveSparkSql,
  shouldUseSharedSparkSession,
  sparkSqlProvideDependencies,
  sparkSqlProvideImports
} from './sparkSqlCodegen';
