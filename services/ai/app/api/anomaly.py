from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import ValidationError

from app.core.config import MODEL_ARTIFACT_PATH, settings
from app.models.isolation_forest import IsolationForestModel
from app.models.schemas import (
    AnomalyFlag,
    BatchAnalysisRequest,
    BatchAnalysisResult,
    ModelInfo,
    PredictionResult,
    RuleViolation,
    Severity,
    TelemetryReading,
)
from app.pipelines.features import FEATURE_COLUMNS, extract_features, readings_to_matrix
from app.rules.engine import RuleEngine

router = APIRouter()

# ---------------------------------------------------------------------------
# Auth: optional API key for internal callers. When AI_API_KEY is unset the
# endpoints are open (development convenience).
# ---------------------------------------------------------------------------
_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(key: Optional[str] = Security(_API_KEY_HEADER)):
    if settings.AI_API_KEY:
        if not key or key != settings.AI_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return key


# ---------------------------------------------------------------------------
# Lazy singletons
# ---------------------------------------------------------------------------
_model: Optional[IsolationForestModel] = None
_engine: Optional[RuleEngine] = None


def get_model() -> IsolationForestModel:
    global _model
    if _model is None or not _model.is_fitted:
        _model = IsolationForestModel.load_or_train_default(MODEL_ARTIFACT_PATH)
    return _model


def get_engine() -> RuleEngine:
    global _engine
    if _engine is None:
        _engine = RuleEngine()
    return _engine


def _to_flags(violations: list[RuleViolation], score: Optional[float], is_if_anomaly: bool) -> list[AnomalyFlag]:
    flags: list[AnomalyFlag] = [
        AnomalyFlag(
            source="rule_engine",
            code=v.code,
            severity=v.severity,
            message=v.message,
        )
        for v in violations
    ]
    if is_if_anomaly:
        flags.append(
            AnomalyFlag(
                source="isolation_forest",
                code="IF_ANOMALY",
                severity=Severity.WARNING,
                message=(
                    f"Isolation Forest anomaly score {score:.4f} below "
                    f"threshold {settings.ANOMALY_SCORE_THRESHOLD}"
                ),
                score=score,
            )
        )
    return flags


@router.post("/predict", response_model=PredictionResult)
def predict(reading: TelemetryReading, _: Optional[str] = Depends(verify_api_key)):
    """Score a single telemetry reading.

    Returns the statistical anomaly score (Isolation Forest decision function;
    lower = more anomalous) plus any business-rule violations. `isAnomaly` is
    true when either the rule engine fires or the statistical model flags the
    reading.
    """
    engine = get_engine()
    model = get_model()
    payload = reading.model_dump()
    violations = engine.evaluate(payload)
    feats = extract_features(payload)
    score = float(model.decision_function(feats.reshape(1, -1))[0])
    is_if_anomaly = bool(score < settings.ANOMALY_SCORE_THRESHOLD)
    flags = _to_flags(violations, score, is_if_anomaly)
    return PredictionResult(
        isAnomaly=bool(flags),
        score=score,
        ruleViolations=violations,
        flags=flags,
        features=dict(zip(FEATURE_COLUMNS, [float(x) for x in feats.tolist()])),
    )


@router.get("/model", response_model=ModelInfo)
def model_info(_: Optional[str] = Depends(verify_api_key)):
    """Report the active model artifact state."""
    model = get_model()
    return ModelInfo(
        contamination=model.contamination,
        trained=model.is_fitted,
        artifactPath=MODEL_ARTIFACT_PATH,
    )


@router.post("/analyze-batch", response_model=BatchAnalysisResult)
def analyze_batch(
    req: BatchAnalysisRequest,
    _: Optional[str] = Depends(verify_api_key),
):
    """Analyze a batch of readings and summarize statistical + rule anomalies."""
    engine = get_engine()
    model = get_model()
    readings = req.readings
    total = len(readings)

    if total == 0:
        return BatchAnalysisResult(
            total=0,
            anomalyCount=0,
            normalCount=0,
            contaminationRate=0.0,
            anomalies=[],
            model=ModelInfo(contamination=model.contamination, trained=model.is_fitted, artifactPath=MODEL_ARTIFACT_PATH),
        )

    matrix = readings_to_matrix([r.model_dump() for r in readings])
    scores = model.decision_function(matrix)
    is_anom_flags = scores < settings.ANOMALY_SCORE_THRESHOLD

    anomalies: list = []
    anomaly_count = 0
    for reading, score, flagged in zip(readings, scores, is_anom_flags):
        payload = reading.model_dump()
        violations = engine.evaluate(payload)
        flags = _to_flags(violations, float(score), bool(flagged))
        reading_anomalous = bool(flags)
        if reading_anomalous:
            anomaly_count += 1
            anomalies.append(
                {
                    "sequenceNumber": reading.sequenceNumber,
                    "deviceId": reading.deviceId,
                    "isAnomaly": True,
                    "score": float(score),
                    "flags": flags,
                }
            )

    return BatchAnalysisResult(
        total=total,
        anomalyCount=anomaly_count,
        normalCount=total - anomaly_count,
        contaminationRate=round(anomaly_count / total, 6),
        anomalies=anomalies,
        model=ModelInfo(contamination=model.contamination, trained=model.is_fitted, artifactPath=MODEL_ARTIFACT_PATH),
    )


# Expose the ValidationError so callers get a typed 422 from FastAPI automatically
__all__ = ["router", "ValidationError"]
