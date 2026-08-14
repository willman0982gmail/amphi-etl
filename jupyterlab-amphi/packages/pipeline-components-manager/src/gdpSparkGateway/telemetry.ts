/**
 * Lightweight, redacted telemetry for GDP Gateway Browse (G9.4).
 * No secrets (tokens / full URLs). Default sink: console.info.
 * Host apps may register additional handlers.
 */

export type GdpGatewayTelemetryEvent =
  | { type: 'browse_open' }
  | { type: 'browse_close' }
  | {
      type: 'browse_select_success';
      sessionId: string;
      name: string;
      namespace: string;
      status: string;
    }
  | { type: 'browse_select_fail'; reason: string }
  | { type: 'browse_create_new'; namespace: string }
  | { type: 'browse_list_error'; message: string }
  | { type: 'browse_list_ok'; count: number; namespace: string }
  | {
      type: 'browse_create_return_autoselect';
      sessionId: string;
      name: string;
    };

export type GdpGatewayTelemetryHandler = (
  event: GdpGatewayTelemetryEvent
) => void;

const handlers: GdpGatewayTelemetryHandler[] = [];

function defaultHandler(event: GdpGatewayTelemetryEvent): void {
  // eslint-disable-next-line no-console
  console.info('[Amphi][GDP Gateway][telemetry]', event);
}

let useDefaultConsole = true;

/** Register a handler; returns unsubscribe. */
export function onGdpGatewayTelemetry(
  handler: GdpGatewayTelemetryHandler
): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) {
      handlers.splice(i, 1);
    }
  };
}

/** Disable the default console sink (tests / production host with own sink). */
export function setGdpGatewayTelemetryDefaultConsole(enabled: boolean): void {
  useDefaultConsole = enabled;
}

export function emitGdpGatewayTelemetry(
  event: GdpGatewayTelemetryEvent
): void {
  if (useDefaultConsole) {
    try {
      defaultHandler(event);
    } catch {
      // never throw from telemetry
    }
  }
  for (const h of handlers) {
    try {
      h(event);
    } catch {
      // isolate handler failures
    }
  }
}

/** Pick newest Ready session not in previousIds (by started_at / created_at). */
export function pickNewReadySession(
  sessions: Array<{
    id: string;
    name: string;
    status: string;
    raw?: unknown;
  }>,
  previousIds: Set<string>
): { id: string; name: string } | null {
  const newcomers = sessions.filter(
    s =>
      !previousIds.has(s.id) &&
      String(s.status).toLowerCase() === 'ready'
  );
  if (newcomers.length === 0) {
    return null;
  }
  const scored = newcomers.map(s => {
    const raw = (s.raw || {}) as Record<string, unknown>;
    const ts = Date.parse(
      String(raw.started_at ?? raw.created_at ?? '') || ''
    );
    return { s, ts: Number.isFinite(ts) ? ts : 0 };
  });
  scored.sort((a, b) => b.ts - a.ts);
  const best = scored[0].s;
  return { id: best.id, name: best.name };
}
