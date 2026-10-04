# TeduhRoute

**Langkah kecil. Lebih sejuk.** Prototipe navigasi mikro pejalan kaki untuk FIK FAIR 2026, mengeksplorasi jalur teduh sebagai respons terhadap Urban Heat Island di koridor Sudirman–Gelora Bung Karno, Jakarta Pusat. Mendukung SDG 11 dan SDG 13.

## Menjalankan

Gunakan Node.js 22.12+ (disarankan Node 24 LTS) dan npm.

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya http://localhost:5173.

```bash
npm test
npm run build
npm run preview
```

## Deploy ke Vercel

Push proyek ke GitHub lalu import repository melalui Vercel. Pilih preset **Vite**, build command `npm run build`, dan output directory `dist`. Konfigurasi juga tersedia di `vercel.json`. Tidak perlu backend, database, API key, atau environment variable. Deployment dilakukan setelah repository dihubungkan ke akun Vercel Anda.

## Fitur

- Peta Leaflet interaktif dengan fit bounds otomatis, zoom, dan pemusatan ulang.
- Jalur reguler merah dan jalur teduh hijau dengan highlight glow.
- Slider 08:00–17:00 WIB; metrik berubah langsung tanpa request API.
- Peringatan ekstrem pukul 11:00–14:00: suhu terasa 41°C dibanding 32°C pada jalur teduh, dengan keteduhan hingga 85%.
- Komparasi suhu permukaan, suhu terasa, UV, kanopi, jarak, waktu tempuh, dan kalori.
- Empat cooling shelter dan empat usulan water refill dengan popup dan toggle layer.
- Pin SVG Lucide melalui `L.divIcon`, tanpa ketergantungan gambar marker default Leaflet.
- Panel glassmorphism, tampilan seluler, kontrol keyboard, dan modal inovasi berbasis native dialog.

## Struktur

```text
public/favicon.svg
src/
  components/
    Navbar.jsx
    MapView.jsx
    ControlPanel.jsx
  data/
    routeData.js
    routeData.test.js
  App.jsx
  main.jsx
  index.css
index.html
package.json
vite.config.js
tailwind.config.js
postcss.config.js
vercel.json
```

## Model data dan batas prototipe

Semua data aplikasi ada di `src/data/routeData.js`. Koordinat rute merupakan ilustrasi, bukan hasil survei trotoar atau routing engine. Kedua rute memiliki titik awal dan akhir yang sama. Titik shelter dan air minum adalah usulan simulasi; keberadaan, akses publik, air gratis, dan jam operasional belum diverifikasi. Jangan gunakan prototipe ini sebagai petunjuk navigasi nyata.

`getRouteMetrics(hour)` mengembalikan `{ hour, heatWarning, regular, shaded }`. Setiap rute berisi `distanceKm`, `surfaceTemperature`, `feelsLike`, `uvIndex`, `canopyCoverage`, `durationMinutes`, dan `calories`. Suhu, UV, dan kanopi menggunakan kurva waktu sintetis; suhu terasa berbeda dari suhu permukaan. Tidak ada prediksi cuaca, sensor langsung, atau perhitungan bayangan matahari dari bangunan.

Jarak dihitung menggunakan Haversine antartitik. Waktu memakai kecepatan berjalan 4,5 km/jam dengan perlambatan sintetis untuk jalur panas. Kalori adalah ilustrasi sekitar 3,5 kkal/menit untuk orang dewasa 60 kg, dengan faktor kecil pada jalur panas; bukan perhitungan fisiologis personal. Geometri contoh membuat jalur teduh lebih pendek daripada jalur reguler; bukan hasil optimasi jaringan jalan.

Data aplikasi sepenuhnya client-side. Peta dasar tetap membutuhkan koneksi internet ke OpenStreetMap. Atribusi disertakan pada peta. Tidak ada GPS, pelacakan pengguna, atau navigasi turn-by-turn. Untuk produksi, ganti data dengan survei jalur, fasilitas terverifikasi, dan model mikroklimat tervalidasi. Penggunaan tile publik mengikuti [kebijakan tile OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/); untuk trafik besar, pilih penyedia tile dengan kapasitas yang sesuai.

Audit npm saat implementasi mencatat lima temuan high pada rantai dependensi pengembangan Tailwind 3 (`braces`, `chokidar`, `micromatch`, `fast-glob`, `tailwindcss`). Perbaikan otomatis yang ditawarkan memerlukan migrasi ke Tailwind 4. Dependensi runtime dipisahkan dari toolchain build; jangan menjalankan `npm audit fix --force` tanpa menyesuaikan konfigurasi Tailwind.

## Teknologi dan referensi

React 18, Vite, Tailwind CSS 3, Leaflet, React Leaflet 4, dan Lucide React. Tailwind 3 dipilih agar mendukung konfigurasi `tailwind.config.js` dan PostCSS yang diminta; React Leaflet 4 kompatibel dengan React 18.

- [React Leaflet 4 — instalasi](https://react-leaflet.js.org/docs/v4/start-installation/)
- [Vite — deployment statis](https://vite.dev/guide/static-deploy.html)
- [Tailwind CSS 3](https://v3.tailwindcss.com/)
 
