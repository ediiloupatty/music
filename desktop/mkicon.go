//go:build ignore

// Converts a PNG/JPG to a Windows .ico file (single image, PNG-in-ICO).
// Usage: go run mkicon.go <input.png> <output.ico>
package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"os"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "usage: go run mkicon.go <input.png> <output.ico>")
		os.Exit(1)
	}

	data, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	// ICO format: 0 in width/height field means 256
	w, h := cfg.Width, cfg.Height
	bw, bh := byte(w), byte(h)
	if w >= 256 {
		bw = 0
	}
	if h >= 256 {
		bh = 0
	}

	var buf bytes.Buffer
	// ICONDIR (6 bytes)
	binary.Write(&buf, binary.LittleEndian, uint16(0)) // reserved
	binary.Write(&buf, binary.LittleEndian, uint16(1)) // type = icon
	binary.Write(&buf, binary.LittleEndian, uint16(1)) // count = 1
	// ICONDIRENTRY (16 bytes)
	buf.WriteByte(bw)
	buf.WriteByte(bh)
	buf.WriteByte(0)   // color count (0 = truecolor)
	buf.WriteByte(0)   // reserved
	binary.Write(&buf, binary.LittleEndian, uint16(1))           // planes
	binary.Write(&buf, binary.LittleEndian, uint16(32))          // bit depth
	binary.Write(&buf, binary.LittleEndian, uint32(len(data)))   // image size
	binary.Write(&buf, binary.LittleEndian, uint32(6+16))        // offset to image data

	buf.Write(data)

	if err := os.WriteFile(os.Args[2], buf.Bytes(), 0644); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("wrote %s (%dx%d)\n", os.Args[2], cfg.Width, cfg.Height)
}
