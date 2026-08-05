import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkUnixTimeCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkUnixTime extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioUnixMode: 'unix_timestamp',
      tsCFinputColumn: '',
      tsCFinputFormat: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioUnixMode',
          options: [
            { value: 'unix_timestamp', label: 'unix_timestamp' },
            { value: 'from_unixtime', label: 'from_unixtime' },
            { value: 'current_timestamp', label: 'current_timestamp' },
            { value: 'current_date', label: 'current_date' }
          ]
        },
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'ts_or_epoch',
          condition: {
            tsCFradioUnixMode: ['unix_timestamp', 'from_unixtime']
          }
        },
        {
          type: 'input',
          label: 'Format (optional)',
          id: 'tsCFinputFormat',
          placeholder: 'yyyy-MM-dd HH:mm:ss',
          condition: {
            tsCFradioUnixMode: ['unix_timestamp', 'from_unixtime']
          }
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults depend on mode)'
        }
      ]
    };
    super(
      'Spark Unix Time',
      'sparkUnixTime',
      'unix_timestamp / from_unixtime / current_timestamp / current_date.',
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
    return generateSparkUnixTimeCode(config, inputName, outputName);
  }
}
