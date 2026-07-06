import sys
import os
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal
from app.models import Tenant, User, InventoryItem

client = TestClient(app)

def test_integration_flow():
    print("=== STARTING API INTEGRATION TESTS ===")

    # 1. Test Login
    print("\n1. Testing Multi-Tenant Authentication...")
    login_payload = {
        "username": "freshmart",
        "password": "password"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200, f"Login failed: {response.text}"
    login_data = response.json()
    assert login_data["user"]["username"] == "freshmart"
    tenant_id = login_data["tenant"]["id"]
    print(f"   [OK] Authenticated tenant: {login_data['tenant']['name']} (ID: {tenant_id})")

    # 2. Test Fetching Inventory
    print("\n2. Testing Inventory CRUD...")
    response = client.get(f"/api/v1/inventory?tenant_id={tenant_id}")
    assert response.status_code == 200
    initial_count = len(response.json())
    print(f"   [OK] Retrieved {initial_count} inventory items")

    # 3. Add inventory item
    item_payload = {
        "product_name": "Test Avocado Pack",
        "category": "Produce",
        "quantity": 10.0,
        "unit": "units",
        "purchase_price": 4.50,
        "expiry_date": "2026-07-10",
        "status": "active"
    }
    response = client.post(f"/api/v1/inventory?tenant_id={tenant_id}", json=item_payload)
    assert response.status_code == 200, f"Failed to create inventory: {response.text}"
    new_item = response.json()
    new_item_id = new_item["id"]
    print(f"   [OK] Added new item: {new_item['product_name']} (ID: {new_item_id})")

    # Re-fetch inventory
    response = client.get(f"/api/v1/inventory?tenant_id={tenant_id}")
    assert len(response.json()) == initial_count + 1
    print("   [OK] Verified inventory count increased")

    # 4. Test POS API synchronization simulator
    print("\n3. Testing POS Integration API Sync...")
    pos_payload = [
        {"product_name": "POS Milk Pack", "category": "Dairy", "quantity": 15.0, "purchase_price": 3.00, "days_to_expiry": 5},
        {"product_name": "POS Apple Box", "category": "Produce", "quantity": 5.0, "purchase_price": 10.00, "days_to_expiry": 3}
    ]
    response = client.post(f"/api/v1/pos/sync?tenant_id={tenant_id}", json=pos_payload)
    assert response.status_code == 200, f"POS sync failed: {response.text}"
    print(f"   [OK] POS Synced: {response.json()['message']}")

    # 5. Test AI Waste Risk Engine
    print("\n4. Testing AI Waste Risk Predictions...")
    response = client.get(f"/api/v1/predict/risk?tenant_id={tenant_id}")
    assert response.status_code == 200, f"Predictions failed: {response.text}"
    risk_data = response.json()
    assert "predictions" in risk_data
    # Check if our newly added test items are listed
    predictions = risk_data["predictions"]
    assert len(predictions) > 0
    print(f"   [OK] Predicted risk metrics for {len(predictions)} stock entries")
    # Verify values exist
    first_pred = predictions[0]
    print(f"   [OK] Top Risk Item: {first_pred['product_name']} | Risk Score: {first_pred['waste_risk_score']}% ({first_pred['risk_level']} Risk)")

    # 6. Test Smart Reorders
    print("\n5. Testing AI Smart Reorder Suggestions...")
    response = client.get(f"/api/v1/predict/reorder?tenant_id={tenant_id}")
    assert response.status_code == 200
    reorder_data = response.json()
    assert "recommendations" in reorder_data
    print(f"   [OK] Generated reorder logs for {len(reorder_data['recommendations'])} items")

    # 7. Create Surplus Listing
    print("\n6. Testing Redistribution Marketplace & Matchings...")
    listing_payload = {
        "inventory_item_id": new_item_id,
        "product_name": "Test Avocado Pack",
        "category": "Produce",
        "quantity": 10.0,
        "unit": "units",
        "expiry_date": "2026-07-10",
        "pickup_window_start": "2026-07-06T10:00:00",
        "pickup_window_end": "2026-07-06T14:00:00",
        "notes": "Test listing notes",
        "status": "available"
    }
    response = client.post(f"/api/v1/marketplace/listings?tenant_id={tenant_id}", json=listing_payload)
    assert response.status_code == 200, f"Listing creation failed: {response.text}"
    listing = response.json()
    listing_id = listing["id"]
    print(f"   [OK] Published surplus listing (ID: {listing_id})")

    # 8. Test Proximity Matching Engine for the listing
    response = client.get(f"/api/v1/marketplace/listings/{listing_id}/matching-ngos")
    assert response.status_code == 200, f"Matching NGOs failed: {response.text}"
    matches = response.json()
    assert len(matches) > 0
    print(f"   [OK] Matching Engine paired {len(matches)} NGOs. Top Match: {matches[0]['name']} with score {matches[0]['match_score']}%")

    # 9. Test Sustainability Analytics
    print("\n7. Testing ESG Impact & CO2 Offset calculations...")
    response = client.get("/api/v1/analytics/impact")
    assert response.status_code == 200, f"Analytics impact failed: {response.text}"
    impact = response.json()
    assert "summary" in impact
    assert "weekly_trend" in impact
    assert "category_breakdown" in impact
    print(f"   [OK] Total Diverted: {impact['summary']['total_diverted_kg']} kg")
    print(f"   [OK] CO2 Equivalents Saved: {impact['summary']['co2_saved_kg']} kg")
    print(f"   [OK] Beneficiary Meals Served: {impact['summary']['meals_redistributed']}")
    print(f"   [OK] Estimated Financial Value Rescued: ${impact['summary']['total_value_saved_usd']}")

    # Clean up test item
    print("\n8. Cleaning up database...")
    response = client.delete(f"/api/v1/inventory/{new_item_id}?tenant_id={tenant_id}")
    assert response.status_code == 200
    print("   [OK] Test inventory record purged")

    print("\n=== ALL API INTEGRATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    try:
        test_integration_flow()
    except AssertionError as e:
        print(f"\nAssertion Error during testing: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error during testing: {e}")
        sys.exit(1)
