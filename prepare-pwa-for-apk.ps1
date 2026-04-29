# Script para preparar la PWA para conversión a APK usando servicios online

Write-Host "=== Preparando SpinDraw PWA para conversión APK ===" -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (!(Test-Path "manifest.json")) {
    Write-Host "Error: Ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Crear directorio para el APK
$apkDir = "pwa-for-apk"
if (Test-Path $apkDir) {
    Remove-Item -Recurse -Force $apkDir
}
New-Item -ItemType Directory -Path $apkDir | Out-Null

Write-Host "Copiando archivos de la PWA..." -ForegroundColor Yellow

# Copiar archivos principales
Copy-Item "ruleta-pro.html" "$apkDir\index.html" -Force
Copy-Item "manifest.json" "$apkDir\" -Force
Copy-Item "favicon.svg" "$apkDir\" -Force -ErrorAction SilentlyContinue

# Crear iconos si no existen
if (!(Test-Path "$apkDir\favicon.svg")) {
    # Crear un favicon básico
    $faviconSvg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#7c3aed"/>
  <circle cx="96" cy="96" r="60" fill="white" stroke="#7c3aed" stroke-width="4"/>
  <text x="96" y="110" text-anchor="middle" fill="#7c3aed" font-family="Arial" font-size="60" font-weight="bold">🎯</text>
</svg>
"@
    $faviconSvg | Out-File -FilePath "$apkDir\favicon.svg" -Encoding UTF8
}

# Crear service worker básico si no existe
$serviceWorker = @"
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('fetch', (event) => {
  // Para modo offline básico
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline - Conéctate a internet para usar SpinDraw');
    })
  );
});
"@
$serviceWorker | Out-File -FilePath "$apkDir\sw.js" -Encoding UTF8

# Actualizar el manifest para APK
$manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
$manifest.start_url = "/index.html"
$manifest.scope = "/"
$manifest.display = "standalone"
$manifest.orientation = "portrait-primary"
$manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath "$apkDir\manifest.json" -Encoding UTF8

# Crear archivo ZIP para subir a servicios online
Write-Host "Creando archivo ZIP para servicios online..." -ForegroundColor Yellow
Compress-Archive -Path "$apkDir\*" -DestinationPath "SpinDraw-PWA.zip" -Force

Write-Host "¡Preparacion completada!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "Archivos preparados en: $apkDir\" -ForegroundColor Cyan
Write-Host "Archivo ZIP creado: SpinDraw-PWA.zip" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Servicios online recomendados para convertir PWA a APK:" -ForegroundColor Yellow
Write-Host "   - https://appmaker.xyz/pwa-to-apk" -ForegroundColor White
Write-Host "   - https://pwabuilder.com" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "Instrucciones:" -ForegroundColor Green
Write-Host "   1. Ve a uno de los servicios arriba" -ForegroundColor White
Write-Host "   2. Sube el archivo SpinDraw-PWA.zip" -ForegroundColor White
Write-Host "   3. Configura el nombre: 'SpinDraw'" -ForegroundColor White
Write-Host "   4. Configura el package ID: 'com.spindraw.app'" -ForegroundColor White
Write-Host "   5. Descarga el APK generado" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "Nota: El APK generado sera funcional pero basico." -ForegroundColor Yellow
Write-Host "Para caracteristicas avanzadas, usa Android Studio." -ForegroundColor Yellow