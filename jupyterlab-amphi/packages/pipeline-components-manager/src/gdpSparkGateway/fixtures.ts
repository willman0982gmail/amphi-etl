/**
 * Recorded Gateway fixtures for CI and local Browse (redacted — no real hosts/JWTs/IDs).
 *
 * Raw list shape matches GET /api/v1/connects → { items, total }.
 */

import type { GdpSparkConnectSession } from './types';
import { mapGatewaySession } from './mapSession';

export const FIXTURE_NAMESPACE = 'example-ns-gdp-spark-jobs-dev';

/** Placeholder External Connect host for building sc:// URLs in fixtures. */
export const FIXTURE_EXTERNAL_HOST =
  'spark-connect-dedicated.example.com';

/**
 * Redacted list payload aligned with a real Gateway response
 * (names/states/sizing preserved; ids/hosts/tokens replaced).
 */
export const FIXTURE_LIST_RESPONSE = {
  items: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Test2',
      namespace: FIXTURE_NAMESPACE,
      connect_id: 'REDACTED_CONNECT_ID_TEST2',
      visibility: 'private',
      state: 'READY',
      desired_state: 'RUNNING',
      driver: { cores: 1, memory: '2g' },
      executor: { cores: 2, memory: '2g', instances: 2 },
      spark_conf: {},
      exposure: 'external',
      idle_timeout_minutes: 120,
      created_at: '2026-08-14T00:00:00.000000+00:00',
      started_at: '2026-08-14T00:00:00.000000+00:00',
      is_default: false,
      error_message: null
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'KyleTest',
      namespace: FIXTURE_NAMESPACE,
      connect_id: 'REDACTED_CONNECT_ID_KYLE',
      visibility: 'private',
      state: 'READY',
      desired_state: 'RUNNING',
      driver: { cores: 1, memory: '2g' },
      executor: { cores: 2, memory: '2g', instances: 2 },
      spark_conf: {},
      exposure: 'external',
      idle_timeout_minutes: 480,
      created_at: '2026-08-14T00:00:00.000000+00:00',
      started_at: '2026-08-14T00:00:00.000000+00:00',
      is_default: false,
      error_message: null
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      name: 'SharedAnalytics',
      namespace: FIXTURE_NAMESPACE,
      connect_id: 'REDACTED_CONNECT_ID_SHARED',
      visibility: 'shared',
      state: 'READY',
      desired_state: 'RUNNING',
      driver: { cores: 4, memory: '8g' },
      executor: { cores: 4, memory: '8g', instances: 4 },
      spark_conf: {},
      exposure: 'external',
      idle_timeout_minutes: 120,
      created_at: '2026-08-14T00:00:00.000000+00:00',
      started_at: '2026-08-14T00:00:00.000000+00:00',
      is_default: false,
      error_message: null
    },
    {
      id: '00000000-0000-4000-8000-000000000004',
      name: 'OldBatch',
      namespace: FIXTURE_NAMESPACE,
      connect_id: 'REDACTED_CONNECT_ID_STOPPED',
      visibility: 'private',
      state: 'STOPPED',
      desired_state: 'STOPPED',
      driver: { cores: 1, memory: '2g' },
      executor: { cores: 2, memory: '2g', instances: 0 },
      spark_conf: {},
      exposure: 'external',
      idle_timeout_minutes: 60,
      created_at: '2026-08-01T00:00:00.000000+00:00',
      started_at: null,
      is_default: false,
      error_message: null
    }
  ],
  total: 4
};

export const FIXTURE_SESSIONS: GdpSparkConnectSession[] =
  FIXTURE_LIST_RESPONSE.items.map(item =>
    mapGatewaySession(item as Record<string, unknown>, FIXTURE_NAMESPACE, {
      externalHost: FIXTURE_EXTERNAL_HOST
    })
  );
