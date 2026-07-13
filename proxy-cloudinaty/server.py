import base64
import hashlib
import hmac
import json
import mimetypes
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote

from flask import Flask, Response, jsonify, request, send_file
from dotenv import load_dotenv


APP_ROOT = Path(__file__).resolve().parent
DEFAULT_ENV_FILE = APP_ROOT.parent / "backend" / ".env"
load_dotenv(os.environ.get("LOCAL_CLOUDINARY_ENV_FILE", DEFAULT_ENV_FILE))

STORAGE_ROOT = Path(os.environ.get("LOCAL_CLOUDINARY_STORAGE", APP_ROOT / "storage")).resolve()
DEFAULT_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "local")
DEFAULT_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "local_key")
DEFAULT_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "local_secret")
DEFAULT_HOST = os.environ.get("LOCAL_CLOUDINARY_HOST", "127.0.0.1")
DEFAULT_PORT = int(os.environ.get("LOCAL_CLOUDINARY_PORT", "5055"))
PUBLIC_BASE_URL = os.environ.get("LOCAL_CLOUDINARY_PUBLIC_BASE_URL", f"http://{DEFAULT_HOST}:{DEFAULT_PORT}")
TIMESTAMP_SKEW_SECONDS = int(os.environ.get("LOCAL_CLOUDINARY_TIMESTAMP_SKEW", "3600"))

app = Flask(__name__)


def _now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _error(message, status):
    return jsonify({"error": {"message": message}}), status


def _cloud_dir(cloud_name):
    path = STORAGE_ROOT / cloud_name
    path.mkdir(parents=True, exist_ok=True)
    return path


def _asset_path(cloud_name, asset_id):
    return _cloud_dir(cloud_name) / "assets" / asset_id


def _meta_path(cloud_name):
    return _cloud_dir(cloud_name) / "metadata.json"


def _load_metadata(cloud_name):
    path = _meta_path(cloud_name)
    if not path.exists():
        return {"resources": {}}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_metadata(cloud_name, metadata):
    path = _meta_path(cloud_name)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2, sort_keys=True)
    tmp_path.replace(path)


def _asset_key(resource_type, upload_type, public_id):
    return f"{resource_type}/{upload_type}/{public_id}"


def _public_id_from_request(folder, public_id, filename):
    base = (public_id or "").strip()
    if not base:
        original = Path(filename or "file").name
        stem = Path(original).stem or "file"
        base = stem
    folder = (folder or "").strip("/")
    return f"{folder}/{base}" if folder else base


def _content_type(filename, resource_type):
    if resource_type == "raw":
        return "application/octet-stream"
    guessed = mimetypes.guess_type(filename or "")[0]
    return guessed or "application/octet-stream"


def _format_from_name(filename, resource_type):
    suffix = Path(filename or "").suffix.lstrip(".")
    if suffix:
        return suffix.lower()
    return "raw" if resource_type == "raw" else None


def _resource_url(cloud_name, resource_type, version, public_id):
    encoded_public_id = "/".join(quote(part) for part in public_id.split("/"))
    return f"{PUBLIC_BASE_URL.rstrip('/')}/{cloud_name}/{resource_type}/upload/v{version}/{encoded_public_id}"


def _sha1_hex(data):
    return hashlib.sha1(data).hexdigest()


def _api_string_to_sign(params):
    parts = []
    for key, value in params.items():
        if key in {"file", "signature", "api_key", "resource_type", "cloud_name"}:
            continue
        if value in (None, "", False):
            continue
        if isinstance(value, list):
            value = ",".join(str(item) for item in value)
        elif isinstance(value, bool):
            value = str(value).lower()
        else:
            value = str(value)
        parts.append(f"{key}={value}")
    return "&".join(sorted(parts))


def _expected_signature(params, api_secret):
    return hashlib.sha1((_api_string_to_sign(params) + api_secret).encode("utf-8")).hexdigest()


def _validate_upload_auth():
    api_key = request.form.get("api_key")
    signature = request.form.get("signature")
    timestamp = request.form.get("timestamp")

    if api_key != DEFAULT_API_KEY:
        return _error("Invalid API key", 401)
    if not signature:
        return _error("Missing required parameter - signature", 400)
    if not timestamp:
        return _error("Missing required parameter - timestamp", 400)

    try:
        request_ts = int(timestamp)
    except ValueError:
        return _error("Invalid timestamp", 400)

    if TIMESTAMP_SKEW_SECONDS > 0 and abs(int(time.time()) - request_ts) > TIMESTAMP_SKEW_SECONDS:
        return _error("Stale request - timestamp is outside the allowed window", 401)

    params = {key: request.form.getlist(key) if len(request.form.getlist(key)) > 1 else request.form.get(key)
              for key in request.form.keys()}
    expected = _expected_signature(params, DEFAULT_API_SECRET)
    if not hmac.compare_digest(signature, expected):
        return _error(f"Invalid Signature {signature}. String to sign - '{_api_string_to_sign(params)}'.", 401)
    return None


def _parse_basic_auth():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Basic "):
        return None, None
    try:
        decoded = base64.b64decode(header.split(" ", 1)[1]).decode("utf-8")
    except Exception:
        return None, None
    if ":" not in decoded:
        return None, None
    return decoded.split(":", 1)


def _validate_admin_auth():
    key, secret = _parse_basic_auth()
    if key != DEFAULT_API_KEY or secret != DEFAULT_API_SECRET:
        return _error("Invalid credentials", 401)
    return None


def _cloudinary_signature_for_response(public_id, version):
    payload = f"public_id={public_id}&version={version}{DEFAULT_API_SECRET}".encode("utf-8")
    return hashlib.sha1(payload).hexdigest()


