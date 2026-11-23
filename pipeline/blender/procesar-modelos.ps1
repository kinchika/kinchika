<#
.SYNOPSIS
  Procesa con Blender los modelos 3D crudos (pipeline\out) y los deja listos en public\models.

.DESCRIPTION
  Busca blender.exe automáticamente (o usa -Blender "ruta\blender.exe") y ejecuta
  preparar_modelo.py para cada modelo que encuentre:

    pipeline\out\buzo-rig.*  (o buzo-higgsfield.*, buzo-sketchfab.*)  → public\models\buzo.glb  (+ buzo.blend)
    pipeline\out\jurel-higgsfield.*  (o jurel-sketchfab.*)            → public\models\jurel.glb
    pipeline\out\reineta-higgsfield.*               → public\models\reineta.glb
    pipeline\out\anchoveta-higgsfield.*             → public\models\anchoveta.glb

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File pipeline\blender\procesar-modelos.ps1

.EXAMPLE
  # Probar el proceso sin Higgsfield, con modelos de prueba
  powershell -ExecutionPolicy Bypass -File pipeline\blender\procesar-modelos.ps1 -Demo
#>
[CmdletBinding()]
param(
  [string]$Blender = '',
  # Genera modelos de prueba (sin Higgsfield) para comprobar que todo funciona
  [switch]$Demo,
  # Peces que quedaron mirando hacia atrás (ej: -Invertir jurel,reineta)
  [string[]]$Invertir = @()
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Script = Join-Path $PSScriptRoot 'preparar_modelo.py'
$Out = Join-Path $Root 'pipeline\out'
$Models = Join-Path $Root 'public\models'
New-Item -ItemType Directory -Force -Path $Out, $Models | Out-Null

function Buscar-Blender {
  if ($Blender) { return $Blender }
  $cmd = Get-Command blender -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidatos = @()
  foreach ($base in @("$env:ProgramFiles\Blender Foundation", "${env:ProgramFiles(x86)}\Steam\steamapps\common", "$env:LOCALAPPDATA\Programs")) {
    if (Test-Path $base) {
      $candidatos += Get-ChildItem -Path $base -Recurse -Filter 'blender.exe' -ErrorAction SilentlyContinue -Depth 2
    }
  }
  $mejor = $candidatos | Sort-Object { $_.VersionInfo.FileVersion } -Descending | Select-Object -First 1
  if ($mejor) { return $mejor.FullName }
  return $null
}

$exe = Buscar-Blender
if (-not $exe) {
  Write-Host 'No encontré Blender. Indica la ruta, por ejemplo:' -ForegroundColor Red
  Write-Host '  ... procesar-modelos.ps1 -Blender "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe"' -ForegroundColor Yellow
  exit 1
}
Write-Host "Blender: $exe" -ForegroundColor DarkGray

function Preparar([string]$tipo, [string]$entrada, [string]$salida, [string[]]$extra = @()) {
  Write-Host "`n▸ $tipo · $(Split-Path $entrada -Leaf) → $(Split-Path $salida -Leaf)" -ForegroundColor Cyan
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $exe -b --factory-startup -P $Script -- --tipo $tipo --entrada $entrada --salida $salida @extra 2>&1 |
      ForEach-Object { "$_" } |
      Where-Object { $_ -match '^\s+- |^OK |Error|rror:|No existe|no contiene|Kinchika' } |
      ForEach-Object { Write-Host "  $_" }
  } finally { $ErrorActionPreference = $prev }
  if ($LASTEXITCODE -ne 0) { Write-Host "  ✖ Blender terminó con error ($LASTEXITCODE)" -ForegroundColor Red }
}

function Buscar([string]$patron) {
  Get-ChildItem -Path $Out -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $patron -and $_.Extension -in @('.glb', '.gltf', '.fbx', '.obj') } |
    Select-Object -First 1
}

if ($Demo) {
  Preparar 'buzo' 'demo' (Join-Path $Models 'buzo.glb') @('--guardar-blend')
  Preparar 'pez' 'demo' (Join-Path $Models 'jurel.glb')
  Write-Host "`nModelos de prueba listos. Bórralos de public\models cuando tengas los reales." -ForegroundColor Yellow
  exit 0
}

$buzo = Buscar 'buzo-rig.*'
if (-not $buzo) { $buzo = Buscar 'buzo-higgsfield.*' }
if (-not $buzo) { $buzo = Buscar 'buzo-sketchfab.*' }
# "pPlane": plano auxiliar que traen algunos modelos de Sketchfab exportados desde Maya
if ($buzo) { Preparar 'buzo' $buzo.FullName (Join-Path $Models 'buzo.glb') @('--guardar-blend', '--quitar', 'pPlane') }
else { Write-Host "`n(no hay modelo de buzo en pipeline\out)" -ForegroundColor DarkGray }

# Ajustes conocidos por archivo (revisados a mano: hacia dónde mira y si viene de cabeza)
$AjustesPorArchivo = @{
  # "Atlantic Mackerel (Animated and Game-ready)" de Ishxxn, Sketchfab, CC BY 4.0
  'jurel-sketchfab' = @('--invertir', '--voltear', '--caras', '7000', '--ancho', '0.13')
  # "Sardine" de Drake (dlp14c), Sketchfab, CC BY 4.0
  'anchoveta-sketchfab' = @('--invertir', '--caras', '3000')
  # "Fish" de VeeRuby Technologies, Sketchfab, CC BY 4.0 (reducir caras rompe las aletas)
  'reineta-sketchfab' = @('--caras', '3000')
}

foreach ($pez in @('jurel', 'reineta', 'anchoveta')) {
  $f = Buscar "$pez-higgsfield.*"
  if (-not $f) { $f = Buscar "$pez-sketchfab.*" }
  if (-not $f) { Write-Host "(no hay modelo de $pez en pipeline\out)" -ForegroundColor DarkGray; continue }
  $extra = @()
  $clave = [IO.Path]::GetFileNameWithoutExtension($f.Name)
  if ($AjustesPorArchivo.ContainsKey($clave)) { $extra += $AjustesPorArchivo[$clave] }
  if ($Invertir -contains $pez -and $extra -notcontains '--invertir') { $extra += '--invertir' }
  Preparar 'pez' $f.FullName (Join-Path $Models "$pez.glb") $extra
}

Write-Host "`nListo. Revisa el resultado con:  npm run dev" -ForegroundColor White
Write-Host 'Posición, tamaño y animación del buzo se ajustan en src\assets.config.js' -ForegroundColor DarkGray
