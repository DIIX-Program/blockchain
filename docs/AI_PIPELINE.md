# AI Pipeline — Anomaly Detection for Cold-Chain Telemetry

> Internal design + operations document for `services/ai`.

## 1. Overview

The **Cold-Chain Anomaly Detection AI Service** is a stateless FastAPI service
that scores telemetry readings for anomalies using a two-layer detection
strategy:

1. **Rule engine** (deterministic, business logic): hard thresholds on
   temperature, humidity, latitude/longitude validity, and timestamp sanity.
2. **Statistical model** (Isolation Forest): a fitted scikit-learn
   `IsolationForest` trained on the 4-D feature vector
   `[temperatureC, humidityPercent, latitude, longitude]`.

A reading is anomalous if **either** layer flags it. The service is consumed
by the backend API (`apps/api/src/lib/ai.ts`) via async webhook analysis and
is also callable directly during development.

```
┌────────────┐   POST /api/v1/predict       ┌──────────────┐
│  Backend   │ ───────────────────────────► │   AI service │
│  (api)     │                                │  :8000       │
└──────┬─────┘  async: POST /api/v1/analyze-batch  │
       │                                     │ rules │ model │
       └──────────────────────────────┘
```

## 2. Feature Representation

| Feature          | Type   | Source field    | Missing → default |
| ---------------- | ------ | --------------- | ----------------- |
| `temperatureC`   | float  | required        | —                 |
| `humidityPercent`| float  | optional        | `50.0`            |
| `latitude`       | float  | optional        | `0.0`             |
| `longitude`      | float  | optional        | `0.0`             |

`app/pipelines/features.py` exposes `extract_features(dict) -> np.ndarray(4)`
and `readings_to_matrix(list[dict]) -> np.ndarray(N,4)`. Imputation defaults are
cold-chain-sensible so the model always receives a fixed-width vector.

Feature order is significant and must be identical between training and
inference — it is enforced by the single constant `FEATURE_COLUMNS`.

## 3. Rule Engine

`app/rules/engine.py::RuleEngine` evaluates a reading against configurable
thresholds (see `app/core/config.py`) and emits `RuleViolation` objects:

| Code                | Severity | Condition                          |
| ------------------- | -------- | ---------------------------------- |
| `TEMP_OUT_OF_RANGE` | critical | `temperatureC` outside `[TEMP_MIN, TEMP_MAX]` |
| `HUMIDITY_OUT_OF_RANGE` | warning | `humidityPercent` outside `[HUM_MIN, HUM_MAX]` |
| `INVALID_LATITUDE`  | warning  | `latitude` not in `[-90, 90]`      |
| `INVALID_LONGITUDE` | warning  | `longitude` not in `[-180, 180]`   |
| `FUTURE_TIMESTAMP`  | warning  | `recordedAt` beyond `now + 5 min`  |

Default cold-chain envelope: temperature `[-30, 50] °C`, humidity `[0, 100] %`.
Thresholds are overridable via environment variables (`TEMP_MIN_C`, etc.) and
per-instance for tests.

## 4. Statistical Model — Isolation Forest

`app/models/isolation_forest.py::IsolationForestModel` wraps
`sklearn.ensemble.IsolationForest`.

- `decision_function(X)` → anomaly score (higher = more normal).
- A reading is a statistical anomaly when `score < ANOMALY_SCORE_THRESHOLD`
  (default `0.0`).
- `contamination` (default `0.1`) is the expected anomaly fraction, passed to
  the underlying estimator.
- `random_state` (default `42`) makes training reproducible.

**Dev fallback:** when no persisted artifact exists, `load_or_train_default`
trains a deterministic model on 400 synthetic readings (seed `42`). This makes
the service functional out-of-the-box for local development and tests.

**Persistence:** `save(path)` / `load(path)` use `joblib`. The artifact is
written to `artifacts/isolation_forest.joblib` (git-ignored).

## 5. API Endpoints

