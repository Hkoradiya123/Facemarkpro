import io
import os
import pickle

import cloudinary
import cloudinary.api
import cloudinary.uploader


HOST = os.environ.get("LOCAL_CLOUDINARY_PUBLIC_BASE_URL", "http://127.0.0.1:5055")
CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "local")
API_KEY = os.environ.get("CLOUDINARY_API_KEY", "local_key")
API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "local_secret")


def main():
    cloudinary.config(
        cloud_name=CLOUD_NAME,
        api_key=API_KEY,
        api_secret=API_SECRET,
        upload_prefix=HOST,
        secure=True,
    )

    payload = {"encodings": [[0.1, 0.2, 0.3]], "metadata": [{"roll_no": "1", "name": "Local Test"}]}
    buffer = io.BytesIO(pickle.dumps(payload))

    upload = cloudinary.uploader.upload(
        buffer,
        public_id="CE_3",
        folder="facemarkpro/encodings",
        resource_type="raw",
        overwrite=True,
    )
    print("upload public_id:", upload["public_id"])
    print("upload secure_url:", upload["secure_url"])

    resources = cloudinary.api.resources(
        type="upload",
        resource_type="raw",
        prefix="facemarkpro/encodings/",
    )
    print("resources:", [item["public_id"] for item in resources["resources"]])

    resource = cloudinary.api.resource("facemarkpro/encodings/CE_3", resource_type="raw")
    print("resource bytes:", resource["bytes"])


if __name__ == "__main__":
    main()
