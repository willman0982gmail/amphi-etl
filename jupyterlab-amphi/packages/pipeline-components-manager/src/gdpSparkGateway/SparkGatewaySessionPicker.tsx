/**
 * Shared GDP Spark Gateway session picker modal (Select Tenant Connect IA).
 * Not owned by Spark SQL Input — reused from Connection, Session, and Input shortcut.
 */

import { Alert, Button, Empty, Input, Modal, Radio, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  createGdpSparkGatewayClient,
  logSessionSelected
} from './client';
import { getGdpGatewayConfig, isGdpGatewayBrowseEnabled } from './config';
import { FIXTURE_NAMESPACE } from './fixtures';
import {
  buildGatewayCreateNewUrl,
  isGatewayCreateNewEnabled
} from './portal';
import {
  getCachedSessionList,
  invalidateSessionListCache,
  sessionListCacheKey,
  setCachedSessionList
} from './sessionListCache';
import {
  emitGdpGatewayTelemetry,
  pickNewReadySession
} from './telemetry';
import type {
  GdpSparkConnectSession,
  GdpSparkGatewayClient,
  GdpUrlPreference
} from './types';

export interface SparkGatewaySessionPickerProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (
    session: GdpSparkConnectSession,
    meta: { urlPreference: GdpUrlPreference }
  ) => void;
  /** Override client (tests). */
  client?: GdpSparkGatewayClient;
  title?: string;
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0
};

function formatRefreshTime(ts: number | null): string {
  if (!ts) {
    return '';
  }
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return '';
  }
}

export const SparkGatewaySessionPicker: React.FC<
  SparkGatewaySessionPickerProps
