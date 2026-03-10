"""
data_fetcher.py
---------------
Real-time AQI data fetcher for AirSense.

Primary  source : Open-Meteo Air Quality API (https://open-meteo.com)
                  ✅ 100% free  ✅ No API key  ✅ Excellent India coverage
                  ✅ Real-time updates every hour

Fallback source : WAQI (https://aqicn.org)
                  Requires a free token — set via WAQI_TOKEN env var.
                  Get one at: https://aqicn.org/data-platform/token/

`requests` is imported dynamically (lazy import) inside each function.
"""

import os
import pandas as pd
from datetime import datetime, timezone, timedelta


# ── Constants ─────────────────────────────────────────────────────────────────

# Open-Meteo (no key needed)
GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# Global static coordinates cache — populated from world_cities.csv for sub-millisecond lookups
GLOBAL_CITY_COORDS = {
    "delhi": (28.61, 77.21), "mumbai": (19.07, 72.88), "bangalore": (12.97, 77.59),
    "chennai": (13.08, 80.27), "hyderabad": (17.39, 78.48), "kolkata": (22.57, 88.36),
    "pune": (18.52, 73.86), "ahmedabad": (23.02, 72.57)
}

# Load extended coordinates from CSV if available
try:
    _base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _csv_path = os.path.join(_base_dir, "world_cities.csv")
    if os.path.exists(_csv_path):
        _df = pd.read_csv(_csv_path)
        for _, row in _df.iterrows():
            GLOBAL_CITY_COORDS[str(row["city"]).lower().strip()] = (float(row["lat"]), float(row["lon"]))
except Exception as e:
    print(f"[AirSense/Init] Could not load extended city coords: {e}")

# WAQI fallback (optional — set env var)
WAQI_TOKEN = os.getenv("WAQI_TOKEN", "")
WAQI_BASE  = "https://api.waqi.info"

# OpenAQ v3 fallback (optional — set env var)
OPENAQ_KEY  = os.getenv("OPENAQ_API_KEY", "")
OPENAQ_BASE = "https://api.openaq.org/v3"

# Simple in-memory geocode cache so we don't re-query for the same city
_GEO_CACHE: dict[str, tuple[float, float]] = {}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _session():
    """Return a requests.Session with automatic retry logic."""
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry

    s = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.4,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.headers.update({"Accept": "application/json"})
    return s


def _empty_df() -> pd.DataFrame:
    return pd.DataFrame(
        columns=["parameter", "value", "unit", "location", "city", "datetime"]
    )


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _geocode(city: str) -> tuple[float, float] | None:
    """
    Convert a city name to (latitude, longitude) using Open-Meteo geocoding.
    Results are cached in memory for the session lifetime.
    """
    key = city.strip().lower()
    if key in GLOBAL_CITY_COORDS:
        return GLOBAL_CITY_COORDS[key]
    if key in _GEO_CACHE:
        return _GEO_CACHE[key]

    try:
        r = _session().get(
            GEO_URL,
            params={"name": city, "count": 1, "language": "en", "format": "json"},
            timeout=10,
        )
        r.raise_for_status()
        results = r.json().get("results", [])
        if not results:
            print(f"[AirSense/Geocode] Could not find coordinates for '{city}'")
            return None

        lat = results[0]["latitude"]
        lon = results[0]["longitude"]
        _GEO_CACHE[key] = (lat, lon)
        return lat, lon

    except Exception as e:
        print(f"[AirSense/Geocode] Error: {e}")
        return None


# ── Open-Meteo Air Quality (primary — no API key) ─────────────────────────────

