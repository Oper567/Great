Add-Type -AssemblyName System.Drawing

$dir = "public\assets\school cmmpound"
$backupDir = "public\assets\school cmmpound\original"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

$files = Get-ChildItem -Path $dir -Filter *.JPG -File

foreach ($f in $files) {
    $backupPath = Join-Path $backupDir $f.Name
    if (!(Test-Path $backupPath)) {
        Copy-Item $f.FullName $backupPath
        Write-Host "Backed up original to: $backupPath"
    }

    # Load from backup and optimize to high quality 1920px max width
    $src = [System.Drawing.Image]::FromFile($backupPath)
    $targetWidth = 1920
    if ($src.Width -le $targetWidth) {
        $targetWidth = $src.Width
        $targetHeight = $src.Height
    } else {
        $targetHeight = [int]($targetWidth * $src.Height / $src.Width)
    }

    $bmp = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $dstRect = [System.Drawing.Rectangle]::new(0, 0, $targetWidth, $targetHeight)
    $srcRect = [System.Drawing.Rectangle]::new(0, 0, $src.Width, $src.Height)
    $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()

    # Save as 92% quality JPEG
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]92)

    $tempOut = $f.FullName + ".tmp"
    $bmp.Save($tempOut, $codec, $encoderParams)
    $encoderParams.Dispose()
    $bmp.Dispose()

    Move-Item -Path $tempOut -Destination $f.FullName -Force
    $newLen = (Get-Item $f.FullName).Length
    Write-Host "Optimized $($f.Name): now $([math]::Round($newLen / 1KB, 1)) KB"
}