def _resource_response(resource):
    response = {
        "asset_id": resource["asset_id"],
        "public_id": resource["public_id"],
        "version": resource["version"],
        "version_id": resource["version_id"],
        "signature": resource["signature"],
        "resource_type": resource["resource_type"],
        "created_at": resource["created_at"],
        "type": resource["type"],
        "bytes": resource["bytes"],
        "etag": resource["etag"],
        "placeholder": False,
        "url": resource["url"],
        "secure_url": resource["secure_url"],
        "folder": resource.get("folder", ""),
        "original_filename": resource.get("original_filename", ""),
    }
    if resource.get("format"):
        response["format"] = resource["format"]
    if resource["resource_type"] == "image":
        response.setdefault("width", resource.get("width", 1))
        response.setdefault("height", resource.get("height", 1))
    return response


@app.get("/health")
def health():
    return jsonify({"status": "healthy", "service": "local-cloudinary"})


@app.post("/v1_1/<cloud_name>/<resource_type>/upload")
def upload(cloud_name, resource_type):
    if cloud_name != DEFAULT_CLOUD_NAME:
        return _error("Unknown cloud_name", 401)
    auth_error = _validate_upload_auth()
    if auth_error:
        return auth_error

    file_storage = request.files.get("file")
    if not file_storage:
        return _error("Missing required parameter - file", 400)

    data = file_storage.read()
    public_id = _public_id_from_request(
        request.form.get("folder"),
        request.form.get("public_id"),
        file_storage.filename,
    )
    upload_type = request.form.get("type") or "upload"
    asset_id = hashlib.sha256(f"{resource_type}/{upload_type}/{public_id}".encode("utf-8")).hexdigest()[:32]
    version = int(time.time())
    etag = _sha1_hex(data)
    created_at = _now_iso()
    fmt = _format_from_name(file_storage.filename or public_id, resource_type)

    asset_path = _asset_path(cloud_name, asset_id)
    asset_path.parent.mkdir(parents=True, exist_ok=True)
    asset_path.write_bytes(data)

    url = _resource_url(cloud_name, resource_type, version, public_id)
    resource = {
        "asset_id": asset_id,
        "public_id": public_id,
        "version": version,
        "version_id": hashlib.sha1(f"{asset_id}:{version}".encode("utf-8")).hexdigest(),
        "signature": _cloudinary_signature_for_response(public_id, version),
        "resource_type": resource_type,
        "created_at": created_at,
        "type": upload_type,
        "bytes": len(data),
        "etag": etag,
        "url": url,
        "secure_url": url,
        "folder": str(request.form.get("folder") or "").strip("/"),
        "format": fmt,
        "original_filename": Path(file_storage.filename or public_id).stem,
        "content_type": _content_type(file_storage.filename, resource_type),
        "storage_path": str(asset_path),
    }

    metadata = _load_metadata(cloud_name)
    metadata["resources"][_asset_key(resource_type, upload_type, public_id)] = resource
    _save_metadata(cloud_name, metadata)
    return jsonify(_resource_response(resource))


@app.get("/v1_1/<cloud_name>/resources/<resource_type>/upload")
def list_resources(cloud_name, resource_type):
    if cloud_name != DEFAULT_CLOUD_NAME:
        return _error("Unknown cloud_name", 401)
    auth_error = _validate_admin_auth()
    if auth_error:
        return auth_error

    prefix = request.args.get("prefix", "")
    max_results = int(request.args.get("max_results", "10") or "10")
    metadata = _load_metadata(cloud_name)
    resources = [
        resource for key, resource in metadata["resources"].items()
        if resource.get("resource_type") == resource_type
        and resource.get("type") == "upload"
        and resource.get("public_id", "").startswith(prefix)
    ]
    resources.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    selected = resources[:max_results]

    return jsonify({
        "resources": [_resource_response(item) for item in selected],
        "rate_limit_allowed": 500,
        "rate_limit_reset_at": int(time.time()) + 3600,
        "rate_limit_remaining": 499,
    })


@app.get("/v1_1/<cloud_name>/resources/<resource_type>/upload/<path:public_id>")
def get_resource(cloud_name, resource_type, public_id):
    if cloud_name != DEFAULT_CLOUD_NAME:
        return _error("Unknown cloud_name", 401)
    auth_error = _validate_admin_auth()
    if auth_error:
        return auth_error

    public_id = unquote(public_id)
    metadata = _load_metadata(cloud_name)
    resource = metadata["resources"].get(_asset_key(resource_type, "upload", public_id))
    if not resource:
        return _error("Resource not found", 404)
    return jsonify(_resource_response(resource))


def _send_public_asset(cloud_name, resource_type, public_id):
    public_id = unquote(public_id)
    metadata = _load_metadata(cloud_name)
    resource = metadata["resources"].get(_asset_key(resource_type, "upload", public_id))
    if not resource:
        return _error("Resource not found", 404)
    path = Path(resource["storage_path"])
    if not path.exists():
        return _error("Resource content not found", 404)
    return send_file(path, mimetype=resource.get("content_type") or "application/octet-stream")


@app.get("/<cloud_name>/<resource_type>/upload/v<int:version>/<path:public_id>")
def public_versioned_asset(cloud_name, resource_type, version, public_id):
    return _send_public_asset(cloud_name, resource_type, public_id)


@app.get("/<cloud_name>/<resource_type>/upload/<path:public_id>")
def public_asset(cloud_name, resource_type, public_id):
    return _send_public_asset(cloud_name, resource_type, public_id)


if __name__ == "__main__":
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    app.run(host=DEFAULT_HOST, port=DEFAULT_PORT, debug=os.environ.get("FLASK_DEBUG") == "1")
