import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkWindowCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Window function over a Spark DataFrame (row_number, rank, lag, sum, …).
 */
export class SparkWindow extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioWindowFn: 'row_number',
      tsCFinputPartitionBy: '',
      tsCFinputOrderBy: '',
      tsCFradioOrderDirection: 'asc',
      tsCFinputValueColumn: '',
      tsCFinputOffset: '1',
      tsCFinputNtileBuckets: '4',
      tsCFinputResultColumn: 'w'
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Window function',
          id: 'tsCFradioWindowFn',
          options: [
            { value: 'row_number', label: 'row_number' },
            { value: 'rank', label: 'rank' },
            { value: 'dense_rank', label: 'dense_rank' },
            { value: 'percent_rank', label: 'percent_rank' },
            { value: 'ntile', label: 'ntile' },
            { value: 'lag', label: 'lag' },
            { value: 'lead', label: 'lead' },
            { value: 'sum', label: 'sum' },
            { value: 'avg', label: 'avg' },
            { value: 'min', label: 'min' },
            { value: 'max', label: 'max' },
            { value: 'count', label: 'count' }
          ]
        },
        {
          type: 'input',
          label: 'Partition by',
          id: 'tsCFinputPartitionBy',
          placeholder: 'region (optional)',
          tooltip: 'Comma-separated partition columns.'
        },
        {
          type: 'input',
          label: 'Order by',
          id: 'tsCFinputOrderBy',
          placeholder: 'ts, id',
          tooltip: 'Required for ranking / lag / lead / ntile.'
        },
        {
          type: 'radio',
          label: 'Order direction',
          id: 'tsCFradioOrderDirection',
          options: [
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' }
          ]
        },
        {
          type: 'input',
          label: 'Value column',
          id: 'tsCFinputValueColumn',
          placeholder: 'amount',
          condition: {
            tsCFradioWindowFn: ['lag', 'lead', 'sum', 'avg', 'min', 'max', 'count']
          },
          tooltip: 'Column for lag/lead/agg. For count, leave empty or * for row count.'
        },
        {
          type: 'input',
          label: 'Offset',
          id: 'tsCFinputOffset',
          placeholder: '1',
          condition: { tsCFradioWindowFn: ['lag', 'lead'] }
        },
        {
          type: 'input',
          label: 'Ntile buckets',
          id: 'tsCFinputNtileBuckets',
          placeholder: '4',
          condition: { tsCFradioWindowFn: 'ntile' }
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: 'w'
        }
      ]
    };
    super(
      'Spark Window',
      'sparkWindow',
      'Add a window function column (row_number, rank, lag/lead, running agg) over partition/order.',
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
    return generateSparkWindowCode(config, inputName, outputName);
  }
}
