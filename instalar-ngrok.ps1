# Script para instalar y configurar ngrok de forma segura

Write-Host "=== Instalador de ngrok para TestSprite ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si ngrok ya esta instalado
$ngrokPath = "C:\ngrok\ngrok.exe"
if (Test-Path $ngrokPath) {
    Write-Host "ngrok ya esta instalado en: $ngrokPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para usar ngrok:" -ForegroundColor Yellow
    Write-Host "  cd C:\ngrok" -ForegroundColor White
    Write-Host "  .\ngrok.exe http 3000" -ForegroundColor White
    Write-Host ""
    exit 0
}

Write-Host "ngrok no esta instalado." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pasos para instalar ngrok:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Descarga ngrok desde: https://ngrok.com/download" -ForegroundColor White
Write-Host "2. Extrae ngrok.exe a: C:\ngrok\" -ForegroundColor White
Write-Host "3. (Opcional) Crea cuenta en: https://dashboard.ngrok.com/signup" -ForegroundColor White
Write-Host "4. (Opcional) Configura token: ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
Write-Host ""
Write-Host "Quieres que abra el navegador para descargar ngrok? (S/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Start-Process "https://ngrok.com/download"
    Write-Host ""
    Write-Host "Despues de descargar e instalar, ejecuta este script nuevamente." -ForegroundColor Green
}
