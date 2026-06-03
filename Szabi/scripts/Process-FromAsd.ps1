# Cipokepek: hatter eltavolitasa, atlatszo PNG (termek) / feher hatter (akcio)
Add-Type -AssemblyName System.Drawing

if (-not ("ShoeCutout" -as [type])) {
Add-Type @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class ShoeCutout
{
    public static void Process(string srcPath, string dstPath, int targetW, int targetH, bool whiteBackground)
    {
        using (var src = new Bitmap(srcPath))
        {
            int w = src.Width, h = src.Height;
            var bg = SampleBackground(src, w, h);
            bool[,] bgMask = BuildBackgroundMask(src, w, h, bg);
            FloodFromEdges(bgMask, w, h);

            using (var cut = new Bitmap(w, h, PixelFormat.Format32bppArgb))
            {
                for (int y = 0; y < h; y++)
                {
                    for (int x = 0; x < w; x++)
                    {
                        Color c = src.GetPixel(x, y);
                        if (bgMask[x, y])
                        {
                            cut.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                            continue;
                        }
                        int alpha = EdgeAlpha(src, bgMask, x, y, w, h, bg);
                        cut.SetPixel(x, y, Color.FromArgb(alpha, c.R, c.G, c.B));
                    }
                }

                var bbox = ContentBounds(cut, w, h);
                if (bbox == null) { File.Copy(srcPath, dstPath, true); return; }

                int x0 = bbox.Value.Item1, y0 = bbox.Value.Item2;
                int cw = bbox.Value.Item3 - x0, ch = bbox.Value.Item4 - y0;
                int pad = (int)(Math.Max(cw, ch) * 0.06);

                using (var cropped = cut.Clone(new Rectangle(x0, y0, cw, ch), PixelFormat.Format32bppArgb))
                using (var padded = new Bitmap(cw + pad * 2, ch + pad * 2, PixelFormat.Format32bppArgb))
                {
                    using (var g = Graphics.FromImage(padded))
                    {
                        g.Clear(Color.Transparent);
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.DrawImage(cropped, pad, pad, cw, ch);
                    }

                    double ratio = (double)targetW / targetH;
                    int pw = padded.Width, ph = padded.Height;
                    int cw2, ch2;
                    if (pw / (double)ph > ratio) { cw2 = pw; ch2 = (int)(pw / ratio); }
                    else { ch2 = ph; cw2 = (int)(ph * ratio); }

                    using (var canvas = new Bitmap(cw2, ch2, PixelFormat.Format32bppArgb))
                    using (var g2 = Graphics.FromImage(canvas))
                    {
                        g2.Clear(whiteBackground ? Color.White : Color.Transparent);
                        g2.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g2.CompositingMode = CompositingMode.SourceOver;
                        int ox = (cw2 - pw) / 2, oy = (ch2 - ph) / 2;
                        g2.DrawImage(padded, ox, oy);

                        int maxSide = Math.Max(targetW, targetH);
                        Bitmap finalBmp = canvas;
                        if (canvas.Width > maxSide || canvas.Height > maxSide)
                        {
                            double sc = maxSide / (double)Math.Max(canvas.Width, canvas.Height);
                            int nw = (int)(canvas.Width * sc), nh = (int)(canvas.Height * sc);
                            finalBmp = new Bitmap(nw, nh, PixelFormat.Format32bppArgb);
                            using (var g3 = Graphics.FromImage(finalBmp))
                            {
                                g3.Clear(whiteBackground ? Color.White : Color.Transparent);
                                g3.InterpolationMode = InterpolationMode.HighQualityBicubic;
                                g3.DrawImage(canvas, 0, 0, nw, nh);
                            }
                        }

                        string dir = System.IO.Path.GetDirectoryName(dstPath);
                        if (!string.IsNullOrEmpty(dir)) System.IO.Directory.CreateDirectory(dir);
                        finalBmp.Save(dstPath, ImageFormat.Png);
                        if (!ReferenceEquals(finalBmp, canvas)) finalBmp.Dispose();
                    }
                }
            }
        }
    }

    static Color SampleBackground(Bitmap src, int w, int h)
    {
        long r = 0, g = 0, b = 0, n = 0;
        int s = Math.Min(12, Math.Min(w, h) / 8);
        int[,] corners = { {0,0}, {w-s,0}, {0,h-s}, {w-s,h-s} };
        foreach (var corner in new[] { Tuple.Create(0,0), Tuple.Create(w-s,0), Tuple.Create(0,h-s), Tuple.Create(w-s,h-s) })
        {
            for (int y = corner.Item2; y < corner.Item2 + s; y++)
            for (int x = corner.Item1; x < corner.Item1 + s; x++)
            {
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                Color c = src.GetPixel(x, y);
                r += c.R; g += c.G; b += c.B; n++;
            }
        }
        if (n == 0) return Color.White;
        return Color.FromArgb((int)(r/n), (int)(g/n), (int)(b/n));
    }

    static bool IsBackgroundLike(Color c, Color bg)
    {
        if (c.A < 15) return true;
        int dr = c.R - bg.R, dg = c.G - bg.G, db = c.B - bg.B;
        int dist = dr*dr + dg*dg + db*db;
        if (dist < 45 * 45) return true;
        int mx = Math.Max(c.R, Math.Max(c.G, c.B));
        int mn = Math.Min(c.R, Math.Min(c.G, c.B));
        int sat = mx - mn;
        if (mx >= 235 && sat <= 22) return true;
        if (mx >= 210 && mn >= 190 && sat <= 35) return true;
        int bgL = (bg.R + bg.G + bg.B) / 3;
        int cL = (c.R + c.G + c.B) / 3;
        if (Math.Abs(cL - bgL) < 28 && sat < 40) return true;
        return false;
    }

    static bool[,] BuildBackgroundMask(Bitmap src, int w, int h, Color bg)
    {
        var mask = new bool[w, h];
        for (int y = 0; y < h; y++)
        for (int x = 0; x < w; x++)
            mask[x, y] = IsBackgroundLike(src.GetPixel(x, y), bg);
        return mask;
    }

    static void FloodFromEdges(bool[,] mask, int w, int h)
    {
        var q = new Queue<Tuple<int,int>>();
        var seen = new bool[w, h];
        Action tryAdd = () => { };
        for (int x = 0; x < w; x++)
        {
            EnqueueIfBg(mask, seen, q, x, 0);
            EnqueueIfBg(mask, seen, q, x, h - 1);
        }
        for (int y = 0; y < h; y++)
        {
            EnqueueIfBg(mask, seen, q, 0, y);
            EnqueueIfBg(mask, seen, q, w - 1, y);
        }
        int[] dx = { -1, 1, 0, 0 }, dy = { 0, 0, -1, 1 };
        while (q.Count > 0)
        {
            var p = q.Dequeue();
            int x = p.Item1, y = p.Item2;
            mask[x, y] = true;
            for (int i = 0; i < 4; i++)
            {
                int nx = x + dx[i], ny = y + dy[i];
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                if (seen[nx, ny] || !mask[nx, ny]) continue;
                seen[nx, ny] = true;
                q.Enqueue(Tuple.Create(nx, ny));
            }
        }
    }

    static void EnqueueIfBg(bool[,] mask, bool[,] seen, Queue<Tuple<int,int>> q, int x, int y)
    {
        if (mask[x, y] && !seen[x, y]) { seen[x, y] = true; q.Enqueue(Tuple.Create(x, y)); }
    }

    static int EdgeAlpha(Bitmap src, bool[,] bgMask, int x, int y, int w, int h, Color bg)
    {
        if (!bgMask[x, y]) return 255;
        return 0;
    }

    static Tuple<int,int,int,int>? ContentBounds(Bitmap bmp, int w, int h)
    {
        int minX = w, minY = h, maxX = 0, maxY = 0;
        bool found = false;
        for (int y = 0; y < h; y++)
        for (int x = 0; x < w; x++)
        {
            if (bmp.GetPixel(x, y).A > 12)
            {
                found = true;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
        if (!found) return null;
        return Tuple.Create(minX, minY, maxX + 1, maxY + 1);
    }
}
"@
}

$Asd = "C:\Users\Szabolcs\Desktop\asd"
$Out = "C:\Users\Szabolcs\Desktop\igen\images"

function Resolve-AsdFile([string]$name) {
    $p = Join-Path $Asd $name
    if (Test-Path -LiteralPath $p) { return $p }
    Get-ChildItem -LiteralPath $Asd -File | Where-Object { $_.Name -ieq $name } | Select-Object -First 1 -ExpandProperty FullName
}

# Csak tiszta studioban keszult kepek (nem banner / szoveges grafika)
$Jobs = @(
    @{ Src = "nike airmax feher.png";      Out = "akcio-airmax-feher.png";      W = 960; H = 600; White = $true }
    @{ Src = "airmax feher+kék.png";       Out = "akcio-airmax-feher-kek.png";  W = 960; H = 600; White = $true }
    @{ Src = "airmax kék 2.png";           Out = "akcio-airmax-kek-2.png";      W = 960; H = 600; White = $true }
    @{ Src = "nike cipo kék.png";          Out = "akcio-nike-kek.png";          W = 960; H = 600; White = $true }
    @{ Src = "nike cipo piros.png";        Out = "akcio-nike-piros.png";        W = 960; H = 600; White = $true }
    @{ Src = "Nike cipo fekete feher.png"; Out = "termek-white-af1.png";        W = 800; H = 600; White = $false }
    @{ Src = "nike cipo piros.png";        Out = "termek-black-af1.png";        W = 800; H = 600; White = $false }
    @{ Src = "nike airmax feher.png";      Out = "termek-airmax-feher.png";     W = 800; H = 600; White = $false }
    @{ Src = "Nike cipo fekete feher.png"; Out = "termek-nike-fekete-feher.png"; W = 800; H = 600; White = $false }
    @{ Src = "nike cipo kék.png";          Out = "logo.png";                    W = 220; H = 220; White = $false }
)

$log = Join-Path $Out "_process-log.txt"
"" | Set-Content $log

foreach ($job in $Jobs) {
    $src = Resolve-AsdFile $job.Src
    if (-not $src) {
        "MISSING $($job.Src)" | Add-Content $log
        continue
    }
    $dst = Join-Path $Out $job.Out
    try {
        [ShoeCutout]::Process($src, $dst, $job.W, $job.H, $job.White)
        "OK $($job.Out)" | Add-Content $log
    } catch {
        "ERR $($job.Out): $_" | Add-Content $log
    }
}

"done $(Get-Date)" | Add-Content $log
