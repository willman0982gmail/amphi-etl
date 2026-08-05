import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDateTruncCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Truncate a date/timestamp column to a calendar unit.
 */
export class SparkDateTrunc extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumn: '',
      tsCFselectTruncUnit: 'day',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'event_ts'
        },
        {
          type: 'select',
          label: 'Trunc unit',
          id: 'tsCFselectTruncUnit',
          options: [
            { value: 'year', label: 'year' },
            { value: 'quarter', label: 'quarter' },
            { value: 'month', label: 'month' },
            { value: 'week', label: 'week' },
            { value: 'day', label: 'day' },
            { value: 'hour', label: 'hour' },
            { value: 'minute', label: 'minute' },
            { value: 'second', label: 'second' }
          ]
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to source column)'
        }
      ]
    };
    super(
      'Spark Date Trunc',
      'sparkDateTrunc',
      'Truncate a date/timestamp with F.date_trunc(unit, col).',
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
    return generateSparkDateTruncCode(config, inputName, outputName);
  }
}
