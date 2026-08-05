import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkGreatestCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkGreatest extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioGreatestMode: 'greatest',
      tsCFinputColumns: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioGreatestMode',
          options: [
            { value: 'greatest', label: 'greatest' },
            { value: 'least', label: 'least' }
          ]
        },
        {
          type: 'input',
          label: 'Columns',
          id: 'tsCFinputColumns',
          placeholder: 'a, b, c'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to greatest/least)'
        }
      ]
    };
    super(
      'Spark Greatest',
      'sparkGreatest',
      'Row-wise greatest or least across columns.',
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
    return generateSparkGreatestCode(config, inputName, outputName);
  }
}
