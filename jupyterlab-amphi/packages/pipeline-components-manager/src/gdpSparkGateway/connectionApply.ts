/**
 * Apply a selected GDP session onto Connection node variable rows.
 */

import {
  extractConnectIdFromUrl,
  resolveSessionConnectUrl
} from './mapSession';
import type { GdpSparkConnectSession, GdpUrlPreference } from './types';

export interface ConnectionVariableRow {
  key: string | number;
  name: string;
  value: string;
  default: string;
}

/** Strip token= from Connect URL so secrets stay in SPARK_TOKEN / env. */
export function stripTokenFromConnectUrl(url: string): string {
  if (!url) {
    return '';
  }
  let out = String(url).replace(/;?\s*token=[^;&\s]*/gi, '');
  out = out.replace(/\/;\s*$/, '/');
  out = out.replace(/;{2,}/g, ';');
  if (/sc:\/\/[^/]+\/?$/.test(out.replace(/\/+$/, ''))) {
    return out.replace(/\/+$/, '');
  }
  return out;
}

function upsertVariable(
  rows: ConnectionVariableRow[],
  name: string,
  clearValue: string,
  fetchMethod: string
): ConnectionVariableRow[] {
  const next = rows.map(r => ({ ...r }));
  const idx = next.findIndex(r => r.name === name);
  const envValue = `{os.getenv('${name}')}`;
  const useEnv = fetchMethod === 'envVars' || fetchMethod === 'envFile';
  const row: ConnectionVariableRow = {
    key: idx >= 0 ? next[idx].key : `${name}-${Date.now()}`,
    name,
    value: useEnv ? envValue : clearValue,
    default: useEnv ? clearValue : idx >= 0 ? next[idx].default : ''
  };
  if (idx >= 0) {
    next[idx] = { ...next[idx], ...row, key: next[idx].key };
  } else {
    next.push(row);
  }
  return next;
}

export interface ApplySessionOptions {
  fetchMethod?: string;
  urlPreference?: GdpUrlPreference;
  /** Host for building External URL when session has connect_id only. */
  externalHost?: string;
  /** When true, also write GDP_CONNECT_ID / GDP_CONNECT_NAME metadata. */
  writeMetadata?: boolean;
}

/**
 * Merge selected session into Connection variables.
 * Writes SPARK_CONNECT_URL (no token) and optional metadata keys.
 */
export function applySessionToConnectionVariables(
  rows: ConnectionVariableRow[],
  session: GdpSparkConnectSession,
  options: ApplySessionOptions = {}
): ConnectionVariableRow[] {
  const fetchMethod = options.fetchMethod || 'clear';
  const preference = options.urlPreference || 'external';
  const writeMetadata = options.writeMetadata !== false;

  let url = resolveSessionConnectUrl(
    session,
    preference,
    options.externalHost || ''
  );
  url = stripTokenFromConnectUrl(url);
  if (!url) {
    throw new Error(
      `Selected session "${session.name}" has no ${preference} Connect URL. ` +
        'Set PageConfig gdpSparkConnectExternalHost so Amphi can build sc://…;x-gdp-connect-id:… from connect_id.'
    );
  }

  let next = upsertVariable(rows, 'SPARK_CONNECT_URL', url, fetchMethod);

  if (writeMetadata) {
    const connectId =
      session.connectId || extractConnectIdFromUrl(url) || '';
    if (connectId) {
      next = upsertVariable(next, 'GDP_CONNECT_ID', connectId, fetchMethod);
    }
    if (session.name) {
      next = upsertVariable(
        next,
        'GDP_CONNECT_NAME',
        session.name,
        fetchMethod
      );
    }
  }

  return next;
}

/** Suggest a Connection Name from session name when empty. */
export function suggestConnectionNameFromSession(
  currentName: string,
  session: GdpSparkConnectSession
): string {
  if (currentName && currentName.trim()) {
    return currentName;
  }
  return session.name || session.id || '';
}
