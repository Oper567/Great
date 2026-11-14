Add-Type -AssemblyName System.Drawing

$compoundDir = Join-Path $PSScriptRoot "..\public\assets\school cmmpound"
$files = Get-ChildItem -Path $compoundDir -Filter *.JPG

foreach ($f in $files) {
    try {
        $img = [System.Drawing.Image]::FromFile($f.FullName)
        Write-Host "File: $($f.Name) | Dimensions: $($img.Width) x $($img.Height) | Ratio: $([math]::Round($img.Width / $img.Height, 2))"
        $img.Dispose()
    } catch {
        Write-Host "Error reading $($f.Name): $_"
    }
}