Mounted under `/api/v1/`:

| Method | Path            | Description                                                       |
| ------ | --------------- | ----------------------------------------------------------------- |
| `POST` | `/predict`      | Score a single `TelemetryReading` → `PredictionResult`            |
| `POST` | `/analyze-batch`| Score a batch of readings → `BatchAnalysisResult` summary         |
| `GET`  | `/model`        | Report `ModelInfo` (contamination, trained, artifact path)        |
| `GET`  | `/health`       | Liveness (also mounted at `/health`)                              |

**Auth (optional):** When `AI_API_KEY` env var is set, callers must send
`X-API-Key: <AI_API_KEY>` (returns `401` otherwise). When unset, endpoints
are open — for development only.

### 5.1 `GET /api/v1/model`
```jsonc
{ "type": "isolation_forest", "version": "1.0.0", "contamination": 0.1, "trained": true, "artifactPath": "/abs/path/isolation_forest.joblib" }
```

### 5.2 `POST /api/v1/predict`
```jsonc
// request
{ "batchId": "...", "deviceId": "...", "sequenceNumber": 1, "recordedAt": "2026-10-17T12:00:00Z",
  "temperatureC": 4.5, "humidityPercent": 50, "latitude": 21.0, "longitude": 105.8 }
// response
{ "isAnomaly": false, "score": 0.09, "ruleViolations": [], "flags": [],
  "features": {"temperatureC":4.5,"humidityPercent":50.0,"latitude":21.0,"longitude":105.8} }
```

### 5.3 `POST /api/v1/analyze-batch`
```jsonc
// request
{ "readings": [ ...TelemetryReading... ] }
// response
{ "total": 10, "anomalyCount": 2, "normalCount": 8, "contaminationRate": 0.2,
  "anomalies": [ { "sequenceNumber": 99, "deviceId": "dev-1", "isAnomaly": true,
                   "score": -0.05, "flags": [...] } ],
  "model": { ...ModelInfo } }
```

## 6. Training Operations

```bash
# 1. Generate a synthetic labelled dataset (no real data required)
python scripts/generate_dataset.py --n 1000 --anomaly-rate 0.1 \
  --out datasets/synthetic_telemetry.csv

# 2. Train + persist the artifact
python scripts/train.py --csv datasets/synthetic_telemetry.csv
```

`train.py` also works without `--csv`, in which case it trains on synthetic
readings. Output includes score stats and the count of detected anomalies.

**Validation:** trained on 1000 synthetic rows with 100 planted anomalies, the
model recovered exactly 100 anomalies at threshold `0.0` (see repository test
report).

## 7. Data Flow (Backend Integration)

1. IoT simulator / devices POST telemetry → `POST /api/v1/sensors/telemetry`
   (idempotent).
2. The backend may submit readings for analysis →
   `POST http://<AI>/api/v1/predict` or `/analyze-batch`.
3. Anomalies returned are persisted as `Alert` records in the backend DB for
   human review (see `apps/api/src/routes/alert.routes.ts` and `Task 07`).

## 8. Reproducibility

- `IF_RANDOM_STATE=42`, `IF_N_ESTIMATORS=100`, `IF_CONTAMINATION=0.1`.
- Synthetic dataset generation is seeded (`--seed 42`).
- Dev model fallback uses the same seed.

## 9. Testing

```bash
pytest -q          # from services/ai
```
Covers: health, rule engine (7 cases), Isolation Forest (fit/score/save-load),
`/predict` (normal/rule-violation/422/api-key/model-info) and
`/analyze-batch` (mixed + empty). See `tests/`.

## 10. Limitations & Future Work

- The model is unsupervised; labels in the synthetic dataset are only for
  reporting, not for training.
- Features are limited to the 4 numeric fields; contextual features (product
  temp envelope, time-of-day, device history) are future work.
- The rule engine uses fixed envelopes; a per-product profile service would
  let rules reference `tempMinC`/`tempMaxC` from the backend.
