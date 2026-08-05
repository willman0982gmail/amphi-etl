import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkExplodeCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Explode array/map columns on a Spark DataFrame.
 */
export class SparkExplode extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputExplodeColumn: '',
      tsCFradioExplodeMode: 'explode',
      tsCFinputValueAlias: '',
      tsCFinputPosAlias: 'pos',
      tsCFbooleanDropOriginal: true
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'input',
          label: 'Column to explode',
          id: 'tsCFinputExplodeColumn',
          placeholder: 'tags',
          tooltip: 'Array or map column name.'
        },
        {
          type: 'radio',
          label: 'Mode',
          id: 'tsCFradioExplodeMode',
          options: [
            { value: 'explode', label: 'explode' },
            { value: 'explode_outer', label: 'explode_outer' },
            { value: 'posexplode', label: 'posexplode' },
            { value: 'posexplode_outer', label: 'posexplode_outer' }
          ]
        },
        {
          type: 'input',
          label: 'Value alias',
          id: 'tsCFinputValueAlias',
          placeholder: '(defaults to column name)',
          tooltip: 'Alias for the exploded value column.'
        },
        {
          type: 'input',
          label: 'Position alias',
          id: 'tsCFinputPosAlias',
          placeholder: 'pos',
          condition: {
            tsCFradioExplodeMode: ['posexplode', 'posexplode_outer']
          },
          tooltip: 'Alias for the position column (posexplode only).'
        },
        {
          type: 'boolean',
          label: 'Drop original column',
          id: 'tsCFbooleanDropOriginal',
          tooltip: 'Drop the source array/map column after explode.'
        }
      ]
    };
    super(
      'Spark Explode',
      'sparkExplode',
      'Explode an array or map column into rows (explode / explode_outer / posexplode).',
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
    return generateSparkExplodeCode(config, inputName, outputName);
  }
}
