import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure database is seeded if it doesn't exist
    if not os.path.exists("food_redistribution.db"):
        print("Database not found. Initializing and seeding...")
        try:
            from app.seed import seed_db
            seed_db()
        except Exception as e:
            print(f"Error seeding database: {e}")
            sys.exit(1)
            
    print("Starting FastAPI Uvicorn server...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
