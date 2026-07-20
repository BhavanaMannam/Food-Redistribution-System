from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

# Tenant Schemas
class TenantBase(BaseModel):
    name: str
    type: str
    org_type: Optional[str] = None
    location_lat: float = 0.0
    location_lng: float = 0.0
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_public: bool = True

class TenantCreate(TenantBase):
    pass

class TenantResponse(TenantBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    username: str
    tenant_id: int
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    org_name: str
    org_type: str
    portal: str
    location: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_public: bool = True

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# Inventory Schemas
class InventoryItemBase(BaseModel):
    product_name: str
    category: str
    quantity: float
    unit: str
    purchase_price: float
    expiry_date: date
    purchase_date: Optional[date] = None
    status: Optional[str] = "active"

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemResponse(InventoryItemBase):
    id: int
    tenant_id: int

    class Config:
        from_attributes = True

# Listing Schemas
class SurplusListingBase(BaseModel):
    inventory_item_id: Optional[int] = None
    product_name: str
    category: str
    quantity: float
    unit: str
    expiry_date: date
    pickup_window_start: datetime
    pickup_window_end: datetime
    notes: Optional[str] = None
    status: Optional[str] = "available"

class SurplusListingCreate(SurplusListingBase):
    pass

class SurplusListingResponse(SurplusListingBase):
    id: int
    tenant_id: int
    tenant: Optional[TenantResponse] = None

    class Config:
        from_attributes = True

# Booking Schemas
class BookingBase(BaseModel):
    listing_id: int
    pickup_time: datetime

class BookingCreate(BookingBase):
    pass

class BookingResponse(BaseModel):
    id: int
    listing_id: int
    ngo_id: int
    pickup_time: datetime
    status: str
    created_at: datetime
    listing: Optional[SurplusListingResponse] = None
    ngo: Optional[TenantResponse] = None

    class Config:
        from_attributes = True

# Predictive Analytics Schemas
class ProductPrediction(BaseModel):
    product_name: str
    category: str
    current_stock: float
    predicted_7day_demand: float
    days_to_expiry: int
    waste_risk_score: float  # 0 to 100
    risk_level: str  # "Low", "Medium", "High"

class ReorderRecommendation(BaseModel):
    product_name: str
    category: str
    current_stock: float
    predicted_7day_demand: float
    recommended_reorder_qty: float
    reason: str

class WastePredictionResponse(BaseModel):
    predictions: List[ProductPrediction]

class ReorderResponse(BaseModel):
    recommendations: List[ReorderRecommendation]

class MatchingNGOResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    distance_km: float
    matching_categories: List[str]
    match_score: float
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


# ---------------------------------------------------------------------------
# Barcode Product Schemas
# ---------------------------------------------------------------------------
class BarcodeProductCreate(BaseModel):
    barcode: str
    product_name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class BarcodeProductUpdate(BaseModel):
    product_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class BarcodeProductResponse(BarcodeProductCreate):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
