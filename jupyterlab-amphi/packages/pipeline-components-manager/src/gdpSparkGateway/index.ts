export type {
  GdpGatewayConfig,
  GdpSparkConnectSession,
  GdpSparkGatewayClient,
  GdpSessionStatus,
  GdpSessionVisibility,
  GdpUrlPreference,
  ListSessionsOptions
} from './types';

export {
  getGdpGatewayConfig,
  isGdpGatewayBrowseEnabled
} from './config';

export {
  createGdpSparkGatewayClient,
  FixtureGdpSparkGatewayClient,
  HttpGdpSparkGatewayClient,
  logSessionSelected
} from './client';

export {
  buildExternalConnectUrl,
  extractConnectIdFromUrl,
  mapGatewaySession,
  resolveSessionConnectUrl
} from './mapSession';

export {
  FIXTURE_EXTERNAL_HOST,
  FIXTURE_LIST_RESPONSE,
  FIXTURE_NAMESPACE,
  FIXTURE_SESSIONS
} from './fixtures';

export {
  redactSparkConnectUrl,
  summarizeGdpSessionForLog
} from './redact';

export {
  applySessionToConnectionVariables,
  suggestConnectionNameFromSession,
  stripTokenFromConnectUrl
} from './connectionApply';
export type {
  ApplySessionOptions,
  ConnectionVariableRow
} from './connectionApply';

export { SparkGatewaySessionPicker } from './SparkGatewaySessionPicker';
export type { SparkGatewaySessionPickerProps } from './SparkGatewaySessionPicker';

export {
  getCachedSessionList,
  invalidateSessionListCache,
  sessionListCacheKey,
  setCachedSessionList,
  getSessionListCacheTtlMs
} from './sessionListCache';

export {
  buildGatewayCreateNewUrl,
  isGatewayCreateNewEnabled
} from './portal';

export {
  isRetryableGatewayError,
  retryDelayMs,
  withRetry
} from './retry';

export {
  emitGdpGatewayTelemetry,
  onGdpGatewayTelemetry,
  pickNewReadySession,
  setGdpGatewayTelemetryDefaultConsole
} from './telemetry';
export type {
  GdpGatewayTelemetryEvent,
  GdpGatewayTelemetryHandler
} from './telemetry';
