import QRCode from 'qrcode';

export interface QrOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  scale?: number;
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Render `value` into a PNG data URL (base64) suitable for an <img src>.
 * Deterministic for a given value + options.
 */
export async function generateQrDataUrl(value: string, options: QrOptions = {}): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    scale: 6,
    width: 256,
    ...options,
  });
}

/**
 * Render `value` as an inline SVG string. Useful for embedding into the DOM
 * without a bitmap, e.g. for print/PDF.
 */
export async function generateQrSvg(value: string, options: QrOptions = {}): Promise<string> {
  return QRCode.toString(value, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    ...options,
  });
}
