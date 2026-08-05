import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkSubstringCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Extract a substring from a Spark string column.
 */
export class SparkSubstring extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumn: '',
      tsCFinputPosition: '1',
      tsCFinputLength: '',
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
          label: 'Start position',
          id: 'tsCFinputPosition',
          placeholder: '1',
          tooltip: '1-based position; negative counts from the end (Spark substring).'
        },
        {
          type: 'input',
          label: 'Length (optional)',
          id: 'tsCFinputLength',
          placeholder: 'leave empty for rest of string',
          tooltip: 'When empty, length is omitted from F.substring (to end of string).'
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
      'Spark Substring',
      'sparkSubstring',
      'Extract a substring with F.substring(col, pos[, len]).',
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
    return generateSparkSubstringCode(config, inputName, outputName);
  }
}
