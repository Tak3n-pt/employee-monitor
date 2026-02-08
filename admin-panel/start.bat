@echo off
echo ========================================
echo Employee Monitor - Admin Panel
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting admin panel server...
echo.
echo Dashboard will be available at: http://localhost:3847
echo.

npm run server
