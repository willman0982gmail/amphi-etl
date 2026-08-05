import { sparkSqlInputIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkCacheCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Cache / persist a Spark DataFrame (native).
 */
export class SparkCache extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFradioCacheMode: 'cache',
      tsCFradioStorageLevel: 'MEMORY_AND_DISK'
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioCacheMode',
          options: [
            { value: 'cache', label: 'cache()' },
            { value: 'persist', label: 'persist(level)' },
            { value: 'unpersist', label: 'unpersist()' }
          ],
          tooltip: 'cache() is MEMORY_AND_DISK. persist allows an explicit StorageLevel. unpersist drops cached blocks.'
        },
        {
          type: 'radio',
          label: 'Storage level',
          id: 'tsCFradioStorageLevel',
          condition: { tsCFradioCacheMode: 'persist' },
          options: [
            { value: 'MEMORY_ONLY', label: 'MEMORY_ONLY' },
            { value: 'MEMORY_AND_DISK', label: 'MEMORY_AND_DISK' },
            { value: 'DISK_ONLY', label: 'DISK_ONLY' },
            { value: 'MEMORY_ONLY_SER', label: 'MEMORY_ONLY_SER' },
            { value: 'MEMORY_AND_DISK_SER', label: 'MEMORY_AND_DISK_SER' }
          ]
        }
      ]
    };

    const description =
      'Cache, persist, or unpersist an upstream Spark DataFrame. Useful before repeated actions on the same DF over Connect.';

    super(
      'Spark Cache',
      'sparkCache',
      description,
      'spark_df_processor',
      [],
      'transforms.Spark',
      sparkSqlInputIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    return generateSparkCacheCode(config, inputName, outputName);
  }
}
