from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    """Impact level of a detected anomaly."""

    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class TelemetryReading(BaseModel):
    """A single cold-chain telemetry reading submitted for analysis."""

    batchId: str
    deviceId: str
    sequenceNumber: int
    recordedAt: str
    temperatureC: float
    humidityPercent: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    isSimulated: Optional[bool] = True


class RuleViolation(BaseModel):
    """A threshold/business-rule breach found by the rule engine."""

    code: str
    severity: Severity
    message: str


class AnomalyFlag(BaseModel):
    """A single anomaly signal, sourced from either the rule engine or the
    statistical Isolation Forest model."""

    source: str = Field(..., description="Source of the anomaly: 'rule_engine' or 'isolation_forest'")
    code: str
    severity: Severity
    message: str
    score: Optional[float] = None


class PredictionResult(BaseModel):
    isAnomaly: bool
    score: Optional[float] = None
    ruleViolations: List[RuleViolation] = []
    flags: List[AnomalyFlag] = []
    features: dict


class ReadingAnomaly(BaseModel):
    sequenceNumber: int
    deviceId: str
    isAnomaly: bool
    score: Optional[float] = None
    flags: List[AnomalyFlag] = []


class ModelInfo(BaseModel):
    type: str = "isolation_forest"
    version: str = "1.0.0"
    contamination: float
    trained: bool
    artifactPath: Optional[str] = None


class BatchAnalysisRequest(BaseModel):
    readings: List[TelemetryReading]


class BatchAnalysisResult(BaseModel):
    total: int
    anomalyCount: int
    normalCount: int
    contaminationRate: float
    anomalies: List[ReadingAnomaly] = []
    model: ModelInfo


class AnalyzeRequest(BaseModel):
    """Envelope accepting either pydantic readings or raw dict rows."""

    readings: List[TelemetryReading]
