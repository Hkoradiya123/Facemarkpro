import os
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

def add_faculty_users():
    users_to_add = [
        {"name": "Harsh", "email": "harsh@facemarkpro.com", "password": "123456", "role": "teacher", "department": "CSE"},
        {"name": "Umang", "email": "umang@facemarkpro.com", "password": "123456", "role": "teacher", "department": "CSE"},
        {"name": "Malhar", "email": "malhar@facemarkpro.com", "password": "123456", "role": "teacher", "department": "CSE"},
    ]
    
    # 1. MongoDB
    collection = db['faculty']
    
    for user in users_to_add:
        # Check if user already exists
        if collection.find_one({"email": user["email"]}):
            print(f"User {user['email']} already exists in MongoDB. Skipping...")
            continue

        raw_password = user["password"]
        hashed_password = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt())
        
        user_doc = {
            "email": user["email"],
            "password": hashed_password,
            "name": user["name"],
            "role": user["role"],
            "department": user["department"],
            "created_at": "2026-01-21"
        }
        
        collection.insert_one(user_doc)
        print(f"User {user['email']} added to MongoDB.")

    # 2. CSV
    csv_file = 'faculty_users.csv'
    
    # Read existing emails to avoid duplicates in CSV
    existing_emails = set()
    if os.path.exists(csv_file):
        with open(csv_file, 'r', newline='') as f:
            reader = csv.reader(f)
            try:
                header = next(reader)
                for row in reader:
                    if len(row) > 1:
                        existing_emails.add(row[1])
            except StopIteration:
                pass # Empty file

    with open(csv_file, 'a', newline='') as f:
        writer = csv.writer(f)
        # If file was empty or didn't exist, might need header, but assuming it exists with header based on previous reads.
        # But just in case:
        if os.stat(csv_file).st_size == 0:
             writer.writerow(['faculty_name', 'faculty_email', 'password'])

        for user in users_to_add:
            if user["email"] not in existing_emails:
                writer.writerow([user["name"], user["email"], user["password"]])
                print(f"User {user['email']} added to {csv_file}.")
                existing_emails.add(user["email"])
            else:
                 print(f"User {user['email']} already exists in CSV. Skipping...")

if __name__ == "__main__":
    add_faculty_users()
    print("Faculty addition complete.")
