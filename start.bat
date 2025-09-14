@echo off
setlocal

where node >nul 2>nul || (
  echo Node.js bulunamadi. LTS surumu icin: https://nodejs.org
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo npm bulunamadi.
  pause
  exit /b 1
)

if exist package-lock.json (
  set "NPM_INSTALL=npm ci"
) else (
  set "NPM_INSTALL=npm install"
)

if not exist node_modules (
  echo Bagimliliklar kuruluyor...
  %NPM_INSTALL% || goto fail
) else (
  for /f %%A in ('dir /b node_modules 2^>nul') do set HASNM=1
  if not defined HASNM (
    echo Bagimliliklar kuruluyor...
    %NPM_INSTALL% || goto fail
  )
)

echo Gelistirme sunucusu baslatiliyor...
npm run dev
goto end

:fail
echo Kurulum basarisiz.
pause
:end
