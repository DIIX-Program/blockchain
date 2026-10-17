from fastapi.testclient import TestClient

from app.main import app
client = TestClient(app)

_NORMAL = {
    "batchId": "123e4567-e89b-12d3-a456-426614174000",
    "deviceId": "dev-1",
    "sequenceNumber": 1,
    "recordedAt": "2026-10-17T12:00:00Z",
    "temperatureC": 4.5,
    "humidityPercent": 50.0,
    "latitude": 21.0,
    "longitude": 105.8,
    "isSimulated": True,
}


def test_predict_normal_reading():
    res = client.post("/api/v1/predict", json=_NORMAL)
    assert res.status_code == 200
    data = res.json()
    assert data["isAnomaly"] is False
    assert data["score"] is not None
    assert "features" in data
    assert "ruleViolations" in data


def test_predict_rule_violation_flagged():
    reading = {**_NORMAL, "temperatureC": 99.0}
    res = client.post("/api/v1/predict", json=reading)
    assert res.status_code == 200
    data = res.json()
    assert data["isAnomaly"] is True
    # At least one rule_engine flag and an IF flag should be present.
    sources = {f["source"] for f in data["flags"]}
    assert "rule_engine" in sources


def test_predict_missing_required_field_returns_422():
    bad = {**_NORMAL}
    del bad["temperatureC"]
    res = client.post("/api/v1/predict", json=bad)
    assert res.status_code == 422


def test_predict_with_api_key_when_required():
    from app.core.config import settings
    from app.api.anomaly import verify_api_key

    settings.AI_API_KEY = "test-secret"
    try:
        # missing key -> 401
        res = client.post("/api/v1/predict", json=_NORMAL)
        assert res.status_code == 401
        # correct key -> 200
        res = client.post(
            "/api/v1/predict",
            json=_NORMAL,
            headers={"X-API-Key": "test-secret"},
        )
        assert res.status_code == 200
    finally:
        settings.AI_API_KEY = ""


def test_model_info_endpoint():
    res = client.get("/api/v1/model")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "isolation_forest"
    assert data["trained"] is True
