#!/usr/bin/env node
/**
 * S21 — catalog cache unit checks (no Lab runtime).
 * Run: npx tsx src/forms/sparkCatalogCacheChecks.ts
 */
import assert from 'assert';
import {
  clearSparkCatalogCache,
  composeQualifiedTableName,
  getSparkCatalogCache,
  invalidateSparkTableCachesForNode,
  setSparkCatalogCache,
  sparkCatalogCacheKey
} from './sparkCatalogCache';

clearSparkCatalogCache();

const keyTables = sparkCatalogCacheKey(
  'node1',
  'tsCFinputTableName',
  'main',
  'default',
  'SHOW TABLES'
);
const keyCats = sparkCatalogCacheKey('node1', 'tsCFinputCatalog', '', '', 'SHOW CATALOGS');

assert.strictEqual(
  keyTables,
  'node1::tsCFinputTableName::main::default::SHOW TABLES'
);

setSparkCatalogCache(keyTables, [
  { value: 't1', label: 't1', type: 'table' },
  { value: 't2', label: 't2', type: 'table' }
]);
setSparkCatalogCache(keyCats, [{ value: 'main', label: 'main', type: 'table' }]);

assert.strictEqual(getSparkCatalogCache(keyTables)?.length, 2);
assert.strictEqual(getSparkCatalogCache(keyCats)?.length, 1);

invalidateSparkTableCachesForNode('node1');
assert.strictEqual(getSparkCatalogCache(keyTables), null);
assert.strictEqual(getSparkCatalogCache(keyCats)?.length, 1);

assert.strictEqual(
  composeQualifiedTableName('cat', 'sch', 'tbl'),
  'cat.sch.tbl'
);
assert.strictEqual(composeQualifiedTableName('', 'sch', 'tbl'), 'sch.tbl');
assert.strictEqual(composeQualifiedTableName('', '', 'a.b.c'), 'a.b.c');

clearSparkCatalogCache();
assert.strictEqual(getSparkCatalogCache(keyCats), null);

console.log('sparkCatalogCache checks: OK');
