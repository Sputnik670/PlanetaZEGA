# Script para iniciar ngrok y ejecutar TestSprite

Write-Host "=== Iniciador de ngrok para TestSprite ===" -ForegroundColor Cyan
Write-Host ""

# Verificar ngrok
$ngrokPath = "C:\ngrok\ngrok.exe"
if (-not (Test-Path $ngrokPath)) {
    Write-Host "Error: ngrok no encontrado en $ngrokPath" -ForegroundColor Red
    exit 1
}

# Verificar servidor
Write-Host "Verificando servidor en puerto 3000..." -ForegroundColor Yellow
$serverRunning = netstat -ano | findstr ":3000.*LISTENING"
if (-not $serverRunning) {
    Write-Host "Error: Servidor NO esta corriendo en puerto 3000" -ForegroundColor Red
    Write-Host "Por favor, inicia el servidor primero: npm run dev" -ForegroundColor Yellow
    exit 1
}
Write-Host "Servidor detectado" -ForegroundColor Green
Write-Host ""

# Iniciar ngrok en background
Write-Host "Iniciando ngrok..." -ForegroundColor Yellow
Write-Host "IMPORTANTE: ngrok se iniciara en una nueva ventana" -ForegroundColor Cyan
Write-Host "Copia la URL que ngrok muestra (ejemplo: https://abc123.ngrok.io)" -ForegroundColor Yellow
Write-Host "Presiona Enter cuando tengas la URL..." -ForegroundColor Yellow
Read-Host

# Iniciar ngrok en nueva ventana
Start-Process -FilePath $ngrokPath -ArgumentList "http", "3000" -WindowStyle Normal

Write-Host ""
Write-Host "ngrok iniciado. Espera unos segundos a que muestre la URL." -ForegroundColor Green
Write-Host "Cuando tengas la URL, avisame y actualizaremos TestSprite." -ForegroundColor Yellow

