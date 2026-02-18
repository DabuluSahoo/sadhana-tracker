@echo off
echo ========================================
echo   Sadhana Tracker - Deploy to Cloud
echo ========================================
echo.

:: Ask for commit message
set /p MSG="What did you change? (commit message): "

echo.
echo [1/3] Saving changes...
git add .
git commit -m "%MSG%"

echo.
echo [2/3] Pushing to GitHub...
git push

echo.
echo [3/3] Done!
echo.
echo ✓ Backend (Render) will auto-update in ~2 minutes.
echo ✓ Check: https://sadhana-tracker.onrender.com
echo.
pause
