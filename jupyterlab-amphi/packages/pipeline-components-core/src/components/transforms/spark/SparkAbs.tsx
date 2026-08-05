import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkAbsCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkAbs extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioAbsMode: 'abs',
      tsCFinputColumn: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioAbsMode',
          options: [
            { value: 'abs', label: 'abs' },
            { value: 'signum', label: 'signum' }
          ]
        },
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'delta'
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
      'Spark Abs',
      'sparkAbs',
      'Absolute value or signum of a numeric column.',
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
    return generateSparkAbsCode(config, inputName, outputName);
  }
}
