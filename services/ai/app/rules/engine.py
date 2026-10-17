from __future__ import annotations

import datetime as _dt

from app.core.config import settings
from app.models.schemas import RuleViolation, Severity

# Allow the device clock to be a few minutes ahead/behind the server clock
# before flagging a timestamp anomaly.
_TIMESTAMP_SKEW_SECONDS = 5 * 60


class RuleEngine:
    """Stateless, dependency-free business-rule anomalies for a telemetry reading.

    Each rule maps a cold-chain invariant to a `RuleViolation`. Thresholds come
    from the service settings (configurable via env) but can be overridden per
    instance for tests.
    """

    def __init__(self, **overrides: float):
        self.temp_min = overrides.get("temp_min", settings.TEMP_MIN_C)
        self.temp_max = overrides.get("temp_max", settings.TEMP_MAX_C)
        self.humidity_min = overrides.get("humidity_min", settings.HUMIDITY_MIN_PCT)
        self.humidity_max = overrides.get("humidity_max", settings.HUMIDITY_MAX_PCT)
        self.lat_min = overrides.get("lat_min", settings.LAT_MIN)
        self.lat_max = overrides.get("lat_max", settings.LAT_MAX)
        self.lon_min = overrides.get("lon_min", settings.LON_MIN)
        self.lon_max = overrides.get("lon_max", settings.LON_MAX)

    def evaluate(self, reading: dict) -> list[RuleViolation]:
        violations: list[RuleViolation] = []
        temp = reading.get("temperatureC")
        if temp is not None and (temp < self.temp_min or temp > self.temp_max):
            violations.append(
                RuleViolation(
                    code="TEMP_OUT_OF_RANGE",
                    severity=Severity.CRITICAL,
                    message=f"Temperature {temp}°C outside permitted envelope [{self.temp_min}, {self.temp_max}]",
                )
            )

        humidity = reading.get("humidityPercent")
        if humidity is not None and (humidity < self.humidity_min or humidity > self.humidity_max):
            violations.append(
                RuleViolation(
                    code="HUMIDITY_OUT_OF_RANGE",
                    severity=Severity.WARNING,
                    message=f"Humidity {humidity}% outside range [{self.humidity_min}, {self.humidity_max}]",
                )
            )

        lat = reading.get("latitude")
        if lat is not None and not (self.lat_min <= lat <= self.lat_max):
            violations.append(
                RuleViolation(
                    code="INVALID_LATITUDE",
                    severity=Severity.WARNING,
                    message=f"Latitude {lat} outside [-90, 90]",
                )
            )

        lon = reading.get("longitude")
        if lon is not None and not (self.lon_min <= lon <= self.lon_max):
            violations.append(
                RuleViolation(
                    code="INVALID_LONGITUDE",
                    severity=Severity.WARNING,
                    message=f"Longitude {lon} outside [-180, 180]",
                )
            )

        recorded_at = reading.get("recordedAt")
        if isinstance(recorded_at, str):
            when = self._parse_timestamp(recorded_at)
            if when is not None:
                now = _dt.datetime.now(_dt.timezone.utc)
                if when > now + _dt.timedelta(seconds=_TIMESTAMP_SKEW_SECONDS):
                    violations.append(
                        RuleViolation(
                            code="FUTURE_TIMESTAMP",
                            severity=Severity.WARNING,
                            message=f"Reading timestamp {recorded_at} is in the future",
                        )
                    )

        return violations

    @staticmethod
    def _parse_timestamp(value: str):
        try:
            return _dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
