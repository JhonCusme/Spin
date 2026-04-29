# Script para compilar SpinDraw para Android
# Requiere: Android Studio SDK, Java JDK

Write-Host "=== Compilando SpinDraw para Android ===" -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (!(Test-Path "capacitor.config.json")) {
    Write-Host "Error: Ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Sincronizar archivos con Capacitor
Write-Host "Sincronizando archivos con Capacitor..." -ForegroundColor Yellow
npx cap sync android

# Abrir Android Studio
Write-Host "Abriendo Android Studio..." -ForegroundColor Yellow
Write-Host "Una vez abierto Android Studio:" -ForegroundColor Cyan
Write-Host "1. Espera a que Gradle termine de sincronizar" -ForegroundColor White
Write-Host "2. Ve a Build > Build Bundle(s)/APK(s) > Build APK(s)" -ForegroundColor White
Write-Host "3. El APK se generará en android/app/build/outputs/apk/debug/" -ForegroundColor White

npx cap open android