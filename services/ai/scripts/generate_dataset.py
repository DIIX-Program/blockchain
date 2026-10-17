"""Generate a synthetic cold-chain telemetry dataset with planted anomalies.

No labelled production data is required to bootstrap the model. This script
writes a CSV whose rows match the AI service's `TelemetryReading` schema, with
an `isAnomaly` label column (temperature > 20 °C flags a planted anomaly, since
the synthetic normal envelope is centred on 4 °C and anomalies are pushed ~34 °C).

Usage:
    python scripts/generate_dataset.py --n 1000 --anomaly-rate 0.1 --out datasets/synthetic_telemetry.csv
"""
from __future__ import annotations

import argparse
import csv
import os
import sys

# Allow running as `python scripts/generate_dataset.py` from the service dir.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.pipelines.synthetic import synthetic_readings


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n", type=int, default=1000)
    parser.add_argument("--anomaly-rate", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    default_out = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "datasets", "synthetic_telemetry.csv"
    )
    parser.add_argument("--out", type=str, default=default_out)
    args = parser.parse_args()

    readings = synthetic_readings(args.n, anomaly_rate=args.anomaly_rate, seed=args.seed)

    fields = [
        "batchId",
        "deviceId",
        "sequenceNumber",
        "recordedAt",
        "temperatureC",
        "humidityPercent",
        "latitude",
        "longitude",
        "isSimulated",
        "isAnomaly",
    ]

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in readings:
            row = {k: r.get(k) for k in fields}
            row["isAnomaly"] = bool(r["temperatureC"] > 20.0)
            writer.writerow(row)

    labels = sum(1 for r in readings if r["temperatureC"] > 20.0)
    print(f"Wrote {len(readings)} rows ({labels} anomalies) to {args.out}")


if __name__ == "__main__":
    main()
