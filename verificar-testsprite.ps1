# Script para verificar y configurar TestSprite en todas las ubicaciones posibles

Write-Host "=== Verificador de Configuración TestSprite ===" -ForegroundColor Cyan
Write-Host ""

$apiKey = "sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA"

# Ubicación 1: settings.json
$settingsPath = "$env:APPDATA\Cursor\User\settings.json"
Write-Host "1. Verificando: $settingsPath" -ForegroundColor Yellow
if (Test-Path $settingsPath) {
    $content = Get-Content $settingsPath -Raw
    if ($content -match "testsprite" -and $content -match $apiKey) {
        Write-Host "   ✓ Configurado correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ✗ No tiene la configuración correcta" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ No existe" -ForegroundColor Red
}

# Ubicación 2: globalStorage/mcp.json
$mcpPath1 = "$env:APPDATA\Cursor\User\globalStorage\mcp.json"
Write-Host "2. Verificando: $mcpPath1" -ForegroundColor Yellow
if (Test-Path $mcpPath1) {
    $content = Get-Content $mcpPath1 -Raw
    if ($content -match "testsprite" -and $content -match $apiKey) {
        Write-Host "   ✓ Configurado correctamente" -ForegroundColor Green
        Write-Host "   Contenido:" -ForegroundColor Cyan
        Get-Content $mcpPath1 | Write-Host
    } else {
        Write-Host "   ✗ No tiene la configuración correcta" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ No existe" -ForegroundColor Red
}

# Ubicación 3: .cursor/mcp.json en home
$mcpPath2 = "$env:USERPROFILE\.cursor\mcp.json"
Write-Host "3. Verificando: $mcpPath2" -ForegroundColor Yellow
if (Test-Path $mcpPath2) {
    $content = Get-Content $mcpPath2 -Raw
    if ($content -match "testsprite" -and $content -match $apiKey) {
        Write-Host "   ✓ Configurado correctamente" -ForegroundColor Green
        Write-Host "   Contenido:" -ForegroundColor Cyan
        Get-Content $mcpPath2 | Write-Host
    } else {
        Write-Host "   ✗ No tiene la configuración correcta" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ No existe" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Buscando otros archivos mcp.json ===" -ForegroundColor Cyan
Get-ChildItem "$env:APPDATA\Cursor" -Recurse -Filter "mcp.json" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Encontrado: $($_.FullName)" -ForegroundColor Yellow
    Get-Content $_.FullName | Write-Host
    Write-Host ""
}

Write-Host ""
Write-Host "=== Recomendación ===" -ForegroundColor Yellow
Write-Host "Si TestSprite sigue sin funcionar, puede ser que:" -ForegroundColor White
Write-Host "1. La API key haya expirado o no sea válida" -ForegroundColor White
Write-Host "2. Cursor necesite reiniciarse completamente" -ForegroundColor White
Write-Host "3. La configuración necesite estar en un formato específico" -ForegroundColor White
Write-Host ""




