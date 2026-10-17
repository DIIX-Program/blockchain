import { useEffect, useState } from 'react';
import { generateQrDataUrl } from '../lib/qrcode';

export interface QrCodeDisplayProps {
  /** The payload to encode (e.g. the public traceability URL). */
  value: string;
  alt?: string;
  size?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Renders a QR code for `value`. The QR is generated off-main-thread via a
 * async call to the `qrcode` library; while pending a placeholder is shown so
 * the layout never shifts. Used on the public traceability page so a consumer
 * can scan the batch to open its verification URL.
 */
export function QrCodeDisplay({
  value,
  alt = 'QR code',
  size = 256,
  darkColor = '#ffffff',
  lightColor = 'rgba(10, 14, 21, 0.6)',
}: QrCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(null);
    generateQrDataUrl(value, { color: { dark: darkColor, light: lightColor } })
      .then(
        (url) => {
          if (!cancelled) setDataUrl(url);
        },
        () => {
          if (!cancelled) setError('Unable to generate QR code');
        },
      )
      .catch(() => {
        if (!cancelled) setError('Unable to generate QR code');
      });
    return () => {
      cancelled = true;
    };
  }, [value, darkColor, lightColor]);

  if (error) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: 28,
          color: 'var(--text-secondary)',
          fontSize: '0.75rem',
          lineHeight: `${28}px`,
          textAlign: 'center',
        }}
      >
        {error}
      </span>
    );
  }

  if (!dataUrl) {
    // Aspect-square placeholder matching the final rendered size.
    return (
      <div
        style={{
          width: size,
          height: size,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: '10px',
        }}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      style={{
        display: 'block',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)',
        background: '#ffffff',
      }}
    />
  );
}