def _fetch_openmeteo(city: str, hours: int = 24) -> pd.DataFrame:
    """
    Fetch real-time air quality data from Open-Meteo for *city*.

    Hourly variables returned: pm2_5, pm10, ozone, nitrogen_dioxide,
    sulphur_dioxide, carbon_monoxide.
    """
    coords = _geocode(city)
    if coords is None:
        return _empty_df()

    lat, lon = coords
    now  = _utc_now()

    params = {
        "latitude":  lat,
        "longitude": lon,
        "hourly":    "pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide",
        "timezone":  "UTC",
        "past_days": max(1, (hours // 24) + 1),  # fetch enough days to cover the requested hours
        "forecast_days": 1,
    }

    try:
        r = _session().get(AQI_URL, params=params, timeout=15)
        r.raise_for_status()
        body = r.json()

        hourly     = body.get("hourly", {})
        timestamps = hourly.get("time", [])

        # Map Open-Meteo variable names → standard parameter labels
        var_map = {
            "pm2_5":            ("pm25",  "µg/m³"),
            "pm10":             ("pm10",  "µg/m³"),
            "ozone":            ("o3",    "µg/m³"),
            "nitrogen_dioxide": ("no2",   "µg/m³"),
            "sulphur_dioxide":  ("so2",   "µg/m³"),
            "carbon_monoxide":  ("co",    "µg/m³"),
        }

        # Only keep readings within the requested look-back window
        cutoff = now - timedelta(hours=hours)
        records = []
        for i, ts in enumerate(timestamps):
            try:
                dt = datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
            except ValueError:
                continue

            if dt < cutoff or dt > now:
                continue

            for api_key, (param, unit) in var_map.items():
                val = hourly.get(api_key, [None])[i]
                if val is None:
                    continue
                records.append({
                    "parameter": param,
                    "value":     float(val),
                    "unit":      unit,
                    "location":  city,
                    "city":      city,
                    "datetime":  dt,
                })

        if not records:
            print(f"[AirSense/OpenMeteo] No data in window for '{city}'")
            return _empty_df()

        df = pd.DataFrame(records)
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
        df["value"]    = pd.to_numeric(df["value"], errors="coerce")
        return df.dropna(subset=["value"]).reset_index(drop=True)

    except Exception as e:
        print(f"[AirSense/OpenMeteo] Error: {e}")
        return _empty_df()


# ── WAQI (fallback — free token required) ─────────────────────────────────────

def _fetch_waqi(city: str) -> pd.DataFrame:
    """Fetch current readings from WAQI. Only runs if WAQI_TOKEN is set."""
    import requests

    token = WAQI_TOKEN.strip()
    if not token:
        return _empty_df()

    try:
        r = _session().get(
            f"{WAQI_BASE}/feed/{city}/",
            params={"token": token},
            timeout=10,
        )
        r.raise_for_status()
        body = r.json()

        if body.get("status") != "ok":
            return _empty_df()

        data  = body["data"]
        iaqi  = data.get("iaqi", {})
        ts    = data.get("time", {}).get("iso", str(_utc_now()))
        loc   = data.get("city", {}).get("name", city)

        param_map = {
            "pm25": ("pm25", "µg/m³"),
            "pm10": ("pm10", "µg/m³"),
            "o3":   ("o3",   "µg/m³"),
            "no2":  ("no2",  "µg/m³"),
            "so2":  ("so2",  "µg/m³"),
            "co":   ("co",   "µg/m³"),
        }

        records = [
            {
                "parameter": param,
                "value":     float(iaqi[k]["v"]),
                "unit":      unit,
                "location":  loc,
                "city":      city,
                "datetime":  pd.to_datetime(ts, utc=True),
            }
            for k, (param, unit) in param_map.items()
            if k in iaqi
        ]

        return pd.DataFrame(records) if records else _empty_df()

    except Exception as e:
        print(f"[AirSense/WAQI] Error: {e}")
        return _empty_df()


# ── Public API ────────────────────────────────────────────────────────────────

# PERSISTENT HUB CACHE
RAW_DATA_CACHE = {}
DATA_EXPIRY = 900 # 15 minutes

def fetch_aqi_data(city: str = "Chennai", hours: int = 24) -> pd.DataFrame:
    """
    Fetch real-time air-quality measurements for *city*.
    Uses a high-performance in-memory cache to prevent slow API handshakes.
    """
    cache_key = f"{city}_{hours}"
    now = datetime.now().timestamp()
    
    if cache_key in RAW_DATA_CACHE:
        cached_df, timestamp = RAW_DATA_CACHE[cache_key]
        if now - timestamp < DATA_EXPIRY:
            return cached_df

    df = _fetch_openmeteo(city, hours)

    if df.empty:
        print(f"[AirSense] Open-Meteo returned no data for '{city}', trying WAQI…")
        df = _fetch_waqi(city)

    if not df.empty:
        RAW_DATA_CACHE[cache_key] = (df, now)

    if df.empty:
        print(f"[AirSense] ⚠️  No real-time data available for '{city}'.")

    return df


def fetch_latest_aqi(city: str = "Chennai") -> dict:
    """
    Return a single real-time AQI snapshot dict for *city*.
    Uses a 12-hour window to ensure we always find the most recent non-null reading.
    """
    df = fetch_aqi_data(city=city, hours=12) 

    if df.empty:
        return {}

    # Crucial: Filter out forecast points to find the real 'Now' value
    now = _utc_now()
    df = df[df["datetime"] <= now].copy()
    
    if df.empty:
        return {}

    # Most-recent reading per parameter for Max AQI calculation
    df_sorted = df.sort_values("datetime", ascending=False)

    # Collect the latest raw concentration for each key pollutant
    pollutants = {}
    for p in ["pm25", "pm10", "no2", "so2", "co", "o3"]:
        p_subset = df_sorted[df_sorted["parameter"] == p]
        if not p_subset.empty:
            pollutants[p] = round(float(p_subset.iloc[0]["value"]), 1)
        else:
            pollutants[p] = 0.0

    # Compute sub-index AQI for each major pollutant, then take the MAX
    # This is the US-EPA standard: the overall AQI is the highest sub-index
    aqi_pm25 = calculate_aqi(pollutants.get("pm25", 0), "pm25")
    aqi_pm10 = calculate_aqi(pollutants.get("pm10", 0), "pm10")
    aqi_no2  = calculate_aqi(pollutants.get("no2", 0),  "no2")
    
    aqi_val  = max(aqi_pm25, aqi_pm10, aqi_no2)
    cat, col = aqi_category(aqi_val)

    # Use the dominant parameter for display
    dominant_param = "pm25"
    if aqi_val == aqi_pm10: dominant_param = "pm10"
    if aqi_val == aqi_no2:  dominant_param = "no2"
    
    # Get dominant row for metadata
    dom_subset = df_sorted[df_sorted["parameter"] == dominant_param]
    row = dom_subset.iloc[0] if not dom_subset.empty else df_sorted.iloc[0]

    return {
        "parameter": row["parameter"],
        "value":     round(float(row["value"]), 1),
        "unit":      row.get("unit", "µg/m³"),
        "location":  row["location"],
        "aqi":       aqi_val,
        "category":  cat,
        "color":     col,
        "city":      city,
        "datetime":  str(row["datetime"]),
        "pollutants": pollutants
    }


def fetch_latest_aqi_bulk(cities: list[str]) -> list[dict]:
    """
    Fetch the latest AQI for multiple cities efficiently using chunked batch requests.
    Open-Meteo supports multi-location queries — we chunk into groups of 50 for safety.
    """
    # Check cache first
    cache_key = "bulk_aqi_all"
    now = datetime.now().timestamp()
    if cache_key in RAW_DATA_CACHE:
        cached, ts = RAW_DATA_CACHE[cache_key]
        if now - ts < 300:  # Freshness boost: 5 min cache
            return cached

    results = []
    # Identify coordinates for all cities
    to_fetch = []
    for city in cities:
        key = city.lower().strip()
        coords = GLOBAL_CITY_COORDS.get(key) or _GEO_CACHE.get(key)
        if not coords:
            coords = _geocode(city)
        if coords:
            to_fetch.append({"city": city, "lat": coords[0], "lon": coords[1]})

    if not to_fetch:
        return []

    # Chunk into batches of 50 for API safety
    CHUNK_SIZE = 50
    for chunk_start in range(0, len(to_fetch), CHUNK_SIZE):
        chunk = to_fetch[chunk_start:chunk_start + CHUNK_SIZE]
        lats = [str(f["lat"]) for f in chunk]
        lons = [str(f["lon"]) for f in chunk]

        params = {
            "latitude":  ",".join(lats),
            "longitude": ",".join(lons),
            "hourly":    "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide",
            "timezone":  "UTC",
            "past_hours": 24,
            "forecast_days": 1
        }

        try:
            r = _session().get(AQI_URL, params=params, timeout=25)
            r.raise_for_status()
            body = r.json()

            # Handle single vs multiple responses
            responses = body if isinstance(body, list) else [body]

            now_str = _utc_now().strftime("%Y-%m-%dT%H:00")

            for i, resp in enumerate(responses):
                if i >= len(chunk):
                    break
                city_name = chunk[i]["city"]
                hourly = resp.get("hourly", {})
                times = hourly.get("time", [])
                
                # Fetch maximum across all pollutants at the current hour (or most recent valid)
                try:
                    # Find index where time is <= current UTC hour
                    valid_idx = -1
                    for idx, t_str in enumerate(times):
                        if t_str <= now_str:
                            valid_idx = idx
                        else:
                            break
                            
                    if valid_idx == -1:
                        valid_idx = len(times) - 1

                    def get_latest(key):
                        arr = hourly.get(key, [])
                        for j in range(min(valid_idx, len(arr)-1), -1, -1):
                            if arr[j] is not None: return arr[j]
                        return 0

                    p25v = get_latest("pm2_5")
                    p10v = get_latest("pm10")
                    no2v = get_latest("nitrogen_dioxide")
                    
                    aqi25 = calculate_aqi(p25v, "pm25")
                    aqi10 = calculate_aqi(p10v, "pm10")
                    aqiNo2 = calculate_aqi(no2v, "no2")
                    
                    aqi = max(aqi25, aqi10, aqiNo2)
                    cat, col = aqi_category(aqi)
                    results.append({
                        "city": city_name,
                        "aqi": aqi,
                        "category": cat,
                        "color": col
                    })
                except Exception:
                    continue
        except Exception as e:
            print(f"[AirSense/BulkFetch] Chunk error: {e}")

    # Cache the results
    if results:
        RAW_DATA_CACHE[cache_key] = (results, now)

    return results


def fetch_aqi_forecast_online(city: str = "Chennai") -> list[dict]:
    """
    Fetch the next 24-hour AQI forecast directly from Open-Meteo.
    Extremely fast as it bypasses local model training.
    """
    coords = _geocode(city)
    if coords is None:
        return []

    lat, lon = coords
    params = {
        "latitude":  lat,
        "longitude": lon,
        "hourly":    "pm2_5",
        "timezone":  "auto",
        "forecast_days": 2,
    }

    try:
        r = _session().get(AQI_URL, params=params, timeout=10)
        r.raise_for_status()
        hourly = r.json().get("hourly", {})
        times = hourly.get("time", [])
        values = hourly.get("pm2_5", [])

        now = datetime.now(timezone.utc)
        results = []
        
        # Take first 24 hours starting from 'now'
        found = 0
        for i, t_str in enumerate(times):
            dt = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
            if dt > now and found < 24:
                val = float(values[i])
                aqi = calculate_aqi(val)
                results.append({
                    "time": dt.strftime("%I:%M %p"),
                    "fullTime": dt.isoformat(),
                    "aqi": aqi,
                    "val": val
                })
                found += 1
        
        return results
    except Exception as e:
        print(f"[AirSense/ForecastOnline] Error: {e}")
        return []


# ── AQI calculation ───────────────────────────────────────────────────────────

def calculate_aqi(val: float | None, parameter: str = "pm25") -> int:
    """
    Convert concentration (µg/m³) to a US-EPA AQI score for PM2.5 or PM10.
    Returns 0 if the value is None or NaN.
    """
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0

    # US-EPA Standard Breakpoints
    if parameter == "pm10":
        breakpoints = [
            (0,     54,     0,   50),
            (55,    154,    51,  100),
            (155,   254,   101,  150),
            (255,   354,   151,  200),
            (355,   424,   201,  300),
            (425,   504,   301,  400),
            (505,   604,   401,  500),
        ]
    else: # Default pm2.5
        breakpoints = [
            (0.0,    12.0,    0,   50),
            (12.1,   35.4,   51,  100),
            (35.5,   55.4,  101,  150),
            (55.5,  150.4,  151,  200),
            (150.5, 250.4,  201,  300),
            (250.5, 350.4,  301,  400),
            (350.5, 500.4,  401,  500),
        ]

    for c_lo, c_hi, i_lo, i_hi in breakpoints:
        if c_lo <= val <= c_hi:
            return int(round((i_hi - i_lo) / (c_hi - c_lo) * (val - c_lo) + i_lo))

    return 500 if val > 0 else 0


def aqi_category(aqi: int) -> tuple[str, str]:
    """Return (category_label, hex_color) for a given AQI score."""
    if aqi <= 50:
        return "Good", "#00E400"
    elif aqi <= 100:
        return "Moderate", "#FFFF00"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups", "#FF7E00"
    elif aqi <= 200:
        return "Unhealthy", "#FF0000"
    elif aqi <= 300:
        return "Very Unhealthy", "#8F3F97"
    else:
        return "Hazardous", "#7E0023"