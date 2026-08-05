import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkLengthCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkLength extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioLengthMode: 'length',
      tsCFinputColumn: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioLengthMode',
          options: [
            { value: 'length', label: 'length (chars)' },
            { value: 'octet_length', label: 'octet_length' },
            { value: 'bit_length', label: 'bit_length' }
          ]
        },
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'text_col'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to <col>_len)'
        }
      ]
    };
    super(
      'Spark Length',
      'sparkLength',
      'Measure string length with length / octet_length / bit_length.',
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
    return generateSparkLengthCode(config, inputName, outputName);
  }
}
