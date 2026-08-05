import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkStringReplaceCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Replace substrings in a Spark string column (literal or regex).
 */
export class SparkStringReplace extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumn: '',
      tsCFinputPattern: '',
      tsCFinputReplacement: '',
      tsCFbooleanUseRegex: false,
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'text_col'
        },
        {
          type: 'input',
          label: 'Search pattern',
          id: 'tsCFinputPattern',
          placeholder: 'foo'
        },
        {
          type: 'input',
          label: 'Replacement',
          id: 'tsCFinputReplacement',
          placeholder: 'bar'
        },
        {
          type: 'boolean',
          label: 'Use regex',
          id: 'tsCFbooleanUseRegex',
          tooltip:
            'When off, the pattern is treated as a literal (regex-escaped). When on, pattern is a Java regex for regexp_replace.'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to source column)',
          tooltip: 'Leave empty to overwrite the source column.'
        }
      ]
    };
    super(
      'Spark String Replace',
      'sparkStringReplace',
      'Replace text in a string column with regexp_replace (literal or regex mode).',
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
    return generateSparkStringReplaceCode(config, inputName, outputName);
  }
}
