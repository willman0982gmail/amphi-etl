import { fileParquetIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import {
  generateSparkFileInputCode,
  generateSparkSessionBuilderCode,
  sparkSqlProvideDependencies,
  sparkSqlProvideImports
} from './sparkSqlCodegen';

/**
 * Spark File Input — read parquet/csv/json via spark.read (native Spark DF).
 */
export class SparkFileInput extends BaseCoreComponent {
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
      tsCFradioFormat: 'parquet',
      tsCFinputFilePath: '',
      tsCFbooleanCsvHeader: true,
      tsCFinputMaxRows: '10000',
      tsCFradioSessionMode: 'auto'
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Format',
          id: 'tsCFradioFormat',
          options: [
            { value: 'parquet', label: 'Parquet' },
            { value: 'csv', label: 'CSV' },
            { value: 'json', label: 'JSON' }
          ],
          tooltip: 'Spark DataFrameReader format.'
        },
        {
          type: 'input',
          label: 'Path',
          id: 'tsCFinputFilePath',
          placeholder: '/data/in.parquet or s3a://bucket/path',
          tooltip:
            'Path resolved on the Spark Connect cluster filesystem (not necessarily the Jupyter client).'
        },
        {
          type: 'boolean',
          label: 'CSV header',
          id: 'tsCFbooleanCsvHeader',
          condition: { tsCFradioFormat: 'csv' },
          tooltip: 'When reading CSV, treat the first row as header (option header=true).'
        },
        {
          type: 'input',
          label: 'Max rows',
          id: 'tsCFinputMaxRows',
          placeholder: '10000',
          tooltip:
            'Applies DataFrame.limit() after read. Does not collect to pandas.'
        },
        {
          type: 'radio',
          label: 'Spark session',
          id: 'tsCFradioSessionMode',
          options: [
            { value: 'auto', label: 'Auto (shared if Session node present)' },
            { value: 'shared', label: 'Always use shared Session' },
            { value: 'local', label: 'Per-node getOrCreate()' }
          ],
          tooltip:
            'Prefer a Spark Connect Session for multi-node pipelines. Local uses Connect fields below.'
        },
        {
          type: 'radio',
          label: 'Provider',
          id: 'tsCFradioProvider',
          advanced: true,
          options: [
            { value: 'generic', label: 'Generic' },
            { value: 'databricks', label: 'Databricks' }
          ],
          connection: 'SparkConnect',
          tooltip: 'Used when Session mode is Local, or Auto without a Session node.'
        },
        {
          type: 'input',
          label: 'Spark Connect URL',
          id: 'tsCFinputSparkConnectUrl',
          placeholder: 'sc://host:15002',
          advanced: true,
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_CONNECT_URL',
          tooltip: 'Fallback Connect URL when not using a shared Session.'
        },
        {
          type: 'gdpSparkGatewayBrowse',
          label: 'GDP Spark Gateway',
          id: 'tsCFgdpSparkGatewayBrowse',
          advanced: true,
          tooltip:
            'Optional shortcut to fill Connect URL from a Ready Gateway session when not using a shared Session.',
          connection: 'SparkConnect',
          urlFieldId: 'tsCFinputSparkConnectUrl'
        },
        {
          type: 'input',
          label: 'Databricks cluster ID',
          id: 'tsCFinputDatabricksClusterId',
          advanced: true,
          connection: 'SparkConnect',
          connectionVariableName: 'DATABRICKS_CLUSTER_ID',
          condition: { tsCFradioProvider: 'databricks' }
        },
        {
          type: 'radio',
          label: 'Authentication',
          id: 'tsCFradioAuthMethod',
          advanced: true,
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
          label: 'Deferred auth',
          id: 'tsCFinfoDeferredAuth',
          text:
            'OAuth and Kerberos wizards are not implemented. Prefer Token / Username-Password, or configure vendor auth outside Amphi. See examples/spark-sql-input.md.',
          condition: { tsCFradioAuthMethod: ['oauth', 'kerberos'] }
        },
        {
          type: 'input',
          label: 'Access token',
          id: 'tsCFinputToken',
          inputType: 'password',
          advanced: true,
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_TOKEN',
          condition: { tsCFradioAuthMethod: 'token' }
        },
        {
          type: 'input',
          label: 'Username',
          id: 'tsCFinputUserName',
          advanced: true,
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_USER',
          condition: { tsCFradioAuthMethod: 'userpass' }
        },
        {
          type: 'input',
          label: 'Password',
          id: 'tsCFinputPassword',
          inputType: 'password',
          advanced: true,
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_PASSWORD',
          condition: { tsCFradioAuthMethod: 'userpass' }
        },
        {
          type: 'input',
          label: 'Application name',
          id: 'tsCFinputAppName',
          advanced: true,
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_APP_NAME'
        }
      ]
    };

    super(
      'Spark File Input',
      'sparkFileInput',
      'Read parquet/csv/json with spark.read into a Spark DataFrame. Path is resolved on the Connect cluster. Prefer a shared Spark Connect Session.',
      'spark_df_input',
      [],
      'inputs.Spark',
      fileParquetIcon,
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

  public generateComponentCode({ config, outputName }): string {
    return generateSparkFileInputCode(config, outputName);
  }

  public generateSparkConnectProbeCode({ config }): string {
    return generateSparkSessionBuilderCode(config);
  }
}
