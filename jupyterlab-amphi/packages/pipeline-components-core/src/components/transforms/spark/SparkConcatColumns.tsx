import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkConcatColumnsCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Concatenate Spark columns with optional separator.
 */
export class SparkConcatColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumns: '',
      tsCFinputNewColumnName: 'concat_col',
      tsCFinputSeparator: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Columns',
          id: 'tsCFinputColumns',
          placeholder: 'first_name, last_name',
          tooltip: 'Comma-separated columns to concatenate (cast to string).'
        },
        {
          type: 'input',
          label: 'New column name',
          id: 'tsCFinputNewColumnName',
          placeholder: 'full_name'
        },
        {
          type: 'input',
          label: 'Separator',
          id: 'tsCFinputSeparator',
          placeholder: ' (empty = concat, else concat_ws)',
          tooltip: 'Empty uses F.concat; non-empty uses F.concat_ws(separator, …).'
        }
      ]
    };
    super(
      'Spark Concat Columns',
      'sparkConcatColumns',
      'Concatenate columns into a new string column (concat / concat_ws).',
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
    return generateSparkConcatColumnsCode(config, inputName, outputName);
  }
}
