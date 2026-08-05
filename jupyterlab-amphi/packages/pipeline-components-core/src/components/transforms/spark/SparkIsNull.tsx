import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkIsNullCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkIsNull extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioNullMode: 'isnull',
      tsCFinputColumn: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioNullMode',
          options: [
            { value: 'isnull', label: 'isnull' },
            { value: 'isnotnull', label: 'isnotnull' },
            { value: 'isnan', label: 'isnan' }
          ]
        },
        { type: 'input', label: 'Column', id: 'tsCFinputColumn', placeholder: 'col' },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to <col>_<mode>)'
        }
      ]
    };
    super(
      'Spark Is Null',
      'sparkIsNull',
      'Add a boolean column for isnull / isnotnull / isnan.',
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
    return generateSparkIsNullCode(config, inputName, outputName);
  }
}
