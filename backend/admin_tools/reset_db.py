import os
import shutil
import csv
from pymongo import MongoClient
import bcrypt
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# MongoDB setup
MONGO_URI = os.environ.get('MONGO_URI')
DB_NAME = os.environ.get('MONGODB_DB', 'attendance_db')

if not MONGO_URI:
    print("Error: MONGO_URI not found in .env")
    exit(1)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def clean_db():
    print("Cleaning MongoDB...")
    collections = ['faculty', 'students', 'attendance', 'users', 'timetable']
    
    for col_name in collections:
        if col_name in db.list_collection_names() or col_name in ['faculty', 'students', 'attendance', 'users', 'timetable']:
            # Check if collection exists implicitly or explicitly
            try:
                count = db[col_name].count_documents({})
                db[col_name].delete_many({})
                print(f"Deleted {count} documents from '{col_name}' collection.")
            except Exception as e:
                print(f"Error cleaning {col_name}: {e}")

def clean_encodings():
    print("Cleaning split_encodings...")
    split_dir = "split_encodings"
    if os.path.exists(split_dir):
        for filename in os.listdir(split_dir):
            file_path = os.path.join(split_dir, filename)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}: {e}")

def seed_db_and_csv():
    print("Seeding Rahul...")
    
    # 1. MongoDB
    users = db['faculty']
    email = "rahul@facemarkpro.com"
    raw_password = "rahul@123"
    hashed_password = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt())
    
    user_data = {
        "email": email,
        "password": hashed_password,
        "name": "Rahul",
        "role": "teacher",
        "department": "CSE",
        "created_at": "2024-01-01"
    }
    
    users.insert_one(user_data)
    print(f"User {email} created in MongoDB.")
    
    # 2. CSV
    csv_file = 'faculty_users.csv'
    header = ['faculty_name', 'faculty_email', 'password']
    row = ['Rahul', email, raw_password] # Keeping raw password in CSV as per existing pattern
    
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerow(row)
    print(f"User {email} added to {csv_file}.")

if __name__ == "__main__":
    clean_db()
    clean_encodings()
    seed_db_and_csv()
    print("Database reset complete.")
