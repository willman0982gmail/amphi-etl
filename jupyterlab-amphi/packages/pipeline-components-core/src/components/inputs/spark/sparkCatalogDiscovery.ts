/**
 * S10.3 — catalog discovery SQL helpers (kernel-side Refresh will execute these).
 * Prefer SHOW statements over catalog API for Connect portability (design §18.5).
 */

export function sqlShowCatalogs(): string {
  return 'SHOW CATALOGS';
}

export function sqlShowNamespaces(catalog?: string): string {
  const c = (catalog || '').trim();
  if (!c) {
    return 'SHOW NAMESPACES';
  }
  return `SHOW NAMESPACES IN ${quoteSimpleIdent(c)}`;
}

export function sqlShowTables(namespace: string, catalog?: string): string {
  const ns = (namespace || '').trim();
  if (!ns) {
    throw new Error('sqlShowTables: namespace is required');
  }
  const c = (catalog || '').trim();
  if (c) {
    return `SHOW TABLES IN ${quoteSimpleIdent(c)}.${quoteSimpleIdent(ns)}`;
  }
  return `SHOW TABLES IN ${quoteSimpleIdent(ns)}`;
}

function quoteSimpleIdent(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Invalid identifier for discovery SQL: ${name}`);
  }
  return `\`${name}\``;
}

/** Fully qualified table name from cascading select values. */
export function formatQualifiedTableName(
  catalog: string | undefined,
  schema: string,
  table: string
): string {
  const parts = [catalog, schema, table]
    .map(p => (p || '').trim())
    .filter(Boolean);
  return parts.join('.');
}
