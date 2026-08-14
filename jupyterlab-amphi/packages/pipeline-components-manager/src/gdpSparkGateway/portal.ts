/**
 * Deep-link helpers for GDP Spark Gateway portal (G8.1 Create New).
 */

import type { GdpGatewayConfig } from './types';

/**
 * Build Create New portal URL.
 * Template may include `{namespace}` placeholder.
 * Example: https://portal.example.com/spark-connects/new?namespace={namespace}
 */
export function buildGatewayCreateNewUrl(
  config: Pick<GdpGatewayConfig, 'portalUrl' | 'createUrlTemplate'>,
  namespace: string
): string {
  const ns = encodeURIComponent((namespace || '').trim());
  const template = (config.createUrlTemplate || '').trim();
  if (template) {
    return template.replace(/\{namespace\}/gi, ns || '');
  }
  const portal = (config.portalUrl || '').replace(/\/+$/, '');
  if (!portal) {
    return '';
  }
  // Conservative default: open portal root with namespace query if known.
  if (ns) {
    return `${portal}?namespace=${ns}`;
  }
  return portal;
}

export function isGatewayCreateNewEnabled(
  config: Pick<GdpGatewayConfig, 'portalUrl' | 'createUrlTemplate'>
): boolean {
  return Boolean(
    (config.createUrlTemplate || '').trim() || (config.portalUrl || '').trim()
  );
}
