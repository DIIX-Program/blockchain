from __future__ import annotations

import os

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from app.core.config import MODEL_ARTIFACT_PATH, settings


class IsolationForestModel:
    """Thin wrapper around scikit-learn's IsolationForest.

    `decision_function` returns the anomaly score (higher = more normal);
    a reading is anomalous when its score falls below the configured
    threshold (default 0). The model is fit on a 4-D feature matrix produced
    by `app.pipelines.features.readings_to_matrix`.
    """

    def __init__(
        self,
        contamination: float | None = None,
        random_state: int | None = None,
        n_estimators: int | None = None,
    ):
        self.contamination = float(
            settings.IF_CONTAMINATION if contamination is None else contamination
        )
        self.random_state = int(
            settings.IF_RANDOM_STATE if random_state is None else random_state
        )
        self.n_estimators = int(
            settings.IF_N_ESTIMATORS if n_estimators is None else n_estimators
        )
        self._fitted = False
        self._build_model()

    def _build_model(self) -> None:
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=self.n_estimators,
        )

    @property
    def is_fitted(self) -> bool:
        return self._fitted

    def fit(self, X: np.ndarray) -> "IsolationForestModel":
        self._build_model()
        self.model.fit(X)
        self._fitted = True
        return self

    def decision_function(self, X: np.ndarray) -> np.ndarray:
        return self.model.decision_function(X)

    def predict(self, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Return (is_anomaly, score) arrays of length len(X)."""
        scores = self.decision_function(X)
        is_anomaly = scores < settings.ANOMALY_SCORE_THRESHOLD
        return is_anomaly, scores

    def save(self, path: str = MODEL_ARTIFACT_PATH) -> str:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        joblib.dump(
            {
                "model": self.model,
                "contamination": self.contamination,
                "random_state": self.random_state,
                "n_estimators": self.n_estimators,
            },
            path,
        )
        return path

    @classmethod
    def load(cls, path: str = MODEL_ARTIFACT_PATH) -> "IsolationForestModel":
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"No model artifact at {path}. Run `python scripts/train.py` first."
            )
        data = joblib.load(path)
        obj = cls(
            contamination=data["contamination"],
            random_state=data["random_state"],
            n_estimators=data.get("n_estimators", settings.IF_N_ESTIMATORS),
        )
        obj.model = data["model"]
        obj._fitted = True
        return obj

    @classmethod
    def load_or_train_default(cls, path: str = MODEL_ARTIFACT_PATH) -> "IsolationForestModel":
        """Load the persisted artifact, or — as a dev/test convenience — train a
        deterministic default model on synthetic data when no artifact exists."""
        if os.path.exists(path):
            try:
                return cls.load(path)
            except Exception:
                pass
        from app.pipelines.synthetic import synthetic_readings
        from app.pipelines.features import readings_to_matrix

        readings = synthetic_readings(
            400,
            anomaly_rate=settings.IF_CONTAMINATION,
            seed=settings.IF_RANDOM_STATE,
        )
        X = readings_to_matrix(readings)
        return cls().fit(X)
