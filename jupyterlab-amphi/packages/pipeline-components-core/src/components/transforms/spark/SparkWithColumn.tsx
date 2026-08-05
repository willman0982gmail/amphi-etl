import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkWithColumnCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Add or replace a column via Spark SQL expression (native).
 */
export class SparkWithColumn extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputColumnName: '',
      tsCFinputColumnExpr: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Column name',
          id: 'tsCFinputColumnName',
          placeholder: 'new_col',
          tooltip: 'Name of the column to add or replace.'
        },
        {
          type: 'textarea',
          label: 'Expression',
          id: 'tsCFinputColumnExpr',
          placeholder: 'n * 2',
          tooltip:
            'Spark SQL expression for F.expr(...). Single expression only (no semicolons).'
        }
      ]
    };

    const description =
      'Add or replace a Spark DataFrame column with withColumn + F.expr. For multi-column SQL, use Spark SQL Transform.';

    super(
      'Spark With Column',
      'sparkWithColumn',
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
    return generateSparkWithColumnCode(config, inputName, outputName);
  }
}
