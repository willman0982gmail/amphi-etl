import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkRenameColumnsCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Rename Spark DataFrame columns via withColumnRenamed.
 */
export class SparkRenameColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFtextareaRenameMappings: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'textarea',
          label: 'Rename mappings',
          id: 'tsCFtextareaRenameMappings',
          placeholder: 'old_name:new_name\nqty:quantity',
          tooltip:
            'Comma or newline separated old:new pairs. Emits chained withColumnRenamed calls.'
        }
      ]
    };
    super(
      'Spark Rename Columns',
      'sparkRenameColumns',
      'Rename one or more Spark DataFrame columns (withColumnRenamed).',
      'spark_df_processor',
      [],
      'transforms.Spark',
      sparkTransformIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    return generateSparkRenameColumnsCode(config, inputName, outputName);
  }
}
