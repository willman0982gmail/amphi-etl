import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkArrayOpsCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkArrayOps extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioArrayOp: 'size',
      tsCFinputColumn: '',
      tsCFinputContainsValue: '',
      tsCFinputArrayIndex: '0',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Operation',
          id: 'tsCFradioArrayOp',
          options: [
            { value: 'size', label: 'size' },
            { value: 'contains', label: 'array_contains' },
            { value: 'get', label: 'get by index' }
          ]
        },
        {
          type: 'input',
          label: 'Array column',
          id: 'tsCFinputColumn',
          placeholder: 'tags'
        },
        {
          type: 'input',
          label: 'Contains value',
          id: 'tsCFinputContainsValue',
          placeholder: 'foo',
          condition: { tsCFradioArrayOp: 'contains' }
        },
        {
          type: 'input',
          label: 'Index',
          id: 'tsCFinputArrayIndex',
          placeholder: '0',
          condition: { tsCFradioArrayOp: 'get' },
          tooltip: '0-based index into the array.'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults depend on op)'
        }
      ]
    };
    super(
      'Spark Array Ops',
      'sparkArrayOps',
      'Array helpers: size, array_contains, or element-by-index.',
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
    return generateSparkArrayOpsCode(config, inputName, outputName);
  }
}
