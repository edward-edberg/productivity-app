#!/bin/bash
set -e
cd "$(dirname "$0")/.."
docker build -t pm-app .
docker rm -f pm-app 2>/dev/null || true
mkdir -p data
docker run -d --name pm-app -p 8000:8000 --env-file .env -v "$(pwd)/data:/app/data" pm-app
echo "App running at http://localhost:8000"
