# Zenify Desktop — Discord Rich Presence (rencana)

Tujuan: profil Discord menampilkan **"Listening to Zenify"** lengkap dengan
judul lagu, artis, cover/logo, dan bar progres — sesuatu yang **tidak mungkin**
dari tab browser (browser tidak bisa mengakses socket IPC Discord lokal).

## Arsitektur — "thin shell"

```
┌────────────────────────────── desktop app (Go) ──────────────────────────────┐
│                                                                               │
│   webview (WebView2 Windows)            rich-go ──IPC──► Discord (lokal)       │
│        │  memuat ONLINE                     ▲                                  │
│        │  https://<zenify>                  │ SetActivity(judul, artis, …)     │
│        ▼                                     │                                 │
│   halaman web Zenify  ──CustomEvent──►  fungsi Go (binding)                    │
│   'zenify:nowplaying'                                                          │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Web tetap di cloud.** Desktop TIDAK membundel server Next.js (butuh RSC /
  server actions / D1 / R2). Ia hanya jendela webview yang membuka URL Zenify yang
  sudah online + jembatan native untuk Discord.
- **Jembatan:** halaman web men-`dispatch` `CustomEvent('zenify:nowplaying', …)`
  setiap ganti lagu / play / pause (sudah ditambahkan di `BottomPlayer.tsx`).
  Init-script desktop memasang listener yang meneruskan detail ke fungsi Go yang
  di-`Bind`. Go memanggil `rich-go` `SetActivity(...)`.
- **Lintas-origin aman:** `webview_go` menyuntik init-script & binding di SETIAP
  navigasi, jadi tetap bekerja walau halaman berasal dari domain online.

## Komponen

| Bagian | Teknologi | Catatan |
|---|---|---|
| Jendela | `github.com/webview/webview_go` | pinjam WebView2 bawaan Windows (~ringan, tanpa bundel Chromium) |
| Discord RPC | `github.com/hugolgst/rich-go` | hanya butuh **Application ID** `1520363130478133369` (publik) |
| Jembatan web→Go | `CustomEvent` + `w.Bind` + `w.Init` | tanpa server localhost |

## Art Assets (di-upload di Discord Developer Portal → Rich Presence → Art Assets)

| Key | Isi |
|---|---|
| `zenify_logo` | logo Zenify (large image / fallback) |
| `playing` | badge ▶️ (small image saat play) |
| `paused` | badge ⏸️ (small image saat pause) |

Cover album dinamis bersifat **best-effort**: RPC `large_image` hanya menerima
*asset key* atau URL https yang stabil & bisa diakses server Discord. Karena
`/api/cover` masih 302→presigned (kedaluwarsa) dan `r2.dev` diblokir ISP, default
memakai `zenify_logo`. Aktifkan cover dinamis (`-dynamic-cover`) hanya setelah ada
CDN domain sendiri (Tahap 3 rencana cover).

## Keamanan
- Application ID & Public Key = **publik, aman**.
- TIDAK membuat / menyimpan / commit **Client Secret** atau **Bot Token** (tidak
  diperlukan untuk RPC).

## Tahapan
1. Scaffold folder `desktop/` (Go module) — **selesai**.
2. `main.go`: connect Discord, buka webview ke URL Zenify, bind + init-script — **selesai**.
3. Web: dispatch `zenify:nowplaying` di `BottomPlayer.tsx` — **selesai**.
4. User: install Go + C compiler (mingw) + WebView2, upload 3 art asset, `go run` / `go build`.
5. (Nanti) cover dinamis setelah CDN domain aktif.
