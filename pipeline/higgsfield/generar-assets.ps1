<#
.SYNOPSIS
  Genera con Higgsfield los videos, fotos y modelos 3D del sitio Kinchika.

.DESCRIPTION
  Usa la CLI oficial de Higgsfield (npm install -g @higgsfield/cli).
  Antes de cada generación muestra el costo en créditos y pide confirmación.

  Destinos:
    Videos   → public\video\higgsfield\*.mp4  (el sitio los muestra solos)
    Fotos    → public\img\eventos\*.jpg       (reemplazan las ilustraciones .svg)
    3D crudo → pipeline\out\*.glb             (luego se procesan con Blender:
                                               pipeline\blender\procesar-modelos.ps1)

.EXAMPLE
  # Solo ver cuánto costaría todo, sin generar nada
  powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1 -Cotizar

.EXAMPLE
  # Generar solo los videos, confirmando uno por uno
  powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1 -Solo videos

.EXAMPLE
  # Generar todo sin preguntar
  powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1 -Si
#>
[CmdletBinding()]
param(
  # videos | fotos | 3d   (vacío = todo)
  [ValidateSet('', 'videos', 'fotos', '3d')]
  [string]$Solo = '',
  # Solo muestra el costo, no genera
  [switch]$Cotizar,
  # No pide confirmación
  [switch]$Si,
  # Vuelve a generar aunque el archivo ya exista
  [switch]$Forzar,
  # Id de la animación de nado para el buzo (ver: higgsfield preset list animation-action --query swim)
  [int]$AnimacionId = 0
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$OutRaw = Join-Path $Root 'pipeline\out'
New-Item -ItemType Directory -Force -Path $OutRaw, (Join-Path $Root 'public\video\higgsfield'), (Join-Path $Root 'public\img\eventos') | Out-Null

if (-not (Get-Command higgsfield -ErrorAction SilentlyContinue)) {
  Write-Host 'No encuentro la CLI de Higgsfield. Instálala con:' -ForegroundColor Red
  Write-Host '  npm install -g @higgsfield/cli' -ForegroundColor Yellow
  Write-Host '  higgsfield auth login' -ForegroundColor Yellow
  exit 1
}

# ───────────────────────────── estilo común ─────────────────────────────
$NEGRO = 'Pure black background (#000000) so it blends seamlessly into a dark website. ' +
         'No text, no logos, no watermark, no UI. Seamless loop: first and last frames match.'

# ───────────────────────────── catálogo ─────────────────────────────
$VIDEOS = @(
  @{
    archivo = 'public\video\higgsfield\cardumen-jurel.mp4'
    modelo  = 'seedance_2_0'
    flags   = @('--aspect_ratio', '16:9', '--duration', '5', '--resolution', '1080p', '--generate_audio', 'false')
    prompt  = 'Cinematic underwater shot in an ultra-dark deep ocean, photorealistic. A tight, synchronized school ' +
              'of Chilean jack mackerel (Trachurus murphyi), silver bodies with subtle iridescent blue highlights, ' +
              'glides smoothly from left to right across the frame. Faint caustic light rays from above in cold ' +
              'teal (#00e6c8) and ocean blue. Drifting plankton particles. No seabed, no surface visible. ' +
              'Static camera, moderate speed. ' + $NEGRO
  },
  @{
    archivo = 'public\video\higgsfield\descenso-boya.mp4'
    modelo  = 'seedance_2_0'
    flags   = @('--aspect_ratio', '16:9', '--duration', '5', '--resolution', '1080p', '--generate_audio', 'false')
    prompt  = 'Cinematic side view of a freediver in a black wetsuit with long carbon bifins descending head-first ' +
              'along a vertical guide rope in deep blue-black water, calm and streamlined, single breath, eyes closed. ' +
              'Soft light beams fading from above, small bubbles, suspended particles. Graceful slow motion, ' +
              'the diver stays centered while the rope and particles move upward. Anonymous diver, face hidden by mask. ' + $NEGRO
  },
  @{
    archivo = 'public\video\higgsfield\abismo-bioluminiscente.mp4'
    modelo  = 'seedance_2_0'
    flags   = @('--aspect_ratio', '16:9', '--duration', '5', '--resolution', '1080p', '--generate_audio', 'false')
    prompt  = 'Deep sea mesopelagic zone in total darkness. Delicate bioluminescent jellyfish pulse slowly, glowing ' +
              'cyan (#5ff6ff) and soft gold (#c9a84c), long translucent tentacles trailing. Tiny sparkling plankton ' +
              'flashes around them. Ethereal, calm, documentary macro realism. ' + $NEGRO
  }
)

$FOTO_FLAGS = @('--aspect_ratio', '16:9', '--resolution', '2k')
$FOTO_ESTILO = ' Documentary photography, natural light, realistic, candid, Chile, no recognizable faces, ' +
               'no text, no logos, cinematic color grade with deep blues and warm gold accents.'
$FOTOS = @(
  @{ archivo = 'public\img\eventos\limpieza-playa.jpg';   prompt = 'Volunteers from a small diving club collecting plastic waste on a rocky beach at Quintay, central Chile, early morning mist, reusable bags, ocean in background.' + $FOTO_ESTILO },
  @{ archivo = 'public\img\eventos\clinica-apnea.jpg';    prompt = 'Static apnea training session in an indoor municipal swimming pool at night, a freediver floating face down relaxed while a buddy supervises, calm turquoise water, lane ropes.' + $FOTO_ESTILO },
  @{ archivo = 'public\img\eventos\salida-pichilemu.jpg'; prompt = 'Group of freedivers around an orange training buoy in open ocean off Pichilemu, Chile, long fins, wetsuits, guide rope going down into deep blue water, seen from the surface.' + $FOTO_ESTILO },
  @{ archivo = 'public\img\eventos\charla-historia.jpg';  prompt = 'Community talk about the history of freediving in a small cultural center, audience seen from behind, projector screen showing an old black and white photo of pearl divers.' + $FOTO_ESTILO },
  @{ archivo = 'public\img\eventos\interclubes-nado.jpg'; prompt = 'Finswimming competition in an indoor 50m pool, swimmers with monofins underwater mid-stroke, bubbles, lane lines, dynamic angle.' + $FOTO_ESTILO }
)

$MODELOS_3D = @(
  @{
    nombre  = 'buzo'
    archivo = 'pipeline\out\buzo-higgsfield.glb'
    prompt  = 'Full body freediver in a sleek black open-cell wetsuit with long carbon bifins, low-volume mask and nose clip, ' +
              'arms relaxed by the sides, T-pose friendly, realistic proportions, clean topology, game-ready.'
    rig     = $true
  },
  @{ nombre = 'jurel';     archivo = 'pipeline\out\jurel-higgsfield.glb';     rig = $false
     prompt = 'Chilean jack mackerel fish (Trachurus murphyi), streamlined silver body with blue-green back, forked tail, realistic, side profile, game-ready low poly.' },
  @{ nombre = 'reineta';   archivo = 'pipeline\out\reineta-higgsfield.glb';   rig = $false
     prompt = 'Southern ray''s bream fish (Brama australis), tall compressed silver body, large eyes, deeply forked tail, realistic, game-ready low poly.' },
  @{ nombre = 'anchoveta'; archivo = 'pipeline\out\anchoveta-higgsfield.glb'; rig = $false
     prompt = 'Peruvian anchoveta fish (Engraulis ringens), small slender silver body with blue back, realistic, game-ready low poly.' }
)

# ───────────────────────────── utilidades ─────────────────────────────
# Llama a la CLI sin que los mensajes por stderr detengan el script (PowerShell 5.1)
function Invoke-Higgs([string[]]$a) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { $o = & higgsfield @a 2>&1 | ForEach-Object { "$_" } | Out-String }
  finally { $ErrorActionPreference = $prev }
  return $o
}

