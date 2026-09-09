# DONGWAL - CYBER-EDITION

> Unofficial Anichin scraper API with cyberpunk neon-themed web UI.

DongWal adalah API dan web interface untuk mengakses data anime/donghua dari [anichin.cafe](https://anichin.cafe). Aplikasi ini bekerja dengan cara scraping halaman HTML secara real-time, menampilkannya melalui UI bertema cyberpunk, serta menyediakan HLS stream proxy yang bebas iklan.

## Fitur

- **Real-time scraping** dari anichin.cafe
- **Cyberpunk Neon UI** - Dashboard interaktif dengan tema cyberpunk
- **Weekly Schedule** - Jadwal rilis anime per hari dalam grid card
- **HLS Stream Proxy** - Proxy video stream dengan filter iklan dan rewrite M3U8
- **Watch History** - Riwayat tonton tersimpan lokal di SQLite
- **Search** - Pencarian anime/donghua
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
| GET | `/slide` | Slider/featured anime dari homepage |
| GET | `/popular` | Anime populer hari ini |
| GET | `/latest?page=N` | Episode terbaru (paginated) |
| GET | `/search?q=QUERY&page=N` | Pencarian anime |
| GET | `/genres` | Daftar semua genre |
| GET | `/genres/:genre?page=N` | Anime berdasarkan genre |
| GET | `/detail/:slug` | Detail anime + daftar episode |
| GET | `/episode/:slug` | Info episode + embed sources |
| GET | `/ongoing?page=N` | Anime ongoing |
| GET | `/completed?page=N` | Anime completed |
| GET | `/schedule` | Jadwal rilis mingguan |
| GET | `/play/:slug` | Halaman player dedicated |
| GET | `/api/stream?url=URL` | HLS stream proxy (ad-free) |
| GET | `/api/history?limit=N` | Ambil riwayat tonton |
| POST | `/api/history` | Simpan/update riwayat tonton |
| DELETE | `/api/history/:slug` | Hapus satu riwayat |
| DELETE | `/api/history` | Hapus semua riwayat |

## Struktur Project

```
DongWal/
├── app.js              # Express server, routes, stream proxy
├── dongwal.js          # Core scraper class (Cheerio-based)
├── db.js               # SQLite database layer
├── package.json
├── views/
│   ├── index.ejs       # Main SPA dashboard
│   └── player.ejs      # Dedicated video player page
├── public/             # Static assets
└── backup/             # Local backup (git-ignored)
```

## Konfigurasi

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | `2504` | Port server |

Semua konfigurasi hardcoded di `app.js`. Ubah nilai `PORT` atau set environment variable `PORT` sebelum menjalankan.

## Lisensi

MIT License - DongWal

## Credits

- Data source: [anichin.cafe](https://anichin.cafe)
- Build by: [Fiano](https://www.instagram.com/octa.fiano/)
