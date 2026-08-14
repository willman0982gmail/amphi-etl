/**
 * GdpSparkGatewayClient implementations.
 *
 * Confirmed list path: GET {base}/api/v1/connects?limit=50&offset=0
 * Auth: Authorization: Bearer <token>
 * Call path: Lab frontend → Gateway (or proxy base URL).
 */

import { FIXTURE_SESSIONS } from './fixtures';
import {
  mapGatewaySession,
  resolveSessionConnectUrl
} from './mapSession';
import { redactSparkConnectUrl, summarizeGdpSessionForLog } from './redact';
import { withRetry } from './retry';
import type {
  GdpSparkConnectSession,
  GdpSparkGatewayClient,
  ListSessionsOptions
} from './types';
import type { GdpGatewayConfig } from './types';
import { getGdpGatewayConfig } from './config';

export {
  buildExternalConnectUrl,
  extractConnectIdFromUrl,
  mapGatewaySession,
  resolveSessionConnectUrl
} from './mapSession';

export class FixtureGdpSparkGatewayClient implements GdpSparkGatewayClient {
  constructor(private readonly sessions: GdpSparkConnectSession[] = FIXTURE_SESSIONS) {}

  async listSessions(
    options: ListSessionsOptions = {}
  ): Promise<GdpSparkConnectSession[]> {
    const ns = (options.namespace || '').trim();
    let list = this.sessions.filter(
      s => !ns || s.namespace === ns || s.namespace === ''
    );
    if (options.status && options.status !== 'all') {
      const want = String(options.status).toLowerCase();
      list = list.filter(s => String(s.status).toLowerCase() === want);
    }
    return list.map(s => ({ ...s }));
  }

  async getSession(
    namespace: string,
    id: string
  ): Promise<GdpSparkConnectSession | null> {
    const found = this.sessions.find(
      s =>
        s.id === id &&
        (!namespace || s.namespace === namespace || s.namespace === '')
    );
    return found ? { ...found } : null;
  }
}

export class HttpGdpSparkGatewayClient implements GdpSparkGatewayClient {
  constructor(private readonly config: GdpGatewayConfig) {
    if (!config.baseUrl) {
      throw new Error(
        'GDP Spark Gateway base URL is not configured (gdpSparkGatewayUrl).'
      );
    }
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    if (this.config.authToken) {
      h.Authorization = `Bearer ${this.config.authToken}`;
    }
    return h;
  }

  private mapItem(item: Record<string, unknown>): GdpSparkConnectSession {
    return mapGatewaySession(item, '', {
      externalHost: this.config.sparkConnectExternalHost
    });
  }

  private async fetchJson(path: string): Promise<unknown> {
    return withRetry(() => this.fetchJsonOnce(path), {
      attempts: 3,
      baseDelayMs: 300
    });
  }

  private async fetchJsonOnce(path: string): Promise<unknown> {
    const url = `${this.config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
        credentials: 'include'
      });
    } catch (err: any) {
      throw new Error(
        `Network error contacting GDP Spark Gateway (${redactSparkConnectUrl(url)}): ${String(err?.message ?? err)}`
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Not authorized to list Spark Connect sessions (${res.status}). Sign in to GDP Gateway or check scopes.`
      );
    }
    if (!res.ok) {
      throw new Error(
        `GDP Spark Gateway returned HTTP ${res.status} for ${path}`
      );
    }
    try {
      return await res.json();
    } catch {
      throw new Error('GDP Spark Gateway returned a malformed JSON body.');
    }
  }

  private extractItems(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) {
      return body as Record<string, unknown>[];
    }
    if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      const items = o.items ?? o.data ?? o.sessions ?? o.results;
      if (Array.isArray(items)) {
        return items as Record<string, unknown>[];
      }
    }
    return [];
  }

  async listSessions(
    options: ListSessionsOptions = {}
  ): Promise<GdpSparkConnectSession[]> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    // Confirmed: GET /api/v1/connects?limit=&offset=
    const body = await this.fetchJson(`/api/v1/connects?${params.toString()}`);
    let mapped = this.extractItems(body).map(item => this.mapItem(item));

    const ns = (options.namespace || '').trim();
    if (ns) {
      mapped = mapped.filter(s => s.namespace === ns);
    }
    if (options.status && options.status !== 'all') {
      const want = String(options.status).toLowerCase();
      mapped = mapped.filter(s => String(s.status).toLowerCase() === want);
    }
    return mapped;
  }

  async getSession(
    _namespace: string,
    id: string
  ): Promise<GdpSparkConnectSession | null> {
    const sid = encodeURIComponent(id);
    try {
      // Detail path inferred from list resource; adjust if Gateway differs.
      const body = await this.fetchJson(`/api/v1/connects/${sid}`);
      if (!body || typeof body !== 'object') {
        return null;
      }
      return this.mapItem(body as Record<string, unknown>);
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (/HTTP 404/.test(msg)) {
        return null;
      }
      throw err;
    }
  }
}

/** Factory: fixture or HTTP client based on config. */
export function createGdpSparkGatewayClient(
  overrides: Partial<GdpGatewayConfig> = {}
): GdpSparkGatewayClient {
  const config = getGdpGatewayConfig(overrides);
  if (config.useFixture || !config.baseUrl) {
    if (!config.useFixture && !config.baseUrl) {
      throw new Error(
        'GDP Spark Gateway is not configured. Set gdpSparkGatewayUrl or enable gdpSparkGatewayUseFixture.'
      );
    }
    return new FixtureGdpSparkGatewayClient();
  }
  return new HttpGdpSparkGatewayClient(config);
}

/** Log a session selection without leaking tokens. */
export function logSessionSelected(session: GdpSparkConnectSession): void {
  // eslint-disable-next-line no-console
  console.info(
    '[Amphi][GDP Gateway] selected session:',
    summarizeGdpSessionForLog(session)
  );
}
