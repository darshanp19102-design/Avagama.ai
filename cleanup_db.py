import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.core.config import settings

async def clear_db():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    
    print("Clearing collections...")
    res1 = await db['evaluations'].delete_many({})
    print(f"Deleted {res1.deleted_count} evaluations.")
    
    res2 = await db['company_use_cases'].delete_many({})
    print(f"Deleted {res2.deleted_count} company use cases.")
    
    res3 = await db['domain_use_cases'].delete_many({})
    print(f"Deleted {res3.deleted_count} domain use cases.")
    
    print("Database cleanup complete. Left users table intact.")

if __name__ == "__main__":
    asyncio.run(clear_db())
