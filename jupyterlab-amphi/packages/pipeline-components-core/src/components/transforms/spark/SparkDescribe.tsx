import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDescribeCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkDescribe extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioDescribeMode: 'describe',
      tsCFinputColumns: '',
      tsCFinputSummaryStats: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioDescribeMode',
          options: [
            { value: 'describe', label: 'describe()' },
            { value: 'summary', label: 'summary()' }
          ],
          tooltip:
            'Returns a stats DataFrame (count/mean/stddev/min/max for describe; richer percentiles for summary).'
        },
        {
          type: 'input',
          label: 'Columns (optional)',
          id: 'tsCFinputColumns',
          placeholder: 'age, fare',
          tooltip: 'Comma-separated. Empty = all columns.'
        },
        {
          type: 'input',
          label: 'Summary stats (optional)',
          id: 'tsCFinputSummaryStats',
          placeholder: 'count, mean, max, 50%',
          tooltip: 'Only for summary() mode. Empty = Spark defaults.',
          condition: { tsCFradioDescribeMode: 'summary' }
        }
      ]
    };
    super(
      'Spark Describe',
      'sparkDescribe',
      'Compute describe()/summary() statistics as a Spark DataFrame.',
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
    return generateSparkDescribeCode(config, inputName, outputName);
  }
}
