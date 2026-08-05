import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkGenerateIdCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Add a row identifier column on a Spark DataFrame.
 */
export class SparkGenerateId extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioIdMode: 'row_number',
      tsCFinputRowIdName: 'id',
      tsCFinputStartingValue: '1'
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'ID mode',
          id: 'tsCFradioIdMode',
          options: [
            {
              value: 'row_number',
              label: 'Sequential (row_number)'
            },
            {
              value: 'monotonically_increasing_id',
              label: 'monotonically_increasing_id'
            }
          ],
          tooltip:
            'row_number is dense and sequential (may shuffle). monotonically_increasing_id is partition-local unique ids.'
        },
        {
          type: 'input',
          label: 'Column name',
          id: 'tsCFinputRowIdName',
          placeholder: 'id'
        },
        {
          type: 'input',
          label: 'Starting value',
          id: 'tsCFinputStartingValue',
          placeholder: '1',
          condition: { tsCFradioIdMode: 'row_number' },
          tooltip: 'First row_number value (default 1).'
        }
      ]
    };
    super(
      'Spark Generate ID',
      'sparkGenerateId',
      'Add a row id column via row_number or monotonically_increasing_id.',
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
    return generateSparkGenerateIdCode(config, inputName, outputName);
  }
}
