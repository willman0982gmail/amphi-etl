/**
 * Map GDP Spark Gateway JSON → Amphi session DTO.
 * Confirmed list fields: id, name, namespace, connect_id, visibility (private|shared),
 * state, desired_state, driver{cores,memory}, executor{cores,memory,instances},
 * exposure, idle_timeout_minutes (list does not include sc:// URLs).
 */

import type { GdpSparkConnectSession, GdpSessionVisibility } from './types';

function asString(v: unknown, fallback = ''): string {
  if (v == null) {
    return fallback;
  }
  return String(v).trim();
}

function mapVisibility(raw: unknown): GdpSessionVisibility {
  const s = asString(raw).toLowerCase();
  if (s === 'my' || s === 'mine' || s === 'private' || s === 'owner') {
    return 'my';
  }
  if (s === 'shared' || s === 'tenant' || s === 'public') {
    return 'shared';
  }
  return 'unknown';
}

function mapStatus(raw: unknown): string {
  const s = asString(raw);
  if (!s) {
    return 'Unknown';
  }
  if (/ready/i.test(s)) {
    return 'Ready';
  }
  if (/stop/i.test(s)) {
    return 'Stopped';
  }
  return s;
}

function formatResourceSpec(raw: unknown, label: string): string {
  if (!raw) {
    return '';
  }
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const cores = o.cores != null ? `${o.cores}c` : '';
    const memory = o.memory != null ? String(o.memory) : '';
    const size = [cores, memory].filter(Boolean).join(' / ');
    if (label === 'executor') {
      const instances = o.instances != null ? Number(o.instances) : NaN;
      if (Number.isFinite(instances) && size) {
        return `${instances} × ${size}`;
      }
    }
    if (size) {
      return label === 'driver' ? `Driver ${size}` : size;
    }
  }
  return '';
}

function formatIdleTimeout(raw: unknown): string {
  if (raw == null || raw === '') {
    return '';
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return `${raw}m`;
  }
  const s = asString(raw);
  if (/^\d+$/.test(s)) {
    return `${s}m`;
  }
  return s;
}

/** Extract x-gdp-connect-id from a Connect URL (semicolon or query style). */
export function extractConnectIdFromUrl(url: string): string {
  if (!url) {
    return '';
  }
  const m =
    String(url).match(/x-gdp-connect-id[=:]([^;&\s]+)/i) ||
    String(url).match(/x_gdp_connect_id[=:]([^;&\s]+)/i);
  return m ? m[1].trim() : '';
}

/**
 * Build External sc:// URL from connect_id + host.
 * List API returns connect_id only; URL must be composed for SparkSession.remote.
 */
export function buildExternalConnectUrl(
  connectId: string,
  externalHost: string,
  port = 443
): string {
  const host = asString(externalHost)
    .replace(/^sc:\/\//i, '')
    .replace(/\/+$/, '');
  const cid = asString(connectId);
  if (!host || !cid) {
    return '';
  }
  const hostPort = host.includes(':') ? host : `${host}:${port}`;
  return `sc://${hostPort}/;x-gdp-connect-id:${cid}`;
}

export interface MapGatewaySessionOptions {
  /** Hostname (no sc://) used when API omits external URL. */
  externalHost?: string;
}

export function mapGatewaySession(
  raw: Record<string, unknown>,
  fallbackNamespace = '',
  options: MapGatewaySessionOptions = {}
): GdpSparkConnectSession {
  const id = asString(
    raw.id ?? raw.connectId ?? raw.connect_id ?? raw.name,
    'unknown'
  );
  const name = asString(raw.name ?? raw.displayName ?? raw.display_name, id);
  const namespace = asString(
    raw.namespace ?? raw.ns ?? fallbackNamespace,
    fallbackNamespace
  );
  const connectId = asString(
    raw.connectId ?? raw.connect_id ?? raw.gdpConnectId
  );
  let externalUrl = asString(
    raw.externalUrl ??
      raw.external_url ??
      raw.externalConnectUrl ??
      raw.connectUrlExternal
  );
  const internalUrl = asString(
    raw.internalUrl ??
      raw.internal_url ??
      raw.internalConnectUrl ??
      raw.connectUrlInternal
  );

  if (!externalUrl && connectId && options.externalHost) {
    externalUrl = buildExternalConnectUrl(connectId, options.externalHost);
  }

  const driverSummary =
    formatResourceSpec(raw.driverSummary ?? raw.driver ?? raw.driverSpec, 'driver') ||
    undefined;
  const executorSummary =
    formatResourceSpec(
      raw.executorSummary ?? raw.executor ?? raw.executors ?? raw.executorSpec,
      'executor'
    ) || undefined;

  return {
    id,
    name,
    namespace,
    status: mapStatus(raw.status ?? raw.state),
    visibility: mapVisibility(
      raw.visibility ?? raw.scope ?? raw.ownership ?? raw.shared
    ),
    connectId: connectId || extractConnectIdFromUrl(externalUrl) || undefined,
    externalUrl: externalUrl || undefined,
    internalUrl: internalUrl || undefined,
    exposure: asString(raw.exposure) || undefined,
    desiredState: asString(raw.desired_state ?? raw.desiredState) || undefined,
    driverSummary,
    executorSummary,
    idleTimeout:
      formatIdleTimeout(
        raw.idleTimeout ??
          raw.idle_timeout ??
          raw.idleTimeoutMinutes ??
          raw.idle_timeout_minutes
      ) || undefined,
    raw
  };
}

/** Prefer External vs Internal URL for Jupyter binding. */
export function resolveSessionConnectUrl(
  session: GdpSparkConnectSession,
  preference: 'external' | 'internal' = 'external',
  externalHost = ''
): string {
  if (preference === 'internal') {
    return (
      session.internalUrl ||
      session.externalUrl ||
      (session.connectId
        ? buildExternalConnectUrl(session.connectId, externalHost)
        : '')
    );
  }
  return (
    session.externalUrl ||
    (session.connectId
      ? buildExternalConnectUrl(session.connectId, externalHost)
      : '') ||
    session.internalUrl ||
    ''
  );
}
