/**
 * Form control: Browse GDP Spark Gateway sessions and write Connect URL into a form field.
 * Used by Spark Connect Session (G5) and optionally Spark SQL Input (G6).
 */

import { Button, Space, Typography } from 'antd';
import React, { useState } from 'react';

import { stripTokenFromConnectUrl } from '../gdpSparkGateway/connectionApply';
import {
  getGdpGatewayConfig,
  isGdpGatewayBrowseEnabled
} from '../gdpSparkGateway/config';
import { resolveSessionConnectUrl } from '../gdpSparkGateway/mapSession';
import { SparkGatewaySessionPicker } from '../gdpSparkGateway/SparkGatewaySessionPicker';
import type {
  GdpSparkConnectSession,
  GdpUrlPreference
} from '../gdpSparkGateway/types';

export interface GdpSparkGatewayBrowseProps {
  field: {
    id: string;
    label?: string;
    tooltip?: string;
    /** Target form field for SPARK Connect URL (default tsCFinputSparkConnectUrl). */
    urlFieldId?: string;
  };
  handleChange: (value: any, fieldId: string) => void;
  advanced?: boolean;
}

export const GdpSparkGatewayBrowse: React.FC<GdpSparkGatewayBrowseProps> = ({
  field,
  handleChange,
  advanced
}) => {
  const [open, setOpen] = useState(false);
  const enabled = isGdpGatewayBrowseEnabled();
  const urlFieldId = field.urlFieldId || 'tsCFinputSparkConnectUrl';

  const onSelect = (
    session: GdpSparkConnectSession,
    meta: { urlPreference: GdpUrlPreference }
  ) => {
    const host = getGdpGatewayConfig().sparkConnectExternalHost;
    const url = stripTokenFromConnectUrl(
      resolveSessionConnectUrl(session, meta.urlPreference, host)
    );
    if (!url) {
      console.error(
        '[Amphi] GDP Browse: no Connect URL. Set gdpSparkConnectExternalHost.'
      );
      return;
    }
    handleChange(url, urlFieldId);
    setOpen(false);
  };

  return (
    <>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Button
          type="default"
          size={advanced ? 'middle' : 'small'}
          disabled={!enabled}
          onClick={() => setOpen(true)}
        >
          Browse GDP sessions…
        </Button>
        {!enabled ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Disabled — set PageConfig gdpSparkGatewayUrl (and auth / External
            host) or gdpSparkGatewayUseFixture.
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Fills Spark Connect URL from a Ready session (token stays in env).
          </Typography.Text>
        )}
      </Space>
      <SparkGatewaySessionPicker
        open={open}
        onCancel={() => setOpen(false)}
        onSelect={onSelect}
      />
    </>
  );
};

export default GdpSparkGatewayBrowse;
