import { sparkSessionIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';
import { generateSparkSessionStopCode } from '../inputs/spark/sparkSqlCodegen';

/**
 * Optional cleanup: stop the shared SparkSession.
 * S11.4 / S15 — prefer kernel restart when switching clusters; use this only when intentional.
 */
export class SparkSessionStop extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFbooleanConfirmStop: false
    };

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'boolean',
          label: 'Confirm stop SparkSession',
          id: 'tsCFbooleanConfirmStop',
          tooltip:
            'When enabled, generated code calls spark.stop(). Disable (default) emits a no-op comment only.'
        },
        {
          type: 'info',
          id: 'tsCFinfoStop',
          label: 'Guidance',
          text:
            'Stopping a Connect session can break other cells using the same spark. Prefer restarting the Jupyter kernel when switching clusters.'
        }
      ]
    };

    const description =
      'Optionally stop the active SparkSession (`spark.stop()`). Place after Spark outputs when you intentionally tear down the session. Default is a documented no-op until Confirm is enabled.';

    super(
      'Spark Session Stop',
      'sparkSessionStop',
      description,
      'spark_session_stop',
      [],
      'configuration',
      sparkSessionIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config }): string {
    return generateSparkSessionStopCode(config);
  }
}
