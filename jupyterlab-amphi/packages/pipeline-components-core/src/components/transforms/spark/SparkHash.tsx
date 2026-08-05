import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkHashCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkHash extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioHashMode: 'md5',
      tsCFinputColumns: '',
      tsCFinputShaBits: '256',
      tsCFinputResultColumn: 'hash_val'
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Hash mode',
          id: 'tsCFradioHashMode',
          options: [
            { value: 'md5', label: 'md5' },
            { value: 'sha2', label: 'sha2' },
            { value: 'hash', label: 'hash' },
            { value: 'xxhash64', label: 'xxhash64' }
          ]
        },
        {
          type: 'input',
          label: 'Columns',
          id: 'tsCFinputColumns',
          placeholder: 'col1, col2',
          tooltip: 'md5/sha2 need one column; hash/xxhash64 accept multiple.'
        },
        {
          type: 'select',
          label: 'SHA2 bits',
          id: 'tsCFinputShaBits',
          condition: { tsCFradioHashMode: 'sha2' },
          options: [
            { value: '224', label: '224' },
            { value: '256', label: '256' },
            { value: '384', label: '384' },
            { value: '512', label: '512' }
          ]
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: 'hash_val'
        }
      ]
    };
    super(
      'Spark Hash',
      'sparkHash',
      'Compute md5 / sha2 / hash / xxhash64 for columns.',
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
    return generateSparkHashCode(config, inputName, outputName);
  }
}
