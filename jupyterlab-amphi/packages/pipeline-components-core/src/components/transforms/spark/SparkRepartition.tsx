import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkRepartitionCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Repartition or coalesce a Spark DataFrame (native).
 */
export class SparkRepartition extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioPartitionMode: 'repartition',
      tsCFinputNumPartitions: '4',
      tsCFinputPartitionColumns: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioPartitionMode',
          options: [
            { value: 'repartition', label: 'repartition' },
            { value: 'coalesce', label: 'coalesce' }
          ],
          tooltip:
            'repartition can increase or decrease partitions (shuffle). coalesce only reduces without full shuffle.'
        },
        {
          type: 'input',
          label: 'Num partitions',
          id: 'tsCFinputNumPartitions',
          placeholder: '4',
          tooltip: 'Target partition count (>= 1).'
        },
        {
          type: 'input',
          label: 'Partition columns',
          id: 'tsCFinputPartitionColumns',
          placeholder: 'optional col1, col2',
          condition: { tsCFradioPartitionMode: 'repartition' },
          advanced: true,
          tooltip: 'Optional columns for hash partitioning when using repartition.'
        }
      ]
    };

    const description =
      'Change Spark DataFrame partitioning via repartition(n[, cols]) or coalesce(n). Use before wide writes when you need more/fewer tasks.';

    super(
      'Spark Repartition',
      'sparkRepartition',
      description,
      'spark_df_processor',
      [],
      'transforms.Spark',
      sparkSqlInputIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    return generateSparkRepartitionCode(config, inputName, outputName);
  }
}
