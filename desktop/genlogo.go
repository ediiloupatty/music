//go:build ignore

// Generates public/logo.png — the Zenify logo: a teal gradient squircle with a
// white equalizer-bars glyph. Kept pixel-for-pixel in sync with public/logo.svg.
// Usage: go run genlogo.go
package main

import (
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
)

const size = 512

// Brand gradient stops (top-left -> bottom-right): #2dd4bf, #14b8a6, #0d9488.
var (
	g0 = color.NRGBA{0x2d, 0xd4, 0xbf, 255}
	g1 = color.NRGBA{0x14, 0xb8, 0xa6, 255}
	g2 = color.NRGBA{0x0d, 0x94, 0x88, 255}
)

// equalizer bars: {x, height} — each vertically centred on 256.
var bars = [][2]float64{
	{90, 150}, {162, 250}, {234, 340}, {306, 220}, {378, 130},
}

const barW = 44.0

func main() {
	img := image.NewNRGBA(image.Rect(0, 0, size, size))

	hw := float64(size) / 2
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			px, py := float64(x)+0.5, float64(y)+0.5

			// background squircle (rounded rect, r=120)
			bgCov := coverage(sdRoundRect(px, py, hw, hw, hw, hw, 120))
			if bgCov <= 0 {
				continue
			}
			c := gradient(px, py)
			c = sheen(c, px, py) // top-left highlight
			set(img, x, y, c, bgCov)

			// equalizer bars on top (white, fully rounded caps)
			for _, b := range bars {
				cx := b[0] + barW/2
				hh := b[1] / 2
				cov := coverage(sdRoundRect(px, py, cx, 256, barW/2, hh, barW/2))
				if cov > 0 {
					set(img, x, y, color.NRGBA{255, 255, 255, 255}, cov)
				}
			}
		}
	}

	f, err := os.Create("../public/logo.png")
	if err != nil {
		panic(err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		panic(err)
	}
	println("wrote ../public/logo.png (512x512)")
}

// signed distance to a rounded rect centred at (cx,cy) with half-size (hw,hh).
func sdRoundRect(px, py, cx, cy, hw, hh, r float64) float64 {
	qx := math.Abs(px-cx) - (hw - r)
	qy := math.Abs(py-cy) - (hh - r)
	ax, ay := math.Max(qx, 0), math.Max(qy, 0)
	return math.Sqrt(ax*ax+ay*ay) + math.Min(math.Max(qx, qy), 0) - r
}

// 1px anti-aliased coverage from a signed distance (inside = negative).
func coverage(sd float64) float64 {
	return math.Max(0, math.Min(1, 0.5-sd))
}

// diagonal 3-stop gradient sampled at (x,y).
func gradient(x, y float64) color.NRGBA {
	t := (x + y) / (2 * float64(size))
	if t < 0.55 {
		return lerpC(g0, g1, t/0.55)
	}
	return lerpC(g1, g2, (t-0.55)/0.45)
}

// soft white radial sheen near the top-left, fading out.
func sheen(c color.NRGBA, x, y float64) color.NRGBA {
	cx, cy := 0.3*float64(size), 0.24*float64(size)
	dx, dy := x-cx, y-cy
	d := math.Sqrt(dx*dx+dy*dy) / (0.85 * float64(size))
	a := math.Max(0, 1-d) * 0.22
	return color.NRGBA{
		R: lerp8(c.R, 255, a), G: lerp8(c.G, 255, a), B: lerp8(c.B, 255, a), A: 255,
	}
}

func set(img *image.NRGBA, x, y int, c color.NRGBA, alpha float64) {
	src := img.NRGBAAt(x, y)
	a := alpha * float64(c.A) / 255
	img.SetNRGBA(x, y, color.NRGBA{
		R: lerp8(src.R, c.R, a), G: lerp8(src.G, c.G, a), B: lerp8(src.B, c.B, a), A: 255,
	})
}

func lerpC(a, b color.NRGBA, t float64) color.NRGBA {
	return color.NRGBA{lerp8(a.R, b.R, t), lerp8(a.G, b.G, t), lerp8(a.B, b.B, t), 255}
}

func lerp8(a, b uint8, t float64) uint8 {
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}
	return uint8(float64(a)*(1-t) + float64(b)*t + 0.5)
}
