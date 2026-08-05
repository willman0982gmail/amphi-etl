import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkUnpivotCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Unpivot / melt wide columns into variable + value (Spark 3.4+).
 */
export class SparkUnpivot extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputIdColumns: '',
      tsCFinputValueColumns: '',
      tsCFinputVariableColumn: 'variable',
      tsCFinputValueColumnName: 'value'
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'ID columns',
          id: 'tsCFinputIdColumns',
          placeholder: 'id, region (optional)',
          tooltip: 'Columns to keep as identifiers (id_vars).'
        },
        {
          type: 'input',
          label: 'Columns to unpivot',
          id: 'tsCFinputValueColumns',
          placeholder: 'jan, feb, mar',
          tooltip: 'Wide columns converted into rows (value_vars).'
        },
        {
          type: 'input',
          label: 'Variable column name',
          id: 'tsCFinputVariableColumn',
          placeholder: 'variable'
        },
        {
          type: 'input',
          label: 'Value column name',
          id: 'tsCFinputValueColumnName',
          placeholder: 'value'
        }
      ]
    };
    super(
      'Spark Unpivot',
      'sparkUnpivot',
      'Unpivot (melt) wide columns into variable/value rows via DataFrame.unpivot (Spark 3.4+).',
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
    return generateSparkUnpivotCode(config, inputName, outputName);
  }
}
