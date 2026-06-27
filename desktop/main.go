// Zenify Desktop — a thin native shell that wraps the already-online Zenify web
// app in a WebView2 window and bridges "now playing" updates to Discord Rich
// Presence over the local Discord IPC socket (impossible from a plain browser).
//
// How it fits together:
//   - The web page dispatches `CustomEvent('zenify:nowplaying', {detail})` on
//     every track / play-pause change (see src/components/BottomPlayer.tsx).
//   - The init-script injected below listens for that event and calls the Go
//     function `zenifyPresence`, which we expose with w.Bind.
//   - A dedicated goroutine owns the Discord connection and serializes
//     SetActivity calls (rich-go is not safe for concurrent use).
package main

import (
	"flag"
	"log"
	"os"
	"strings"
	"time"

	"github.com/hugolgst/rich-go/client"
	webview "github.com/webview/webview_go"
)

// Public Discord Application ID for Zenify. Safe to commit — it is NOT a secret
// (unlike a Client Secret / Bot Token, neither of which RPC needs).
const discordAppID = "1520363130478133369"

// Art-asset keys uploaded in the Discord Developer Portal (Rich Presence → Art
// Assets). These are referenced by name, not by URL.
const (
	assetLogo    = "zenify_logo" // large image / fallback cover
	assetPlaying = "playing"     // small badge while playing
	assetPaused  = "paused"      // small badge while paused
)

// presence is the JSON shape emitted by the web page's CustomEvent detail.
type presence struct {
	Title    string  `json:"title"`
	Artist   string  `json:"artist"`
	Album    string  `json:"album"`
	Cover    string  `json:"cover"`    // absolute https URL, may be empty
	State    string  `json:"state"`    // "playing" | "paused" | "stopped"
	Position float64 `json:"position"` // seconds into the track
	Duration float64 `json:"duration"` // total track length in seconds
}

func main() {
	url := flag.String("url", envOr("ZENIFY_URL", "http://localhost:3000"),
		"URL of the online Zenify web app to load")
	dynamicCover := flag.Bool("dynamic-cover", false,
		"pass the album cover URL to Discord instead of the static zenify_logo asset "+
			"(only useful once covers are served from a stable public CDN)")
	debug := flag.Bool("debug", false, "open the webview devtools")
	flag.Parse()

	// The worker owns the Discord connection so the UI thread never blocks on IPC.
	updates := make(chan presence, 1)
	go discordWorker(updates, *dynamicCover)

	w := webview.New(*debug)
	defer w.Destroy()
	w.SetTitle("Zenify")
	w.SetSize(1100, 720, webview.HintNone)

	// Dark title bar + embedded app icon (Windows only; no-op elsewhere).
	decorateWindow(uintptr(w.Window()))

	// Exposed to the page as window.zenifyPresence(detail). webview unmarshals the
	// JS object argument straight into our struct. We hand off without blocking.
	w.Bind("zenifyPresence", func(p presence) {
		send(updates, p)
	})

	// Runs before every page's own scripts, on each navigation — so the bridge
	// survives clicking around the SPA / full reloads.
	w.Init(`
		window.__ZENIFY_DESKTOP__ = true;
		window.addEventListener('zenify:nowplaying', function (e) {
			try { window.zenifyPresence(e.detail); } catch (_) {}
		});
	`)

	w.Navigate(*url)
	w.Run()
}

// send delivers the latest presence without ever blocking the UI thread,
// coalescing so a burst keeps only the newest snapshot.
func send(ch chan presence, p presence) {
	for {
		select {
		case ch <- p:
			return
		default:
			select {
			case <-ch: // drop the stale one, then retry with the newest
			default:
			}
		}
	}
}

// discordWorker connects lazily (Discord may not be running yet) and applies
// each presence update. On any IPC error it drops the connection and reconnects
// on the next update, throttled by a short backoff.
func discordWorker(updates <-chan presence, dynamicCover bool) {
	connected := false
	var lastTry time.Time

	ensure := func() bool {
		if connected {
			return true
		}
		if time.Since(lastTry) < 5*time.Second {
			return false
		}
		lastTry = time.Now()
		if err := client.Login(discordAppID); err != nil {
			log.Printf("discord: not connected yet (%v) — is Discord running?", err)
			return false
		}
		connected = true
		log.Println("discord: connected")
		return true
	}

	for p := range updates {
		if !ensure() {
			continue
		}
		if err := client.SetActivity(buildActivity(p, dynamicCover)); err != nil {
			log.Printf("discord: SetActivity failed (%v) — will reconnect", err)
			connected = false
		}
	}
}

// buildActivity maps a now-playing snapshot to a Discord activity. Discord
// requires any present details/state string to be 2–128 chars; shorter values
// are omitted rather than rejected.
func buildActivity(p presence, dynamicCover bool) client.Activity {
	large := assetLogo
	if dynamicCover && strings.HasPrefix(p.Cover, "https://") {
		large = p.Cover
	}

	act := client.Activity{
		Details:    clamp(p.Title),
		LargeImage: large,
		LargeText:  clamp(p.Album),
	}
	if p.Artist != "" {
		act.State = clamp("by " + p.Artist)
	}

	switch p.State {
	case "playing":
		act.SmallImage = assetPlaying
		act.SmallText = "Playing"
		// Start = now - position gives Discord an "elapsed" timer; adding End makes
		// it a countdown with a progress bar.
		now := time.Now()
		start := now.Add(-time.Duration(p.Position * float64(time.Second)))
		act.Timestamps = &client.Timestamps{Start: &start}
		if p.Duration > 0 {
			end := start.Add(time.Duration(p.Duration * float64(time.Second)))
			act.Timestamps.End = &end
		}
	case "paused":
		act.SmallImage = assetPaused
		act.SmallText = "Paused"
	default: // "stopped" / empty — idle
		if act.Details == "" {
			act.Details = "Idle"
		}
	}
	return act
}

// clamp returns s only if it satisfies Discord's 2–128 char rule, else "".
func clamp(s string) string {
	s = strings.TrimSpace(s)
	if len(s) < 2 {
		return ""
	}
	if len(s) > 128 {
		return s[:128]
	}
	return s
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
