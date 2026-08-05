import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkInstrCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkInstr extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioInstrMode: 'instr',
      tsCFinputColumn: '',
      tsCFinputSubstring: '',
      tsCFinputStartPos: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioInstrMode',
          options: [
            { value: 'instr', label: 'instr' },
            { value: 'locate', label: 'locate' }
          ]
        },
        { type: 'input', label: 'Column', id: 'tsCFinputColumn', placeholder: 'text' },
        {
          type: 'input',
          label: 'Substring',
          id: 'tsCFinputSubstring',
          placeholder: 'needle'
        },
        {
          type: 'input',
          label: 'Start position (locate)',
          id: 'tsCFinputStartPos',
          placeholder: '1',
          condition: { tsCFradioInstrMode: 'locate' }
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: '(defaults to <col>_pos)'
        }
      ]
    };
    super(
      'Spark Instr',
      'sparkInstr',
      'Find substring position with instr / locate.',
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
    return generateSparkInstrCode(config, inputName, outputName);
  }
}
