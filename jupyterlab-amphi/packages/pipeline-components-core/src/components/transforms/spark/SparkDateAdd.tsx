import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkDateAddCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkDateAdd extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioDateAddMode: 'date_add',
      tsCFinputColumn: '',
      tsCFinputAmount: '1',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioDateAddMode',
          options: [
            { value: 'date_add', label: 'date_add (days)' },
            { value: 'date_sub', label: 'date_sub (days)' },
            { value: 'add_months', label: 'add_months' }
          ]
        },
        {
          type: 'input',
          label: 'Column',
          id: 'tsCFinputColumn',
          placeholder: 'event_date'
        },
        {
          type: 'input',
          label: 'Amount',
          id: 'tsCFinputAmount',
          placeholder: '1',
          tooltip: 'Integer days or months to add/subtract.'
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
      'Spark Date Add',
      'sparkDateAdd',
      'Add or subtract days/months with date_add / date_sub / add_months.',
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
    return generateSparkDateAddCode(config, inputName, outputName);
  }
}
