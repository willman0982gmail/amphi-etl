import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDateFormatCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkDateFormat extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioDateMode: 'date_format',
      tsCFinputColumn: '',
      tsCFinputFormat: 'yyyy-MM-dd',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioDateMode',
          options: [
            { value: 'date_format', label: 'date_format (ts → string)' },
            { value: 'to_date', label: 'to_date (string → date)' },
            { value: 'to_timestamp', label: 'to_timestamp (string → ts)' }
          ]
        },
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'event_ts'
        },
        {
          type: 'input',
          label: 'Format',
          id: 'tsCFinputFormat',
          placeholder: 'yyyy-MM-dd HH:mm:ss',
          tooltip: 'Java SimpleDateFormat-style pattern used by Spark.'
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
      'Spark Date Format',
      'sparkDateFormat',
      'Format timestamps or parse strings with date_format / to_date / to_timestamp.',
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
    return generateSparkDateFormatCode(config, inputName, outputName);
  }
}
