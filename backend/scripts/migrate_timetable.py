import pandas as pd
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("MONGODB_DB", "attendance_db")

def migrate():
    if not MONGO_URI:
        print("Error: MONGO_URI not found in environment variables")
        return

    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db["timetable"]
        
        # Read CSV
        csv_path = 'timetable.csv'
        if not os.path.exists(csv_path):
            print(f"Error: {csv_path} not found")
            return
            
        print(f"Reading {csv_path}...")
        df = pd.read_csv(csv_path)
        
        # Convert to list of dictionaries
        records = df.to_dict(orient='records')
        
        if not records:
            print("No records found in CSV")
            return

        # Clear existing collection
        print(f"Dropping existing timetable collection in {DB_NAME}...")
        collection.drop()
        
        # Insert new records
        print(f"Inserting {len(records)} records from CSV to MongoDB...")
        collection.insert_many(records)
        
        print("Migration completed successfully!")
        
        # Verify
        count = collection.count_documents({})
        print(f"Total documents in timetable collection: {count}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    migrate()
