@echo off
echo ===================================================
echo   Self-Hosted Restaurant Ordering System Setup
echo ===================================================
echo.

IF NOT EXIST ".env" (
    echo [INFO] First run detected. Creating your .env file automatically...
    copy .env.example .env > nul
    
    :: Generate a random session secret
    setlocal EnableDelayedExpansion
    set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    set "secret="
    for /L %%i in (1,1,32) do (
        set /a "idx=!random! %% 62"
        for %%j in (!idx!) do set "secret=!secret!!chars:~%%j,1!"
    )
    
    :: Append it to the .env file
    echo SESSION_SECRET=!secret!>> .env
    echo [SUCCESS] .env file created with a secure session secret.
    echo.
) ELSE (
    echo [INFO] .env file already exists.
)

echo [INFO] Starting the server and database using Docker...
docker compose up -d

echo.
echo ===================================================
echo   SUCCESS! The system is starting up.
echo.
echo   1. The menu is available at: http://localhost:5000
echo   2. Admin Panel is at:        http://localhost:5000/admin
echo.
echo   Default Admin Username: admin
echo   Default Admin Password: admin123
echo ===================================================
pause
