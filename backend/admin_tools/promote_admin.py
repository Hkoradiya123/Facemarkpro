import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ.get('MONGO_URI')
DB_NAME = os.environ.get('MONGODB_DB', 'attendance_db')

if not MONGO_URI:
    print("MONGO_URI not found")
    exit(1)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
faculty_col = db['faculty']

email = "rahul@facemarkpro.com"

user = faculty_col.find_one({"email": email})
if user:
    faculty_col.update_one({"email": email}, {"$set": {"role": "super_admin"}})
    print(f"SUCCESS: User {email} has been promoted to 'super_admin'.")
else:
    print(f"ERROR: User {email} not found.")
