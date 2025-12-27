# Script para configurar el token de ngrok

Write-Host "=== Configurador de Token ngrok ===" -ForegroundColor Cyan
Write-Host ""

$ngrokPath = "C:\ngrok\ngrok.exe"
if (-not (Test-Path $ngrokPath)) {
    Write-Host "Error: ngrok no encontrado en $ngrokPath" -ForegroundColor Red
    exit 1
}

Write-Host "Para obtener tu token:" -ForegroundColor Yellow
Write-Host "1. Visita: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host "2. Copia el token que aparece" -ForegroundColor White
Write-Host ""
Write-Host "Pega tu token aqui (o presiona Enter para abrir el navegador):" -ForegroundColor Cyan
$token = Read-Host

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Abriendo navegador..." -ForegroundColor Yellow
    Start-Process "https://dashboard.ngrok.com/get-started/your-authtoken"
    Write-Host ""
    Write-Host "Despues de obtener el token, ejecuta:" -ForegroundColor Yellow
    Write-Host "  cd C:\ngrok" -ForegroundColor White
    Write-Host "  .\ngrok.exe config add-authtoken TU_TOKEN" -ForegroundColor White
    exit 0
}

Write-Host ""
Write-Host "Configurando token..." -ForegroundColor Yellow
cd C:\ngrok
$result = & .\ngrok.exe config add-authtoken $token 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Token configurado correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora puedes iniciar ngrok con:" -ForegroundColor Cyan
    Write-Host "  .\ngrok.exe http 3000" -ForegroundColor White
} else {
    Write-Host "Error al configurar token:" -ForegroundColor Red
    Write-Host $result
}

