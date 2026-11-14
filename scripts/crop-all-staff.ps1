Add-Type -AssemblyName System.Drawing

function Crop-Image($srcPath, $dstPath, $cropRect, $topPadColor = $null, $topPadHeight = 0) {
    $img = [System.Drawing.Image]::FromFile($srcPath)
    
    if ($topPadHeight -gt 0) {
        # Expand image top with padded background color
        $expandedBmp = [System.Drawing.Bitmap]::new($img.Width, $img.Height + $topPadHeight)
        $eg = [System.Drawing.Graphics]::FromImage($expandedBmp)
        $brush = [System.Drawing.SolidBrush]::new($topPadColor)
        $eg.FillRectangle($brush, 0, 0, $expandedBmp.Width, $topPadHeight + 10)
        $brush.Dispose()
        $eg.DrawImage($img, 0, $topPadHeight, $img.Width, $img.Height)
        $eg.Dispose()
        $img.Dispose()
        $img = $expandedBmp
    }

    $bmp = [System.Drawing.Bitmap]::new($cropRect.Width, $cropRect.Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $dstRect = [System.Drawing.Rectangle]::new(0, 0, $cropRect.Width, $cropRect.Height)
    $g.DrawImage($img, $dstRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $img.Dispose()

    # Save with high quality jpeg
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]95)

    $bmp.Save($dstPath, $codec, $encoderParams)
    $encoderParams.Dispose()
    $bmp.Dispose()
}

$imgDir = Join-Path $PSScriptRoot "..\public\assets\images"

# 1. Okafor Obinna Jude (head-teacher.jpg) - 4:5 Executive Desk Portrait
$srcHT = Join-Path $PSScriptRoot "..\assets\ChatGPT Image Sep 30, 2026, 02_18_04 PM.png"
$dstHT = Join-Path $imgDir "head-teacher.jpg"
if (Test-Path $srcHT) {
    Crop-Image $srcHT $dstHT ([System.Drawing.Rectangle]::new(0, 0, 1024, 1280))
    Write-Host "head-teacher.jpg cropped to 4:5 executive portrait"
}

# 2. Ms. Gift Itakpe (hod-exams.jpg) - 4:5 Executive Desk Portrait
$srcGift = Join-Path $imgDir "hod-exams-orig.jpg"
$dstGift = Join-Path $imgDir "hod-exams.jpg"
Crop-Image $srcGift $dstGift ([System.Drawing.Rectangle]::new(21, 0, 1024, 1280))
Write-Host "hod-exams.jpg cropped to 4:5 executive portrait"

# 3. Mr. Paul Uyokei (bursar.jpg) - 4:5 Executive Desk Portrait
$srcPaul = Join-Path $imgDir "bursar-orig.jpg"
$dstPaul = Join-Path $imgDir "bursar.jpg"
Crop-Image $srcPaul $dstPaul ([System.Drawing.Rectangle]::new(0, 50, 1065, 1331))
Write-Host "bursar.jpg cropped to 4:5 executive portrait"

# 4. Mr. Jude Godstime (staff-1.jpg) - Head to Chest
$srcJude = Join-Path $imgDir "staff-1-orig.jpg"
$dstJude = Join-Path $imgDir "staff-1.jpg"
Crop-Image $srcJude $dstJude ([System.Drawing.Rectangle]::new(140, 15, 590, 560))
Write-Host "staff-1.jpg cropped to chest level"

# 5. Mr. Abraham Akozor (staff-2.jpg) - 4:5 Executive Desk Portrait
$srcAbraham = Join-Path $imgDir "staff-2-orig.jpg"
$dstAbraham = Join-Path $imgDir "staff-2.jpg"
Crop-Image $srcAbraham $dstAbraham ([System.Drawing.Rectangle]::new(118, 0, 1010, 1263))
Write-Host "staff-2.jpg cropped to 4:5 executive portrait"

