# Gera as duas versões da extensão a partir de extension\ e guarda no histórico:
#   loja\<versão>\viasus-pec-<versão>.zip  -> enviar à Chrome Web Store (só PEC de produção)
#   pec\<versão>\                           -> "Carregar sem compactação" (PEC local + produção)
#
# Uso (na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File versoes-extensao\empacotar.ps1
# Antes, aumente "version" em extension\manifest.json — versão já guardada não é sobrescrita.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path (Split-Path -Parent $here) "extension"
$utf8 = New-Object System.Text.UTF8Encoding $false  # sem BOM

$version = (Get-Content (Join-Path $src "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json).version
$lojaDir = Join-Path $here "loja\$version"
$pecDir = Join-Path $here "pec\$version"
foreach ($d in $lojaDir, $pecDir) {
  if (Test-Path $d) { throw "A versão $version já está guardada em $d. Aumente 'version' em extension\manifest.json." }
}

# Só o que a extensão usa (README fica de fora). Tudo na raiz, sem subpastas.
$files = Get-ChildItem $src -File | Where-Object { $_.Extension -in ".json", ".js", ".html", ".png" }

# --- loja: cópia fiel de extension\ ---
New-Item -ItemType Directory -Path $lojaDir | Out-Null
$zip = Join-Path $lojaDir "viasus-pec-$version.zip"
Compress-Archive -Path $files.FullName -DestinationPath $zip

# --- pec: mesma extensão, também liberada no PEC local de treinamento ---
$prod = '"https://esus.caucaia.ce.gov.br/*"'
$prodLocal = '"https://esus.caucaia.ce.gov.br/*", "http://localhost:8080/*", "http://127.0.0.1:8080/*"'
New-Item -ItemType Directory -Path $pecDir | Out-Null
$files | Copy-Item -Destination $pecDir
foreach ($name in "manifest.json", "background.js") {
  $path = Join-Path $pecDir $name
  $text = [System.IO.File]::ReadAllText($path, $utf8)
  if (-not $text.Contains($prod)) { throw "Endereço do PEC de produção não encontrado em $name." }
  $text = $text.Replace($prod, $prodLocal)
  if ($name -eq "manifest.json") {
    $text = $text.Replace('"name": "ViaSus — Encaminhamento no e-SUS PEC"', '"name": "ViaSus — Encaminhamento no e-SUS PEC (local + produção)"')
  }
  [System.IO.File]::WriteAllText($path, $text, $utf8)
}
$null = Get-Content (Join-Path $pecDir "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json  # valida o JSON

Write-Host "Loja: $zip"
Write-Host "PEC:  $pecDir"
Write-Host "Registre a versão em versoes-extensao\LEIAME.md (Histórico)."
