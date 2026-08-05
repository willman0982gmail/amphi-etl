import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkJoinCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Join two Spark DataFrames (in1 + in2).
 */
export class SparkJoin extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioJoinType: 'inner',
      tsCFinputJoinColumns: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Join type',
          id: 'tsCFradioJoinType',
          options: [
            { value: 'inner', label: 'inner' },
            { value: 'left', label: 'left' },
            { value: 'right', label: 'right' },
            { value: 'outer', label: 'outer' },
            { value: 'left_semi', label: 'left_semi' },
            { value: 'left_anti', label: 'left_anti' },
            { value: 'cross', label: 'cross' }
          ]
        },
        {
          type: 'input',
          label: 'Join columns',
          id: 'tsCFinputJoinColumns',
          placeholder: 'id, or key1, key2',
          condition: { tsCFradioJoinType: ['inner', 'left', 'right', 'outer', 'left_semi', 'left_anti'] },
          tooltip: 'Comma-separated equi-join keys present on both DataFrames. Not used for cross join.'
        },
        {
          type: 'info',
          id: 'tsCFinfoJoin',
          label: 'Handles',
          text: 'Connect left DF to in1 and right DF to in2.'
        }
      ]
    };
    super(
      'Spark Join',
      'sparkJoin',
      'Join two upstream Spark DataFrames. Connect left to in1 and right to in2.',
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
    return generateSparkJoinCode(config, inputName1, inputName2, outputName);
  }
}
