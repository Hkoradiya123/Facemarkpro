"""
Copy all collections from the configured remote MongoDB database to a local MongoDB database.

Usage:
    python backend/admin_tools/sync_mongo_remote_to_local.py --local-uri mongodb://127.0.0.1:27017/attendance_db

By default the remote URI and DB name are loaded from backend/.env:
    MONGO_URI
    MONGODB_DB
"""

import argparse
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from pymongo import MongoClient, ReplaceOne


SCRIPT_PATH = Path(__file__).resolve()
BACKEND_DIR = SCRIPT_PATH.parents[1]
DEFAULT_ENV_FILE = BACKEND_DIR / ".env"
DEFAULT_BATCH_SIZE = 1000


def _db_name_from_uri(uri):
    parsed = urlparse(uri)
    name = parsed.path.lstrip("/").split("/", 1)[0]
    return name or None


def _redact_uri(uri):
    parsed = urlparse(uri)
    if not parsed.username:
        return uri

    host = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    path = parsed.path or ""
    query = f"?{parsed.query}" if parsed.query else ""
    return f"{parsed.scheme}://{parsed.username}:***@{host}{port}{path}{query}"


def _copy_indexes(source_collection, target_collection):
    for index in source_collection.list_indexes():
        index = dict(index)
        if index.get("name") == "_id_":
            continue

        keys = list(index.pop("key").items())
        index.pop("v", None)
        index.pop("ns", None)
        target_collection.create_index(keys, **index)


def _copy_collection(source_collection, target_collection, batch_size, drop_target):
    if drop_target:
        target_collection.drop()

    copied = 0
    batch = []

    for document in source_collection.find({}, no_cursor_timeout=True):
        batch.append(ReplaceOne({"_id": document["_id"]}, document, upsert=True))
        if len(batch) >= batch_size:
            result = target_collection.bulk_write(batch, ordered=False)
            copied += result.upserted_count + result.modified_count + result.matched_count
            batch = []

    if batch:
        result = target_collection.bulk_write(batch, ordered=False)
        copied += result.upserted_count + result.modified_count + result.matched_count

    _copy_indexes(source_collection, target_collection)
    return copied


def main():
    parser = argparse.ArgumentParser(description="Sync remote MongoDB data into a local MongoDB database.")
    parser.add_argument("--local-uri", required=True, help="Local MongoDB URI, for example mongodb://127.0.0.1:27017/attendance_db")
    parser.add_argument("--local-db", help="Local database name. Defaults to DB in --local-uri or MONGODB_DB.")
    parser.add_argument("--remote-uri", help="Remote MongoDB URI. Defaults to MONGO_URI from env file.")
    parser.add_argument("--remote-db", help="Remote database name. Defaults to MONGODB_DB or DB in remote URI.")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE), help="Env file containing MONGO_URI and MONGODB_DB.")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--collections", nargs="*", help="Optional collection names to sync. Defaults to all collections.")
    parser.add_argument("--no-drop", action="store_true", help="Do not drop local collections before copying; upsert instead.")
    args = parser.parse_args()

    load_dotenv(args.env_file)

    remote_uri = args.remote_uri or os.environ.get("MONGO_URI")
    if not remote_uri:
        raise SystemExit("Missing remote Mongo URI. Set MONGO_URI in backend/.env or pass --remote-uri.")

    remote_db_name = args.remote_db or os.environ.get("MONGODB_DB") or _db_name_from_uri(remote_uri)
    local_db_name = args.local_db or _db_name_from_uri(args.local_uri) or remote_db_name

    if not remote_db_name:
        raise SystemExit("Missing remote DB name. Set MONGODB_DB or pass --remote-db.")
    if not local_db_name:
        raise SystemExit("Missing local DB name. Include it in --local-uri or pass --local-db.")

    if remote_uri == args.local_uri and remote_db_name == local_db_name:
        raise SystemExit("Remote and local targets are identical; refusing to copy onto itself.")

    drop_target = not args.no_drop

    print(f"remote: {_redact_uri(remote_uri)} db={remote_db_name}")
    print(f"local:  {_redact_uri(args.local_uri)} db={local_db_name}")
    print(f"mode:   {'drop local collections first' if drop_target else 'upsert without dropping'}")

    remote_client = MongoClient(remote_uri)
    local_client = MongoClient(args.local_uri)

    try:
        remote_client.admin.command("ping")
        local_client.admin.command("ping")

        remote_db = remote_client[remote_db_name]
        local_db = local_client[local_db_name]
        collections = args.collections or remote_db.list_collection_names()

        total = 0
        for name in sorted(collections):
            if name.startswith("system."):
                continue

            source = remote_db[name]
            target = local_db[name]
            copied = _copy_collection(source, target, args.batch_size, drop_target)
            total += copied
            print(f"{name}: copied {copied} document(s)")

        print(f"done: copied {total} document(s) into {local_db_name}")
    finally:
        remote_client.close()
        local_client.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("cancelled")
