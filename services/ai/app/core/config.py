import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cold-Chain Anomaly Detection AI Service"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    MODEL_ARTIFACT_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "artifacts")

    # Internal auth: when non-empty, callers must send `X-API-Key: <AI_API_KEY>`.
    # When empty (default, dev only), endpoints are open.
    AI_API_KEY: str = ""

    # Rule-engine thresholds (cold-chain envelope, configurable per deploy)
    TEMP_MIN_C: float = -30.0
    TEMP_MAX_C: float = 50.0
    HUMIDITY_MIN_PCT: float = 0.0
    HUMIDITY_MAX_PCT: float = 100.0
    LAT_MIN: float = -90.0
    LAT_MAX: float = 90.0
    LON_MIN: float = -180.0
    LON_MAX: float = 180.0

    # Isolation Forest parameters
    IF_CONTAMINATION: float = 0.1  # expected anomaly fraction
    IF_RANDOM_STATE: int = 42
    IF_N_ESTIMATORS: int = 100
    # decision_function threshold: score < ANOMALY_SCORE_THRESHOLD => anomalous
    ANOMALY_SCORE_THRESHOLD: float = 0.0

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

MODEL_ARTIFACT_PATH = os.path.join(settings.MODEL_ARTIFACT_DIR, "isolation_forest.joblib")
