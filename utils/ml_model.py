import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import xgboost as xgb

def attribute_sources(df):
    """
    Identify pollution source contributions using correlation patterns.
    Traffic: high NO2 + CO during rush hours
    Industrial: high SO2, consistent patterns
    Weather-trapped: high PM2.5 + low wind
    """
    df = df.copy()
    df_pivot = df.pivot_table(
        index="datetime", columns="parameter", values="value", aggfunc="mean"
    ).reset_index().fillna(0)
    
    df_pivot["hour"] = pd.to_datetime(df_pivot["datetime"]).dt.hour
    df_pivot["is_rush_hour"] = df_pivot["hour"].apply(
        lambda h: 1 if (7 <= h <= 10 or 17 <= h <= 20) else 0
    )
    
    results = []
    for _, row in df_pivot.iterrows():
        no2 = row.get("no2", 0)
        co  = row.get("co", 0)  # CO is naturally very high (often > 500)
        so2 = row.get("so2", 0)
        pm25 = row.get("pm25", 0)
        
        # Scale down CO so it doesn't instantly overpower everything else
        traffic_score    = (no2 * 1.2 + co * 0.05) * (1.3 if row["is_rush_hour"] else 0.8)
        industrial_score = so2 * 3.5 + pm25 * 0.15
        weather_score    = pm25 * 0.85
        
        total = traffic_score + industrial_score + weather_score + 0.001
        results.append({
            "datetime": row["datetime"],
            "traffic_pct":    round(traffic_score / total * 100, 1),
            "industrial_pct": round(industrial_score / total * 100, 1),
            "weather_pct":    round(weather_score / total * 100, 1),
        })
    
    return pd.DataFrame(results)


def train_aqi_predictor(df, pollutant="pm25"):
    """Train XGBoost model to predict values for next 24 hours"""
    df_pollutant = df[df["parameter"] == pollutant].copy()
    df_pollutant = df_pollutant.sort_values("datetime").reset_index(drop=True)
    df_pollutant["hour"]       = df_pollutant["datetime"].dt.hour
    df_pollutant["day_of_week"] = df_pollutant["datetime"].dt.dayofweek
    df_pollutant["month"]      = df_pollutant["datetime"].dt.month
    df_pollutant["lag_1"]      = df_pollutant["value"].shift(1)
    df_pollutant["lag_3"]      = df_pollutant["value"].shift(3)
    df_pollutant["rolling_3"]  = df_pollutant["value"].rolling(3).mean()

    features = ["hour", "day_of_week", "month", "lag_1", "lag_3", "rolling_3"]

    # Only add lag_24 if we have enough rows
    if len(df_pollutant) > 24:
        df_pollutant["lag_24"] = df_pollutant["value"].shift(24)
        features.append("lag_24")

    df_pollutant = df_pollutant.dropna(subset=features)

    if len(df_pollutant) < 5:
        # Not enough data to train — return a trivial model
        from sklearn.dummy import DummyRegressor
        dummy = DummyRegressor(strategy="mean")
        if df_pollutant.empty:
            df_pollutant = df[df["parameter"] == pollutant].copy().sort_values("datetime")
        dummy.fit([[0]], df_pollutant["value"].fillna(0).values[:1])
        return dummy, df_pollutant

    X = df_pollutant[features]
    y = df_pollutant["value"]

    model = xgb.XGBRegressor(n_estimators=100, max_depth=5,
                              learning_rate=0.1, random_state=42)
    model.fit(X, y)
    return model, df_pollutant


def predict_next_24h(model, df_pollutant):
    """Generate 24-hour forecast"""
    if df_pollutant.empty:
        return pd.DataFrame(columns=["datetime", "predicted_val"])

    last_row = df_pollutant.iloc[-1]
    predictions = []
    last_values = list(df_pollutant["value"].tail(24))

    for i in range(24):
        next_dt = last_row["datetime"] + pd.Timedelta(hours=i+1)
        features = {
            "hour":       next_dt.hour,
            "day_of_week": next_dt.dayofweek,
            "month":      next_dt.month,
            "lag_1":      last_values[-1],
            "lag_3":      last_values[-3] if len(last_values) >= 3 else last_values[-1],
            "rolling_3":  np.mean(last_values[-3:]),
        }
        # Only add lag_24 if the model was trained with it
        if "lag_24" in (model.feature_names_in_ if hasattr(model, 'feature_names_in_') else []):
            features["lag_24"] = last_values[-24] if len(last_values) >= 24 else last_values[-1]

        pred = model.predict(pd.DataFrame([features]))[0]
        predictions.append({"datetime": next_dt, "predicted_val": max(0.0, round(float(pred), 2))})
        last_values.append(pred)

    return pd.DataFrame(predictions)