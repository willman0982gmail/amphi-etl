import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkRoundCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkRound extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioRoundMode: 'round',
      tsCFinputColumn: '',
      tsCFinputScale: '0',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioRoundMode',
          options: [
            { value: 'round', label: 'round' },
            { value: 'bround', label: 'bround' },
            { value: 'ceil', label: 'ceil' },
            { value: 'floor', label: 'floor' }
          ]
        },
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'amount'
        },
        {
          type: 'input',
          label: 'Scale',
          id: 'tsCFinputScale',
          placeholder: '0',
          condition: { tsCFradioRoundMode: ['round', 'bround'] },
          tooltip: 'Decimal places for round / bround.'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to source column)'
        }
      ]
    };
    super(
      'Spark Round',
      'sparkRound',
      'Round numeric columns with round / bround / ceil / floor.',
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
    return generateSparkRoundCode(config, inputName, outputName);
  }
}
