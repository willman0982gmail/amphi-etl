import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkCoalesceCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Coalesce the first non-null among columns into a result column.
 */
export class SparkCoalesce extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumns: '',
      tsCFinputNewColumnName: '',
      tsCFbooleanDropSources: false
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Columns',
          id: 'tsCFinputColumns',
          placeholder: 'primary, fallback, default_col',
          tooltip: 'Comma-separated columns passed to F.coalesce in order.'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputNewColumnName',
          placeholder: '(defaults to first column)',
          tooltip: 'Name of the coalesced column.'
        },
        {
          type: 'boolean',
          label: 'Drop source columns',
          id: 'tsCFbooleanDropSources',
          tooltip: 'Drop input columns other than the result column name.'
        }
      ]
    };
    super(
      'Spark Coalesce',
      'sparkCoalesce',
      'Pick the first non-null value across columns (F.coalesce).',
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
    return generateSparkCoalesceCode(config, inputName, outputName);
  }
}
