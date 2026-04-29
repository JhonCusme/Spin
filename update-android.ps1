# Script para actualizar la app Android con cambios del código web

Write-Host "=== Actualizando SpinDraw Android ===" -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (!(Test-Path "capacitor.config.json")) {
    Write-Host "Error: Ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Copiar archivos actualizados al directorio www
Write-Host "Copiando archivos actualizados..." -ForegroundColor Yellow
Copy-Item "ruleta-pro.html" "www\index.html" -Force
Copy-Item "manifest.json" "www\" -Force
Copy-Item "privacidad.html" "www\" -Force -ErrorAction SilentlyContinue
Copy-Item "terminos.html" "www\" -Force -ErrorAction SilentlyContinue
Copy-Item "cookies.html" "www\" -Force -ErrorAction SilentlyContinue
Copy-Item "contacto.html" "www\" -Force -ErrorAction SilentlyContinue

# Sincronizar con Capacitor
Write-Host "Sincronizando con Capacitor..." -ForegroundColor Yellow
npx cap sync android

Write-Host "¡Actualización completada!" -ForegroundColor Green
Write-Host "Ahora abre Android Studio y rebuild la app:" -ForegroundColor Cyan
Write-Host "npx cap open android" -ForegroundColor White