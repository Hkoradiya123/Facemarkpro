import os

try:
    from flask_caching import Cache
except ImportError:  # pragma: no cover - keeps app running until dependency is installed
    class Cache:  # type: ignore
        def __init__(self, *args, **kwargs):
            self._store = {}

        def init_app(self, app):
            return self

        def get(self, key):
            return self._store.get(key)

        def set(self, key, value, timeout=None):
            self._store[key] = value
            return True

        def delete(self, key):
            self._store.pop(key, None)
            return True


cache = Cache()


def init_cache(app):
    cache_type = os.environ.get("CACHE_TYPE", "SimpleCache")
    cache_config = {
        "CACHE_TYPE": cache_type,
        "CACHE_DEFAULT_TIMEOUT": int(os.environ.get("CACHE_DEFAULT_TIMEOUT", "60")),
    }

    redis_url = os.environ.get("CACHE_REDIS_URL")
    if redis_url:
        cache_config.update({
            "CACHE_TYPE": "RedisCache",
            "CACHE_REDIS_URL": redis_url,
            "CACHE_KEY_PREFIX": os.environ.get("CACHE_KEY_PREFIX", "facemarkpro:"),
        })

    app.config.from_mapping(cache_config)
    cache.init_app(app)
    return cache