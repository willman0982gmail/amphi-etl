import { sparkTransformIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { generateSparkWhenCode } from '../../inputs/spark/sparkSqlCodegen';

/**
 * Conditional column via F.when / otherwise.
 */
export class SparkWhen extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputCondition: '',
      tsCFinputThenExpr: '',
      tsCFinputElseExpr: '',
      tsCFinputResultColumn: ''
    };
    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'textarea',
          label: 'Condition',
          id: 'tsCFinputCondition',
          placeholder: "status = 'ok'",
          tooltip: 'Spark SQL boolean expression for F.when(F.expr(...), …).'
        },
        {
          type: 'textarea',
          label: 'Then expression',
          id: 'tsCFinputThenExpr',
          placeholder: "'pass'",
          tooltip: 'Value / SQL expression when condition is true.'
        },
        {
          type: 'textarea',
          label: 'Else expression (optional)',
          id: 'tsCFinputElseExpr',
          placeholder: "'fail'",
          tooltip: 'Optional otherwise(...) expression. Leave empty for null when false.'
        },
        {
          type: 'input',
          label: 'Result column',
          id: 'tsCFinputResultColumn',
          placeholder: 'flag'
        }
      ]
    };
    super(
      'Spark When',
      'sparkWhen',
      'Add a column with F.when(condition, then).otherwise(else) using Spark SQL expressions.',
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
    return generateSparkWhenCode(config, inputName, outputName);
  }
}
