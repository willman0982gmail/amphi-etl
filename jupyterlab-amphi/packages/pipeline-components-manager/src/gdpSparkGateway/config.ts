/**
 * GDP Spark Gateway client configuration.
 *
 * PageConfig keys:
 * - gdpSparkGatewayUrl — API base (enables Browse), e.g. https://gateway.example.com
 * - gdpSparkGatewayNamespace — default namespace filter
 * - gdpSparkConnectExternalHost — host for sc://… External URLs (no scheme)
 * - gdpSparkGatewayUseFixture ("true" / "1")
 * - gdpSparkGatewayUrlPreference ("external" | "internal")
 * - gdpSparkGatewayAuthToken — Bearer JWT (never commit real tokens)
 * - gdpSparkGatewayPortalUrl — portal UI base for Create New
 * - gdpSparkGatewayCreateUrlTemplate — optional template with {namespace}
 *
 * Confirmed REST (from Gateway curl capture, redacted):
 *   GET {base}/api/v1/connects?limit=50&offset=0
 *   Authorization: Bearer <token>
 *   Content-Type: application/json
 *   Response: { items: GatewayConnectItem[], total: number }
 */

import { PageConfig } from '@jupyterlab/coreutils';

import type { GdpGatewayConfig, GdpUrlPreference } from './types';

function pageOption(name: string): string {
  try {
    return String(PageConfig.getOption(name) || '').trim();
  } catch {
    return '';
  }
}

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function getGdpGatewayConfig(
  overrides: Partial<GdpGatewayConfig> = {}
): GdpGatewayConfig {
  const prefRaw = (
    overrides.urlPreference ||
    pageOption('gdpSparkGatewayUrlPreference') ||
    'external'
  ).toLowerCase();
  const urlPreference: GdpUrlPreference =
    prefRaw === 'internal' ? 'internal' : 'external';

  return {
    baseUrl: String(
      overrides.baseUrl ?? pageOption('gdpSparkGatewayUrl') ?? ''
    ).replace(/\/+$/, ''),
    defaultNamespace: String(
      overrides.defaultNamespace ??
        pageOption('gdpSparkGatewayNamespace') ??
        ''
    ).trim(),
    sparkConnectExternalHost: String(
      overrides.sparkConnectExternalHost ??
        pageOption('gdpSparkConnectExternalHost') ??
        ''
    )
      .trim()
      .replace(/^sc:\/\//i, '')
      .replace(/\/+$/, ''),
    useFixture:
      overrides.useFixture ??
      parseBool(pageOption('gdpSparkGatewayUseFixture')),
    urlPreference,
    authToken:
      overrides.authToken ??
      (pageOption('gdpSparkGatewayAuthToken') || undefined),
    portalUrl: String(
      overrides.portalUrl ?? pageOption('gdpSparkGatewayPortalUrl') ?? ''
    ).replace(/\/+$/, ''),
    createUrlTemplate: String(
      overrides.createUrlTemplate ??
        pageOption('gdpSparkGatewayCreateUrlTemplate') ??
        ''
    ).trim()
  };
}

/** Browse is enabled when a Gateway base URL is set or fixture mode is on. */
export function isGdpGatewayBrowseEnabled(
  config: GdpGatewayConfig = getGdpGatewayConfig()
): boolean {
  return Boolean(config.useFixture || config.baseUrl);
}
