# Script para iniciar ngrok de forma segura para TestSprite

Write-Host "=== Iniciador Seguro de ngrok para TestSprite ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si ngrok está instalado
$ngrokPath = "C:\ngrok\ngrok.exe"
if (-not (Test-Path $ngrokPath)) {
    Write-Host "✗ ngrok no está instalado en: $ngrokPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instala ngrok primero:" -ForegroundColor Yellow
    Write-Host "1. Descarga desde: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Extrae ngrok.exe a: C:\ngrok\" -ForegroundColor White
    Write-Host ""
    Write-Host "O ejecuta: .\instalar-ngrok.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar que el servidor esté corriendo
Write-Host "Verificando que el servidor esté corriendo en puerto 3000..." -ForegroundColor Yellow
$serverRunning = netstat -ano | findstr ":3000.*LISTENING"
if (-not $serverRunning) {
    Write-Host "✗ El servidor NO está corriendo en puerto 3000" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, inicia el servidor primero:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    exit 1
}
Write-Host "✓ Servidor detectado en puerto 3000" -ForegroundColor Green
Write-Host ""

# Opciones de seguridad
Write-Host "Opciones de seguridad:" -ForegroundColor Cyan
Write-Host "1. Básico (sin autenticación) - Solo para testing rápido" -ForegroundColor White
Write-Host "2. Con autenticación (recomendado) - Más seguro" -ForegroundColor White
Write-Host ""
$opcion = Read-Host "Selecciona opción (1 o 2)"

if ($opcion -eq "2") {
    Write-Host ""
    Write-Host "Configuración con autenticación:" -ForegroundColor Yellow
    $usuario = Read-Host "Usuario"
    $password = Read-Host "Contraseña" -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    )
    
    Write-Host ""
    Write-Host "Iniciando ngrok con autenticación..." -ForegroundColor Green
    Write-Host "URL será: https://[usuario]:[password]@[dominio].ngrok.io" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANTE: Cierra ngrok con Ctrl+C cuando termines las pruebas" -ForegroundColor Red
    Write-Host ""
    
    & $ngrokPath http --auth="$usuario`:$passwordPlain" 3000
} else {
    Write-Host ""
    Write-Host "Iniciando ngrok (sin autenticación)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  ADVERTENCIA: Sin autenticación, cualquiera con la URL puede acceder" -ForegroundColor Red
    Write-Host "IMPORTANTE: Cierra ngrok con Ctrl+C cuando termines las pruebas" -ForegroundColor Red
    Write-Host ""
    
    & $ngrokPath http 3000
}

