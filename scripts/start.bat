@echo off
cd /d "%~dp0\.."
docker build -t pm-app .
docker rm -f pm-app 2>nul
if not exist data mkdir data
docker run -d --name pm-app -p 8000:8000 --env-file .env -v "%cd%\data:/app/data" pm-app
echo App running at http://localhost:8000
