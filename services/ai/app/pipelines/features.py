from __future__ import annotations

import numpy as np

# Features consumed by the statistical model. Order is significant and must be
# consistent between training and inference.
FEATURE_COLUMNS = ["temperatureC", "humidityPercent", "latitude", "longitude"]


def extract_features(reading: dict) -> np.ndarray:
    """Convert a single telemetry reading (dict) into a 1-D float feature vector.

    Missing optional fields are imputed with cold-chain-sensible defaults so the
    statistical model always receives a fixed-width numeric vector.
    """
    temp = reading.get("temperatureC")
    hum = reading.get("humidityPercent")
    lat = reading.get("latitude")
    lon = reading.get("longitude")

    return np.array(
        [
            float(temp) if temp is not None else 4.0,
            float(hum) if hum is not None else 50.0,
            float(lat) if lat is not None else 0.0,
            float(lon) if lon is not None else 0.0,
        ],
        dtype=float,
    )


def readings_to_matrix(readings: list[dict]) -> np.ndarray:
    """Stack a list of readings into an (N, 4) feature matrix."""
    if not readings:
        return np.empty((0, len(FEATURE_COLUMNS)), dtype=float)
    return np.vstack([extract_features(r) for r in readings])
