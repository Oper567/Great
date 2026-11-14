Add-Type -AssemblyName System.Drawing

$artifactDir = "C:\Users\HP\.gemini\antigravity-ide\brain\57a546d8-5a99-46c4-ab77-45df736e5df2"
if (!(Test-Path $artifactDir)) {
    New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
}

$files = Get-ChildItem -Path "public\assets\school cmmpound" -Filter *.JPG

foreach ($f in $files) {
    $src = [System.Drawing.Image]::FromFile($f.FullName)
    $w = 640
    $h = [int]($w * $src.Height / $src.Width)
    $thumb = $src.GetThumbnailImage($w, $h, $null, [IntPtr]::Zero)
    $cleanName = ($f.BaseName -replace '@.*$', '') + ".jpg"
    $dst = Join-Path $artifactDir $cleanName
    $thumb.Save($dst, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $thumb.Dispose()
    $src.Dispose()
    Write-Host "Created thumbnail: $dst"
}
