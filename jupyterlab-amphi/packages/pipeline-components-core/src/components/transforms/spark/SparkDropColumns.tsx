import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDropColumnsCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkDropColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { tsCFinputColumns: '' };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Columns to drop',
          id: 'tsCFinputColumns',
          placeholder: 'col1, col2',
          tooltip: 'Comma-separated column names passed to DataFrame.drop.'
        }
      ]
    };
    super(
      'Spark Drop Columns',
      'sparkDropColumns',
      'Drop columns from an upstream Spark DataFrame (df.drop).',
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
    return generateSparkDropColumnsCode(config, inputName, outputName);
  }
}
