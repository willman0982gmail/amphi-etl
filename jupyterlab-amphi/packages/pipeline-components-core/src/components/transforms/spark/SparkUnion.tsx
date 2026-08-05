import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkUnionCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Union two Spark DataFrames (in1 + in2).
 */
export class SparkUnion extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioUnionMode: 'unionByName',
      tsCFbooleanAllowMissingColumns: false
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioUnionMode',
          options: [
            { value: 'unionByName', label: 'unionByName' },
            { value: 'union', label: 'union (by position)' }
          ],
          tooltip: 'unionByName matches columns by name; union requires identical schemas by position.'
        },
        {
          type: 'boolean',
          label: 'Allow missing columns',
          id: 'tsCFbooleanAllowMissingColumns',
          condition: { tsCFradioUnionMode: 'unionByName' },
          tooltip: 'Passed to unionByName(..., allowMissingColumns=True).'
        },
        {
          type: 'info',
          id: 'tsCFinfoUnion',
          label: 'Handles',
          text: 'Connect left DF to in1 and right DF to in2.'
        }
      ]
    };
    super(
      'Spark Union',
      'sparkUnion',
      'Union two upstream Spark DataFrames (union or unionByName). Connect sources to in1 and in2.',
      'spark_df_double_processor',
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

  public generateComponentCode({ config, inputName1, inputName2, outputName }): string {
    return generateSparkUnionCode(config, inputName1, inputName2, outputName);
  }
}
