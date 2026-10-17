/**
 * HTTP client that POSTs generated telemetry readings to the backend's
 * `POST /api/v1/sensors/telemetry` endpoint (SIMULATOR_API_URL). Kept separate
 * from the scenario generators so it can be unit-tested against an in-process
 * echo server with no database.
 */
import type { Reading } from './scenarios';

export interface IngestResult {
  accepted: boolean;
  status: number;
  statusText: string;
  /** 'INGESTED' | 'DUPLICATE_IGNORED' | 'ERROR' | server-provided status */
  outcome?: string;
  readingId?: string;
  message?: string;
}

export class TelemetryClient {
  constructor(private baseUrl: string) {}

  async post(reading: Reading): Promise<IngestResult> {
    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reading),
        redirect: 'manual',
      });
    } catch (err) {
      const cause =
        err instanceof Error && 'cause' in err
          ? (err as { cause?: unknown }).cause
          : undefined;
      const message =
        cause instanceof Error
          ? cause.message
          : err instanceof Error
            ? err.message
            : String(err);
      return {
        accepted: false,
        status: 0,
        statusText: 'NETWORK_ERROR',
        outcome: 'ERROR',
        message,
      };
    }

    const text = await res.text();
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    const outcome = (parsed?.status as string | undefined) ?? (res.ok ? 'INGESTED' : 'ERROR');
    const readingId = parsed?.readingId as string | undefined;
    return {
      accepted: res.ok,
      status: res.status,
      statusText: res.statusText,
      outcome,
      readingId,
      message: (parsed?.message as string | undefined) ?? res.statusText,
    };
  }
}

export default TelemetryClient;
