# Cloudinary-Compatible Local Mock

Local Cloudinary-compatible server for development and tests. It implements the Cloudinary endpoints used by this project with matching URL paths, signed upload auth, Admin API basic auth, and Cloudinary-shaped JSON responses.

## Run

```powershell
cd proxy-cloudinaty
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python server.py
```

Default server: `http://127.0.0.1:5055`

## Point The Existing Backend At It

Do not change backend code. Keep your existing Cloudinary credentials and add this one host override before starting the backend:

```env
CLOUDINARY_UPLOAD_PREFIX=http://127.0.0.1:5055
```

The official Python SDK supports `upload_prefix`; it is loaded from `CLOUDINARY_UPLOAD_PREFIX`. The backend later calls `cloudinary.config(...)` with credentials, and the SDK keeps the existing upload prefix.

The proxy server loads `../backend/.env` by default so its local auth matches your current backend credentials. To use another env file:

```powershell
$env:LOCAL_CLOUDINARY_ENV_FILE="D:\path\to\.env"
python server.py
```

## Sync Real Cloudinary Data Into The Proxy

This downloads the real Cloudinary assets used by this app and stores them under `proxy-cloudinaty/storage`:

```powershell
cd proxy-cloudinaty
python sync_from_cloudinary.py
```

By default it syncs:

```text
raw:   facemarkpro/encodings/
image: facemarkpro/faculty_photos/
```

Use `--prefix`, `--resource-type`, or `--all` for different scopes.

## Implemented Endpoints

```text
POST /v1_1/<cloud_name>/<resource_type>/upload
GET  /v1_1/<cloud_name>/resources/<resource_type>/upload
GET  /v1_1/<cloud_name>/resources/<resource_type>/upload/<public_id>
GET  /<cloud_name>/<resource_type>/upload/v<version>/<public_id>
GET  /<cloud_name>/<resource_type>/upload/<public_id>
GET  /health
```

The server stores assets in `proxy-cloudinaty/storage` by default.

## Smoke Test

With the server running:

```powershell
python smoke_test.py
```

This uses the official `cloudinary` Python SDK against the local API host.

## Notes

This mock targets the Cloudinary API surface this repo uses: raw pickle uploads/downloads, image profile uploads, resource lookup, and resource listing by prefix. It deliberately returns Cloudinary-compatible response shapes for these calls, but it is not a complete implementation of every Cloudinary transformation, delivery, moderation, or asset-management feature.
