import datetime
import numpy as np
import pandas as pd
from typing import List, Tuple
from sqlalchemy.orm import Session
from sklearn.linear_model import Ridge
from .models import SalesHistory, InventoryItem

# Storage capacity limits by category
CATEGORY_STORAGE_LIMITS = {
    "Dairy": 200.0,
    "Produce": 400.0,
    "Bakery": 150.0,
    "Meat": 100.0,
    "Pantry": 1000.0
}

def forecast_product_demand(db: Session, tenant_id: int, product_name: str, category: str, forecast_days: int = 7) -> float:
    """
    Forecast the total demand (quantity sold) for a product over the next forecast_days
    using Ridge Regression with day-of-week and trend features.
    If historical data is sparse, it falls back to a simple moving average.
    """
    # Fetch historical sales for this product
    history = db.query(SalesHistory).filter(
        SalesHistory.tenant_id == tenant_id,
        SalesHistory.product_name == product_name
    ).order_by(SalesHistory.date).all()

    if len(history) < 14:
        # Fallback to category average sales if no product history
        cat_history = db.query(SalesHistory).filter(
            SalesHistory.tenant_id == tenant_id,
            SalesHistory.category == category
        ).all()
        
        if not cat_history:
            # Absolute default if no history exists at all
            return 15.0 * forecast_days / 7.0  # Assumes 15 units/week default
            
        sales = [h.quantity_sold for h in cat_history]
        daily_avg = sum(sales) / len(sales)
        return daily_avg * forecast_days

    # Load into DataFrame
    df = pd.DataFrame([{
        "date": h.date,
        "quantity_sold": h.quantity_sold
    } for h in history])

    # Convert date to datetime and calculate day index and day of week
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    
    # Calculate days from start
    min_date = df["date"].min()
    df["day_index"] = (df["date"] - min_date).dt.days
    df["day_of_week"] = df["date"].dt.dayofweek

    # Feature Engineering: One-hot encode day_of_week
    # Standard 7 days of the week representation
    for i in range(7):
        df[f"dow_{i}"] = (df["day_of_week"] == i).astype(float)

    # Train model
    feature_cols = ["day_index"] + [f"dow_{i}" for i in range(7)]
    X = df[feature_cols].values
    y = df["quantity_sold"].values

    model = Ridge(alpha=1.0)
    model.fit(X, y)

    # Predict next forecast_days
    last_day_index = df["day_index"].max()
    last_date = df["date"].max()
    
    future_features = []
    for d in range(1, forecast_days + 1):
        future_date = last_date + datetime.timedelta(days=d)
        future_day_index = last_day_index + d
        future_dow = future_date.dayofweek
        
        row = [future_day_index]
        for i in range(7):
            row.append(1.0 if future_dow == i else 0.0)
        future_features.append(row)

    predictions = model.predict(np.array(future_features))
    # Clip negative predictions to 0
    predictions = np.clip(predictions, 0, None)
    
    return float(np.sum(predictions))

def calculate_waste_risk(current_stock: float, predicted_demand: float, days_to_expiry: int) -> Tuple[float, str]:
    """
    Calculate a waste risk score (0-100) and risk level classification.
    High stock + low demand + short expiry = High Risk.
    """
    if current_stock <= 0:
        return 0.0, "Low"
    
    if days_to_expiry <= 0:
        return 100.0, "High"

    # Excess stock ratio: how much of the stock is NOT covered by the forecasted demand
    excess_stock = max(0.0, current_stock - predicted_demand)
    excess_ratio = excess_stock / current_stock

    # Expiry factor: urgency increases exponentially as days to expiry decrease
    # If expiry is within 2 days, weight is 1.0. Within 7 days, weight is 0.75.
    if days_to_expiry <= 2:
        base_score = 75.0
        multiplier = 25.0 * excess_ratio
        score = base_score + multiplier
    elif days_to_expiry <= 5:
        base_score = 45.0
        multiplier = 30.0 * excess_ratio
        score = base_score + multiplier
    elif days_to_expiry <= 10:
        base_score = 15.0
        multiplier = 30.0 * excess_ratio
        score = base_score + multiplier
    else:
        # Expiry is far away, risk is mostly low unless stock is extremely high
        score = 15.0 * excess_ratio

    # Bound the score
    score = min(100.0, max(0.0, score))
    
    if score >= 70.0:
        level = "High"
    elif score >= 35.0:
        level = "Medium"
    else:
        level = "Low"

    return round(score, 1), level

def get_reorder_recommendation(
    product_name: str,
    category: str,
    current_stock: float,
    predicted_demand: float,
    storage_limit: float = None
) -> dict:
    """
    Recommend reorder quantities.
    If current stock is sufficient for forecasted demand (plus a safety buffer), no reorder is needed.
    """
    safety_buffer = 0.20 * predicted_demand  # 20% safety stock
    target_inventory = predicted_demand + safety_buffer
    
    if current_stock >= target_inventory:
        return {
            "product_name": product_name,
            "category": category,
            "current_stock": current_stock,
            "predicted_7day_demand": round(predicted_demand, 1),
            "recommended_reorder_qty": 0.0,
            "reason": "Stock level sufficient for predicted demand plus safety buffer."
        }

    needed_qty = target_inventory - current_stock
    
    # Cap recommendation based on category storage limits if provided
    if storage_limit and (current_stock + needed_qty) > storage_limit:
        adjusted_qty = max(0.0, storage_limit - current_stock)
        return {
            "product_name": product_name,
            "category": category,
            "current_stock": current_stock,
            "predicted_7day_demand": round(predicted_demand, 1),
            "recommended_reorder_qty": round(adjusted_qty, 1),
            "reason": f"Capped at category storage capacity. Demanded: {round(needed_qty, 1)} units."
        }

    return {
        "product_name": product_name,
        "category": category,
        "current_stock": current_stock,
        "predicted_7day_demand": round(predicted_demand, 1),
        "recommended_reorder_qty": round(needed_qty, 1),
        "reason": "Replenish stock to meet predicted demand and maintain safety buffer."
    }