function Confirmar([string]$pregunta) {
  if ($Si) { return $true }
  $r = Read-Host "$pregunta (s/N)"
  return $r -match '^(s|si|sí|y|yes)$'
}

function Mostrar-Costo([string]$modelo, [string[]]$opts) {
  try {
    $c = Invoke-Higgs (@('generate', 'cost', $modelo) + $opts)
    Write-Host ('  Costo: ' + $c.Trim()) -ForegroundColor DarkYellow
  } catch {
    Write-Host '  (no pude consultar el costo)' -ForegroundColor DarkGray
  }
}

function Buscar-Url([string]$texto) {
  $urls = [regex]::Matches($texto, 'https://[^\s"''<>\\]+') | ForEach-Object { $_.Value.TrimEnd('.', ',', ')') }
  $media = $urls | Where-Object { $_ -match '\.(mp4|mov|webm|png|jpe?g|webp|glb|gltf|fbx|obj|zip)(\?|$)' } | Select-Object -First 1
  if ($media) { return $media }
  return ($urls | Select-Object -First 1)
}

function Generar([string]$modelo, [string[]]$opts, [string]$destino) {
  $salida = Invoke-Higgs (@('generate', 'create', $modelo) + $opts + @('--wait', '--wait-timeout', '20m', '--json'))
  if ($LASTEXITCODE -ne 0) { throw "Higgsfield devolvió un error:`n$salida" }
  $url = Buscar-Url $salida
  if (-not $url) {
    # algunos trabajos devuelven solo el id: lo consultamos
    try { $id = ($salida | ConvertFrom-Json).id } catch { $id = $null }
    if ($id) { $url = Buscar-Url (Invoke-Higgs @('generate', 'get', "$id", '--json')) }
  }
  if (-not $url) { throw "No encontré la URL del resultado. Respuesta completa:`n$salida" }
  # si Higgsfield entrega otro formato 3D (p. ej. .fbx), se respeta su extensión
  $ext = [regex]::Match($url, '\.(glb|gltf|fbx|obj)(\?|$)')
  if ($ext.Success -and $destino -match '\.(glb|gltf|fbx|obj)$') {
    $destino = [IO.Path]::ChangeExtension($destino, $ext.Groups[1].Value)
  }
  Invoke-WebRequest -Uri $url -OutFile $destino -UseBasicParsing
  Write-Host "  ✔ Guardado en $destino" -ForegroundColor Green
  return $url
}

