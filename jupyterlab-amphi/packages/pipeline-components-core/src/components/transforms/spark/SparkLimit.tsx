import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkLimitCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Apply DataFrame.limit on a Spark DataFrame (native lineage).
 */
export class SparkLimit extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputMaxRows: '1000'
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Max rows',
          id: 'tsCFinputMaxRows',
          placeholder: '1000',
          tooltip: 'Applies Spark DataFrame.limit(N). Does not collect to the client.'
        }
      ]
    };

    const description =
      'Limit an upstream Spark DataFrame with .limit(N). Use before writes or Spark to Pandas to cap rows without collecting.';

    super(
      'Spark Limit',
      'sparkLimit',
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
    return generateSparkLimitCode(config, inputName, outputName);
  }
}
