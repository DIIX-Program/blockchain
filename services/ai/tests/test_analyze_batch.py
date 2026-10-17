from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_NORMAL_BATCH = {
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


def _batch(count, start_seq=1, temp=4.5):
    return [
        {**_NORMAL_BATCH, "sequenceNumber": start_seq + i, "temperatureC": temp}
        for i in range(count)
    ]


def test_analyze_batch_mixed_anomalies():
    readings = _batch(9, temp=4.5) + [{**_NORMAL_BATCH, "sequenceNumber": 99, "temperatureC": 99.0}]
    res = client.post("/api/v1/analyze-batch", json={"readings": readings})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 10
    assert data["anomalyCount"] >= 1
    assert data["normalCount"] == data["total"] - data["anomalyCount"]
    assert 0.0 < data["contaminationRate"] <= 1.0
    assert data["model"]["trained"] is True
    # The extreme outlier should appear in the anomalies list.
    anom_seqs = {a["sequenceNumber"] for a in data["anomalies"]}
    assert 99 in anom_seqs


def test_analyze_batch_empty():
    res = client.post("/api/v1/analyze-batch", json={"readings": []})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert data["anomalyCount"] == 0
    assert data["normalCount"] == 0
    assert data["contaminationRate"] == 0.0
    assert data["anomalies"] == []
