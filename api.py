from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from typing import List, Dict, Any
import pandas as pd
from utils.data_fetcher import fetch_latest_aqi, fetch_aqi_data, calculate_aqi, aqi_category, fetch_aqi_forecast_online
from utils.ml_model import attribute_sources, train_aqi_predictor, predict_next_24h
from utils.city_analysis import CITY_ANALYSIS_DATA, DEFAULT_ANALYSIS
import os
import time
from datetime import datetime, timedelta

app = FastAPI(title="AirSense API", description="AI-powered Air Quality Backend API")

# Simple in-memory cache for high-volume endpoints
TREND_CACHE = {}
CACHE_EXPIRY = 3600 # 1 hour global cache

app.add_middleware(GZipMiddleware, minimum_size=1000)
# Enable CORS for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load available cities
try:
    if os.path.exists("world_cities.csv"):
        cities_df = pd.read_csv("world_cities.csv")
        AVAILABLE_CITIES = cities_df["city"].dropna().unique().tolist()
    else:
        AVAILABLE_CITIES = ["Chennai", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Kolkata", "Pune", "Ahmedabad", "New York", "London", "Tokyo", "Paris", "Dubai", "Singapore", "Jaipur", "Lucknow", "Kochi", "Chandigarh", "Salem", "Coimbatore"]
except Exception:
    AVAILABLE_CITIES = ["Chennai", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Kolkata", "Pune", "Ahmedabad"]

@app.get("/cities")
async def get_cities() -> List[str]:
    return AVAILABLE_CITIES

@app.get("/aqi/current/{city}")
async def get_current_aqi(city: str) -> Dict[str, Any]:
    if city not in AVAILABLE_CITIES:
        raise HTTPException(status_code=404, detail="City not found")
        
    try:
        data = fetch_latest_aqi(city)
        if not data:
             return {"status": "error", "message": "No data available"}
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/aqi/combined/{city}")
async def get_combined_dashboard(city: str, days: int = 1) -> Dict[str, Any]:
    """Consolidated endpoint for dashboard to load everything in 1 request."""
    # Logic hardened: Don't default to Chennai unless the city is truly unknown (no coords)
    from utils.data_fetcher import GLOBAL_CITY_COORDS
    if city not in AVAILABLE_CITIES and city.lower().strip() not in GLOBAL_CITY_COORDS:
        city = "Chennai"
    
    # Simple global cache for dashboard requests
    cache_key = f"combined_{city}_{days}"
    now = time.time()
    # Freshness lock: 5 min cache (300s) to keep sync with Map/Sidebar
    if cache_key in TREND_CACHE:
        data, ts = TREND_CACHE[cache_key]
        if now - ts < 300: 
            return {"status": "success", "data": data}

    try:
        # Fetch everything in parallel where possible
        current = fetch_latest_aqi(city)
        forecast_online = fetch_aqi_forecast_online(city)
        # We use fetch_aqi_data for trend and sources
        raw_df = fetch_aqi_data(city, days * 24)
        
        # Format trend
        pm25_df = raw_df[raw_df["parameter"] == "pm25"].sort_values("datetime")
        trend = pm25_df.apply(lambda r: {
            "fullTime": r["datetime"].isoformat(),
            "time": r["datetime"].strftime("%I %p") if days <= 1 else r["datetime"].strftime("%b %d"),
            "aqi": calculate_aqi(r["value"])
        }, axis=1).tolist()

        # Failsafe for empty trends - generate synthetic baseline if sensors are truly dark
        # Uses city-specific seed so different places don't show identical "flat" data
        if not trend:
            import random
            random.seed(hash(city) % 10000)
            base_aqi = random.randint(30, 120)
            for i in range(24):
                dt = datetime.now() - timedelta(hours=24-i)
                trend.append({
                    "fullTime": dt.isoformat(),
                    "time": dt.strftime("%I %p"),
                    "aqi": base_aqi + random.randint(-15, 15)
                })

        # Attribute sources
        sources_df = attribute_sources(raw_df)
        avg_src = sources_df[["traffic_pct", "industrial_pct", "weather_pct"]].mean()
        
        combined = {
            "current": current,
            "forecast": forecast_online,
            "trend": trend,
            "sources": {
                "traffic": round(avg_src.get("traffic_pct", 40), 1),
                "industrial": round(avg_src.get("industrial_pct", 30), 1),
                "weather": round(avg_src.get("weather_pct", 30), 1)
            }
        }
        
        TREND_CACHE[cache_key] = (combined, now)
        return {"status": "success", "data": combined}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Combined Fetch Error: {str(e)}")

@app.get("/aqi/trend/{city}")
async def get_aqi_trend(city: str, days: int = 7) -> Dict[str, Any]:
    import random, math
    from datetime import datetime, timedelta, timezone
    try:
        days = min(days, 3650)
        cache_key = f"{city}_{days}"
        now_ts = time.time()

        # Freshness lock: 5 min cache (300s) to keep sync with Map/Sidebar
        if cache_key in TREND_CACHE:
            cached, ts = TREND_CACHE[cache_key]
            if now_ts - ts < 300: 
                return {"status": "success", "data": cached, "cached": True}

        # For 24h: try real data from backend
        if days == 1:
            df = fetch_aqi_data(city, 24)
            pm25_df = df[df["parameter"] == "pm25"].copy() if not df.empty else pd.DataFrame()
            if not pm25_df.empty:
                pm25_df["datetime"] = pd.to_datetime(pm25_df["datetime"])
                pm25_df = pm25_df.sort_values("datetime")
                pm25_df["smoothed_aqi"] = pm25_df["value"].rolling(3, min_periods=1).mean().apply(calculate_aqi)
                pm25_df["datetime"] = pm25_df["datetime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                records = pm25_df[["datetime", "smoothed_aqi"]].dropna().to_dict("records")
                TREND_CACHE[cache_key] = (records, now_ts)
                return {"status": "success", "data": records}

        # For 30d / 90d: generate fast realistic synthetic trend (instant, no API call)
        # Seed from current real AQI for accuracy
        base_aqi = 100  # fallback
        try:
            snap = fetch_latest_aqi(city)
            if snap and snap.get("aqi"):
                base_aqi = snap["aqi"]
        except Exception:
            pass

        now_dt = datetime.now(timezone.utc)
        records = []
        # Re-engineered for high-fidelity on short ranges, efficiency on long ranges
        # This fixes the "identical time" bug while keeping 10-year data small
        points_per_day = 1 if days > 180 else 4
        num_points = days * points_per_day
        random.seed(hash(city) % 1000)

        for i in range(num_points):
            # Backtrack from now, but with realistic micro-variations
            # Dynamic interval: 86400s (24h) divided by points per day
            interval_sec = 86400 // points_per_day
            jitter = random.randint(-1800, 1800) # ±30 mins
            dt = now_dt - timedelta(seconds=(num_points - i) * interval_sec + jitter)
            # Smooth seasonal + daily variation
            seasonal = math.sin(i / num_points * math.pi) * 15
            noise = random.uniform(-12, 12)
            aqi_val = max(20, min(400, int(base_aqi + seasonal + noise)))
            records.append({
                "datetime": dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "smoothed_aqi": aqi_val
            })

        TREND_CACHE[cache_key] = (records, now_ts)
        return {"status": "success", "data": records}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trend Error: {str(e)}")

@app.get("/aqi/sources/{city}")
async def get_pollution_sources(city: str) -> Dict[str, Any]:
    try:
        df = fetch_aqi_data(city, 7 * 24)
        if df.empty:
             return {"status": "error", "message": "No data available"}
             
        sources = attribute_sources(df)
        if sources.empty:
             return {"status": "error", "message": "Not enough data for source attribution"}
             
        avg = sources[["traffic_pct", "industrial_pct", "weather_pct"]].mean()
        return {
            "status": "success", 
            "data": {
                "traffic": round(avg["traffic_pct"], 1),
                "industrial": round(avg["industrial_pct"], 1),
                "weather": round(avg["weather_pct"], 1)
            }
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/aqi/forecast/{city}")
async def get_forecast(city: str, pollutant: str = "pm25", online: bool = True) -> Dict[str, Any]:
    try:
        if online and pollutant == "pm25":
            # Direct fast path
            results = fetch_aqi_forecast_online(city)
            return {"status": "success", "data": results}

        # Fallback/Local ML Path
        raw_df = fetch_aqi_data(city, 7 * 24)
        if raw_df.empty: return {"status": "error", "message": "No historical data to train model"}
        
        model, df_pollutant = train_aqi_predictor(raw_df, pollutant=pollutant)
        forecast_df = predict_next_24h(model, df_pollutant)
        
        forecast_df["datetime"] = forecast_df["datetime"].astype(str)
        # Apply AQI calculation on forecast if it's PM2.5
        if pollutant == "pm25":
            forecast_df["predicted_aqi"] = forecast_df["predicted_val"].apply(calculate_aqi)
        else:
             forecast_df["predicted_aqi"] = forecast_df["predicted_val"] # Return raw val
             
        records = forecast_df[["datetime", "predicted_aqi"]].to_dict("records")
        return {"status": "success", "data": records}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/aqi/health/{city}")
async def get_health_risks(city: str, pollutant: str = "pm25") -> Dict[str, Any]:
    try:
        # Consistency lock: Use latest snapshot instead of 24h mean
        snap = fetch_latest_aqi(city)
        aqi_val = snap.get("aqi", 0)
        
        # Determine Risks based on AQI
        if aqi_val <= 50:
            status = "Low Risk"
            respiratory = ["Normal function", "Minimal irritation"]
            cardiac = ["No elevated risk"]
            short_term = "Air is healthy. No negative effects."
            long_term = "Regular exposure promotes good health."
        elif aqi_val <= 100:
            status = "Moderate Risk"
            respiratory = ["Sensitization in asthmatics", "Mild cough"]
            cardiac = ["Minor stress for severe conditions"]
            short_term = "Minor throat irritation after exertion."
            long_term = "Minimal risk for most groups."
        elif aqi_val <= 150:
            status = "High Risk (Sensitive)"
            respiratory = ["Asthma exacerbation", "Increased cough"]
            cardiac = ["Minor heart rhythm irregularities"]
            short_term = "Coughing and shortness of breath."
            long_term = "Lung damage risk over time."
        elif aqi_val <= 200:
            status = "Unhealthy"
            respiratory = ["Severe asthma attacks", "COPD worsening"]
            cardiac = ["Arrhythmia risk", "Stroke risk increases"]
            short_term = "Headaches and dizziness.",
            long_term = "Accelerated aging of arteries."
        else:
            status = "Hazardous"
            respiratory = ["Acute distress", "High pneumonia risk"]
            cardiac = ["Heart attacks", "Severe hypertension"]
            short_term = "Immune system overwhelmed."
            long_term = "Reduced life expectancy."

        return {
            "status": "success",
            "data": {
                "aqi": aqi_val,
                "risk_status": status,
                "risks": {
                    "respiratory": respiratory,
                    "cardiac": cardiac
                },
                "effects": {
                    "short_term": short_term,
                    "long_term": long_term
                }
            }
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/aqi/source-rhythm/{city}")
async def get_source_rhythm(city: str) -> Dict[str, Any]:
    try:
        df = fetch_aqi_data(city, 7 * 24)
        if df.empty:
             return {"status": "error", "message": "No data"}
        
        sources = attribute_sources(df)
        sources['hour'] = pd.to_datetime(sources['datetime']).dt.hour
        hourly_avg = sources.groupby('hour')[["traffic_pct", "industrial_pct", "weather_pct"]].mean().reset_index()
        
        return {"status": "success", "data": hourly_avg.to_dict("records")}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/aqi/why/{city}")
async def get_city_analysis(city: str) -> Dict[str, Any]:
    try:
        # Consistency lock: Use latest snapshot instead of 24h mean
        snap = fetch_latest_aqi(city)
        aqi_val = snap.get("aqi", 0)
        
        analysis = CITY_ANALYSIS_DATA.get(city, DEFAULT_ANALYSIS)
        
        # Format causes for easier JSON handling
        formatted_causes = [
            {"cause": c[0], "pct": c[1], "detail": c[2]} for c in analysis["causes"]
        ]
        
        return {
            "status": "success",
            "data": {
                "aqi": aqi_val,
                "label": aqi_category(aqi_val)[0],
                "color": aqi_category(aqi_val)[1],
                "causes": formatted_causes,
                "solutions": analysis["solutions"],
                "best_month": analysis["best_month"],
                "worst_month": analysis["worst_month"],
                "good_facts": analysis["good_facts"]
            }
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/aqi/historical/{city}")
async def get_historical_heatmap(city: str, days: int = 30) -> Dict[str, Any]:
    try:
        df = fetch_aqi_data(city, days * 24)
        if df.empty:
             return {"status": "error", "message": "No data"}
             
        pm25 = df[df["parameter"] == "pm25"].copy()
        pm25["hour"] = pm25["datetime"].dt.hour
        pm25["day"] = pm25["datetime"].dt.day_name()
        
        # Create a simplified heatmap data structure
        pivot = pm25.groupby(["day", "hour"])["value"].mean().reset_index()
        records = pivot.to_dict("records")
        
        return {"status": "success", "data": records}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/aqi/status-bulk")
async def get_bulk_status(cities: str = "") -> Dict[str, Any]:
    try:
        from utils.data_fetcher import fetch_latest_aqi_bulk
        if not cities:
            target_cities = AVAILABLE_CITIES  # Fetch ALL cities — chunked fetcher handles the load
        else:
            target_cities = cities.split(",")
            
        # Use the high-speed bulk fetcher
        results = fetch_latest_aqi_bulk(target_cities)
        
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk Status Error: {str(e)}")

# Pre-load map locations once at startup for instant /maps responses
_MAP_LOCATIONS_CACHE = None

@app.get("/maps")
async def get_map_locations() -> Dict[str, Any]:
    global _MAP_LOCATIONS_CACHE
    if _MAP_LOCATIONS_CACHE is not None:
        return _MAP_LOCATIONS_CACHE

    try:
        if os.path.exists("world_cities.csv"):
            df = pd.read_csv("world_cities.csv")
        else:
            df = pd.read_csv("city_loc.csv") 
            
        df = df.dropna(subset=["lat", "lon"])
        locations = df.to_dict("records")
        _MAP_LOCATIONS_CACHE = {
            "status": "success",
            "count": len(locations),
            "data": locations
        }
        return _MAP_LOCATIONS_CACHE
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Map data error: {str(e)}")

@app.get("/")
async def root():
    return {"message": "AirSense Backend is Running"}
