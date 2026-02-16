@echo off
setlocal enabledelayedexpansion
echo Connecting to phone(s) via USB...

:: Find ADB path
set ADB_PATH="C:\Users\dabul\AppData\Local\Android\Sdk\platform-tools\adb.exe"

:: Check for devices
%ADB_PATH% devices > devices.txt
findstr /C:"device" devices.txt | findstr /V "List" > connected_devices.txt

set count=0
for /f "tokens=1" %%a in (connected_devices.txt) do (
    set /a count+=1
    echo Found device: %%a
    %ADB_PATH% -s %%a reverse tcp:5000 tcp:5000
    if !errorlevel! equ 0 (
        echo [SUCCESS] Connected to %%a
    ) else (
        echo [FAILED] Could not connect to %%a
    )
)

if %count% equ 0 (
    echo [ERROR] No devices found!
    echo 1. Check USB cable.
    echo 2. Enable USB Debugging.
) else (
    echo.
    echo All devices connected! You can run the app now.
)

del devices.txt
del connected_devices.txt
pause
