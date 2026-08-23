# Genera los iconos de la PWA y el logo de los PDF a partir del logo original.
#
#   powershell -ExecutionPolicy Bypass -File scripts\logo-a-iconos.ps1
#
# Entrada:  image/Logo_Fenix.jpg  (el banner, fenix naranja sobre negro)
# Salidas:  public/icons/*.png       iconos de la app instalada
#           src/assets/logo-fenix.png  la marca sola, para el encabezado de los PDF
#
# El banner trae el fondo negro con textura JPEG. Aqui se recorta la marca, se
# la pasa a fondo transparente y se la vuelve a componer sobre un negro plano:
# el icono queda nitido y pesa una fraccion de lo que pesaba con el ruido.

Add-Type -AssemblyName System.Drawing

$raiz    = Split-Path -Parent $PSScriptRoot
$origen  = Join-Path $raiz "image\Logo_Fenix.jpg"
$destino = Join-Path $raiz "public\icons"
New-Item -ItemType Directory -Force -Path $destino | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $raiz "src\assets") | Out-Null

$FONDO = [System.Drawing.Color]::FromArgb(255, 15, 15, 15)

$src = [System.Drawing.Bitmap]::FromFile($origen)
Write-Output ("origen: {0}x{1}" -f $src.Width, $src.Height)

# --- Una sola pasada de lectura: GetPixel sobre 4 millones de pixeles no ---
$rect  = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $src.Height
$datos = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($datos.Stride * $src.Height)
[System.Runtime.InteropServices.Marshal]::Copy($datos.Scan0, $bytes, 0, $bytes.Length)
$src.UnlockBits($datos)
$stride = $datos.Stride

# --- Caja de la marca y su naranja promedio ---
$minX = $src.Width; $minY = $src.Height; $maxX = -1; $maxY = -1
[long]$sr = 0; [long]$sg = 0; [long]$sb = 0; [long]$n = 0
for ($y = 0; $y -lt $src.Height; $y++) {
  $fila = $y * $stride
  for ($x = 0; $x -lt $src.Width; $x++) {
    $o = $fila + $x * 4
    $b = $bytes[$o]; $g = $bytes[$o + 1]; $r = $bytes[$o + 2]
    if ($r -gt 110 -and $r - $b -gt 50) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
      if ($r -gt 170) { $sr += $r; $sg += $g; $sb += $b; $n++ }
    }
  }
}
$naranja = [System.Drawing.Color]::FromArgb([int]($sr / $n), [int]($sg / $n), [int]($sb / $n))
Write-Output ("naranja de marca: #{0:X2}{1:X2}{2:X2}" -f $naranja.R, $naranja.G, $naranja.B)

# Cuadrado ajustado a la marca, con un pelo de aire.
$cx = ($minX + $maxX) / 2.0
$cy = ($minY + $maxY) / 2.0
$lado = [int]([Math]::Max($maxX - $minX + 1, $maxY - $minY + 1) * 1.04)
$recorte = New-Object System.Drawing.Rectangle ([int]($cx - $lado / 2)), ([int]($cy - $lado / 2)), $lado, $lado

# --- La marca, en alta y con fondo transparente. Base de todo lo demas. ---
# Ojo: PowerShell no distingue mayusculas, asi que el tamano no puede llamarse
# $MARCA mientras el bitmap se llama $marca: serian la misma variable.
$LADO = 1024
$marca = New-Object System.Drawing.Bitmap $LADO, $LADO, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($marca)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $LADO, $LADO), $recorte, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# El alfa sale de la luminancia: los bordes suavizados quedan limpios y el
# color se uniforma al naranja de marca, sin el ruido del JPEG.
$r2 = New-Object System.Drawing.Rectangle 0, 0, $LADO, $LADO
$d2 = $marca.LockBits($r2, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$b2 = New-Object byte[] ($d2.Stride * $LADO)
[System.Runtime.InteropServices.Marshal]::Copy($d2.Scan0, $b2, 0, $b2.Length)
for ($i = 0; $i -lt $b2.Length; $i += 4) {
  $lum = 0.299 * $b2[$i + 2] + 0.587 * $b2[$i + 1] + 0.114 * $b2[$i]
  $a = [Math]::Max(0, [Math]::Min(255, [int](($lum - 18) * 2.4)))
  $b2[$i] = $naranja.B; $b2[$i + 1] = $naranja.G; $b2[$i + 2] = $naranja.R; $b2[$i + 3] = $a
}
[System.Runtime.InteropServices.Marshal]::Copy($b2, 0, $d2.Scan0, $b2.Length)
$marca.UnlockBits($d2)
$src.Dispose()

# Para el encabezado de los PDF, que es papel blanco: la marca sola.
# 256 px basta: en el PDF se dibuja a 64 pt, y el archivo viaja por WhatsApp.
$pdf = New-Object System.Drawing.Bitmap 256, 256, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gp = [System.Drawing.Graphics]::FromImage($pdf)
$gp.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gp.DrawImage($marca, 0, 0, 256, 256)
$gp.Dispose()
$pdf.Save((Join-Path $raiz "src\assets\logo-fenix.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$pdf.Dispose()

# Icono: marca sobre negro plano. "ocupacion" es cuanto del lienzo llena la
# marca; el maskable deja mas aire porque Android le recorta las esquinas.
function Icono([string]$nombre, [int]$tam, [double]$ocupacion) {
  $bmp = New-Object System.Drawing.Bitmap $tam, $tam, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($FONDO)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $lado = [int]($tam * $ocupacion)
  $off = [int](($tam - $lado) / 2)
  $g.DrawImage($script:marca, $off, $off, $lado, $lado)
  $g.Dispose()
  $bmp.Save((Join-Path $destino $nombre), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Icono "icon-192.png"         192 0.84
Icono "icon-512.png"         512 0.84
Icono "apple-touch-icon.png" 180 0.84
Icono "favicon.png"           64 0.90
# Zona segura del maskable: la marca tiene que caber en el 80% central.
Icono "maskable-512.png"     512 0.62

$marca.Dispose()
Get-ChildItem $destino | Select-Object Name, @{n = "KB"; e = { [math]::Round($_.Length / 1KB, 1) } } | Format-Table -AutoSize | Out-String | Write-Output
