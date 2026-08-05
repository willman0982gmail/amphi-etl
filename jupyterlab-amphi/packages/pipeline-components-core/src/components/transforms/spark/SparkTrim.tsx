import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkTrimCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Trim whitespace or custom characters from a string column.
 */
export class SparkTrim extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumn: '',
      tsCFradioTrimMode: 'both',
      tsCFinputTrimChars: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'name'
        },
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioTrimMode',
          options: [
            { value: 'both', label: 'Both (trim)' },
            { value: 'leading', label: 'Leading (ltrim)' },
            { value: 'trailing', label: 'Trailing (rtrim)' }
          ]
        },
        {
          type: 'input',
          label: 'Trim characters (optional)',
          id: 'tsCFinputTrimChars',
          placeholder: ' (empty = whitespace)',
          tooltip: 'When set, passed as the trim character set to trim/ltrim/rtrim.'
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
      'Spark Trim',
      'sparkTrim',
      'Trim leading/trailing characters from a string column (trim / ltrim / rtrim).',
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
    return generateSparkTrimCode(config, inputName, outputName);
  }
}
