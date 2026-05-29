@echo off
cd /d "%~dp0"
echo Starting HousePySbot...
npx tsx src/index.ts
pause
