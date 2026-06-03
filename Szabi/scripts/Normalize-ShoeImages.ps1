Add-Type -AssemblyName System.Drawing

$OutDir = "C:\Users\Szabolcs\Desktop\igen\images"
$Files = @(
    "akcio-airmax-feher.png",
    "akcio-airmax-feher-kek.png",
    "akcio-airmax-kek-2.png",
    "akcio-nike-kek.png",
    "akcio-nike-piros.png",
    "termek-airmax-feher.png",
    "termek-white-af1.png",
    "termek-black-af1.png",
    "termek-nike-fekete-feher.png",
    "logo.png"
)

function Test-Background([System.Drawing.Color]$c) {
    if ($c.A -lt 20) { return $true }
    $mx = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
    $mn = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
    if ($mx -ge 238 -and ($mx - $mn) -le 28) { return $true }
    if ($mx -ge 220 -and $mn -ge 200 -and ($mx - $mn) -le 35) { return $true }
    return $false
}

function Normalize-Image {
    param(
        [string]$Path,
        [int]$TargetW,
        [int]$TargetH,
        [double]$PadRatio = 0.08
    )

    $bmp = [System.Drawing.Bitmap]::FromFile($Path)
    $minX = $bmp.Width; $minY = $bmp.Height
    $maxX = 0; $maxY = 0
    $found = $false

    $step = 2
    for ($y = 0; $y -lt $bmp.Height; $y += $step) {
        for ($x = 0; $x -lt $bmp.Width; $x += $step) {
            $c = $bmp.GetPixel($x, $y)
            if (-not (Test-Background $c)) {
                $found = $true
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $maxX = [Math]::Min($bmp.Width - 1, $maxX + $step)
    $maxY = [Math]::Min($bmp.Height - 1, $maxY + $step)

    if (-not $found) {
        $bmp.Dispose()
        return
    }

    $cw = $maxX - $minX + 1
    $ch = $maxY - $minY + 1
    $pad = [int]([Math]::Max($cw, $ch) * $PadRatio)
    $pw = $cw + $pad * 2
    $ph = $ch + $pad * 2

    $padded = New-Object System.Drawing.Bitmap $pw, $ph
    $g = [System.Drawing.Graphics]::FromImage($padded)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bmp, $pad, $pad, (New-Object System.Drawing.Rectangle $minX, $minY, $cw, $ch), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $bmp.Dispose()

    $ratio = $TargetW / $TargetH
    $cur = $pw / $ph
    if ($cur -gt $ratio) {
        $cw2 = $pw
        $ch2 = [int]($pw / $ratio)
    } else {
        $ch2 = $ph
        $cw2 = [int]($ph * $ratio)
    }

    $canvas = New-Object System.Drawing.Bitmap $cw2, $ch2
    $g2 = [System.Drawing.Graphics]::FromImage($canvas)
    $g2.Clear([System.Drawing.Color]::White)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $ox = [int](($cw2 - $pw) / 2)
    $oy = [int](($ch2 - $ph) / 2)
    $g2.DrawImage($padded, $ox, $oy)
    $g2.Dispose()
    $padded.Dispose()

    $maxSide = [Math]::Max($TargetW, $TargetH)
    if ($canvas.Width -gt $maxSide -or $canvas.Height -gt $maxSide) {
        $scale = $maxSide / [Math]::Max($canvas.Width, $canvas.Height)
        $nw = [int]($canvas.Width * $scale)
        $nh = [int]($canvas.Height * $scale)
        $scaled = New-Object System.Drawing.Bitmap $nw, $nh
        $g3 = [System.Drawing.Graphics]::FromImage($scaled)
        $g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g3.DrawImage($canvas, 0, 0, $nw, $nh)
        $g3.Dispose()
        $canvas.Dispose()
        $canvas = $scaled
    }

    $temp = "$Path.tmp.png"
    $canvas.Save($temp, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Move-Item -Force $temp $Path
}

foreach ($name in $Files) {
    $path = Join-Path $OutDir $name
    if (-not (Test-Path $path)) { continue }
    if ($name -eq "logo.png") {
        Normalize-Image -Path $path -TargetW 220 -TargetH 220 -PadRatio 0.05
    } elseif ($name -like "akcio-*") {
        Normalize-Image -Path $path -TargetW 960 -TargetH 600 -PadRatio 0.07
    } else {
        Normalize-Image -Path $path -TargetW 800 -TargetH 600 -PadRatio 0.06
    }
    Write-Output "OK $name"
}

Remove-Item (Join-Path $OutDir "akcio-air-max.png") -Force -ErrorAction SilentlyContinue
