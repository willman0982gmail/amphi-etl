import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkApproxCountDistinctCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkApproxCountDistinct extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumn: '',
      tsCFinputGroupByColumns: '',
      tsCFinputRsd: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'user_id'
        },
        {
          type: 'input',
          label: 'Group by (optional)',
          id: 'tsCFinputGroupByColumns',
          placeholder: 'region',
          tooltip: 'Empty runs a global aggregation.'
        },
        {
          type: 'input',
          label: 'RSD (optional)',
          id: 'tsCFinputRsd',
          placeholder: '0.05',
          tooltip: 'Relative standard deviation in (0, 1).'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to <col>_approx_n)'
        }
      ]
    };
    super(
      'Spark Approx Count Distinct',
      'sparkApproxCountDistinct',
      'Approximate distinct count with optional groupBy (HyperLogLog).',
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
    return generateSparkApproxCountDistinctCode(config, inputName, outputName);
  }
}
