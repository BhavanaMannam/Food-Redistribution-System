from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String)  # "business" or "ngo"
    org_type = Column(String, nullable=True)
    location_lat = Column(Float, default=0.0)
    location_lng = Column(Float, default=0.0)
    address = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    is_public = Column(Boolean, default=True)  # business privacy toggle
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    inventory_items = relationship("InventoryItem", back_populates="tenant", cascade="all, delete-orphan")
    listings = relationship("SurplusListing", back_populates="tenant", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="ngo", cascade="all, delete-orphan")
    sales_history = relationship("SalesHistory", back_populates="tenant", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, nullable=True)
    password_hash = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    role = Column(String)  # "admin", "staff"

    tenant = relationship("Tenant", back_populates="users")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, index=True)
    category = Column(String)  # "Dairy", "Produce", "Bakery", "Meat", "Pantry"
    quantity = Column(Float)
    unit = Column(String)  # "kg", "units", "liters", "boxes"
    purchase_price = Column(Float)  # Unit cost
    purchase_date = Column(Date, default=datetime.date.today)
    expiry_date = Column(Date)
    status = Column(String, default="active")  # "active", "listed", "donated", "wasted"
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

    tenant = relationship("Tenant", back_populates="inventory_items")
    listings = relationship("SurplusListing", back_populates="inventory_item", cascade="all, delete-orphan")

class SurplusListing(Base):
    __tablename__ = "surplus_listings"

    id = Column(Integer, primary_key=True, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)
    product_name = Column(String)
    category = Column(String)
    quantity = Column(Float)
    unit = Column(String)
    expiry_date = Column(Date)
    pickup_window_start = Column(DateTime)
    pickup_window_end = Column(DateTime)
    notes = Column(String, nullable=True)
    status = Column(String, default="available")  # "available", "reserved", "completed"
    tenant_id = Column(Integer, ForeignKey("tenants.id"))  # Business donor

    tenant = relationship("Tenant", back_populates="listings")
    inventory_item = relationship("InventoryItem", back_populates="listings")
    booking = relationship("Booking", uselist=False, back_populates="listing", cascade="all, delete-orphan")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("surplus_listings.id"), unique=True)
    ngo_id = Column(Integer, ForeignKey("tenants.id"))  # NGO recipient
    pickup_time = Column(DateTime)
    status = Column(String, default="pending")  # "pending", "confirmed", "completed", "cancelled"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    listing = relationship("SurplusListing", back_populates="booking")
    ngo = relationship("Tenant", back_populates="bookings")

class SalesHistory(Base):
    __tablename__ = "sales_history"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    product_name = Column(String, index=True)
    category = Column(String)
    date = Column(Date)
    quantity_sold = Column(Float)
    quantity_wasted = Column(Float)

    tenant = relationship("Tenant", back_populates="sales_history")


# ---------------------------------------------------------------------------
# Barcode Product Catalogue — standalone table, no FK to other tables
# ---------------------------------------------------------------------------
class BarcodeProduct(Base):
    __tablename__ = "barcode_products"

    id             = Column(Integer, primary_key=True, index=True)
    barcode        = Column(String, unique=True, index=True, nullable=False)
    product_name   = Column(String, nullable=False)
    brand          = Column(String, nullable=True)
    category       = Column(String, nullable=True)
    quantity       = Column(Float, nullable=True)
    unit           = Column(String, nullable=True)
    manufacturing_date = Column(Date, nullable=True)
    expiry_date    = Column(Date, nullable=True)
    description    = Column(Text, nullable=True)
    image_url      = Column(String, nullable=True)
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
