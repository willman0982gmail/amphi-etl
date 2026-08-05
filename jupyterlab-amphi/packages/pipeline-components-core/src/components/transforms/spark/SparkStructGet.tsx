import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkStructGetCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkStructGet extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumn: '',
      tsCFinputFieldName: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Struct column',
          id: 'tsCFinputColumn',
          placeholder: 'payload'
        },
        {
          type: 'input',
          label: 'Field name',
          id: 'tsCFinputFieldName',
          placeholder: 'user_id'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to field name)'
        }
      ]
    };
    super(
      'Spark Struct Get',
      'sparkStructGet',
      'Extract a struct field with Column.getField.',
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
    return generateSparkStructGetCode(config, inputName, outputName);
  }
}
