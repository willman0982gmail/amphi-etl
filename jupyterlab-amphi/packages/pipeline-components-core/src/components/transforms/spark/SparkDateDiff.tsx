import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDateDiffCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkDateDiff extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioDateDiffMode: 'datediff',
      tsCFinputEndColumn: '',
      tsCFinputStartColumn: '',
      tsCFbooleanRoundOff: true,
      tsCFinputResultColumn: 'date_diff'
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioDateDiffMode',
          options: [
            { value: 'datediff', label: 'datediff (days)' },
            { value: 'months_between', label: 'months_between' }
          ]
        },
        {
          type: 'input',
          label: 'End column',
          id: 'tsCFinputEndColumn',
          placeholder: 'end_date'
        },
        {
          type: 'input',
          label: 'Start column',
          id: 'tsCFinputStartColumn',
          placeholder: 'start_date'
        },
        {
          type: 'boolean',
          label: 'Round off (months_between)',
          id: 'tsCFbooleanRoundOff',
          condition: { tsCFradioDateDiffMode: 'months_between' }
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: 'date_diff'
        }
      ]
    };
    super(
      'Spark Date Diff',
      'sparkDateDiff',
      'Difference between two date/timestamp columns (datediff / months_between).',
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
    return generateSparkDateDiffCode(config, inputName, outputName);
  }
}
