import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkSqlTransformCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Spark SQL Transform — register input Spark DF as a temp view and run SQL.
 * Design / S12.3 / S17: docs/spark-sql-input-design.md
 */
export class SparkSqlTransform extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputTempViewName: 'amphi_spark_in',
      tsCFcodeTextareaSqlQuery: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Temp view name',
          id: 'tsCFinputTempViewName',
          placeholder: 'amphi_spark_in',
          tooltip:
            'Input Spark DataFrame is registered with createOrReplaceTempView. Reference this name in the SQL.'
        },
        {
          type: 'codeTextarea',
          label: 'SQL Query',
          id: 'tsCFcodeTextareaSqlQuery',
          height: '150px',
          mode: 'sql',
          placeholder:
            'SELECT *\nFROM amphi_spark_in\nWHERE 1 = 1',
          tooltip: 'Single Spark SQL statement. Use the temp view name as the FROM source.'
        }
      ]
    };

    const description =
      'Apply Spark SQL to an upstream Spark DataFrame (temp view + spark.sql). Connect from Spark SQL (native) or another Spark processor. Does not collect to pandas.';

    super(
      'Spark SQL Transform',
      'sparkSqlTransform',
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
    return generateSparkSqlTransformCode(config, inputName, outputName);
  }
}
