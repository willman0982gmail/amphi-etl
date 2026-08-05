import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkMathCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkMath extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioMathMode: 'sqrt',
      tsCFinputColumn: '',
      tsCFinputExponent: '2',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Function',
          id: 'tsCFradioMathMode',
          options: [
            { value: 'sqrt', label: 'sqrt' },
            { value: 'exp', label: 'exp' },
            { value: 'log', label: 'log' },
            { value: 'log10', label: 'log10' },
            { value: 'log2', label: 'log2' },
            { value: 'pow', label: 'pow' }
          ]
        },
        { type: 'input', label: 'Column', id: 'tsCFinputColumn', placeholder: 'x' },
        {
          type: 'input',
          label: 'Exponent',
          id: 'tsCFinputExponent',
          placeholder: '2',
          condition: { tsCFradioMathMode: 'pow' }
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
      'Spark Math',
      'sparkMath',
      'Numeric math helpers: sqrt / exp / log / log10 / log2 / pow.',
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
    return generateSparkMathCode(config, inputName, outputName);
  }
}
