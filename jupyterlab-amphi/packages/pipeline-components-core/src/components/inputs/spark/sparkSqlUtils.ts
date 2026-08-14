/**
 * Pure helpers for Spark SQL Input (testable without Lab/React).
 * Design: docs/spark-sql-input-design.md
 */

/** Validate Spark table identifiers: table | schema.table | catalog.schema.table */
export function isValidTableIdentifier(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes(';')) {
    return false;
  }
  const segment = '`?[A-Za-z_][A-Za-z0-9_]*`?';
  const re = new RegExp(`^${segment}(\\.${segment}){0,2}$`);
  return re.test(trimmed);
}

/** Quote identifier segments with backticks for generated SQL. */
export function quoteTableIdentifier(name: string): string {
  return name
    .trim()
    .split('.')
    .map(part => {
      const cleaned = part.replace(/`/g, '');
      return `\`${cleaned}\``;
    })
    .join('.');
}

/** True if SQL contains more than one statement (ignoring a trailing semicolon). */
export function hasMultipleSqlStatements(sql: string): boolean {
  const stripped = String(sql ?? '')
    .replace(/;+\s*$/, '')
    .trim();
  if (!stripped) {
    return false;
  }
  return stripped.includes(';');
}

/**
 * Extract a trailing LIMIT n from SQL if present (simple heuristic, not a full parser).
 * Returns null if not found.
 */
export function extractTrailingLimit(sql: string): number | null {
  const m = String(sql ?? '')
    .replace(/;+\s*$/, '')
    .match(/\blimit\s+(\d+)\s*$/i);
  if (!m) {
    return null;
  }
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Resolve effective max rows: min(formMaxRows, SQL LIMIT) when both present. */
export function resolveEffectiveMaxRows(
  formMaxRows: number,
  sql: string
): number {
  const fromSql = extractTrailingLimit(sql);
  if (fromSql == null) {
    return formMaxRows;
  }
  return Math.min(formMaxRows, fromSql);
}

export function parseMaxRows(raw: unknown, fallback = 10000): number {
  const parsed = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function parseSqlFromConfigValue(raw: unknown): string {
  if (!raw) {
    return '';
  }
  if (typeof raw === 'object' && raw !== null && 'code' in (raw as object)) {
    return String((raw as { code?: unknown }).code ?? '').trim();
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.code === 'string') {
        return parsed.code.trim();
      }
    } catch {
      // raw SQL string
    }
    return raw.trim();
  }
  return '';
}

export function escapePyDouble(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

export function escapePyTripleSql(sql: string): string {
  return String(sql ?? '').replace(/\\/g, '\\\\').replace(/"""/g, '\\"""');
}

/** Extract table name from string or select `{ value }` object. */
export function parseTableNameValue(raw: unknown): string {
  if (!raw) {
    return '';
  }
  if (typeof raw === 'object' && raw !== null && 'value' in (raw as object)) {
    return String((raw as { value?: unknown }).value ?? '').trim();
  }
  return String(raw).trim();
}

/**
 * Compose catalog.schema.table from form parts.
 * If the table field is already qualified (contains `.`), it wins as-is.
 */
export function resolveQualifiedTableName(config: any): string {
  const catalog = parseTableNameValue(config.tsCFinputCatalog);
  const schema = parseTableNameValue(config.tsCFinputSchema);
  const table = parseTableNameValue(config.tsCFinputTableName);
  if (!table) {
    return '';
  }
  if (table.includes('.')) {
    return table;
  }
  return [catalog, schema, table].filter(Boolean).join('.');
}

/** Append token= to a Spark Connect remote URL when missing. */
export function appendTokenToConnectUrl(url: string, token: string): string {
  if (!token || url.includes('token=')) {
    return url;
  }
  const base = url.replace(/\/+$/, '');
  if (base.includes('/;') || base.endsWith(';')) {
    return (base.endsWith(';') ? base : `${base};`) + `token=${token}`;
  }
  return `${base}/;token=${token}`;
}

/**
 * Extract GDP Connect ID from a Spark Connect URL (`;x-gdp-connect-id:…`
 * or `x-gdp-connect-id=`). Does not modify other URL params.
 */
export function extractGdpConnectId(url: string): string {
  if (!url) {
    return '';
  }
  const m =
    String(url).match(/x-gdp-connect-id[=:]([^;&\s]+)/i) ||
    String(url).match(/x_gdp_connect_id[=:]([^;&\s]+)/i);
  return m ? m[1].trim() : '';
}

/** Redact token= values for logs / UI. Preserves x-gdp-connect-id. */
export function redactSparkConnectSecrets(url: string): string {
  if (!url) {
    return '';
  }
  return String(url)
    .replace(/([;/?&#]|^)(token=)([^;&\s]+)/gi, '$1$2***')
    .replace(
      /([;/?&#]|^)((?:password|passwd|secret)=)([^;&\s]+)/gi,
      '$1$2***'
    );
}
