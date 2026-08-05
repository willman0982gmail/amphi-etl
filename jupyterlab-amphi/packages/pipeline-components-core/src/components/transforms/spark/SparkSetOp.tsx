import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkSetOpCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Intersect / except two Spark DataFrames (dual-input).
 */
export class SparkSetOp extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioSetOp: 'intersect'
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Set operation',
          id: 'tsCFradioSetOp',
          options: [
            { value: 'intersect', label: 'intersect' },
            { value: 'intersectAll', label: 'intersectAll' },
            { value: 'except', label: 'except' },
            { value: 'exceptAll', label: 'exceptAll' }
          ],
          tooltip: 'Connect left DF to in1 and right DF to in2.'
        },
        {
          type: 'info',
          id: 'tsCFinfoSetOp',
          label: 'Handles',
          text: 'Schemas must be compatible (same number/types of columns by position).'
        }
      ]
    };
    super(
      'Spark Set Op',
      'sparkSetOp',
      'Intersect or except two Spark DataFrames (in1 ∩ / − in2).',
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

  public generateComponentCode({
    config,
    inputName1,
    inputName2,
    outputName
  }): string {
    return generateSparkSetOpCode(config, inputName1, inputName2, outputName);
  }
}
