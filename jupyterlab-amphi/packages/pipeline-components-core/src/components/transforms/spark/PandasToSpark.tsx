import { sparkBridgeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

/**
 * Lift a pandas DataFrame into a Spark DataFrame (requires active `spark` session).
 */
export class PandasToSpark extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'info',
          label: 'Note',
          id: 'tsCFinfoPandasToSpark',
          text:
            'Requires an active SparkSession named `spark` (add a Spark Connect Session node, or run a Spark SQL node first).'
        }
      ]
    };

    const description =
      'Convert an upstream pandas DataFrame to a Spark DataFrame via spark.createDataFrame. Requires a Spark Connect Session (or prior Spark SQL node) so `spark` exists in the kernel.';

    super(
      'Pandas to Spark',
      'pandasToSpark',
      description,
      'pandas_df_to_spark_processor',
      [],
      'transforms.Spark',
      sparkBridgeIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    return `
# Pandas to Spark
try:
    spark
except NameError as _amphi_spark_err:
    raise RuntimeError(
        "Pandas to Spark requires an active SparkSession named 'spark'. "
        "Add a Spark Connect Session node (or run Spark SQL Input first)."
    ) from _amphi_spark_err
${outputName} = spark.createDataFrame(${inputName})
`;
  }
}
