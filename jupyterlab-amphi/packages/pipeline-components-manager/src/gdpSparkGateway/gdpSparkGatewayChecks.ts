#!/usr/bin/env node
/**
 * G1.7 / G4 — GDP Spark Gateway client + URL helper checks (no live Gateway).
 * Run: npx tsx src/gdpSparkGateway/gdpSparkGatewayChecks.ts
 */
import assert from 'assert';

import {
  applySessionToConnectionVariables,
  buildExternalConnectUrl,
  createGdpSparkGatewayClient,
  extractConnectIdFromUrl,
  FIXTURE_EXTERNAL_HOST,
  FIXTURE_LIST_RESPONSE,
  FIXTURE_NAMESPACE,
  FIXTURE_SESSIONS,
  FixtureGdpSparkGatewayClient,
  mapGatewaySession,
  redactSparkConnectUrl,
  resolveSessionConnectUrl,
  stripTokenFromConnectUrl,
  suggestConnectionNameFromSession
} from './index';

async function main(): Promise<void> {
  const client = new FixtureGdpSparkGatewayClient();

  const ready = await client.listSessions({
    namespace: FIXTURE_NAMESPACE,
    status: 'Ready'
  });
  assert.ok(ready.length >= 2);
  assert.ok(ready.every(s => s.status === 'Ready'));
  assert.ok(ready.some(s => s.visibility === 'shared'));

  const stopped = await client.listSessions({
    namespace: FIXTURE_NAMESPACE,
    status: 'Stopped'
  });
  assert.ok(stopped.length >= 1);

  const one = await client.getSession(
    FIXTURE_NAMESPACE,
    '00000000-0000-4000-8000-000000000001'
  );
  assert.ok(one);
  assert.strictEqual(one!.name, 'Test2');
  assert.ok(
    (one!.externalUrl || '').includes('x-gdp-connect-id:'),
    'External fixture URL must include Connect ID'
  );
  assert.strictEqual(one!.driverSummary, 'Driver 1c / 2g');
  assert.strictEqual(one!.executorSummary, '2 × 2c / 2g');
  assert.strictEqual(one!.idleTimeout, '120m');

  // Real list API shape (redacted) → DTO
  const rawItem = FIXTURE_LIST_RESPONSE.items[0] as Record<string, unknown>;
  const mapped = mapGatewaySession(rawItem, '', {
    externalHost: FIXTURE_EXTERNAL_HOST
  });
  assert.strictEqual(mapped.status, 'Ready');
  assert.strictEqual(mapped.visibility, 'my'); // private → my
  assert.strictEqual(mapped.connectId, 'REDACTED_CONNECT_ID_TEST2');
  assert.strictEqual(mapped.exposure, 'external');
  assert.strictEqual(mapped.desiredState, 'RUNNING');
  assert.ok(
    mapped.externalUrl!.startsWith(
      `sc://${FIXTURE_EXTERNAL_HOST}:443/;x-gdp-connect-id:`
    )
  );

  assert.strictEqual(
    buildExternalConnectUrl('CID', 'spark.example.com'),
    'sc://spark.example.com:443/;x-gdp-connect-id:CID'
  );

  assert.strictEqual(
    extractConnectIdFromUrl(
      'sc://h:443/;token=t;x-gdp-connect-id:abc-123'
    ),
    'abc-123'
  );

  const withToken =
    'sc://spark-connect-dedicated.example.com:443/;token=super-secret;x-gdp-connect-id:cid-9';
  assert.strictEqual(
    redactSparkConnectUrl(withToken),
    'sc://spark-connect-dedicated.example.com:443/;token=***;x-gdp-connect-id:cid-9'
  );

  const stripped = stripTokenFromConnectUrl(withToken);
  assert.ok(!stripped.includes('token='));
  assert.ok(stripped.includes('x-gdp-connect-id:cid-9'));

  assert.ok(
    resolveSessionConnectUrl(FIXTURE_SESSIONS[0], 'external').includes(
      'x-gdp-connect-id:'
    )
  );

  // Session with connect_id only (as list API) + host override
  const fromIdOnly = resolveSessionConnectUrl(
    {
      id: 'x',
      name: 'n',
      namespace: 'ns',
      status: 'Ready',
      visibility: 'my',
      connectId: 'ONLY_ID'
    },
    'external',
    'gw.example.com'
  );
  assert.strictEqual(
    fromIdOnly,
    'sc://gw.example.com:443/;x-gdp-connect-id:ONLY_ID'
  );

  const rows = applySessionToConnectionVariables(
    [],
    FIXTURE_SESSIONS[0],
    { fetchMethod: 'clear', urlPreference: 'external' }
  );
  const urlRow = rows.find(r => r.name === 'SPARK_CONNECT_URL');
  assert.ok(urlRow);
  assert.ok(urlRow!.value.includes('x-gdp-connect-id:'));
  assert.ok(!urlRow!.value.includes('token='));
  assert.ok(rows.some(r => r.name === 'GDP_CONNECT_ID'));
  assert.ok(rows.some(r => r.name === 'GDP_CONNECT_NAME'));

  const envRows = applySessionToConnectionVariables(
    [],
    FIXTURE_SESSIONS[0],
    { fetchMethod: 'envFile' }
  );
  assert.strictEqual(
    envRows.find(r => r.name === 'SPARK_CONNECT_URL')!.value,
    `{os.getenv('SPARK_CONNECT_URL')}`
  );
  assert.ok(
    envRows
      .find(r => r.name === 'SPARK_CONNECT_URL')!
      .default.includes('x-gdp-connect-id:')
  );

  assert.strictEqual(
    suggestConnectionNameFromSession('', FIXTURE_SESSIONS[0]),
    'Test2'
  );
  assert.strictEqual(
    suggestConnectionNameFromSession('keep-me', FIXTURE_SESSIONS[0]),
    'keep-me'
  );

  const factoryClient = createGdpSparkGatewayClient({ useFixture: true });
  const listed = await factoryClient.listSessions({
    status: 'Ready',
    limit: 50,
    offset: 0
  });
  assert.ok(listed.length > 0);

  assert.strictEqual(FIXTURE_LIST_RESPONSE.total, 4);
  assert.ok(
    !JSON.stringify(FIXTURE_LIST_RESPONSE).includes('eyJ'),
    'fixtures must not contain JWT-looking strings'
  );
  assert.ok(
    !JSON.stringify(FIXTURE_LIST_RESPONSE).includes('scbdev'),
    'fixtures must not contain real host fragments'
  );

  // G7.3 session list cache
  const {
    getCachedSessionList,
    invalidateSessionListCache,
    sessionListCacheKey,
    setCachedSessionList
  } = await import('./sessionListCache');
  invalidateSessionListCache();
  const ckey = sessionListCacheKey(FIXTURE_NAMESPACE, 'all');
  assert.strictEqual(getCachedSessionList(ckey), null);
  setCachedSessionList(ckey, ready);
  assert.strictEqual(getCachedSessionList(ckey)?.sessions.length, ready.length);
  invalidateSessionListCache();
  assert.strictEqual(getCachedSessionList(ckey), null);

  // G8.1 portal Create New URL
  const { buildGatewayCreateNewUrl, isGatewayCreateNewEnabled } = await import(
    './portal'
  );
  assert.strictEqual(
    isGatewayCreateNewEnabled({ portalUrl: '', createUrlTemplate: '' }),
    false
  );
  assert.ok(
    isGatewayCreateNewEnabled({
      portalUrl: 'https://portal.example.com',
      createUrlTemplate: ''
    })
  );
  assert.strictEqual(
    buildGatewayCreateNewUrl(
      {
        portalUrl: '',
        createUrlTemplate:
          'https://portal.example.com/new?namespace={namespace}'
      },
      'my-ns'
    ),
    'https://portal.example.com/new?namespace=my-ns'
  );
  assert.strictEqual(
    buildGatewayCreateNewUrl(
      { portalUrl: 'https://portal.example.com/', createUrlTemplate: '' },
      'ns1'
    ),
    'https://portal.example.com?namespace=ns1'
  );

  // G9.3 retry helpers
  const { retryDelayMs, withRetry, isRetryableGatewayError } = await import(
    './retry'
  );
  assert.strictEqual(retryDelayMs(1, 300), 300);
  assert.strictEqual(retryDelayMs(2, 300), 600);
  assert.ok(isRetryableGatewayError(new Error('Network error contacting x')));
  assert.ok(isRetryableGatewayError(new Error('HTTP 503 for /api')));
  assert.ok(!isRetryableGatewayError(new Error('HTTP 401 unauthorized')));
  let tries = 0;
  const sleeps: number[] = [];
  const val = await withRetry(
    async () => {
      tries += 1;
      if (tries < 3) {
        throw new Error('Network error blip');
      }
      return 'ok';
    },
    {
      attempts: 3,
      baseDelayMs: 10,
      sleep: async ms => {
        sleeps.push(ms);
      }
    }
  );
  assert.strictEqual(val, 'ok');
  assert.strictEqual(tries, 3);
  assert.strictEqual(sleeps.length, 2);

  // G8.3 / G9.4 — pickNewReadySession + telemetry
  const {
    pickNewReadySession,
    emitGdpGatewayTelemetry,
    onGdpGatewayTelemetry,
    setGdpGatewayTelemetryDefaultConsole
  } = await import('./telemetry');
  setGdpGatewayTelemetryDefaultConsole(false);
  const events: string[] = [];
  const unsub = onGdpGatewayTelemetry(e => {
    events.push(e.type);
  });
  emitGdpGatewayTelemetry({ type: 'browse_open' });
  emitGdpGatewayTelemetry({
    type: 'browse_select_success',
    sessionId: '1',
    name: 'n',
    namespace: 'ns',
    status: 'Ready'
  });
  unsub();
  assert.deepStrictEqual(events, ['browse_open', 'browse_select_success']);

  const prev = new Set(['old']);
  const picked = pickNewReadySession(
    [
      {
        id: 'old',
        name: 'Old',
        status: 'Ready',
        raw: { started_at: '2026-01-01T00:00:00Z' }
      },
      {
        id: 'new1',
        name: 'NewOne',
        status: 'Ready',
        raw: { started_at: '2026-08-14T12:00:00Z' }
      },
      {
        id: 'new2',
        name: 'NewTwo',
        status: 'Stopped',
        raw: { started_at: '2026-08-14T13:00:00Z' }
      }
    ],
    prev
  );
  assert.ok(picked);
  assert.strictEqual(picked!.id, 'new1');
  assert.strictEqual(
    pickNewReadySession([{ id: 'old', name: 'O', status: 'Ready' }], prev),
    null
  );
  setGdpGatewayTelemetryDefaultConsole(true);

  console.log('GDP Spark Gateway client checks: OK');
  console.log('  [x] Fixture list Ready / Stopped (real API field shapes)');
  console.log('  [x] private → my; state READY → Ready');
  console.log('  [x] driver/executor/idle_timeout_minutes formatting');
  console.log('  [x] External URL built from connect_id + host');
  console.log('  [x] redact / strip token helpers');
  console.log('  [x] applySessionToConnectionVariables clear + envFile');
  console.log('  [x] session list TTL cache');
  console.log('  [x] Create New portal URL builder');
  console.log('  [x] list API retry / backoff helpers');
  console.log('  [x] telemetry + create-return auto-select helper');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
