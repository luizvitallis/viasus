# Gera as duas versões da extensão a partir de extension\ e guarda no histórico:
#   loja\<versão>\viasus-pec-<versão>.zip  -> enviar à Chrome Web Store (só PEC de produção)
#   pec\<versão>\                           -> "Carregar sem compactação" (PEC local + produção)
# extension\ funciona no PEC local e no de produção; o pacote da loja sai sem os endereços locais.
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

$prod = '"https://esus.caucaia.ce.gov.br/*"'
$prodLocal = '"https://esus.caucaia.ce.gov.br/*", "http://localhost:8080/*", "http://127.0.0.1:8080/*"'

function Edit-Text($path, [scriptblock]$change) {
  $text = [System.IO.File]::ReadAllText($path, $utf8)
  [System.IO.File]::WriteAllText($path, (& $change $text), $utf8)
}

# --- loja: extension\ sem os endereços do PEC local ---
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("viasus-loja-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
$files | Copy-Item -Destination $tmp
foreach ($name in "manifest.json", "background.js") {
  Edit-Text (Join-Path $tmp $name) {
    param($t)
    if (-not $t.Contains($prodLocal)) { throw "Lista de endereços do PEC não encontrada em extension\$name." }
    $t.Replace($prodLocal, $prod)
  }
}
$null = Get-Content (Join-Path $tmp "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json  # valida o JSON
New-Item -ItemType Directory -Path $lojaDir | Out-Null
$zip = Join-Path $lojaDir "viasus-pec-$version.zip"
Compress-Archive -Path (Get-ChildItem $tmp -File).FullName -DestinationPath $zip
Remove-Item $tmp -Recurse

# --- pec: cópia de extension\, com nome que a diferencia da instalada pela loja ---
New-Item -ItemType Directory -Path $pecDir | Out-Null
$files | Copy-Item -Destination $pecDir
Edit-Text (Join-Path $pecDir "manifest.json") {
  param($t)
  $t.Replace('"name": "ViaSus — Encaminhamento no e-SUS PEC"', '"name": "ViaSus — Encaminhamento no e-SUS PEC (local + produção)"')
}
$null = Get-Content (Join-Path $pecDir "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json  # valida o JSON

Write-Host "Loja: $zip"
Write-Host "PEC:  $pecDir"
Write-Host "Registre a versão em versoes-extensao\LEIAME.md (Histórico)."
