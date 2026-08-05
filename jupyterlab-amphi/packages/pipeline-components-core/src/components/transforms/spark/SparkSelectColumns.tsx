import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkSelectColumnsCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Project columns on a Spark DataFrame (native lineage).
 */
export class SparkSelectColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumns: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Columns',
          id: 'tsCFinputColumns',
          placeholder: 'col1, col2',
          tooltip:
            'Comma-separated column names for DataFrame.select. Required. Use simple identifiers.'
        }
      ]
    };

    const description =
      'Select a subset of columns from an upstream Spark DataFrame (df.select). Prefer projecting early before collects or writes.';

    super(
      'Spark Select Columns',
      'sparkSelectColumns',
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
    return generateSparkSelectColumnsCode(config, inputName, outputName);
  }
}
