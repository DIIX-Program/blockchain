/**
 * Typed client for the Cold-Chain Anomaly Detection AI service
 * (services/ai). Uses Node's native `fetch` (available on Node >= 18).
 *
 * The client is intentionally DB-agnostic: it only knows how to serialize a
 * `TelemetryReading`, call the AI HTTP endpoints, and parse the typed
 * responses. Persistence of detected anomalies as `AnomalyAlert` rows is the
 * caller's responsibility (see `toAlertPayload` + the telemetry route hook).
 */
import { config } from '../config';

/** A single telemetry reading, mirroring the AI service's `TelemetryReading`. */
export interface TelemetryReading {
  batchId: string;
  deviceId: string;
  sequenceNumber: number;
  recordedAt: string;
  temperatureC: number;
  humidityPercent?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isSimulated?: boolean;
}

export type Severity = 'critical' | 'warning' | 'info';

export interface AnomalyFlag {
  source: 'rule_engine' | 'isolation_forest';
  code: string;
  severity: Severity;
  message: string;
  score?: number | null;
}

export interface RuleViolation {
  code: string;
  severity: Severity;
  message: string;
}

export interface PredictionResult {
  isAnomaly: boolean;
  score: number | null;
  ruleViolations: RuleViolation[];
  flags: AnomalyFlag[];
  features: Record<string, number>;
}

export interface ReadingAnomaly {
  sequenceNumber: number;
  deviceId: string;
  isAnomaly: boolean;
  score?: number | null;
  flags: AnomalyFlag[];
}

export interface ModelInfo {
  type: string;
  version: string;
  contamination: number;
  trained: boolean;
  artifactPath?: string | null;
}

export interface BatchAnalysisResult {
  total: number;
  anomalyCount: number;
  normalCount: number;
  contaminationRate: number;
  anomalies: ReadingAnomaly[];
  model: ModelInfo;
}

/** Raised when the AI service returns a non-2xx or unparseable response. */
export class AiServiceError extends Error {
  public status?: number;
  public body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
    this.body = body;
  }
}

/** Minimal, typed HTTP client for the AI anomaly-detection service. */
export class AiServiceClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  /** Override the service base URL (used for E2E outage simulation). */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) h['x-api-key'] = this.apiKey;
    return h;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: this.headers(),
      ...init,
      redirect: 'manual',
    });
    const body = await res.text();
    if (!res.ok) {
      throw new AiServiceError(`${res.status} ${res.statusText} for ${path}`, res.status, body);
    }
    if (!body) return undefined as T;
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new AiServiceError(`Invalid JSON response from ${path}`, res.status, body);
    }
  }

  /** Service-wide health check (AI service root `/health`). */
  async getHealth(): Promise<{ status: string; service?: string }> {
    return this.request('/health');
  }

  /** Active model artifact metadata. */
  async getModelInfo(): Promise<ModelInfo> {
    return this.request('/api/v1/model');
  }

  /** Score a single telemetry reading. */
  async predict(reading: TelemetryReading): Promise<PredictionResult> {
    return this.request('/api/v1/predict', {
      method: 'POST',
      body: JSON.stringify(reading),
    });
  }

  /** Analyze a batch of readings in one round-trip. */
  async analyzeBatch(readings: TelemetryReading[]): Promise<BatchAnalysisResult> {
    return this.request('/api/v1/analyze-batch', {
      method: 'POST',
      body: JSON.stringify({ readings }),
    });
  }
}

/** Singleton bound to the configured AI service URL / key. */
export const aiClient = new AiServiceClient(
  config.AI_SERVICE_URL.replace(/\/+$/, ''),
  config.AI_API_KEY || undefined,
);

/**
 * Map an AI-detection result into the plain-field payload needed by the
 * `AnnotationAlert` table (severity stays a raw string; the route maps it to
 * the Prisma `AlertSeverity` enum). Pure function — no DB access, easy to test.
 */
export function toAlertPayload(
  reading: TelemetryReading,
  result: PredictionResult,
): {
  severity: string;
  ruleViolated: string | null;
  explanation: string;
  anomalyScore: number | null;
} {
  // Escalate severity to the highest signal across all flags.
  const severityRank: Record<Severity, number> = { critical: 3, warning: 2, info: 1 };
  let best: Severity | 'low' = 'info';
  let bestRank = 0;
  for (const f of result.flags) {
    const rank = severityRank[f.severity] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = f.severity;
    }
  }
  const ruleCodes = result.ruleViolations.map((v) => v.code);
  const ruleViolated = ruleCodes.length
    ? ruleCodes.join(',')
    : result.flags.length
      ? result.flags.map((f) => f.code).join(',')
      : null;
  const explanation =
    result.flags.length > 0
      ? result.flags
          .map((f) => `[${f.source}] ${f.code}: ${f.message}`)
          .join(' | ')
      : `Statistical anomaly score ${result.score ?? 'n/a'}`;
  return {
    severity: best,
    ruleViolated,
    explanation,
    anomalyScore: result.score ?? null,
  };
}
