# Zenify Desktop

Native shell (Go + WebView2) that wraps the online Zenify web app and shows
**Discord Rich Presence** ("Listening to Zenify" + song / artist / cover / progress).
This is impossible from a browser tab — Discord presence needs the local IPC
socket, which only a native process can reach.

See [`PLAN.md`](./PLAN.md) for the architecture.

## Prerequisites (Windows)

1. **Go** 1.21+ — https://go.dev/dl/
2. **A C compiler** (cgo is required by the webview binding). Easiest:
   [TDM-GCC](https://jmeubank.github.io/tdm-gcc/) or MSYS2 mingw-w64. After install,
   `gcc --version` must work in your shell.
3. **WebView2 Runtime** — already present on Windows 10/11; otherwise install the
   Evergreen runtime from Microsoft.
4. **Discord desktop** running and logged in.

## Discord Art Assets (one-time)

In the [Developer Portal](https://discord.com/developers/applications) →
your app → **Rich Presence → Art Assets**, upload three images with these exact keys:

| Key            | Image                          |
| -------------- | ------------------------------ |
| `zenify_logo`  | Zenify logo (large / fallback) |
| `playing`      | ▶️ small badge                 |
| `paused`       | ⏸️ small badge                 |

Asset changes can take a few minutes to propagate.

## Run (dev)

```sh
cd desktop
go mod tidy        # fetch webview_go + rich-go
# point at your deployed app (or run the Next.js dev server on :3000)
go run . -url https://YOUR-ZENIFY-URL
```

`-url` defaults to `http://localhost:3000` and can also be set via the `ZENIFY_URL`
env var.

## Build a standalone .exe

```sh
cd desktop
go build -ldflags="-H windowsgui" -o zenify-desktop.exe .
```

`-H windowsgui` hides the console window. Run `zenify-desktop.exe -url https://...`.

## Flags

| Flag             | Default                 | Meaning                                                                 |
| ---------------- | ----------------------- | ----------------------------------------------------------------------- |
| `-url`           | `http://localhost:3000` | Online Zenify app to load.                                              |
| `-dynamic-cover` | `false`                 | Send the album cover URL to Discord instead of `zenify_logo`. Only works once covers are on a stable public CDN (see cover plan Tahap 3); `r2.dev`/presigned URLs won't. |
| `-debug`         | `false`                 | Open the webview devtools.                                              |

## How the bridge works

The web app dispatches `CustomEvent('zenify:nowplaying', {detail})` on every
track / play-pause change (in `src/components/BottomPlayer.tsx`). In a browser
that event is harmless and unheard. Here, an injected init-script forwards the
detail to the Go-bound `window.zenifyPresence(...)`, which updates Discord. No
localhost server, no web↔desktop coupling beyond that one event.

## Security

- The **Application ID** in `main.go` is public and safe to commit.
- RPC needs **no** Client Secret or Bot Token — don't create or store them.
