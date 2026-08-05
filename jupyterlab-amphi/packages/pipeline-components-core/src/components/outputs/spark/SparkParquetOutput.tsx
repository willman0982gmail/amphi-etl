import { fileParquetIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkFileOutputCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Spark File Output — write a Spark DataFrame with df.write (no pandas).
 * S12.3 / S16 write path. Design: docs/spark-sql-input-design.md
 */
export class SparkParquetOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputFilePath: 'output.parquet',
      tsCFradioWriteMode: 'overwrite',
      tsCFradioFormat: 'parquet',
      tsCFbooleanCsvHeader: true,
      tsCFinputPartitionBy: ''
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Format',
          id: 'tsCFradioFormat',
          options: [
            { value: 'parquet', label: 'Parquet' },
            { value: 'csv', label: 'CSV' },
            { value: 'json', label: 'JSON' }
          ],
          tooltip: 'Spark DataFrameWriter format.'
        },
        {
          type: 'input',
          label: 'Path',
          id: 'tsCFinputFilePath',
          placeholder: 'output.parquet or /data/out/',
          tooltip: 'Local or cloud path understood by the Spark Connect cluster filesystem.'
        },
        {
          type: 'radio',
          label: 'Write mode',
          id: 'tsCFradioWriteMode',
          options: [
            { value: 'overwrite', label: 'Overwrite' },
            { value: 'append', label: 'Append' },
            { value: 'ignore', label: 'Ignore' },
            { value: 'errorifexists', label: 'Error if exists' }
          ]
        },
        {
          type: 'boolean',
          label: 'CSV header',
          id: 'tsCFbooleanCsvHeader',
          condition: { tsCFradioFormat: 'csv' },
          tooltip: 'When writing CSV, include a header row (option header=true).'
        },
        {
          type: 'input',
          label: 'Partition by',
          id: 'tsCFinputPartitionBy',
          placeholder: 'year, month',
          advanced: true,
          tooltip:
            'Optional comma-separated column names for DataFrameWriter.partitionBy. Columns must exist on the Spark DataFrame.'
        }
      ]
    };

    const description =
      'Write an upstream Spark DataFrame with DataFrameWriter (parquet/csv/json). Connect only from spark_df_* nodes. Path is resolved on the Spark Connect cluster.';

    super(
      'Spark File Output',
      'sparkFileOutput',
      description,
      'spark_df_output',
      [],
      'outputs.Spark',
      fileParquetIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName }): string {
    return generateSparkFileOutputCode(config, inputName);
  }
}
