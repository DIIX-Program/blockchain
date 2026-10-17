from app.rules.engine import RuleEngine
from app.models.schemas import Severity


def _reading(**overrides):
    base = {
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
    base.update(overrides)
    return base


def test_normal_reading_has_no_violations():
    engine = RuleEngine()
    assert engine.evaluate(_reading()) == []


def test_hot_temperature_is_critical():
    engine = RuleEngine()
    violations = engine.evaluate(_reading(temperatureC=99.0))
    assert any(v.code == "TEMP_OUT_OF_RANGE" for v in violations)
    assert violations[0].severity == Severity.CRITICAL


def test_freezing_temperature_outside_envelope():
    engine = RuleEngine()
    violations = engine.evaluate(_reading(temperatureC=-40.0))
    assert any(v.code == "TEMP_OUT_OF_RANGE" and v.severity == Severity.CRITICAL for v in violations)


def test_humidity_above_range_is_warning():
    engine = RuleEngine()
    violations = engine.evaluate(_reading(humidityPercent=150.0))
    assert any(v.code == "HUMIDITY_OUT_OF_RANGE" and v.severity == Severity.WARNING for v in violations)


def test_invalid_latitude_and_longitude():
    engine = RuleEngine()
    violations = engine.evaluate(_reading(latitude=200.0, longitude=-400.0))
    codes = {v.code for v in violations}
    assert "INVALID_LATITUDE" in codes
    assert "INVALID_LONGITUDE" in codes


def test_future_timestamp_flagged():
    engine = RuleEngine()
    violations = engine.evaluate(_reading(recordedAt="2099-01-01T00:00:00Z"))
    assert any(v.code == "FUTURE_TIMESTAMP" for v in violations)


def test_custom_thresholds_override():
    engine = RuleEngine(temp_min=2.0, temp_max=8.0)
    violations = engine.evaluate(_reading(temperatureC=10.0))
    assert any(v.code == "TEMP_OUT_OF_RANGE" for v in violations)
    # within stricter range is fine
    assert engine.evaluate(_reading(temperatureC=5.0)) == []
