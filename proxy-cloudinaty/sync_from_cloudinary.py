import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import cloudinary
import cloudinary.api
import requests
from dotenv import load_dotenv


APP_ROOT = Path(__file__).resolve().parent
DEFAULT_ENV_FILE = APP_ROOT.parent / "backend" / ".env"
DEFAULT_STORAGE = APP_ROOT / "storage"
DEFAULT_PUBLIC_BASE_URL = "http://127.0.0.1:5055"
DEFAULT_PREFIXES = (
    ("raw", "facemarkpro/encodings/"),
    ("image", "facemarkpro/faculty_photos/"),
)


def _load_metadata(cloud_dir):
    path = cloud_dir / "metadata.json"
    if not path.exists():
        return {"resources": {}}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_metadata(cloud_dir, metadata):
    cloud_dir.mkdir(parents=True, exist_ok=True)
    path = cloud_dir / "metadata.json"
    tmp_path = path.with_suffix(".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2, sort_keys=True)
    tmp_path.replace(path)


def _asset_key(resource_type, upload_type, public_id):
    return f"{resource_type}/{upload_type}/{public_id}"


def _resource_url(base_url, cloud_name, resource_type, version, public_id):
    return f"{base_url.rstrip('/')}/{cloud_name}/{resource_type}/upload/v{version}/{public_id}"


def _download(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content, response.headers.get("content-type", "application/octet-stream")


def _list_resources(resource_type, prefix, max_results):
    resources = []
    next_cursor = None

    while True:
        kwargs = {
            "resource_type": resource_type,
            "type": "upload",
            "max_results": max_results,
        }
        if prefix:
            kwargs["prefix"] = prefix
        if next_cursor:
            kwargs["next_cursor"] = next_cursor

        page = cloudinary.api.resources(**kwargs)
        resources.extend(page.get("resources", []))
        next_cursor = page.get("next_cursor")
        if not next_cursor:
            return resources


def sync_scope(cloud_name, storage_root, public_base_url, resource_type, prefix, max_results):
    cloud_dir = storage_root / cloud_name
    asset_dir = cloud_dir / "assets"
    asset_dir.mkdir(parents=True, exist_ok=True)

    metadata = _load_metadata(cloud_dir)
    resources = _list_resources(resource_type, prefix, max_results)
    synced = 0

    for remote in resources:
        public_id = remote.get("public_id")
        upload_type = remote.get("type", "upload")
        if not public_id:
            continue

        source_url = remote.get("secure_url") or remote.get("url")
        if not source_url:
            continue

        content, content_type = _download(source_url)
        asset_id = remote.get("asset_id") or hashlib.sha256(
            f"{resource_type}/{upload_type}/{public_id}".encode("utf-8")
        ).hexdigest()[:32]
        asset_path = asset_dir / asset_id
        asset_path.write_bytes(content)

        version = int(remote.get("version") or time.time())
        local_url = _resource_url(public_base_url, cloud_name, resource_type, version, public_id)
        resource = {
            "asset_id": asset_id,
            "public_id": public_id,
            "version": version,
            "version_id": remote.get("version_id") or hashlib.sha1(f"{asset_id}:{version}".encode("utf-8")).hexdigest(),
            "signature": remote.get("signature") or "",
            "resource_type": resource_type,
            "created_at": remote.get("created_at") or "",
            "type": upload_type,
            "bytes": len(content),
            "etag": remote.get("etag") or hashlib.sha1(content).hexdigest(),
            "url": local_url,
            "secure_url": local_url,
            "folder": remote.get("folder") or str(Path(public_id).parent).replace("\\", "/"),
            "format": remote.get("format"),
            "original_filename": remote.get("original_filename") or Path(public_id).name,
            "content_type": content_type,
            "storage_path": str(asset_path),
        }
        if "width" in remote:
            resource["width"] = remote["width"]
        if "height" in remote:
            resource["height"] = remote["height"]

        metadata["resources"][_asset_key(resource_type, upload_type, public_id)] = resource
        synced += 1

    _save_metadata(cloud_dir, metadata)
    return synced


def main():
    parser = argparse.ArgumentParser(description="Sync real Cloudinary assets into the local proxy storage.")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE))
    parser.add_argument("--storage", default=str(DEFAULT_STORAGE))
    parser.add_argument("--public-base-url", default=os.environ.get("LOCAL_CLOUDINARY_PUBLIC_BASE_URL", DEFAULT_PUBLIC_BASE_URL))
    parser.add_argument("--resource-type", choices=["image", "raw", "video"], action="append")
    parser.add_argument("--prefix", action="append")
    parser.add_argument("--all", action="store_true", help="Sync all upload resources for the selected resource type(s).")
    parser.add_argument("--max-results", type=int, default=500)
    args = parser.parse_args()

    load_dotenv(args.env_file)
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    if not all([cloud_name, api_key, api_secret]):
        raise SystemExit("Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET")

    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)
    storage_root = Path(args.storage).resolve()

    if args.prefix:
        resource_types = args.resource_type or ["raw"]
        scopes = [(resource_type, prefix) for resource_type in resource_types for prefix in args.prefix]
    elif args.all:
        resource_types = args.resource_type or ["raw", "image"]
        scopes = [(resource_type, "") for resource_type in resource_types]
    else:
        scopes = list(DEFAULT_PREFIXES)

    total = 0
    for resource_type, prefix in scopes:
        count = sync_scope(
            cloud_name=cloud_name,
            storage_root=storage_root,
            public_base_url=args.public_base_url,
            resource_type=resource_type,
            prefix=prefix,
            max_results=args.max_results,
        )
        total += count
        print(f"synced {count} {resource_type} resource(s) prefix={prefix or '*'}")

    print(f"done: {total} resource(s) stored in {storage_root}")


if __name__ == "__main__":
    main()
