Add-Type -AssemblyName System.Drawing
$sourcePath = "c:\Users\HP\Great\logo.jpg"
$destIcoPublic = "c:\Users\HP\Great\public\favicon.ico"
$destIcoApp = "c:\Users\HP\Great\src\app\favicon.ico"

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
$thumb = New-Object System.Drawing.Bitmap($bmp, 64, 64)
$iconHandle = $thumb.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)

$fs = New-Object System.IO.FileStream($destIcoPublic, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

Copy-Item $destIcoPublic $destIcoApp -Force

Write-Output "Favicon ICO created successfully with size: $((Get-Item $destIcoPublic).Length) bytes"