# 6. Teacher Omoile Stanley Henry (staff-3.jpg) - 4:5 Executive Portrait
$srcStan = Join-Path $imgDir "staff-3-orig.jpg"
$dstStan = Join-Path $imgDir "staff-3.jpg"
Crop-Image $srcStan $dstStan ([System.Drawing.Rectangle]::new(256, 0, 1088, 1360))
Write-Host "staff-3.jpg cropped to 4:5 executive portrait"

# 7. Mrs. Chiedu Eno (mrs-chiedu-eno.jpg) - 4:5 Executive Desk Portrait
$srcChiedu = Join-Path $PSScriptRoot "..\assets\Men\MRS CHIEDU ENO.jpg"
$dstChiedu = Join-Path $imgDir "mrs-chiedu-eno.jpg"
if (Test-Path $srcChiedu) {
    Crop-Image $srcChiedu $dstChiedu ([System.Drawing.Rectangle]::new(0, 45, 1086, 1357))
    Write-Host "mrs-chiedu-eno.jpg cropped to 4:5 executive portrait"
}

# 8. Miss Grace Edechi (miss-grace.jpg) - 4:5 Executive Desk Portrait
$srcGrace = Join-Path $PSScriptRoot "..\assets\Men\MISS EDECHI GRACE.jpg"
$dstGrace = Join-Path $imgDir "miss-grace.jpg"
if (Test-Path $srcGrace) {
    Crop-Image $srcGrace $dstGrace ([System.Drawing.Rectangle]::new(245, 0, 1110, 1387))
    Write-Host "miss-grace.jpg cropped to 4:5 executive portrait"
}

# 9. Mrs. Philo Mordi (mrs-philo-mordi.jpg) - 4:5 Executive Desk Portrait
$srcPhilo = Join-Path $PSScriptRoot "..\assets\Men\Mrs Philo Mordi.jpg"
$dstPhilo = Join-Path $imgDir "mrs-philo-mordi.jpg"
if (Test-Path $srcPhilo) {
    Crop-Image $srcPhilo $dstPhilo ([System.Drawing.Rectangle]::new(154, 0, 978, 1223))
    Write-Host "mrs-philo-mordi.jpg cropped to 4:5 executive portrait"
}

# 10. Insp. James Ukpere (insp-james-ukpere.jpg) - 4:5 Executive Desk Portrait
$srcJames = Join-Path $PSScriptRoot "..\assets\Men\Insp. James Ukpers RTd POlice Offcer.jpg"
$dstJames = Join-Path $imgDir "insp-james-ukpere.jpg"
if (Test-Path $srcJames) {
    Crop-Image $srcJames $dstJames ([System.Drawing.Rectangle]::new(0, 37, 965, 1206))
    Write-Host "insp-james-ukpere.jpg cropped to 4:5 executive portrait"
}

# 11. Mr. Odogwu Victor (mr-odogwu-victor.jpg) - 4:5 Executive Desk Portrait
$srcVictor = Join-Path $PSScriptRoot "..\assets\Men\MR ODOGWU VICTOR.jpg"
$dstVictor = Join-Path $imgDir "mr-odogwu-victor.jpg"
if (Test-Path $srcVictor) {
    Crop-Image $srcVictor $dstVictor ([System.Drawing.Rectangle]::new(0, 45, 1086, 1357))
    Write-Host "mr-odogwu-victor.jpg cropped to 4:5 executive portrait"
}

# 12. Mrs. Jane Ekene Okolie (mrs-jane-ekene-okolie.jpg) - 4:5 Executive Desk Portrait
$srcJane = Join-Path $PSScriptRoot "..\assets\Men\MRs jane.jpg"
$dstJane = Join-Path $imgDir "mrs-jane-ekene-okolie.jpg"
if (Test-Path $srcJane) {
    Crop-Image $srcJane $dstJane ([System.Drawing.Rectangle]::new(87, 0, 1024, 1280))
    Write-Host "mrs-jane-ekene-okolie.jpg cropped to 4:5 executive portrait"
}


