import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkOrderByCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Order rows on a Spark DataFrame (native lineage).
 */
export class SparkOrderBy extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputOrderBy: '',
      tsCFradioSortDirection: 'asc'
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Order by columns',
          id: 'tsCFinputOrderBy',
          placeholder: 'col1, col2',
          tooltip: 'Comma-separated column names for DataFrame.orderBy.'
        },
        {
          type: 'radio',
          label: 'Direction',
          id: 'tsCFradioSortDirection',
          options: [
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' }
          ],
          tooltip: 'Applied to all listed columns (same direction).'
        }
      ]
    };

    const description =
      'Sort an upstream Spark DataFrame with orderBy. Use before Limit when you need top-N by key.';

    super(
      'Spark Order By',
      'sparkOrderBy',
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
    return generateSparkOrderByCode(config, inputName, outputName);
  }
}
