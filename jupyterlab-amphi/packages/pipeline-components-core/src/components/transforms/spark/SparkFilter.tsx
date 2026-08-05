import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkFilterCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Filter rows on a Spark DataFrame with a SQL WHERE-style expression (native).
 */
export class SparkFilter extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputFilterExpr: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'textarea',
          label: 'Filter expression',
          id: 'tsCFinputFilterExpr',
          placeholder: "status = 'ok' AND n > 0",
          tooltip:
            'Passed to DataFrame.filter / where as a SQL expression string. Single expression only (no semicolons).'
        }
      ]
    };

    const description =
      'Filter an upstream Spark DataFrame with a SQL expression (df.filter). Prefer filtering before collects or writes.';

    super(
      'Spark Filter',
      'sparkFilter',
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
    return generateSparkFilterCode(config, inputName, outputName);
  }
}
