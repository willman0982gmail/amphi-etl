/**
 * Short-TTL cache for GDP Gateway session lists (G7.3).
 * Invalidate on explicit Refresh or namespace change.
 */

import type { GdpSparkConnectSession } from './types';

const DEFAULT_TTL_MS = 30_000;

interface CacheEntry {
  key: string;
  sessions: GdpSparkConnectSession[];
  fetchedAt: number;
}

let entry: CacheEntry | null = null;

export function sessionListCacheKey(
  namespace: string,
  status: string = 'all'
): string {
  return `${namespace.trim()}::${status}`;
}

export function getCachedSessionList(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS
): { sessions: GdpSparkConnectSession[]; fetchedAt: number } | null {
  if (!entry || entry.key !== key) {
    return null;
  }
  if (Date.now() - entry.fetchedAt > ttlMs) {
    return null;
  }
  return {
    sessions: entry.sessions.map(s => ({ ...s })),
    fetchedAt: entry.fetchedAt
  };
}

export function setCachedSessionList(
  key: string,
  sessions: GdpSparkConnectSession[]
): number {
  const fetchedAt = Date.now();
  entry = {
    key,
    sessions: sessions.map(s => ({ ...s })),
    fetchedAt
  };
  return fetchedAt;
}

export function invalidateSessionListCache(): void {
  entry = null;
}

export function getSessionListCacheTtlMs(): number {
  return DEFAULT_TTL_MS;
}
