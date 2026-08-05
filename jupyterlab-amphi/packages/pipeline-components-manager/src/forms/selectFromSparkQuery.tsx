import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { ConfigProvider, Divider, Input, Select, Space, Button, Tag, Empty } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';
import { RequestService } from '../RequestService';
import {
  getSparkCatalogCache,
  invalidateSparkTableCachesForNode,
  setSparkCatalogCache,
  sparkCatalogCacheKey,
  composeQualifiedTableName
} from './sparkCatalogCache';

/**
 * Table browser for Spark Connect (S10.4 / S21).
 * Retrieve runs SHOW via RequestService.retrieveSparkTableList.
 * Last successful Retrieve is cached per node + catalog/schema scope.
 */
interface SelectFromSparkQueryProps {
  data: any;
  field: FieldDescriptor;
  handleChange: (value: any, fieldId: string) => void;
  defaultValue: Option;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

function fieldScalar(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return String(value.value || '').trim();
  return String(value).trim();
}

export const SelectFromSparkQuery: React.FC<SelectFromSparkQueryProps> = ({
  data,
  field,
  handleChange,
  defaultValue,
  context,
  componentService,
  commands,
  nodeId,
  advanced
}) => {
  const catalog = fieldScalar(data?.tsCFinputCatalog);
  const schema = fieldScalar(data?.tsCFinputSchema);
  const cacheKey = sparkCatalogCacheKey(
    nodeId,
    field.id,
    catalog,
    schema,
    field.query
  );

  const findOptionByValue = (value: any, opts: Option[]) => {
    if (value === undefined) {
      return {};
    }
    return (
      opts.find(option => option.value === value.value) || {
        value: value.value,
        label: value.value
      }
    );
  };

  const [items, setItems] = useState<Option[]>(() => {
    return getSparkCatalogCache(cacheKey) || [];
  });
  const [name, setName] = useState('');
  const inputRef = useRef<InputRef>(null);
  const [selectedOption, setSelectedOption] = useState(() =>
    findOptionByValue(defaultValue, getSparkCatalogCache(cacheKey) || [])
  );
  const [loadings, setLoadings] = useState<boolean>(false);
  const prevScopeRef = useRef(`${catalog}::${schema}`);

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue, items));
  }, [defaultValue]);

  // Restore / refresh list when scope or field changes; invalidate table cache on catalog/schema change
  useEffect(() => {
    const scope = `${catalog}::${schema}`;
    if (scope !== prevScopeRef.current) {
      invalidateSparkTableCachesForNode(nodeId);
      prevScopeRef.current = scope;
    }
    const cached = getSparkCatalogCache(cacheKey);
    if (cached && cached.length) {
      setItems(cached);
    }
  }, [cacheKey, catalog, schema, nodeId]);

  const setItemsAndCache = (next: Option[]) => {
    setItems(next);
    setSparkCatalogCache(
      cacheKey,
      next.map(o => ({
        value: String(o.value ?? ''),
        label: String(o.label ?? o.value ?? ''),
        type: o.type,
        named: o.named,
        key: (o as any).key
      }))
    );
  };

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    const next = [...items, { value: name, label: name, type: 'table', named: true }];
    setItemsAndCache(next);
    setName('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectChange = (selection: any) => {
    let value = selection.value;
    if (field.id === 'tsCFinputTableName') {
      value = composeQualifiedTableName(catalog, schema, value);
    }
    const opt = items.find(i => i.value === selection.value) || {
      value,
      label: value,
      type: 'table',
      named: true
    };
    const stored = { ...opt, value, label: value };
    setSelectedOption(stored);
    handleChange(
      { value, type: stored.type || 'table', named: stored.named ?? true },
      field.id
    );
  };

  const customizeRenderEmpty = () => (
    <div style={{ textAlign: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </div>
  );

  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
      <Select
        showSearch
        labelInValue
        size={advanced ? 'middle' : 'small'}
        style={{ width: '100%' }}
        className="nodrag"
        onChange={handleSelectChange}
        value={selectedOption}
        placeholder={field.placeholder || 'Select Spark table…'}
        dropdownRender={(menu: any) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 2px 4px'
              }}
            >
              <Button
                type="primary"
                onClick={event =>
                  RequestService.retrieveSparkTableList(
                    event,
                    catalog,
                    schema,
                    field.query,
                    context,
                    componentService,
                    setItemsAndCache,
                    setLoadings,
                    nodeId
                  )
                }
                loading={loadings}
              >
                Retrieve
              </Button>
            </Space>
            {advanced && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ padding: '0 8px 4px' }}>
                  <Input
                    placeholder="Custom"
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={(e: any) => e.stopPropagation()}
                  />
                  <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                    Add
                  </Button>
                </Space>
              </>
            )}
          </>
        )}
        options={items.map((item: Option) => ({
          label: item.label,
          value: item.value,
          type: item.type,
          named: item.named
        }))}
        optionRender={option => (
          <Space>
            <span>{option.data.label}</span>
            <Tag>{option.data.type || 'table'}</Tag>
          </Space>
        )}
      />
    </ConfigProvider>
  );
};

export default React.memo(SelectFromSparkQuery);
