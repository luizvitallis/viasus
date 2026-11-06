# Gera o .zip da extensão para enviar à Chrome Web Store.
# Uso (na raiz do projeto):  powershell -ExecutionPolicy Bypass -File loja-extensao-pec\empacotar.ps1
# Antes de cada envio, aumente "version" em extension\manifest.json — a loja recusa versão repetida.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path (Split-Path -Parent $here) "extension"
$version = (Get-Content (Join-Path $src "manifest.json") -Raw | ConvertFrom-Json).version
$zip = Join-Path $here "viasus-pec-$version.zip"

# Só o que a extensão usa (README fica de fora). Tudo na raiz do zip, sem subpastas.
$files = Get-ChildItem $src -File | Where-Object { $_.Extension -in ".json", ".js", ".html", ".png" }
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path $files.FullName -DestinationPath $zip
Write-Host "Pacote gerado: $zip ($($files.Count) arquivos)"
