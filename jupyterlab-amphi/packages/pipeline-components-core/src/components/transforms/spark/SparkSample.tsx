import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkSampleCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Sample rows from a Spark DataFrame (native).
 */
export class SparkSample extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputSampleFraction: '0.1',
      tsCFbooleanWithReplacement: false,
      tsCFinputSampleSeed: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Fraction',
          id: 'tsCFinputSampleFraction',
          placeholder: '0.1',
          tooltip: 'Approximate fraction of rows to keep (0, 1].'
        },
        {
          type: 'boolean',
          label: 'With replacement',
          id: 'tsCFbooleanWithReplacement',
          tooltip: 'Passed to DataFrame.sample(withReplacement, fraction, seed).'
        },
        {
          type: 'input',
          label: 'Seed',
          id: 'tsCFinputSampleSeed',
          placeholder: 'optional integer',
          advanced: true,
          tooltip: 'Optional RNG seed for reproducible samples.'
        }
      ]
    };

    const description =
      'Sample an upstream Spark DataFrame with DataFrame.sample. Prefer Spark Limit for an exact row cap.';

    super(
      'Spark Sample',
      'sparkSample',
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
    return generateSparkSampleCode(config, inputName, outputName);
  }
}
