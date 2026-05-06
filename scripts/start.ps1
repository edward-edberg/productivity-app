Set-Location (Join-Path $PSScriptRoot "..")
docker build -t pm-app .
docker rm -f pm-app 2>$null
New-Item -ItemType Directory -Force -Path data | Out-Null
docker run -d --name pm-app -p 8000:8000 --env-file .env -v "${PWD}/data:/app/data" pm-app
Write-Host "App running at http://localhost:8000"
