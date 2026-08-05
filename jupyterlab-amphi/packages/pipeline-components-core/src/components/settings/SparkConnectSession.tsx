import { sparkSessionIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';
import {
  generateSparkSessionBuilderCode,
  sparkSqlProvideDependencies,
  sparkSqlProvideImports
} from '../inputs/spark/sparkSqlCodegen';

/**
 * Spark Connect Session — configure Connect once; Spark SQL Inputs can reuse `spark`.
 * Design: docs/spark-sql-input-design.md §18.7
 */
export class SparkConnectSession extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputSparkConnectUrl: 'sc://localhost:15002',
      tsCFinputAppName: 'amphi-spark-sql-input',
      tsCFradioProvider: 'generic',
      tsCFinputDatabricksClusterId: '',
      tsCFradioAuthMethod: 'none',
      tsCFinputToken: '',
      tsCFinputUserName: '',
      tsCFinputPassword: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Provider',
          id: 'tsCFradioProvider',
          tooltip:
            'Generic OSS Spark Connect, or Databricks Connect URL shape. For Databricks set Auth=Token (PAT).',
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
            'Shared Connect remote. Prefer SPARK_CONNECT_URL or SPARK_REMOTE. Keys: SPARK_CONNECT_URL, SPARK_REMOTE, SPARK_TOKEN, SPARK_USER, SPARK_PASSWORD, DATABRICKS_CLUSTER_ID, SPARK_APP_NAME.',
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
          tooltip: 'Appended as x-databricks-cluster-id=. Prefer DATABRICKS_CLUSTER_ID.'
        },
        {
          type: 'radio',
          label: 'Authentication',
          id: 'tsCFradioAuthMethod',
          tooltip:
            'None / Token / Username+Password — same semantics as Spark SQL Input.',
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
            'OAuth and Kerberos wizards are not implemented. Prefer Token / Username-Password, or configure vendor auth outside Amphi. See examples/spark-sql-input.md.',
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
          tooltip: 'Prefer SPARK_TOKEN via Env/Connection. Do not commit tokens in .ampln.'
        },
        {
          type: 'input',
          label: 'Username',
          id: 'tsCFinputUserName',
          placeholder: 'Enter username',
          connection: 'SparkConnect',
          connectionVariableName: 'SPARK_USER',
          condition: { tsCFradioAuthMethod: 'userpass' },
          tooltip: 'Prefer SPARK_USER. Mapped to Connect URL user_id=.'
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
            'Prefer SPARK_PASSWORD (or SPARK_TOKEN). Mapped to Connect URL token=.'
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
        }
      ]
    };

    const description =
      'Create a shared SparkSession via Spark Connect for reuse by Spark SQL Input nodes. Place one session per pipeline; set Spark SQL Input session mode to Auto (default) or Always shared. Do not call spark.stop() automatically — restart the kernel to switch clusters.';

    super(
      'Spark Connect Session',
      'sparkConnectSession',
      description,
      'spark_session',
      [],
      'configuration',
      sparkSessionIcon,
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

  public generateComponentCode({ config }): string {
    return generateSparkSessionBuilderCode(config);
  }
}
