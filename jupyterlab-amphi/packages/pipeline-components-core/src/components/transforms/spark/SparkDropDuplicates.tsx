import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDropDuplicatesCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Drop duplicate rows on a Spark DataFrame (native lineage).
 */
export class SparkDropDuplicates extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputSubsetColumns: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Subset columns',
          id: 'tsCFinputSubsetColumns',
          placeholder: 'col1, col2 (empty = all columns)',
          tooltip:
            'Optional comma-separated column names passed to dropDuplicates. Leave empty to consider all columns.'
        }
      ]
    };

    const description =
      'Remove duplicate rows from an upstream Spark DataFrame (dropDuplicates). Optional subset columns.';

    super(
      'Spark Drop Duplicates',
      'sparkDropDuplicates',
      description,
      'spark_df_processor',
      [],
      'transforms.Spark',
      sparkSqlInputIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    return generateSparkDropDuplicatesCode(config, inputName, outputName);
  }
}
