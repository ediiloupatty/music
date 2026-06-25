# Implementation Plan (Vertical Slices / Kanban)
**Project**: Zenify (Productivity Music Player)

Sesuai instruksi Anda, rencana implementasi ini menggunakan pendekatan **Vertical Slices (Tracer Bullets)**. Daripada membangun seluruh Database, lalu seluruh API, baru seluruh Frontend (horizontal), kita akan membangun fitur satu per satu secara utuh dari *back-end* hingga *front-end* agar selalu bisa dites pada setiap fasenya.

## 1. Goal Description

Membangun aplikasi Zenify secara bertahap (iteratif) melalui potongan vertikal yang fungsional dan dapat langsung diuji (*testable*).

## 2. User Review Required

> [!IMPORTANT]
> **Setup Cloudflare R2 & D1:**
> Sebelum kita memulai **Slice 3**, Anda perlu membuat bucket di **Cloudflare R2** (untuk menyimpan lagu) dan menyiapkan database **Cloudflare D1**. Anda juga harus menyiapkan _Access Key_ dan _Secret Key_ dari Cloudflare agar aplikasi Next.js dapat terhubung ke R2 dan D1. Apakah Anda siap dengan setup ini?

## 3. Proposed Changes (Vertical Slices)

### Slice 1: Project Scaffold & Thematic UI Foundation
**Tujuan**: Membuat pondasi proyek dan sistem desain agar aplikasi langsung terlihat memukau (Glassmorphism & Dark Mode).
- [NEW] Inisialisasi proyek Next.js.
- [NEW] Setup styling global (CSS/Tailwind) untuk efek *Glassmorphism*.
- [NEW] Halaman utama (`/`) dengan *layout* statis (header, area utama, placeholder untuk player di bawah).
- **Hasil yang bisa dites**: Website bisa dibuka di `localhost:3000` dan langsung menampilkan desain UI premium yang responsif.

---

### Slice 2: Local Audio Player & Pomodoro Timer (Frontend Logic)
**Tujuan**: Menghidupkan fitur pemutar musik dasar dan timer sebelum terhubung ke database.
- [NEW] Komponen Pomodoro Timer (hitungan mundur 25/5 menit).
- [NEW] Komponen Audio Player menggunakan `<audio>` HTML5 standar dengan 1 file `.mp3` *dummy* lokal.
- [NEW] Tombol Play, Pause, dan Volume.
- **Hasil yang bisa dites**: Pengguna bisa menekan Play untuk mendengar lagu *dummy* lokal, dan menjalankan/menghentikan Pomodoro Timer.

---

### Slice 3: Admin Upload Tracer (End-to-End Database & Storage)
**Tujuan**: Menghubungkan aplikasi ke Cloudflare agar admin bisa mengunggah lagu secara nyata.
- [NEW] Setup *Cloudflare S3/R2 Client* (AWS SDK) dan *D1 Database Client* di dalam proyek Next.js.
- [NEW] Membuat halaman `/admin` (dengan form upload file sederhana).
- [NEW] Logika form: mengunggah file musik `.mp3` ke **Cloudflare R2**, lalu menyimpan data (Judul, URL lagu, Kategori) ke **Cloudflare D1**.
- **Hasil yang bisa dites**: Kita buka `/admin`, unggah file musik beneran. File akan muncul di *bucket* Cloudflare R2 dan datanya tercatat di tabel *D1 Database*.

---

### Slice 4: Dynamic Playlist & Category Selector (End-to-End)
**Tujuan**: Menampilkan lagu yang sudah diunggah admin ke pengguna biasa di halaman utama.
- [MODIFY] Halaman `/` agar mengambil (*fetch*) daftar lagu dari Cloudflare D1 berdasarkan kategori (Deep Coding, dll).
- [MODIFY] Komponen Audio Player agar menerima URL lagu asli dari Cloudflare R2, bukan lagi file *dummy*.
- [NEW] Tombol pemilih Kategori (Deep Coding, Creative Design, dll).
- **Hasil yang bisa dites**: Di halaman utama, kita klik kategori "Deep Coding", daftar lagunya muncul dari *D1 database*, lalu kita klik lagu tersebut dan musik langsung terputar secara *streaming* dari Cloudflare R2.

---

### Slice 5: User Accounts & Favorites (End-to-End)
**Tujuan**: Fitur login pengguna untuk menyimpan lagu favorit.
- [NEW] Halaman Login/Register sederhana dengan Auth.js (atau sistem auth khusus Cloudflare yang Anda gunakan).
- [NEW] Tombol ikon "Hati" (Favorite) di sebelah judul lagu pada halaman utama.
- [NEW] Logika klik "Hati": menyimpan relasi User dan Lagu ke tabel `favorites` di Cloudflare D1.
- **Hasil yang bisa dites**: Buat akun pengguna, login, klik ikon hati di salah satu lagu. Saat *refresh* halaman, status hati tersebut tetap tersimpan.

---

### Slice 6: Polish (Visualizer & Background Animations)
**Tujuan**: Menyempurnakan estetika agar website tidak membosankan dan membantu produktivitas.
- [NEW] Menambahkan Audio Visualizer sederhana yang merespons lagu yang sedang diputar.
- [NEW] Animasi gambar latar (*background*) yang berubah berdasarkan kategori (misalnya nuansa alam untuk *Routine Tasks*, *dark tech* untuk *Deep Coding*).
- **Hasil yang bisa dites**: Lagu diputar, visualizer bergerak sesuai *beat*, dan latar belakang bergerak mulus sesuai tema (*Ken Burns effect*).

## 4. Verification Plan

Setiap selesainya satu *Slice*, saya akan menginstruksikan perintah `npm run dev` agar Anda bisa langsung membukanya di browser lokal Anda dan mencoba fitur tersebut dari ujung ke ujung (*end-to-end*).
