Add-Type -AssemblyName System.Drawing

# Crop staff-2.jpg (Mr. Abraham Akozor) - 4:5 Executive Desk Portrait
$srcPath = Join-Path $PSScriptRoot "..\public\assets\images\staff-2-orig.jpg"
$dstPath = Join-Path $PSScriptRoot "..\public\assets\images\staff-2.jpg"

$img = [System.Drawing.Image]::FromFile($srcPath)
# 4:5 aspect ratio crop: 1010 x 1263
$cropRect = [System.Drawing.Rectangle]::new(118, 0, 1010, 1263)
$bmp = [System.Drawing.Bitmap]::new($cropRect.Width, $cropRect.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$dstRect = [System.Drawing.Rectangle]::new(0, 0, $cropRect.Width, $cropRect.Height)
$g.DrawImage($img, $dstRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$img.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
$encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]95)

$bmp.Save($dstPath, $codec, $encoderParams)
$encoderParams.Dispose()
$bmp.Dispose()
Write-Host "staff-2.jpg cropped successfully!"

# Process staff-3.jpg (Teacher Omoile Stanley Henry) - 4:5 Executive Portrait
$srcPath3 = Join-Path $PSScriptRoot "..\public\assets\images\staff-3-orig.jpg"
$dstPath3 = Join-Path $PSScriptRoot "..\public\assets\images\staff-3.jpg"

$img3 = [System.Drawing.Image]::FromFile($srcPath3)
# 4:5 aspect ratio crop: 1088 x 1360
$cropRect3 = [System.Drawing.Rectangle]::new(256, 0, 1088, 1360)
$bmp3 = [System.Drawing.Bitmap]::new($cropRect3.Width, $cropRect3.Height)
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g3.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$dstRect3 = [System.Drawing.Rectangle]::new(0, 0, $cropRect3.Width, $cropRect3.Height)
$g3.DrawImage($img3, $dstRect3, $cropRect3, [System.Drawing.GraphicsUnit]::Pixel)
$g3.Dispose()
$img3.Dispose()

$encoderParams3 = [System.Drawing.Imaging.EncoderParameters]::new(1)
$encoderParams3.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]95)

$bmp3.Save($dstPath3, $codec, $encoderParams3)
$encoderParams3.Dispose()
$bmp3.Dispose()
Write-Host "staff-3.jpg framed successfully!"

