import datetime
import random
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import Tenant, User, InventoryItem, SalesHistory, SurplusListing, Booking

def seed_db():
    # Recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    print("Seeding database...")

    # 1. Tenants
    tenants = [
        Tenant(
            name="FreshMart Supermarket",
            type="business",
            location_lat=37.7749,
            location_lng=-122.4194,
            address="100 Market St, San Francisco, CA",
            contact_email="manager@freshmart.com",
            contact_phone="555-0192"
        ),
        Tenant(
            name="BakeHouse Café",
            type="business",
            location_lat=37.7833,
            location_lng=-122.4167,
            address="456 Bakery Ln, San Francisco, CA",
            contact_email="hello@bakehousecafe.com",
            contact_phone="555-0183"
        ),
        Tenant(
            name="FoodForAll Kitchen",
            type="ngo",
            location_lat=37.7699,
            location_lng=-122.4468,
            address="789 Community Rd, San Francisco, CA",
            contact_email="coordinator@foodforall.org",
            contact_phone="555-0144"
        ),
        Tenant(
            name="Hope Food Bank",
            type="ngo",
            location_lat=37.7550,
            location_lng=-122.4350,
            address="12 Shelter Ave, San Francisco, CA",
            contact_email="donations@hopefoodbank.org",
            contact_phone="555-0155"
        )
    ]
    for t in tenants:
        db.add(t)
    db.commit()

    # Get IDs
    fm_id = tenants[0].id
    bh_id = tenants[1].id
    ffa_id = tenants[2].id
    hfb_id = tenants[3].id

    # 2. Users
    users = [
        User(username="freshmart", password="password", tenant_id=fm_id, role="admin"),
        User(username="bakehouse", password="password", tenant_id=bh_id, role="admin"),
        User(username="foodforall", password="password", tenant_id=ffa_id, role="admin"),
        User(username="hopebank", password="password", tenant_id=hfb_id, role="admin")
    ]
    for u in users:
        db.add(u)
    db.commit()

    # 3. Inventory Items
    today = datetime.date.today()
    
    # FreshMart Inventory
    fm_items = [
        InventoryItem(
            product_name="Whole Milk 1 Gallon",
            category="Dairy",
            quantity=45.0,
            unit="units",
            purchase_price=3.50,
            purchase_date=today - datetime.timedelta(days=2),
            expiry_date=today + datetime.timedelta(days=2),
            status="active",
            tenant_id=fm_id
        ),
        InventoryItem(
            product_name="Organic Bananas",
            category="Produce",
            quantity=120.0,
            unit="kg",
            purchase_price=1.20,
            purchase_date=today - datetime.timedelta(days=1),
            expiry_date=today + datetime.timedelta(days=3),
            status="active",
            tenant_id=fm_id
        ),
        InventoryItem(
            product_name="Greek Yogurt 500g",
            category="Dairy",
            quantity=60.0,
            unit="units",
            purchase_price=2.00,
            purchase_date=today - datetime.timedelta(days=4),
            expiry_date=today + datetime.timedelta(days=8),
            status="active",
            tenant_id=fm_id
        ),
        InventoryItem(
            product_name="Fresh Chicken Breasts",
            category="Meat",
            quantity=25.0,
            unit="kg",
            purchase_price=8.99,
            purchase_date=today - datetime.timedelta(days=2),
            expiry_date=today + datetime.timedelta(days=4),
            status="active",
            tenant_id=fm_id
        ),
        InventoryItem(
            product_name="Canned Tomato Soup",
            category="Pantry",
            quantity=300.0,
            unit="units",
            purchase_price=0.80,
            purchase_date=today - datetime.timedelta(days=30),
            expiry_date=today + datetime.timedelta(days=180),
            status="active",
            tenant_id=fm_id
        ),
        InventoryItem(
            product_name="Salmon Fillet",
            category="Meat",
            quantity=15.0,
            unit="kg",
            purchase_price=14.50,
            purchase_date=today - datetime.timedelta(days=4),
            expiry_date=today + datetime.timedelta(days=1),
            status="active",
            tenant_id=fm_id
        ),
        InventoryItem(
            product_name="Spinach Pre-packed",
            category="Produce",
            quantity=40.0,
            unit="units",
            purchase_price=1.99,
            purchase_date=today - datetime.timedelta(days=3),
            expiry_date=today + datetime.timedelta(days=2),
            status="active",
            tenant_id=fm_id
        ),
    ]

    # BakeHouse Cafe Inventory
    bh_items = [
        InventoryItem(
            product_name="Sourdough Bread Loaf",
            category="Bakery",
            quantity=35.0,
            unit="units",
            purchase_price=2.50,
            purchase_date=today - datetime.timedelta(days=1),
            expiry_date=today + datetime.timedelta(days=1),
            status="active",
            tenant_id=bh_id
        ),
        InventoryItem(
            product_name="Apple Pie 9-inch",
            category="Bakery",
            quantity=10.0,
            unit="units",
            purchase_price=5.00,
            purchase_date=today - datetime.timedelta(days=1),
            expiry_date=today + datetime.timedelta(days=3),
            status="active",
            tenant_id=bh_id
        ),
        InventoryItem(
            product_name="Chocolate Cookies Box",
            category="Bakery",
            quantity=30.0,
            unit="units",
            purchase_price=3.00,
            purchase_date=today - datetime.timedelta(days=2),
            expiry_date=today + datetime.timedelta(days=6),
            status="active",
            tenant_id=bh_id
        )
    ]

    for item in fm_items + bh_items:
        db.add(item)
    db.commit()

    # 4. Generate 90 Days of Sales/Waste History for Forecasting
    # We will generate day-by-day sales data.
    # We want a weekly cyclical pattern (weekends sell more, Mondays sell less) and minor noise.
    start_date = today - datetime.timedelta(days=90)
    
    # Products to generate history for
    products = [
        {"name": "Whole Milk 1 Gallon", "cat": "Dairy", "tenant": fm_id, "base_sales": 25, "weekend_boost": 10, "waste_chance": 0.05, "waste_qty": 3},
        {"name": "Organic Bananas", "cat": "Produce", "tenant": fm_id, "base_sales": 70, "weekend_boost": 20, "waste_chance": 0.08, "waste_qty": 8},
        {"name": "Greek Yogurt 500g", "cat": "Dairy", "tenant": fm_id, "base_sales": 15, "weekend_boost": 5, "waste_chance": 0.03, "waste_qty": 2},
        {"name": "Fresh Chicken Breasts", "cat": "Meat", "tenant": fm_id, "base_sales": 12, "weekend_boost": 8, "waste_chance": 0.04, "waste_qty": 2},
        {"name": "Canned Tomato Soup", "cat": "Pantry", "tenant": fm_id, "base_sales": 8, "weekend_boost": 1, "waste_chance": 0.005, "waste_qty": 1},
        {"name": "Salmon Fillet", "cat": "Meat", "tenant": fm_id, "base_sales": 8, "weekend_boost": 6, "waste_chance": 0.10, "waste_qty": 3},
        {"name": "Spinach Pre-packed", "cat": "Produce", "tenant": fm_id, "base_sales": 22, "weekend_boost": 5, "waste_chance": 0.07, "waste_qty": 4},
        
        {"name": "Sourdough Bread Loaf", "cat": "Bakery", "tenant": bh_id, "base_sales": 28, "weekend_boost": 15, "waste_chance": 0.12, "waste_qty": 5},
        {"name": "Apple Pie 9-inch", "cat": "Bakery", "tenant": bh_id, "base_sales": 8, "weekend_boost": 7, "waste_chance": 0.08, "waste_qty": 2},
        {"name": "Chocolate Cookies Box", "cat": "Bakery", "tenant": bh_id, "base_sales": 12, "weekend_boost": 4, "waste_chance": 0.04, "waste_qty": 2}
    ]

    history_records = []
    
    # We do a batch insert of sales history for speed
    for p in products:
        # Simple upward or stable trend
        trend_factor = 0.02 * (random.random() - 0.2)  # subtle trend
        for d in range(90):
            current_date = start_date + datetime.timedelta(days=d)
            day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday
            
            # Base sales plus weekly cycle
            sales = p["base_sales"] + (d * trend_factor)
            
            # Boost for Friday (4), Saturday (5), Sunday (6)
            if day_of_week in [4, 5, 6]:
                sales += p["weekend_boost"]
                
            # Add random noise
            sales += random.uniform(-p["base_sales"]*0.15, p["base_sales"]*0.15)
            sales = max(0.0, round(sales, 1))

            # Simulate waste
            wasted = 0.0
            if random.random() < p["waste_chance"]:
                wasted = round(random.uniform(1.0, p["waste_qty"]), 1)

            history_records.append(
                SalesHistory(
                    tenant_id=p["tenant"],
                    product_name=p["name"],
                    category=p["cat"],
                    date=current_date,
                    quantity_sold=sales,
                    quantity_wasted=wasted
                )
            )

    db.bulk_save_objects(history_records)
    db.commit()

    # 5. Create some existing listings and bookings for demonstration
    # FreshMart lists some Milk that was close to expiry yesterday, which FoodForAll booked
    expired_milk_item = InventoryItem(
        product_name="Whole Milk 1 Gallon (Donated)",
        category="Dairy",
        quantity=15.0,
        unit="units",
        purchase_price=3.50,
        purchase_date=today - datetime.timedelta(days=7),
        expiry_date=today - datetime.timedelta(days=1),
        status="donated",
        tenant_id=fm_id
    )
    db.add(expired_milk_item)
    db.commit()

    past_listing = SurplusListing(
        inventory_item_id=expired_milk_item.id,
        product_name=expired_milk_item.product_name,
        category=expired_milk_item.category,
        quantity=15.0,
        unit=expired_milk_item.unit,
        expiry_date=expired_milk_item.expiry_date,
        pickup_window_start=datetime.datetime.combine(today - datetime.timedelta(days=1), datetime.time(9, 0)),
        pickup_window_end=datetime.datetime.combine(today - datetime.timedelta(days=1), datetime.time(12, 0)),
        notes="Slightly short shelf life but perfectly cold stored.",
        status="completed",
        tenant_id=fm_id
    )
    db.add(past_listing)
    db.commit()

    past_booking = Booking(
        listing_id=past_listing.id,
        ngo_id=ffa_id,
        pickup_time=datetime.datetime.combine(today - datetime.timedelta(days=1), datetime.time(10, 30)),
        status="completed",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
    )
    db.add(past_booking)
    
    # Active listing from Bakehouse Cafe
    pastries_item = InventoryItem(
        product_name="Mixed Morning Pastries",
        category="Bakery",
        quantity=20.0,
        unit="units",
        purchase_price=1.50,
        purchase_date=today - datetime.timedelta(days=1),
        expiry_date=today + datetime.timedelta(days=1),
        status="listed",
        tenant_id=bh_id
    )
    db.add(pastries_item)
    db.commit()

    active_listing = SurplusListing(
        inventory_item_id=pastries_item.id,
        product_name=pastries_item.product_name,
        category=pastries_item.category,
        quantity=20.0,
        unit=pastries_item.unit,
        expiry_date=pastries_item.expiry_date,
        pickup_window_start=datetime.datetime.combine(today, datetime.time(16, 0)),
        pickup_window_end=datetime.datetime.combine(today, datetime.time(20, 0)),
        notes="Freshly baked yesterday. High quality selection.",
        status="available",
        tenant_id=bh_id
    )
    db.add(active_listing)
    db.commit()

    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed_db()
