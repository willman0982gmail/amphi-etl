/**
 * Normalized GDP Spark Gateway session DTO (Amphi-facing).
 * Maps from Gateway REST payloads in `mapGatewaySession`.
 *
 * Confirmed list API (redacted): GET {base}/api/v1/connects?limit=50&offset=0
 * Auth: Authorization: Bearer <token>
 * Body: { items: [...], total: number }
 */

export type GdpSessionStatus = 'Ready' | 'Stopped' | 'Unknown' | string;
/** Gateway API uses `private` / `shared`; Amphi normalizes private → my. */
export type GdpSessionVisibility = 'my' | 'shared' | 'unknown';

export interface GdpSparkConnectSession {
  id: string;
  name: string;
  namespace: string;
  status: GdpSessionStatus;
  visibility: GdpSessionVisibility;
  /** Full External sc:// URL (built from connect_id + host when API omits URL). */
  externalUrl?: string;
  /** Cluster-internal sc:// URL when available. */
  internalUrl?: string;
  connectId?: string;
  /** Gateway `exposure` when present (e.g. external). */
  exposure?: string;
  desiredState?: string;
  driverSummary?: string;
  executorSummary?: string;
  idleTimeout?: string;
  raw?: unknown;
}

export interface ListSessionsOptions {
  /** When set, filter client-side (list API returns the caller's connects). */
  namespace?: string;
  /** When set, client may filter server-side or client-side. */
  status?: GdpSessionStatus | 'all';
  limit?: number;
  offset?: number;
}

export interface GdpSparkGatewayClient {
  listSessions(options?: ListSessionsOptions): Promise<GdpSparkConnectSession[]>;
  getSession?(namespace: string, id: string): Promise<GdpSparkConnectSession | null>;
}

export type GdpUrlPreference = 'external' | 'internal';

export interface GdpGatewayConfig {
  /** Base URL of Gateway API (no trailing slash), e.g. https://gateway.example.com */
  baseUrl: string;
  /** Default namespace filter for the picker. */
  defaultNamespace: string;
  /**
   * Hostname used to build External sc:// URLs from `connect_id`
   * (list API does not return Connect URLs).
   * Example: spark-connect-dedicated.example.com
   */
  sparkConnectExternalHost: string;
  /** Use recorded fixtures instead of HTTP (CI / local without Gateway). */
  useFixture: boolean;
  /** Prefer External URLs when applying Browse (Jupyter outside cluster). */
  urlPreference: GdpUrlPreference;
  /** Bearer JWT; required for direct Gateway calls matching portal curl. */
  authToken?: string;
  /**
   * Portal UI base for Create New deep-link (G8).
   * Used when createUrlTemplate is empty.
   */
  portalUrl: string;
  /**
   * Optional full URL template for Create New, may include `{namespace}`.
   * Example: https://portal.example.com/connects/new?namespace={namespace}
   */
  createUrlTemplate: string;
}
