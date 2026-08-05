import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkPivotCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Pivot a Spark DataFrame (groupBy + pivot + agg).
 */
export class SparkPivot extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputGroupByColumns: '',
      tsCFinputPivotColumn: '',
      tsCFinputPivotValues: '',
      tsCFradioAggFunc: 'sum',
      tsCFinputValueColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Group by columns',
          id: 'tsCFinputGroupByColumns',
          placeholder: 'date, region',
          tooltip: 'Comma-separated index columns for groupBy before pivot.'
        },
        {
          type: 'input',
          label: 'Pivot column',
          id: 'tsCFinputPivotColumn',
          placeholder: 'category',
          tooltip: 'Column whose distinct values become new columns.'
        },
        {
          type: 'input',
          label: 'Pivot values (optional)',
          id: 'tsCFinputPivotValues',
          placeholder: 'A, B, C',
          tooltip:
            'Optional comma-separated values to materialize as columns. Empty lets Spark discover values (extra scan).'
        },
        {
          type: 'radio',
          label: 'Aggregation',
          id: 'tsCFradioAggFunc',
          options: [
            { value: 'sum', label: 'sum' },
            { value: 'avg', label: 'avg' },
            { value: 'min', label: 'min' },
            { value: 'max', label: 'max' },
            { value: 'count', label: 'count' }
          ]
        },
        {
          type: 'input',
          label: 'Value column',
          id: 'tsCFinputValueColumn',
          placeholder: 'amount',
          tooltip: 'Numeric column to aggregate. For count, leave empty or use *.'
        }
      ]
    };
    super(
      'Spark Pivot',
      'sparkPivot',
      'Pivot a Spark DataFrame with groupBy + pivot + aggregation (sum/avg/min/max/count).',
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
    return generateSparkPivotCode(config, inputName, outputName);
  }
}
