import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkSplitCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkSplit extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumn: '',
      tsCFinputSeparator: ',',
      tsCFinputSplitLimit: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'path'
        },
        {
          type: 'input',
          label: 'Separator (regex)',
          id: 'tsCFinputSeparator',
          placeholder: ',',
          tooltip: 'Passed to F.split as a Java regex pattern.'
        },
        {
          type: 'input',
          label: 'Limit (optional)',
          id: 'tsCFinputSplitLimit',
          placeholder: 'leave empty for default',
          tooltip: 'Optional third argument to F.split.'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to <col>_parts)'
        }
      ]
    };
    super(
      'Spark Split',
      'sparkSplit',
      'Split a string column into an array with F.split.',
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
    return generateSparkSplitCode(config, inputName, outputName);
  }
}
