import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkCheckpointCode } from '../../inputs/spark/sparkSqlCodegen';

export class SparkCheckpoint extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFbooleanEager: true,
      tsCFinputCheckpointDir: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'boolean',
          label: 'Eager checkpoint',
          id: 'tsCFbooleanEager',
          tooltip: 'When true, materializes the checkpoint immediately.'
        },
        {
          type: 'input',
          label: 'Checkpoint directory (optional)',
          id: 'tsCFinputCheckpointDir',
          placeholder: 'hdfs:///tmp/spark-checkpoint',
          tooltip:
            'If set, calls spark.sparkContext.setCheckpointDir(...) before checkpoint. Requires an active spark session variable.',
          advanced: true
        }
      ]
    };
    super(
      'Spark Checkpoint',
      'sparkCheckpoint',
      'Checkpoint a Spark DataFrame (truncate lineage). Prefer Cache for in-memory reuse.',
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
    return generateSparkCheckpointCode(config, inputName, outputName);
  }
}
