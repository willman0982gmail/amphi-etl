import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkFillNaCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Fill nulls on a Spark DataFrame (fillna).
 */
export class SparkFillNa extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioFillMode: 'value',
      tsCFinputFillValue: '0',
      tsCFinputColumns: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Fill mode',
          id: 'tsCFradioFillMode',
          options: [
            { value: 'value', label: 'Constant value' },
            { value: 'dropna_any', label: 'Drop rows (any null)' },
            { value: 'dropna_all', label: 'Drop rows (all null)' }
          ]
        },
        {
          type: 'input',
          label: 'Fill value',
          id: 'tsCFinputFillValue',
          placeholder: '0, null, true, or text',
          condition: { tsCFradioFillMode: 'value' },
          tooltip:
            'Literal used with fillna(value). Numbers, true/false/null, or a string.'
        },
        {
          type: 'input',
          label: 'Columns (optional)',
          id: 'tsCFinputColumns',
          placeholder: 'col1, col2',
          tooltip: 'Comma-separated subset. Empty applies to all columns.'
        }
      ]
    };
    super(
      'Spark Fill Na',
      'sparkFillNa',
      'Fill nulls (fillna) or drop null rows (dropna) on a Spark DataFrame.',
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
    return generateSparkFillNaCode(config, inputName, outputName);
  }
}
