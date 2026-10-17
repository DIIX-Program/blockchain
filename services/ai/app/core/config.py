import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cold-Chain Anomaly Detection AI Service"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    MODEL_ARTIFACT_DIR: str = "./artifacts"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
