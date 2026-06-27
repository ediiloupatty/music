# Membagikan Zenify ke Orang Lain

## 1. Build exe produksi

URL deploy "ditanam" ke exe supaya pengguna tinggal double-click (tanpa flag).
Dari CMD (bukan MSYS2), di folder `desktop`:

```
release.bat https://URL-ZENIFY-KAMU
```

Hasil: `zenify-desktop.exe` (~6–7 MB) dengan logo & URL produksi sudah di dalamnya.
File ini **portable** — bisa langsung dikirim (Drive/WeTransfer/dll) dan dijalankan.

## 2. (Opsional) Bikin installer yang rapi

Single exe sudah cukup, tapi installer kasih Start Menu + uninstaller:

1. Install **Inno Setup**: https://jrsoftware.org/isdl.php
2. Buka `Zenify.iss` → klik **Compile** (atau `iscc Zenify.iss`)
3. Hasil: `Output\ZenifySetup.exe` — itu yang kamu bagikan.

## 3. Yang perlu diketahui pengguna

**WebView2 Runtime** — Zenify pakai engine WebView2 milik Windows.
- Windows 11 & Windows 10 versi baru: **sudah ada**, langsung jalan.
- Windows lama yang belum punya: download gratis sekali dari Microsoft
  (Evergreen Standalone): https://developer.microsoft.com/microsoft-edge/webview2/
  Installer Inno bisa diatur untuk mengeceknya otomatis kalau perlu.

**Peringatan SmartScreen** — karena exe belum ditandatangani (code signing), Windows
mungkin menampilkan "Windows protected your PC". Pengguna klik **More info → Run
anyway**. Untuk menghilangkan peringatan ini permanen perlu **code signing
certificate** (berbayar, opsional).

**Discord Rich Presence** — hanya tampil kalau Discord desktop pengguna sedang jalan.
Art assets (`zenify_logo`, `playing`, `paused`) sudah di Developer Portal-mu, jadi
otomatis muncul untuk semua pengguna.

## Ringkas

| Mau bagikan sebagai | Lakukan |
| --- | --- |
| 1 file portable | `release.bat https://...` → kirim `zenify-desktop.exe` |
| Installer | build di atas, lalu compile `Zenify.iss` → kirim `ZenifySetup.exe` |
