"""
Django production settings for SorooshX Exchange.
"""
from .base import *  # noqa: F401, F403

DEBUG = False

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# HTTPS settings
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Logging
LOGGING['handlers']['file'] = {  # noqa: F405
    'class': 'logging.FileHandler',
    'filename': BASE_DIR / 'logs' / 'django.log',  # noqa: F405
    'formatter': 'verbose',  # noqa: F405
}
LOGGING['root']['handlers'].append('file')  # noqa: F405
