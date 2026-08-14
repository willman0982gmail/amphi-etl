/**
 * Redact secrets from Spark Connect / Gateway URLs for logs and UI.
 * Never log raw tokens.
 */

const TOKEN_RE = /([;/?&#]|^)(token=)([^;&\s]+)/gi;
const PASSWORDISH_RE = /([;/?&#]|^)((?:password|passwd|secret)=)([^;&\s]+)/gi;

/** Replace token=… (and similar) values with *** in a Connect URL. */
export function redactSparkConnectUrl(url: string): string {
  if (!url) {
    return '';
  }
  return String(url)
    .replace(TOKEN_RE, '$1$2***')
    .replace(PASSWORDISH_RE, '$1$2***');
}

/** Safe one-line summary for console / notifications. */
export function summarizeGdpSessionForLog(session: {
  id?: string;
  name?: string;
  namespace?: string;
  status?: string;
  externalUrl?: string;
  connectId?: string;
}): string {
  const url = session.externalUrl
    ? redactSparkConnectUrl(session.externalUrl)
    : '';
  return [
    session.namespace && `ns=${session.namespace}`,
    session.name && `name=${session.name}`,
    session.id && `id=${session.id}`,
    session.connectId && `connectId=${session.connectId}`,
    session.status && `status=${session.status}`,
    url && `url=${url}`
  ]
    .filter(Boolean)
    .join(' ');
}
