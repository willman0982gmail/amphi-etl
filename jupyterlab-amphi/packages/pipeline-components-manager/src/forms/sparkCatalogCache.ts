/**
 * In-memory cache for Spark catalog Retrieve (SHOW CATALOGS / NAMESPACES / TABLES).
 * Design §18.6 / S21 — cascading selects reuse last successful Refresh per node+scope.
 */
export type SparkCatalogOption = {
  value: string;
  label: string;
  type?: string;
  named?: boolean;
  key?: string;
};

type CacheEntry = {
  items: SparkCatalogOption[];
  fetchedAt: number;
};

const store = new Map<string, CacheEntry>();

export function sparkCatalogCacheKey(
  nodeId: string,
  fieldId: string,
  catalog: string,
  schema: string,
  query?: string
): string {
  return [
    nodeId || '',
    fieldId || '',
    (catalog || '').trim(),
    (schema || '').trim(),
    (query || '').trim()
  ].join('::');
}

export function getSparkCatalogCache(key: string): SparkCatalogOption[] | null {
  const entry = store.get(key);
  return entry ? entry.items.slice() : null;
}

export function setSparkCatalogCache(
  key: string,
  items: SparkCatalogOption[]
): void {
  store.set(key, { items: items.slice(), fetchedAt: Date.now() });
}

/** Drop table-list caches for a node when catalog/schema changes. */
export function invalidateSparkTableCachesForNode(nodeId: string): void {
  const prefix = `${nodeId || ''}::`;
  for (const key of Array.from(store.keys())) {
    if (!key.startsWith(prefix)) continue;
    // field id is second segment; clear table-oriented fields
    const parts = key.split('::');
    const fieldId = parts[1] || '';
    if (
      fieldId === 'tsCFinputTableName' ||
      fieldId.toLowerCase().includes('table')
    ) {
      store.delete(key);
    }
  }
}

export function clearSparkCatalogCache(): void {
  store.clear();
}

/** Compose catalog.schema.table when selecting a short table name (design §18.6). */
export function composeQualifiedTableName(
  catalog: string,
  schema: string,
  table: string
): string {
  const t = (table || '').trim();
  if (!t) return t;
  if (t.includes('.')) return t;
  const c = (catalog || '').trim();
  const s = (schema || '').trim();
  if (c && s) return `${c}.${s}.${t}`;
  if (s) return `${s}.${t}`;
  if (c) return `${c}.${t}`;
  return t;
}
