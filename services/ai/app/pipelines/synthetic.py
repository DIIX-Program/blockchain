from __future__ import annotations

import datetime as _dt
import numpy as np

from app.core.config import settings


def synthetic_reading(
    sequence_number: int,
    *,
    base_temp: float = 4.0,
    base_humidity: float = 50.0,
    anomaly: bool = False,
    rng: np.random.Generator | None = None,
) -> dict:
    """Generate one deterministic-ish synthetic cold-chain reading."""
    if rng is None:
        rng = np.random.default_rng(settings.IF_RANDOM_STATE)
    temp = base_temp + float(rng.normal(0, 1.0))
    humidity = max(0.0, min(100.0, base_humidity + float(rng.normal(0, 5.0))))
    if anomaly:
        temp += base_temp + 30.0  # push into a clearly anomalous hot zone
    return {
        "batchId": "123e4567-e89b-12d3-a456-426614174000",
        "deviceId": "dev-synthetic",
        "sequenceNumber": sequence_number,
        "recordedAt": (_dt.datetime(2026, 10, 17, 12, 0, 0, tzinfo=_dt.timezone.utc) + _dt.timedelta(minutes=sequence_number)).isoformat(),
        "temperatureC": round(temp, 2),
        "humidityPercent": round(humidity, 2),
        "latitude": round(float(21.0 + rng.normal(0, 0.01)), 6),
        "longitude": round(float(105.8 + rng.normal(0, 0.01)), 6),
        "isSimulated": True,
    }


def synthetic_readings(n: int, anomaly_rate: float = 0.1, seed: int | None = None) -> list[dict]:
    """Generate `n` readings with ~`anomaly_rate` planted anomalies."""
    rng = np.random.default_rng(seed if seed is not None else settings.IF_RANDOM_STATE)
    readings: list[dict] = []
    n_anom = int(n * anomaly_rate)
    indices = set(rng.choice(n, size=n_anom, replace=False).tolist())
    for i in range(n):
        readings.append(synthetic_reading(i, anomaly=i in indices, rng=rng))
    return readings
