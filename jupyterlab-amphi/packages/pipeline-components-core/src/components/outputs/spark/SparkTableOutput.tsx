import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkTableOutputCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Write a Spark DataFrame to a catalog table via saveAsTable / insertInto.
 */
export class SparkTableOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputCatalog: '',
      tsCFinputSchema: '',
      tsCFinputTableName: '',
      tsCFradioWriteMode: 'overwrite',
      tsCFradioWriteMethod: 'saveAsTable'
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'sparkTable',
          label: 'Catalog',
          id: 'tsCFinputCatalog',
          placeholder: 'optional catalog',
          query: 'SHOW CATALOGS',
          tooltip: 'Optional. Retrieve lists catalogs via SHOW CATALOGS (needs Session or upstream Connect config).'
        },
        {
          type: 'sparkTable',
          label: 'Schema / namespace',
          id: 'tsCFinputSchema',
          placeholder: 'default',
          query: 'SHOW NAMESPACES',
          tooltip: 'Optional. Retrieve lists namespaces (SHOW NAMESPACES).'
        },
        {
          type: 'sparkTable',
          label: 'Table name',
          id: 'tsCFinputTableName',
          placeholder: 'table or catalog.schema.table',
          tooltip:
            'Target table. Retrieve lists tables over Connect when a Session node is present. Composed with Catalog/Schema when unqualified.'
        },
        {
          type: 'radio',
          label: 'Write method',
          id: 'tsCFradioWriteMethod',
          options: [
            { value: 'saveAsTable', label: 'saveAsTable' },
            { value: 'insertInto', label: 'insertInto (existing table)' }
          ]
        },
        {
          type: 'radio',
          label: 'Write mode',
          id: 'tsCFradioWriteMode',
          options: [
            { value: 'overwrite', label: 'Overwrite' },
            { value: 'append', label: 'Append' },
            { value: 'ignore', label: 'Ignore' },
            { value: 'errorifexists', label: 'Error if exists' }
          ],
          condition: { tsCFradioWriteMethod: 'saveAsTable' }
        }
      ]
    };

    const description =
      'Write an upstream Spark DataFrame to a Spark catalog table (saveAsTable or insertInto). Path is resolved on the Connect cluster metastore.';

    super(
      'Spark Table Output',
      'sparkTableOutput',
      description,
      'spark_df_output',
      [],
      'outputs.Spark',
      sparkSqlInputIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public provideDependencies({ config }): string[] {
    return ['pyspark[connect]'];
  }

  public generateComponentCode({ config, inputName }): string {
    return generateSparkTableOutputCode(config, inputName);
  }
}
