import { sparkBridgeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkToPandasCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Collect a Spark DataFrame to pandas so existing Amphi transforms/outputs can continue.
 * Design §18.9 — explicit bridge (not a flag on Spark SQL Input).
 */
export class SparkToPandas extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputMaxRows: '10000'
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Max rows',
          id: 'tsCFinputMaxRows',
          placeholder: '10000',
          tooltip:
            'Applies .limit() before toPandas(). Large collects can OOM the Jupyter client.'
        }
      ]
    };

    const description =
      'Collect an upstream Spark DataFrame into a pandas DataFrame (toPandas + convert_dtypes). Connect from Spark SQL (native) / Spark SQL Transform; connect downstream to pandas Filter, CSV Output, etc.';

    super(
      'Spark to Pandas',
      'sparkToPandas',
      description,
      'spark_df_to_pandas_processor',
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
    return generateSparkToPandasCode(config, inputName, outputName);
  }
}
