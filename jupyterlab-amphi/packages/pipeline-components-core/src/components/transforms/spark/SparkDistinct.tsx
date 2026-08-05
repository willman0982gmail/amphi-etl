import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDistinctCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkDistinct extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'info',
          id: 'tsCFinfoDistinct',
          label: 'Note',
          text: 'Applies DataFrame.distinct() (all columns). For subset-based dedupe, use Spark Drop Duplicates.'
        }
      ]
    };
    super(
      'Spark Distinct',
      'sparkDistinct',
      'Remove fully duplicate rows from an upstream Spark DataFrame (distinct).',
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
    return generateSparkDistinctCode(config, inputName, outputName);
  }
}
