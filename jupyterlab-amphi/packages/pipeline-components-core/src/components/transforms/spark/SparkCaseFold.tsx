import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkCaseFoldCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkCaseFold extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioCaseMode: 'upper',
      tsCFinputColumn: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioCaseMode',
          options: [
            { value: 'upper', label: 'upper' },
            { value: 'lower', label: 'lower' },
            { value: 'initcap', label: 'initcap' }
          ]
        },
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'name'
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
      'Spark Case Fold',
      'sparkCaseFold',
      'Change string case with upper / lower / initcap.',
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
    return generateSparkCaseFoldCode(config, inputName, outputName);
  }
}
