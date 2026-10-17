"""Train the Isolation Forest anomaly model and persist the artifact.

Trains on a synthetic telemetry dataset by default (no external data needed).
Alternatively pass `--csv datasets/synthetic_telemetry.csv` to train on a real
labelled CSV. The persisted artifact is consumed at runtime by the AI service's
`/predict` and `/analyze-batch` endpoints (see `app/models/isolation_forest.py`).

Usage:
    python scripts/train.py [--csv datasets/synthetic_telemetry.csv] [--out artifacts/isolation_forest.joblib]
"""
from __future__ import annotations

import argparse
import csv
import os
import sys

# Allow running as `python scripts/train.py` from the service dir.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import MODEL_ARTIFACT_PATH, settings
from app.models.isolation_forest import IsolationForestModel
from app.pipelines.features import readings_to_matrix


def load_readings_from_csv(path: str) -> list[dict]:
    rows: list[dict] = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            rows.append(
                {
                    "temperatureC": float(row["temperatureC"]),
                    "humidityPercent": float(row["humidityPercent"])
                    if row.get("humidityPercent") not in (None, "", "null")
                    else None,
                    "latitude": float(row["latitude"])
                    if row.get("latitude") not in (None, "", "null")
                    else None,
                    "longitude": float(row["longitude"])
                    if row.get("longitude") not in (None, "", "null")
                    else None,
                }
            )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=str, default=None, help="Telemetry CSV to train on.")
    parser.add_argument("--out", type=str, default=MODEL_ARTIFACT_PATH)
    args = parser.parse_args()

    if args.csv:
        readings = load_readings_from_csv(args.csv)
    else:
        from app.pipelines.synthetic import synthetic_readings

        readings = synthetic_readings(
            400,
            anomaly_rate=settings.IF_CONTAMINATION,
            seed=settings.IF_RANDOM_STATE,
        )

    X = readings_to_matrix(readings)
    model = IsolationForestModel().fit(X)
    path = model.save(args.out)

    scores = model.decision_function(X)
    n_anom = int((scores < settings.ANOMALY_SCORE_THRESHOLD).sum())
    print(f"Trained IsolationForest on {len(readings)} samples.")
    print(
        f"Score stats: min={scores.min():.4f} max={scores.max():.4f} "
        f"mean={scores.mean():.4f}"
    )
    print(
        f"Anomalies detected (score < {settings.ANOMALY_SCORE_THRESHOLD}): {n_anom}"
    )
    print(f"Artifact saved to: {path}")


if __name__ == "__main__":
    main()
