// Command dedupe finds audio files in the download folder that already exist in
// the D1 `tracks` table and (optionally) deletes them from disk. It mirrors the
// uploader's duplicate-detection exactly: songKey = normalize(title)|artist|album,
// with embedded tags taking precedence over the artist/album/title derived from
// the folder path.
//
// Usage:
//
//	go run ./dedupe -dir ./download           # dry-run: only list duplicates
//	go run ./dedupe -dir ./download -delete    # actually delete the duplicates
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/dhowden/tag"
	"github.com/joho/godotenv"
)

var audioExts = map[string]bool{
	".flac": true, ".mp3": true, ".wav": true,
	".m4a": true, ".ogg": true, ".aac": true,
}

func main() {
	dirPtr := flag.String("dir", "./download", "Directory containing downloaded songs")
	deletePtr := flag.Bool("delete", false, "Actually delete duplicate files (default is dry-run)")
	flag.Parse()

	if err := godotenv.Load("../.env", ".env"); err != nil {
		log.Println("⚠️  Warning: Tidak menemukan file .env, menggunakan system environment variables.")
	}

	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	d1ID := os.Getenv("D1_DATABASE_ID")
	d1Token := os.Getenv("CLOUDFLARE_API_TOKEN")
	if accountID == "" || d1ID == "" || d1Token == "" {
		log.Fatal("❌ Error: Kredensial D1 tidak lengkap di .env (butuh CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID, CLOUDFLARE_API_TOKEN).")
	}

	d1 := &d1Client{
		endpoint: fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/d1/database/%s/query", accountID, d1ID),
		token:    d1Token,
		http:     &http.Client{Timeout: 30 * time.Second},
	}

	fmt.Println("🔍 Membaca data tracks dari D1...")
	existing, err := d1.loadExisting(context.TODO())
	if err != nil {
		log.Fatalf("❌ Gagal membaca data tracks: %v", err)
	}
	fmt.Printf("📚 %d lagu sudah ada di database.\n\n", len(existing))

	root := filepath.Clean(*dirPtr)
	type dup struct {
		path  string
		label string
	}
	var dups []dup
	var notInDB []string
	totalAudio := 0

	err = filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(p))
		if !audioExts[ext] {
			return nil
		}
		totalAudio++

		rel, _ := filepath.Rel(root, p)
		rel = filepath.ToSlash(rel)
		artist, album, title := deriveFromPath(rel)
		if tTitle, tArtist, tAlbum, ok := readTags(p); ok {
			if tTitle != "" {
				title = tTitle
			}
			if tArtist != "" {
				artist = tArtist
			}
			if tAlbum != "" {
				album = tAlbum
			}
		}
		if existing[songKey(title, artist, album)] {
			dups = append(dups, dup{path: p, label: fmt.Sprintf("%s — %s", strings.TrimSpace(artist), strings.TrimSpace(title))})
		} else {
			notInDB = append(notInDB, fmt.Sprintf("%s — %s  (%s)", strings.TrimSpace(artist), strings.TrimSpace(title), rel))
		}
		return nil
	})
	if err != nil {
		log.Fatalf("❌ Gagal membaca folder: %v", err)
	}

	sort.Slice(dups, func(i, j int) bool { return dups[i].path < dups[j].path })

	fmt.Printf("📦 Total file audio di folder: %d\n", totalAudio)
	fmt.Printf("🔁 Duplikat (sudah ada di DB):  %d\n", len(dups))
	fmt.Printf("🆕 BELUM ada di DB (akan disimpan): %d\n", len(notInDB))
	for _, n := range notInDB {
		fmt.Printf("     ↳ %s\n", n)
	}
	fmt.Println()

	if len(dups) == 0 {
		fmt.Println("✅ Tidak ada duplikat. Tidak ada yang dihapus.")
		return
	}

	for _, d := range dups {
		fmt.Printf("  • %s\n", d.label)
	}
	fmt.Println()

	if !*deletePtr {
		fmt.Println("ℹ️  DRY-RUN: tidak ada file yang dihapus. Jalankan ulang dengan -delete untuk menghapus.")
		return
	}

	deleted := 0
	for _, d := range dups {
		if err := os.Remove(d.path); err != nil {
			fmt.Printf("❌ Gagal hapus %s: %v\n", d.path, err)
			continue
		}
		deleted++
	}
	removedDirs := removeEmptyDirs(root)

	fmt.Printf("\n🗑️  Dihapus %d file duplikat.\n", deleted)
	if removedDirs > 0 {
		fmt.Printf("🧹 Dibersihkan %d folder kosong.\n", removedDirs)
	}
}

// removeEmptyDirs deletes now-empty album/artist folders (deepest first),
// leaving the root in place. Returns the number of directories removed.
func removeEmptyDirs(root string) int {
	var dirs []string
	filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
		if err == nil && info.IsDir() {
			dirs = append(dirs, p)
		}
		return nil
	})
	sort.Slice(dirs, func(i, j int) bool { return len(dirs[i]) > len(dirs[j]) }) // deepest first
	removed := 0
	for _, d := range dirs {
		if d == root {
			continue
		}
		entries, err := os.ReadDir(d)
		if err == nil && len(entries) == 0 {
			if os.Remove(d) == nil {
				removed++
			}
		}
	}
	return removed
}

func deriveFromPath(rel string) (artist, album, title string) {
	segs := strings.Split(rel, "/")
	base := segs[len(segs)-1]
	title = strings.TrimSuffix(base, filepath.Ext(base))
	switch {
	case len(segs) >= 3:
		artist, album = segs[0], segs[1]
	case len(segs) == 2:
		artist = segs[0]
	}
	return
}

func readTags(p string) (title, artist, album string, ok bool) {
	f, err := os.Open(p)
	if err != nil {
		return "", "", "", false
	}
	defer f.Close()
	m, err := tag.ReadFrom(f)
	if err != nil {
		return "", "", "", false
	}
	return m.Title(), m.Artist(), m.Album(), true
}

func songKey(title, artist, album string) string {
	return normalize(title) + "|" + normalize(artist) + "|" + normalize(album)
}

func normalize(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(s)), " ")
}

// ─── D1 REST client (same endpoint as the app & uploader) ────────────────────

type d1Client struct {
	endpoint string
	token    string
	http     *http.Client
}

func (c *d1Client) loadExisting(ctx context.Context) (map[string]bool, error) {
	rows, err := c.query(ctx, "SELECT title, artist, album FROM tracks", nil)
	if err != nil {
		return nil, err
	}
	songs := make(map[string]bool, len(rows))
	for _, r := range rows {
		songs[songKey(asString(r["title"]), asString(r["artist"]), asString(r["album"]))] = true
	}
	return songs, nil
}

func (c *d1Client) query(ctx context.Context, sql string, params []interface{}) ([]map[string]interface{}, error) {
	if params == nil {
		params = []interface{}{}
	}
	body, _ := json.Marshal(map[string]interface{}{"sql": sql, "params": params})
	req, err := http.NewRequestWithContext(ctx, "POST", c.endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
		Result []struct {
			Results []map[string]interface{} `json:"results"`
		} `json:"result"`
	}
	raw, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("respons D1 tidak valid (HTTP %d): %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	if !out.Success {
		msg := "unknown error"
		if len(out.Errors) > 0 {
			msg = out.Errors[0].Message
		}
		return nil, fmt.Errorf("%s", msg)
	}
	if len(out.Result) > 0 {
		return out.Result[0].Results, nil
	}
	return nil, nil
}

func asString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
