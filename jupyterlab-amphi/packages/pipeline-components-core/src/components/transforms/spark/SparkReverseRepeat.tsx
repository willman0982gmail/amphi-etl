import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkReverseRepeatCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkReverseRepeat extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioRevMode: 'reverse',
      tsCFinputColumn: '',
      tsCFinputRepeatN: '2',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioRevMode',
          options: [
            { value: 'reverse', label: 'reverse' },
            { value: 'repeat', label: 'repeat' }
          ]
        },
        { type: 'input', label: 'Column', id: 'tsCFinputColumn', placeholder: 'text' },
        {
          type: 'input',
          label: 'Repeat count',
          id: 'tsCFinputRepeatN',
          placeholder: '2',
          condition: { tsCFradioRevMode: 'repeat' }
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to source)'
        }
      ]
    };
    super(
      'Spark Reverse/Repeat',
      'sparkReverseRepeat',
      'Reverse or repeat a string column.',
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
    return generateSparkReverseRepeatCode(config, inputName, outputName);
  }
}
