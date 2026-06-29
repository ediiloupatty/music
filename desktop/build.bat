@echo off
cd /d "%~dp0"

echo [1/3] Converting logo.png to logo.ico...
go run mkicon.go ..\public\logo.png logo.ico
if errorlevel 1 ( echo FAILED && pause && exit /b 1 )

echo [2/3] Compiling Windows resource (icon)...
windres zenify.rc -O coff -o zenify.syso
if errorlevel 1 ( echo FAILED - pastikan windres ada di PATH (C:\msys64\mingw64\bin) && pause && exit /b 1 )

echo [3/3] Building zenify-desktop.exe...
go build -trimpath -ldflags="-H windowsgui -extldflags \"-static\"" -o zenify-desktop.exe .
if errorlevel 1 ( echo FAILED && pause && exit /b 1 )

echo.
echo Done! zenify-desktop.exe siap dijalankan.
pause