function Procesar([string]$tipo, [string]$titulo, [string]$archivo, [string]$modelo, [string[]]$opts) {
  $destino = Join-Path $Root $archivo
  Write-Host "`n▸ [$tipo] $titulo" -ForegroundColor Cyan
  if ((Test-Path $destino) -and -not $Forzar) { Write-Host '  Ya existe (usa -Forzar para regenerar).' -ForegroundColor DarkGray; return $null }
  Mostrar-Costo $modelo $opts
  if ($Cotizar) { return $null }
  if (-not (Confirmar '  ¿Generar ahora?')) { Write-Host '  Omitido.'; return $null }
  return Generar $modelo $opts $destino
}

# ───────────────────────────── ejecución ─────────────────────────────
Write-Host "Kinchika · generación con Higgsfield" -ForegroundColor White
Invoke-Higgs @('account') | Out-Host

if ($Solo -in @('', 'videos')) {
  foreach ($v in $VIDEOS) {
    Procesar 'video' (Split-Path $v.archivo -Leaf) $v.archivo $v.modelo ($v.flags + @('--prompt', $v.prompt)) | Out-Null
  }
}

if ($Solo -in @('', 'fotos')) {
  foreach ($f in $FOTOS) {
    Procesar 'foto' (Split-Path $f.archivo -Leaf) $f.archivo 'nano_banana_2' ($FOTO_FLAGS + @('--prompt', $f.prompt)) | Out-Null
  }
}

if ($Solo -in @('', '3d')) {
  foreach ($m in $MODELOS_3D) {
    $flags = @('--prompt', $m.prompt, '--geometry_quality', 'detailed', '--texture_quality', 'standard', '--face_limit', '20000')
    $url = Procesar '3d' $m.nombre $m.archivo 'tripo_3d' $flags
    if (-not $m.rig -or $Cotizar) { continue }
    if (-not $url) {
      Write-Host '  (para el rig se necesita la URL del modelo recién generado; vuelve a correr con -Forzar)' -ForegroundColor DarkGray
      continue
    }

    # Rig + animación de nado para el buzo
    $anim = $AnimacionId
    if (-not $anim) {
      Write-Host '  Buscando animaciones de nado…' -ForegroundColor DarkGray
      foreach ($q in @('swim', 'dive', 'float', 'idle')) {
        $lista = Invoke-Higgs @('preset', 'list', 'animation-action', '--query', $q, '--json')
        $m2 = [regex]::Match($lista, '"id"\s*:\s*(\d+)')
        if ($m2.Success) { $anim = [int]$m2.Groups[1].Value; Write-Host "  Animación '$q' → id $anim"; break }
      }
    }
    $rigFlags = @('--model_url', $url, '--height_meters', '1.8')
    if ($anim) { $rigFlags += @('--enable_animation', 'true', '--animation_action_id', "$anim") }
    Procesar '3d' 'buzo con esqueleto y animación' 'pipeline\out\buzo-rig.glb' '3d_rigging' $rigFlags | Out-Null
  }
}

Write-Host "`nListo." -ForegroundColor White
if ($Solo -in @('', '3d') -and -not $Cotizar) {
  Write-Host 'Siguiente paso para los modelos 3D:' -ForegroundColor White
  Write-Host '  powershell -ExecutionPolicy Bypass -File pipeline\blender\procesar-modelos.ps1' -ForegroundColor Yellow
}
Write-Host 'Para ver el resultado:  npm run dev' -ForegroundColor Yellow
