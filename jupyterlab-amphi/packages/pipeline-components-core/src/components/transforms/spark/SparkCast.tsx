import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkCastCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Cast Spark DataFrame columns to Spark SQL types.
 */
export class SparkCast extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFtextareaCastMappings: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'textarea',
          label: 'Cast mappings',
          id: 'tsCFtextareaCastMappings',
          placeholder: 'amount:double\nid:long\nprice:decimal(10,2)',
          tooltip:
            'Comma or newline separated column:type. Types: string, boolean, byte, short, int, long, float, double, decimal[(p,s)], date, timestamp, binary.'
        }
      ]
    };
    super(
      'Spark Cast',
      'sparkCast',
      'Cast Spark DataFrame columns to Spark SQL types (withColumn + cast).',
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
    return generateSparkCastCode(config, inputName, outputName);
  }
}
