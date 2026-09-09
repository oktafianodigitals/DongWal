# DONGWAL - CYBER-EDITION v2.0.3

> Multi-Source Anichin scraper API with cyberpunk neon-themed web UI.

DongWal adalah API dan web interface untuk mengakses data anime/donghua dari multiple sumber. Aplikasi ini bekerja dengan cara scraping halaman HTML secara real-time dari **3 sumber** sekaligus, menampilkannya melalui UI bertema cyberpunk, serta menyediakan HLS stream proxy yang bebas iklan.

## Sumber Data

| Source | URL | Status |
|--------|-----|--------|
| Anichin.Cafe | https://anichin.cafe | Active |
| Anichin.Moe | https://anichin.moe | Active |
| Anichin.Watch | https://anichin.watch | Active |

Setiap API endpoint mendukung parameter `?source=` untuk memfilter sumber tertentu.

## Fitur

- **Multi-Source Scraping** - 3 sumber data anichin aktif secara bersamaan
- **Source Filter** - Filter data per sumber via query parameter
- **Cyberpunk Neon UI** - Dashboard interaktif dengan tema cyberpunk
- **Weekly Schedule** - Jadwal rilis anime per hari dalam grid card
- **HLS Stream Proxy** - Proxy video stream dengan filter iklan dan rewrite M3U8
- **Watch History** - Riwayat tonton tersimpan lokal di SQLite
- **Search** - Pencarian anime/donghua dari semua sumber
- **Genre Browser** - Jelajahi anime berdasarkan genre
- **Detail & Episode** - Info lengkap anime beserta daftar episode
- **Responsive** - Tampilan optimal di desktop dan mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Templating | EJS |
| HTTP Client | Axios |
| HTML Parser | Cheerio |
| Database | SQLite3 (WAL mode) |
| HLS Player | hls.js |

## Instalasi

```bash
git clone https://github.com/oktafianodigitals/DongWal.git
cd DongWal
npm install
```

## Menjalankan

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Server akan berjalan di `http://localhost:2504`

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/` | Web UI dashboard |
| GET | `/api/sources` | Daftar semua sumber data |
| GET | `/slide?source=NAME` | Slider/featured anime |
| GET | `/popular?source=NAME` | Anime populer hari ini |
| GET | `/latest?page=N&source=NAME` | Episode terbaru (paginated) |
| GET | `/search?q=QUERY&page=N&source=NAME` | Pencarian anime |
| GET | `/genres?source=NAME` | Daftar semua genre |
| GET | `/genres/:genre?page=N` | Anime berdasarkan genre |
| GET | `/detail/:slug?source=NAME` | Detail anime + daftar episode |
| GET | `/episode/:slug?source=NAME` | Info episode + embed sources |
| GET | `/ongoing?page=N&source=NAME` | Anime ongoing |
| GET | `/completed?page=N&source=NAME` | Anime completed |
| GET | `/schedule?source=NAME` | Jadwal rilis mingguan |
| GET | `/play/:slug` | Halaman player dedicated |
| GET | `/api/stream?url=URL` | HLS stream proxy (ad-free) |
| GET | `/api/history?limit=N` | Ambil riwayat tonton |
| POST | `/api/history` | Simpan/update riwayat tonton |
| DELETE | `/api/history/:slug` | Hapus satu riwayat |
| DELETE | `/api/history` | Hapus semua riwayat |

**Catatan:** Parameter `source` bersifat opsional. Jika tidak diisi, semua sumber akan di-query dan hasilnya di-merge (deduplicate by slug).

## Struktur Project v2.0

```
DongWal/
├── app.js                  # Express server, routes, stream proxy
├── package.json
├── lib/                    # Core modules
│   ├── sources.js          # Multi-source manager & aggregator
│   ├── anichinCafe.js      # Scraper: anichin.cafe
│   ├── anichinWp.js        # Scraper: WordPress-based (anichin.moe, anichin.watch)
│   └── db.js               # SQLite database layer
├── views/                  # EJS templates
│   ├── index.ejs           # Main SPA dashboard
│   └── player.ejs          # Dedicated video player page
├── public/                 # Static assets
│   ├── css/
│   │   ├── base.css        # Shared styles (variables, reset, header, status bar)
│   │   ├── index.css       # Dashboard-specific styles
│   │   └── player.css      # Player-specific styles
│   └── js/
│       ├── index.js        # Dashboard logic (SPA, modals, pagination)
│       └── player.js       # Player logic (HLS, embeds, downloads)
├── backup/                 # Local backups (git-ignored)
└── README.md
```

## Perubahan v2.0 (Big Update)

- **Multi-Source Architecture** - Didukung 3 sumber: anichin.cafe, anichin.moe, anichin.watch
- **Source Filter** - Parameter `?source=` di semua endpoint + dropdown di UI
- **File Separation** - CSS dan JS dipisah dari EJS ke file terpisah
- **Modular Scraper** - `lib/anichinCafe.js` (custom parser) dan `lib/anichinWp.js` (WordPress parser)
- **Aggregator** - `lib/sources.js` mengelola semua sumber dan merge hasil
- **New Endpoint** - `GET /api/sources` untuk melihat daftar sumber aktif

## Perubahan v2.0.1 (Patch Fix)

- **Episode Parsing** - Perkuat regex fallback: "Ep 157" → 157 (sebelumnya hanya "157")
- **Image Fallback** - SVG placeholder cyberpunk (tidak lagi "NO IMAGE" text abu-abu)
- **Scrollbar Theme** - Konsisten cyberpunk gradient di semua browser (webkit + Firefox)
- **Horizontal Scroll** - Strip card scroll mendapat styling neon gradient
- **Modal Scrollbar** - Modal box dan synopsis mendapat scrollbar themed
- **Schedule Cards** - Menggunakan image fallback yang sama dengan card lainnya
- **Modal Poster** - Menggunakan fallback img alih-alih hide onerror

## Perubahan v2.0.2 (Patch Fix)

- **Remove Source Dropdown** - Dropdown filter sumber di search bar dihapus, search box langsung mencari ke semua sumber secara default

## Perubahan v2.0.3 (Patch Fix)

- **Clean Footer** - Informasi daftar source dihapus dari status bar bawah, menyisakan brand & build credit

## Konfigurasi

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | `2504` | Port server |

## Lisensi

MIT License - DongWal

## Credits

- Data source: [anichin.cafe](https://anichin.cafe), [anichin.moe](https://anichin.moe), [anichin.watch](https://anichin.watch)
- Build by: [Fiano](https://www.instagram.com/octa.fiano/)
