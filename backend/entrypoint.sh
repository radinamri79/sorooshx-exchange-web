#!/bin/sh
set -e

echo "🚀 SorooshX Backend Starting..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
max_attempts=30
attempt=0
while ! python -c "import psycopg; psycopg.connect('$DATABASE_URL')" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Database connection failed after $max_attempts attempts"
        exit 1
    fi
    echo "   Database not ready, waiting... (attempt $attempt/$max_attempts)"
    sleep 2
done
echo "✅ Database is ready!"

# Run migrations
echo "📦 Running database migrations..."
python manage.py migrate --noinput

# Collect static files (only if needed)
if [ "$DEBUG" = "False" ] || [ ! -d "/app/staticfiles/admin" ]; then
    echo "📁 Collecting static files..."
    python manage.py collectstatic --noinput
fi

echo "✅ Backend initialization complete!"
echo "🎯 Starting server..."

# Execute the main command
exec "$@"
