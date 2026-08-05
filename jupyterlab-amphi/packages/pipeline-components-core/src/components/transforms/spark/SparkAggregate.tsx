import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkAggregateCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Group-by + aggregate on a Spark DataFrame (native).
 */
export class SparkAggregate extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputGroupByColumns: '',
      tsCFtextareaAggregations: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Group by columns',
          id: 'tsCFinputGroupByColumns',
          placeholder: 'region, year (optional)',
          tooltip:
            'Comma-separated group keys. Leave empty for a global aggregation (df.agg).'
        },
        {
          type: 'textarea',
          label: 'Aggregations',
          id: 'tsCFtextareaAggregations',
          placeholder: 'sum:amount\ncount:id:row_cnt\navg:price as avg_price',
          tooltip:
            'One per line or comma-separated: op:column, op:column:alias, or op:column as alias. Ops: min, max, sum, avg/mean, count, countDistinct/nunique, first, last, std/stddev, var/variance.'
        }
      ]
    };
    super(
      'Spark Aggregate',
      'sparkAggregate',
      'Group and aggregate a Spark DataFrame (groupBy + F.agg). Empty group-by runs a global agg.',
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
    return generateSparkAggregateCode(config, inputName, outputName);
  }
}