> = ({
  open,
  onCancel,
  onSelect,
  client: clientProp,
  title = 'Select Tenant Connect'
}) => {
  const config = useMemo(() => getGdpGatewayConfig(), []);
  const enabled = isGdpGatewayBrowseEnabled(config);

  const [namespace, setNamespace] = useState(
    config.defaultNamespace || FIXTURE_NAMESPACE
  );
  const [statusTab, setStatusTab] = useState<'Ready' | 'Stopped'>('Ready');
  const [urlPreference, setUrlPreference] = useState<GdpUrlPreference>(
    config.urlPreference
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GdpSparkConnectSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  const idsBeforeCreateRef = useRef<Set<string> | null>(null);
  const awaitingCreateReturnRef = useRef(false);
  const titleId = 'gdp-gw-picker-title';
  const statusId = 'gdp-gw-picker-status';

  const client = useMemo(
    () => clientProp ?? (enabled ? createGdpSparkGatewayClient() : null),
    [clientProp, enabled]
  );

  const load = useCallback(
    async (
      opts: {
        force?: boolean;
        previousIds?: Set<string> | null;
      } = {}
    ) => {
      if (!client) {
        setError(
          'GDP Spark Gateway is not configured. Set PageConfig gdpSparkGatewayUrl or enable gdpSparkGatewayUseFixture.'
        );
        setSessions([]);
        return;
      }
      const ns = namespace.trim();
      const key = sessionListCacheKey(ns, 'all');
      if (!opts.force) {
        const hit = getCachedSessionList(key);
        if (hit) {
          setSessions(hit.sessions);
          setLastRefreshAt(hit.fetchedAt);
          setSelectedId(null);
          setError(null);
          return;
        }
      } else {
        invalidateSessionListCache();
      }

      setLoading(true);
      setError(null);
      try {
        const list = await client.listSessions({
          namespace: ns || undefined,
          status: 'all',
          limit: 50,
          offset: 0
        });
        const fetchedAt = setCachedSessionList(key, list);
        setSessions(list);
        setLastRefreshAt(fetchedAt);
        emitGdpGatewayTelemetry({
          type: 'browse_list_ok',
          count: list.length,
          namespace: ns
        });

        if (opts.previousIds) {
          const pick = pickNewReadySession(list, opts.previousIds);
          if (pick) {
            setStatusTab('Ready');
            setSelectedId(pick.id);
            setInfo(
              `New Ready session detected: ${pick.name}. Review and click Select.`
            );
            emitGdpGatewayTelemetry({
              type: 'browse_create_return_autoselect',
              sessionId: pick.id,
              name: pick.name
            });
          } else {
            setSelectedId(null);
            setInfo(
              'Returned from Create New — no new Ready session yet. Start it in the portal, then Refresh.'
            );
          }
        } else {
          setSelectedId(null);
        }
      } catch (err: any) {
        const message = String(err?.message ?? err);
        setError(message);
        setSessions([]);
        emitGdpGatewayTelemetry({ type: 'browse_list_error', message });
      } finally {
        setLoading(false);
      }
    },
    [client, namespace]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    emitGdpGatewayTelemetry({ type: 'browse_open' });
    void load({ force: false });
    return () => {
      emitGdpGatewayTelemetry({ type: 'browse_close' });
      awaitingCreateReturnRef.current = false;
      idsBeforeCreateRef.current = null;
      setInfo(null);
    };
  }, [open, load]);

  // G8.3 — after Create New portal tab, refresh on focus and auto-select new Ready
  useEffect(() => {
    if (!open) {
      return;
    }
    const onReturn = () => {
      if (!awaitingCreateReturnRef.current) {
        return;
      }
      awaitingCreateReturnRef.current = false;
      const previousIds = idsBeforeCreateRef.current;
      idsBeforeCreateRef.current = null;
      void load({ force: true, previousIds });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        onReturn();
      }
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [open, load]);

  const filtered = useMemo(() => {
    return sessions.filter(
      s => String(s.status).toLowerCase() === statusTab.toLowerCase()
    );
  }, [sessions, statusTab]);

  const mySessions = useMemo(
    () => filtered.filter(s => s.visibility !== 'shared'),
    [filtered]
  );
  const sharedSessions = useMemo(
    () => filtered.filter(s => s.visibility === 'shared'),
    [filtered]
  );

  const selected = useMemo(
    () => sessions.find(s => s.id === selectedId) || null,
    [sessions, selectedId]
  );

  const columns: ColumnsType<GdpSparkConnectSession> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row) => (
        <Space>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                String(row.status).toLowerCase() === 'ready'
                  ? '#52c41a'
                  : '#bfbfbf',
              display: 'inline-block'
            }}
          />
          <span>{name}</span>
          <span className="amphi-sr-only" style={srOnly}>{`Status ${row.status}`}</span>
          {row.visibility === 'shared' ? <Tag>Shared</Tag> : null}
        </Space>
      )
    },
    {
      title: 'Driver / Executors',
      key: 'sizing',
      render: (_, row) =>
        [row.driverSummary, row.executorSummary].filter(Boolean).join(' · ') ||
        '—'
    },
    {
      title: 'Idle',
      dataIndex: 'idleTimeout',
      key: 'idle',
      width: 80,
      render: (v: string) => v || '—'
    }
  ];

  const renderSection = (
    sectionTitle: string,
    data: GdpSparkConnectSession[],
    headingId: string
  ) => (
    <div
      style={{ marginBottom: 16 }}
      key={sectionTitle}
      role="group"
      aria-labelledby={headingId}
    >
      <div id={headingId} style={{ fontWeight: 600, marginBottom: 8 }}>
        {sectionTitle}
      </div>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={data}
        locale={{ emptyText: <Empty description="No sessions" /> }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedId ? [selectedId] : [],
          getCheckboxProps: (record) => ({
            disabled: String(record.status).toLowerCase() !== 'ready',
            'aria-label': `Select session ${record.name}, status ${record.status}`
          }),
          onChange: (keys) => {
            setSelectedId(keys[0] != null ? String(keys[0]) : null);
          }
        }}
        onRow={(record) => ({
          tabIndex: String(record.status).toLowerCase() === 'ready' ? 0 : -1,
          'aria-selected': selectedId === record.id,
          onClick: () => {
            if (String(record.status).toLowerCase() === 'ready') {
              setSelectedId(record.id);
            }
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            if (
              (e.key === 'Enter' || e.key === ' ') &&
              String(record.status).toLowerCase() === 'ready'
            ) {
              e.preventDefault();
              setSelectedId(record.id);
            }
          }
        })}
      />
    </div>
  );

  const handleOk = async () => {
    if (!selected) {
      emitGdpGatewayTelemetry({
        type: 'browse_select_fail',
        reason: 'no_selection'
      });
      return;
    }
    if (String(selected.status).toLowerCase() !== 'ready') {
      const reason = 'not_ready';
      setError(
        'Stopped sessions cannot be selected. Start the session in GDP Spark Gateway (Create New / portal), then Refresh.'
      );
      emitGdpGatewayTelemetry({ type: 'browse_select_fail', reason });
      return;
    }
    if (client?.getSession) {
      try {
        const fresh = await client.getSession(
          selected.namespace || namespace.trim(),
          selected.id
        );
        if (fresh && String(fresh.status).toLowerCase() !== 'ready') {
          setError(
            `Session "${fresh.name}" is not Ready (status: ${fresh.status}). Start it in GDP Spark Gateway, then Refresh.`
          );
          emitGdpGatewayTelemetry({
            type: 'browse_select_fail',
            reason: `status_${fresh.status}`
          });
          void load({ force: true });
          return;
        }
        if (fresh) {
          logSessionSelected(fresh);
          emitGdpGatewayTelemetry({
            type: 'browse_select_success',
            sessionId: fresh.id,
            name: fresh.name,
            namespace: fresh.namespace,
            status: String(fresh.status)
          });
          onSelect(fresh, { urlPreference });
          return;
        }
      } catch (err: any) {
        setError(
          `Could not re-validate session status (${String(err?.message ?? err)}). Selecting listed session.`
        );
      }
    }
    logSessionSelected(selected);
    emitGdpGatewayTelemetry({
      type: 'browse_select_success',
      sessionId: selected.id,
      name: selected.name,
      namespace: selected.namespace,
      status: String(selected.status)
    });
    onSelect(selected, { urlPreference });
  };

  const createNewUrl = buildGatewayCreateNewUrl(config, namespace);
  const createNewEnabled = isGatewayCreateNewEnabled(config);

  const openCreateNew = () => {
    const url = buildGatewayCreateNewUrl(config, namespace);
    if (!url) {
      setError(
        'Create New is not configured. Set PageConfig gdpSparkGatewayPortalUrl or gdpSparkGatewayCreateUrlTemplate.'
      );
      return;
    }
    idsBeforeCreateRef.current = new Set(sessions.map(s => s.id));
    awaitingCreateReturnRef.current = true;
    setInfo(
      'Create New opened in another tab. When you return, the list will refresh and auto-select a new Ready session if one appears.'
    );
    emitGdpGatewayTelemetry({
      type: 'browse_create_new',
      namespace: namespace.trim()
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const refreshLabel = formatRefreshTime(lastRefreshAt);
  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      title={<span id={titleId}>{title}</span>}
      open={open}
      onCancel={handleCancel}
      width={820}
      destroyOnClose
      aria-labelledby={titleId}
      aria-describedby={statusId}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="select"
          type="primary"
          disabled={
            !selected || String(selected.status).toLowerCase() !== 'ready'
          }
          aria-disabled={
            !selected || String(selected.status).toLowerCase() !== 'ready'
          }
          onClick={() => void handleOk()}
        >
          Select
        </Button>
      ]}
    >
      <div id={statusId} style={srOnly} aria-live="polite">
        {loading
          ? 'Loading sessions'
          : error
            ? error
            : info
              ? info
              : `${filtered.length} ${statusTab} sessions shown`}
      </div>

      {!enabled && !clientProp ? (
        <Alert
          type="warning"
          showIcon
          message="GDP Spark Gateway Browse is disabled"
          description="Configure gdpSparkGatewayUrl (PageConfig) or set gdpSparkGatewayUseFixture=true for local fixtures."
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap align="center">
            <label htmlFor="gdp-gw-namespace">Browsing namespace</label>
            <Input
              id="gdp-gw-namespace"
              style={{ minWidth: 240 }}
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              onPressEnter={() => void load({ force: true })}
              placeholder="optional filter"
              aria-label="Browsing namespace"
            />
            <Button
              onClick={() => void load({ force: true })}
              disabled={loading}
              aria-label="Refresh session list"
            >
              Refresh
            </Button>
            <Button
              onClick={openCreateNew}
              disabled={!createNewEnabled}
              aria-label="Create new session in GDP Spark Gateway portal"
              title={
                createNewEnabled
                  ? createNewUrl
                  : 'Set gdpSparkGatewayPortalUrl or gdpSparkGatewayCreateUrlTemplate'
              }
            >
              Create New…
            </Button>
            {refreshLabel ? (
              <span style={{ color: '#8c8c8c', fontSize: 12 }} aria-live="polite">
                Last refresh: {refreshLabel}
              </span>
            ) : null}
          </Space>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            Leave namespace empty to list all connects returned by GET
            /api/v1/connects. Lists are cached ~30s; Refresh forces a reload.
            Create New opens the Gateway portal; when you return, Amphi
            refreshes and tries to auto-select a new Ready session.
          </div>

          <Radio.Group
            value={statusTab}
            onChange={(e) => setStatusTab(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            aria-label="Session status filter"
            options={[
              { label: 'Ready', value: 'Ready' },
              { label: 'Stopped', value: 'Stopped' }
            ]}
          />

          <Radio.Group
            value={urlPreference}
            onChange={(e) => setUrlPreference(e.target.value)}
            aria-label="Connect URL preference"
            options={[
              { label: 'External URL (default)', value: 'external' },
              { label: 'Internal URL', value: 'internal' }
            ]}
          />

          {statusTab === 'Stopped' ? (
            <Alert
              type="info"
              showIcon
              message="Stopped sessions cannot be selected in Amphi. Use Create New… or start them in the GDP Spark Gateway portal, then Refresh."
            />
          ) : null}

          {info ? <Alert type="success" showIcon message={info} /> : null}
          {error ? (
            <Alert type="error" showIcon message={error} role="alert" />
          ) : null}

          <div aria-busy={loading} aria-live="polite">
            <Spin spinning={loading}>
              {filtered.length === 0 && !loading ? (
                <Empty
                  description={`No ${statusTab} sessions in this namespace`}
                />
              ) : (
                <>
                  {renderSection(
                    'My Tenant Connects',
                    mySessions,
                    'gdp-gw-my-heading'
                  )}
                  {renderSection(
                    'Tenant Shared',
                    sharedSessions,
                    'gdp-gw-shared-heading'
                  )}
                </>
              )}
            </Spin>
          </div>
        </Space>
      )}
    </Modal>
  );
};

export default SparkGatewaySessionPicker;
