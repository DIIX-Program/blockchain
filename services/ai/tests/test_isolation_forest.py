import os

import numpy as np

from app.core.config import settings
from app.models.isolation_forest import IsolationForestModel
from app.pipelines.features import extract_features, readings_to_matrix
from app.pipelines.synthetic import synthetic_readings


def _train_default() -> IsolationForestModel:
    readings = synthetic_readings(300, anomaly_rate=0.1, seed=settings.IF_RANDOM_STATE)
    X = readings_to_matrix(readings)
    return IsolationForestModel().fit(X)


def test_model_is_fitted_after_fit():
    model = _train_default()
    assert model.is_fitted is True


def test_outlier_flagged_as_anomalous():
    model = _train_default()
    # Extreme hot reading far outside the training envelope (~4C)
    outlier = extract_features(
        {
            "temperatureC": 99.0,
            "humidityPercent": 50.0,
            "latitude": 21.0,
            "longitude": 105.8,
        }
    ).reshape(1, -1)
    is_anom, score = model.predict(outlier)
    assert bool(is_anom[0]) is True
    assert float(score[0]) < settings.ANOMALY_SCORE_THRESHOLD


def test_normal_reading_not_flagged():
    model = _train_default()
    normal = extract_features(
        {
            "temperatureC": 4.0,
            "humidityPercent": 50.0,
            "latitude": 21.0,
            "longitude": 105.8,
        }
    ).reshape(1, -1)
    is_anom, score = model.predict(normal)
    # A clearly-in-distribution reading should score above the anomaly threshold.
    assert float(score[0]) >= settings.ANOMALY_SCORE_THRESHOLD
    assert bool(is_anom[0]) is False


def test_outlier_scores_lower_than_normal():
    model = _train_default()
    normal_score = float(model.decision_function(
        extract_features({"temperatureC": 4.0, "humidityPercent": 50.0, "latitude": 21.0, "longitude": 105.8}).reshape(1, -1)
    )[0])
    outlier_score = float(model.decision_function(
        extract_features({"temperatureC": 99.0, "humidityPercent": 50.0, "latitude": 21.0, "longitude": 105.8}).reshape(1, -1)
    )[0])
    assert outlier_score < normal_score


def test_save_and_load_roundtrip():
    model = _train_default()
    path = os.path.join(settings.MODEL_ARTIFACT_DIR, "test_roundtrip.joblib")
    try:
        model.save(path)
        loaded = IsolationForestModel.load(path)
        assert loaded.is_fitted is True
        # same input -> same score
        x = extract_features({"temperatureC": 99.0, "humidityPercent": 50.0, "latitude": 21.0, "longitude": 105.8}).reshape(1, -1)
        assert np.allclose(model.decision_function(x), loaded.decision_function(x))
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_load_or_train_default_is_fitted():
    model = IsolationForestModel.load_or_train_default()
    assert model.is_fitted is True
