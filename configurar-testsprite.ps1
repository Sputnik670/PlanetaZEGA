# Script para configurar TestSprite API Key en Cursor
Write-Host "=== Configurador de TestSprite API Key ===" -ForegroundColor Cyan
Write-Host ""

$apiKey = "sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA"
$cursorUserPath = "$env:APPDATA\Cursor\User"
$settingsPath = "$cursorUserPath\settings.json"

Write-Host "Buscando configuracion de Cursor..." -ForegroundColor Yellow

# Leer settings.json actual
$currentSettings = @{}
if (Test-Path $settingsPath) {
    Write-Host "Encontrado: $settingsPath" -ForegroundColor Green
    try {
        $content = Get-Content $settingsPath -Raw
        $currentSettings = $content | ConvertFrom-Json
    } catch {
        Write-Host "Error al leer settings.json, creando nuevo..." -ForegroundColor Yellow
    }
} else {
    Write-Host "No se encontro settings.json, creando nuevo..." -ForegroundColor Yellow
}

# Agregar configuración MCP
$mcpConfig = @{
    "testsprite" = @{
        "apiKey" = $apiKey
    }
}

# Convertir a objeto si es necesario
if ($currentSettings -is [PSCustomObject]) {
    $currentSettings | Add-Member -MemberType NoteProperty -Name "mcp.servers" -Value $mcpConfig -Force
    $jsonContent = $currentSettings | ConvertTo-Json -Depth 10
} else {
    $newSettings = @{
        "mcp.servers" = $mcpConfig
    }
    $jsonContent = $newSettings | ConvertTo-Json -Depth 10
}

# Guardar
try {
    $jsonContent | Set-Content $settingsPath -Encoding UTF8
    Write-Host "Configuracion guardada exitosamente!" -ForegroundColor Green
} catch {
    Write-Host "Error al guardar: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== IMPORTANTE ===" -ForegroundColor Yellow
Write-Host "Debes REINICIAR Cursor completamente para que los cambios surtan efecto." -ForegroundColor Yellow
Write-Host "1. Cierra todas las ventanas de Cursor" -ForegroundColor White
Write-Host "2. Vuelve a abrir Cursor" -ForegroundColor White
Write-Host ""
