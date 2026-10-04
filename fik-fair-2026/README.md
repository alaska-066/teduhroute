# TeduhRoute

Prototipe FIK FAIR 2026 untuk eksplorasi jalur pejalan kaki yang lebih teduh di koridor Sudirman–Gelora Bung Karno. Mendukung SDG 11 dan SDG 13.

## Menjalankan dan deploy

Node.js 22.12+ (disarankan Node 24 LTS):

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Buka alamat localhost yang ditampilkan Vite. Backend lokal tersedia otomatis melalui middleware; tidak perlu server terpisah. Import seluruh repository ke Vercel, preset Vite, build `npm run build`, output `dist`. Folder `api/` menjadi Node.js Functions. Jangan hanya mengunggah `dist` ke hosting statis karena endpoint backend juga diperlukan. Tidak perlu API key atau database untuk demo ini.

## Rute otomatis dan edit titik

1. Klik **Edit titik rute**, lalu geser **A**, **B**, atau persinggahan pada peta.
2. Alternatif keyboard: pilih titik, isi latitude/longitude, klik **Terapkan koordinat**.
3. **Tambah persinggahan** lalu klik peta untuk menyisipkan titik sebelum tujuan. Kedua rute melalui urutan persinggahan yang sama.
4. Hapus persinggahan lewat formulir/popup. **Undo** menyimpan 20 perubahan; **Reset rute** mengembalikan A/B awal.

Setiap perubahan titik, tanggal, atau jam otomatis memanggil `/api/routes` setelah debounce 250 ms. Permintaan lama dibatalkan dan hasil lama disembunyikan sampai hasil baru tersedia. Edit berlaku selama sesi, belum disimpan setelah reload. Maksimum 8 titik (A, B, dan 6 persinggahan), panjang 10 m hingga 10 km, dalam area latitude sekitar -6.229192 sampai -6.210808 dan longitude 106.798393 sampai 106.819607.

Pin diproyeksikan ke ruas jalan terdekat maksimal 100 m. Jarak penyesuaian ditampilkan; garis putus abu-abu dari pin ke jaringan **bukan jalur berjalan yang diverifikasi** dan tidak masuk perhitungan jarak. Titik yang terlalu jauh atau jaringan terputus menghasilkan pesan error, tanpa fallback garis lurus.

- **Rute Reguler:** Dijkstra dengan biaya waktu berjalan (1,25 m/detik; tangga 0,7 m/detik).
- **Rute Nyaman:** kandidat jalur berbobot waktu, keterpaparan matahari, jalan utama, dan permukaan kasar. Dipilih kandidat dengan skor kenyamanan lebih baik dan tambahan jarak maksimum 35% per tahap terhadap reguler. Ini pencarian beberapa kandidat berbobot, bukan jaminan solusi optimum global.
- Bayangan dihitung dari SunCalc + geometri OSM sesuai waktu pilihan. Ruas `covered=yes` dan terowongan yang dipetakan juga dihitung terlindung. Cuaca kawasan ditampilkan terpisah dan belum menjadi bobot routing.
- Jika tidak ditemukan alternatif yang lebih baik dalam batas jarak, kedua pilihan dapat memakai jalur sama; UI menjelaskan kondisi tersebut.

Graph tersambung berdasarkan ID node OSM, bukan perpotongan visual, sehingga jembatan tidak otomatis menjadi persimpangan. Routing menyaring larangan `foot`, akses privat, konstruksi, motorway/trunk, dan akses bersyarat yang belum didukung. Arah `oneway:foot` diperhatikan; arah kendaraan tidak otomatis berlaku untuk pejalan kaki. Gerbang tanpa izin eksplisit dikecualikan secara konservatif.

Kelengkapan OSM menentukan hasil. Jalan lokal dapat berupa garis tengah jalan, bukan trotoar terpisah. Belum mendukung pembatasan belok berbasis relation, jam buka, penutupan langsung, elevasi, atau navigasi kursi roda. Tangga masih diizinkan. Akses dan penyeberangan tetap perlu verifikasi lapangan.

## Ekspansi wilayah 2x dan backup

Area editor/routing diperluas menjadi sekitar **2x luas awal** dengan pusat tetap (-6.22, 106.809). Panjang dan lebar masing-masing dikalikan sqrt(2), bukan 2. `src/lib/studyArea.js` menjadi sumber batas tunggal untuk editor, validasi, graph, dan query OSM. Wilayah unduhan OSM memakai buffer tambahan 0,0035 derajat (>380 m) di setiap sisi, melebihi batas proyeksi bayangan 300 m. Batas 8 titik, radius snapping 100 m, panjang rute 10 km, serta cache 6 jam tetap berlaku.

Backup sebelum perubahan: `backups/teduhroute-before-area-2x-20261004-163810.zip`, dengan daftar SHA-256 di file `.manifest.json` di folder yang sama. Seluruh 43 file backup telah diverifikasi terhadap isi ZIP. Backup menyertakan sumber dan konfigurasi lokal; `node_modules`, `dist`, `.vercel`, serta folder backup dikecualikan. Untuk memulihkan, ekstrak ke folder terpisah, jalankan `npm install`, lalu `npm run dev`. Folder backup diabaikan Git agar tidak ikut dipublikasikan.

Smoke test data langsung pada 4 Oktober 2026: 6.976 objek OSM, 4.616 node graph dan 4.762 ruas. Pengambilan/normalisasi/graph awal sekitar 3,26 detik; routing default 146 ms dan contoh tujuan di wilayah tambahan 86 ms pada mesin pengujian. Angka ini bukan jaminan kecepatan di HP atau Vercel. Jaringan jalan tidak dikirim oleh `/api/osm` karena hanya diperlukan backend; browser menerima konteks peta saja.

## Cuaca terbaru dan prakiraan

Cuaca aktif sekarang berasal dari **Open-Meteo**, bukan angka skenario. Panel Cuaca terkini menampilkan suhu udara, suhu terasa, kelembapan, angin, hujan, UV, waktu berlaku data, dan waktu pengambilan oleh aplikasi. Open-Meteo menyediakan kondisi terkini berbasis model 15-menitan, bukan sensor langsung di setiap trotoar.

- Browser memeriksa API setiap **5 menit** saat tab terlihat; kembali ke tab juga memicu pemeriksaan.
- Tombol **Perbarui** memeriksa data terbaru yang tersedia; backend menggunakan cache per instance maksimal 5 menit dan deduplikasi request. Nilai dapat tetap sama jika model belum berubah.
- Respons HTTP `/api/weather` memakai `no-store` agar cache edge/browser tidak memperpanjang usia cache backend.
- Data diberi label belum terbaru jika pembaruan gagal, pengambilan sudah lebih dari 10 menit, atau waktu berlaku kondisi terkini sudah lebih dari 90 menit.
- Saat gagal pertama kali, tampilkan tidak tersedia. Jika pernah berhasil, data lama dipertahankan dengan label belum terbaru dan timestamp. Tidak ada fallback angka cuaca rekaan.
- Data mewakili kawasan pada permintaan latitude -6.22, longitude 106.808. Semua titik editor berada di kawasan ini; sumber bukan pengukuran mikroklimat per meter.

Kartu perbandingan rute memakai **prakiraan per jam sesuai tanggal/jam WIB yang dipilih**, terpisah dari panel kondisi terkini. Rentang prakiraan 7 hari. Jika jam/tanggal tidak tersedia, nilai cuaca kartu adalah kosong (`null`), bukan cuaca saat ini yang diberi tanggal lain. Jam awal mengikuti jam WIB saat halaman dibuka, dibatasi rentang slider 08–17.

Cuaca kawasan yang sama berlaku bagi kedua rute. Aplikasi tidak mengurangi suhu terasa atau UV secara rekaan berdasarkan keteduhan. Persentase bayangan masih merupakan model geometri, bukan pengamatan intensitas matahari langsung; awan/hujan dapat mengurangi sinar langsung. **Suhu permukaan aspal tidak tersedia** dan tidak disamakan dengan suhu udara.

## Backend dan struktur

- `api/osm.js`: GET konteks OSM untuk wilayah tetap.
- `api/weather.js`: GET kondisi terkini dan prakiraan cuaca.
- `api/routes.js`: POST titik perjalanan untuk pencarian dua rute dan metrik.
- `api/analyze.js`: API analisis geometri lama, tidak digunakan editor aktif.
- `server/osmService.js`: query Overpass, konversi GeoJSON, cache 6 jam, deduplikasi request dan timeout 25 detik.
- `server/weatherService.js`: Open-Meteo, normalisasi null/zero, cache 5 menit dan timeout 12 detik.
- `server/http.js`: respons JSON, headers, method handling.
- `src/lib/routeAnalysis.js`: mesin analisis SunCalc + Turf untuk server dan browser.
- `src/lib/walkingRouter.js`: graph jalan, snapping, Dijkstra dan seleksi rute nyaman.
- `src/lib/waypoints.js`: validasi dan edit titik perjalanan bersama.
- `src/hooks/useWalkingRoutes.js`: debounce, pembatalan request, dan penolakan hasil lama.
- `src/lib/routeEditing.js`: validasi geometri dan kompatibilitas API lama.
- `src/lib/weather.js`: pemilihan prakiraan WIB, status kedaluwarsa, format cuaca.
- `src/hooks/useRouteEditor.js`: state rute dan undo.
- `src/hooks/useWeather.js`: pembaruan otomatis, loading/error, refresh, stale status.
- `src/hooks/useOsmContext.js`: fetch OSM dengan deduplikasi React StrictMode.
- `src/components/MapView.jsx`: Leaflet, marker draggable, batas area, bayangan, fasilitas.
- `src/components/RouteEditor.jsx`: kontrol edit titik dengan akses keyboard.
- `src/components/WeatherCard.jsx`: cuaca terkini, sumber, timestamp, refresh.
- `src/components/ControlPanel.jsx`: integrasi editor, cuaca dan perbandingan rute.
- `src/data/routeData.js`: kandidat bawaan serta fasilitas demo. Kalkulasi skenario lama dipertahankan untuk kompatibilitas, tetapi tidak dipakai dashboard aktif atau API analisis.

Browser mengambil OSM, routing, dan cuaca secara independen. Backend memakai cache OSM 6 jam sehingga edit titik tidak perlu mengambil ulang Overpass. Cuaca tetap tampil ketika routing gagal.

## API

```text
GET /api/osm
GET /api/weather
POST /api/routes
Content-Type: application/json
```

```json
{
  "date": "2026-10-04",
  "hour": 16,
  "waypoints": [[-6.2149, 106.8083], [-6.2215, 106.8066]]
}
```

Koordinat input `[latitude, longitude]`; GeoJSON memakai `[longitude, latitude]`. Body maksimum 4 KB, 2 sampai 8 titik, jam integer 8 sampai 17 WIB. Respons berisi `routes.regular`, `routes.shaded` (nama internal rute nyaman), detail `regular`/`comfortable`, `sameRoute`, `snaps`, `extraDistancePercent`, dan `metrics`. Maksimum 4096 koordinat hasil per rute. HTTP 422 berarti jaringan tidak dapat menghasilkan rute valid; 503 berarti sumber OSM gagal. Respons memakai `no-store`.

API lama `GET /api/analyze?date=2026-10-04&hour=16` atau POST `{date,hour,routes:{regular,shaded}}` tetap tersedia untuk analisis geometri, bukan pencarian jalan. Body maksimum 16 KB, 2 sampai 64 koordinat per rute dengan endpoint bersama.

`/api/weather`: `source`, `sourceUrl`, `license`, `fetchedAt`, `location`, `grid`, `current`, `hourly`. Timestamp `time` berupa Unix seconds UTC; UI memformatnya ke WIB. `current.interval` adalah durasi agregasi hujan dalam detik. `hourly` berlaku pada slot waktu tertentu, bukan instant current.

`/api/analyze`: `sun`, `regular`, `shaded`, `shadows`, `selectedWeather`, `weatherSource`, `weatherFetchedAt`, `weatherError`, dan metadata OSM. Jika cuaca gagal, API masih mengembalikan analisis geometri dengan nilai cuaca null. Jika OSM gagal, respons 503. Analisis memakai `no-store` agar hasil POST pengguna tidak dicache bersama.

Status: 200 berhasil, 400 input/body invalid, 405 method tidak diizinkan, 503 layanan upstream tidak tersedia. Endpoint tidak menerima URL upstream atau query Overpass bebas. Cache per instance hilang saat cold start dan tidak dibagi antarinstance; produksi berskala besar membutuhkan cache persisten/rate limiting.

## Model bayangan

SunCalc **1.9.0 dipin**: radian dan azimut dari selatan dikonversi ke derajat dari utara. Tanggal/jam memakai offset eksplisit `+07:00`; posisi matahari dihitung dekat titik tengah awal/tujuan.

Bangunan memakai tag `height`; fallback `building:levels × 3 m`; default 12 m. Meter dan feet didukung. Panjang bayangan = tinggi / tan(elevasi), arah berlawanan matahari, dibatasi 300 m. Bentuk bayangan berupa convex hull tapak dan vertex proyeksi sehingga dapat melebihkan cakupan bangunan cekung/halaman dalam. Tidak ada pemodelan atap, elevasi medan atau interaksi 3D.

Pohon `natural=tree` memakai tinggi dan diameter mahkota jika tersedia; fallback 8 m / 8 m. Mahkota diproyeksikan sebagai lingkaran. Taman tidak otomatis dianggap kanopi. Turf mengukur titik tengah segmen dengan interval maksimal 15 m, dengan tumpang tindih bayangan dihitung sekali. Sampel di dalam bangunan dilaporkan sebagai konflik dan dikecualikan dari model bayangan; ruas lorong tertutup yang dipetakan tetap dapat dihitung terlindung oleh routing.

Persentase bayangan bukan persentase kanopi. Kelengkapan pohon dan tinggi OSM bervariasi; 0% bayangan terdeteksi tidak membuktikan area terik. Hasil tidak dipaksa mencapai 85%. Waktu memakai 4,5 km/jam (tangga 2,52 km/jam) dan kalori 3,5 kkal/menit sebagai ilustrasi orang dewasa 60 kg.

## Fasilitas dan batas demo

Fasilitas bertag `amenity=shelter` dan `amenity=drinking_water` belum diverifikasi di lapangan. Shelter tidak menjamin AC; air tidak menjamin gratis. Fasilitas berbentuk area belum ditampilkan sebagai pin. Jika OSM sudah dimuat dan tidak memiliki titik fasilitas, layer tetap kosong. Saat OSM belum tersedia, hanya pin demo berlabel simulasi yang ditampilkan.

## Verifikasi dan dependensi

`npm test` mencakup bayangan, WIB, sampling, multipolygon OSM, cache/recovery, validasi API, perpindahan endpoint, insert/delete, batas wilayah/panjang, normalisasi cuaca, pemilihan prakiraan, null/zero, serta data kedaluwarsa. Tes routing tambahan mencakup akses, arah, topology, snapping, detour, persinggahan, dan API. Smoke test jaringan langsung: `node scripts/check-routing.mjs` (memerlukan internet). Uji browser mencakup drag, undo, tambah titik lewat peta, formulir koordinat, reset, hapus, dan cuaca terbaru.

Override `@xmldom/xmldom` ke `^0.8.15` memperbaiki advisori parser pada konverter OSM. Audit runtime pada integrasi sebelumnya bersih. Lima temuan high toolchain Tailwind 3 tetap tercatat; migrasi Tailwind 4 memerlukan penyesuaian konfigurasi.

## Referensi dan lisensi

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): kondisi terkini dan prakiraan. Data CC BY 4.0; atribusi ada pada UI.
- [Ketentuan Open-Meteo](https://open-meteo.com/en/terms): endpoint gratis untuk penggunaan nonkomersial dengan batas permintaan; evaluasi paket yang sesuai untuk penggunaan komersial.
- [SunCalc 1.9.0](https://github.com/mourner/suncalc/tree/v1.9.0): BSD-2-Clause.
- [Turf](https://turfjs.org/docs/api/along): MIT.
- [React Leaflet](https://react-leaflet.js.org/docs/v4/api-components/) dan [Leaflet](https://leafletjs.com/): komponen peta/marker.
- [osmtogeojson](https://github.com/tyrasd/osmtogeojson): MIT.
- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright): data ODbL.
- [Kebijakan tile OSM](https://operations.osmfoundation.org/policies/tiles/).
- [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).

Referensi tagging routing: [foot](https://wiki.openstreetmap.org/wiki/Key:foot), [access](https://wiki.openstreetmap.org/wiki/Key:access), [oneway:foot](https://wiki.openstreetmap.org/wiki/Key:oneway:foot).

### Jalan yang terlihat tetapi tidak dapat dirutekan

Peta dasar menampilkan juga jalan privat dan akses khusus tujuan. Routing tetap mengecualikannya; keberadaan garis jalan bukan jaminan akses publik. Jalan lokal kelas tertiary kini dapat menjadi penghubung tanpa tag trotoar eksplisit, seperti residential. Larangan foot/access dan gerbang tetap berlaku. UI melaporkan panjang ruas dengan trotoar belum terkonfirmasi serta nama jalan/pembatasan dekat pin saat pencarian gagal. Jalan primary/secondary tetap membutuhkan petunjuk akses berjalan. Pengujian koordinat perkiraan dari gambar Widya Chandra bukan verifikasi pintu masuk persis di lapangan.

## Moda jalan kaki dan motor

Pilih **Jalan kaki** atau **Motor** di panel. Pergantian moda mempertahankan pin, membatalkan permintaan lama, lalu menghitung ulang dua rute dengan graph terpisah. Pin yang valid untuk jalan kaki (misalnya di dalam GBK) belum tentu tersambung untuk motor; pindahkan ke pintu masuk/jalan umum jika pencarian gagal.

`POST /api/routes` menerima `mode: "walking"` (default untuk kompatibilitas) atau `mode: "motorcycle"`. Nilai lain ditolak 400. Kedua moda tetap memakai waktu matahari, perkiraan bayangan, penalti permukaan kasar, serta batas tambahan jarak nyaman 35%. Suhu dan UV kawasan tidak diturunkan secara rekaan.

Motor menggunakan urutan akses OSM motorcycle > motor_vehicle > vehicle > access, arah oneway dan pengecualian motorcycle, roundabout, serta larangan arah spesifik. Trotoar, jalan pedestrian, tangga, cycleway, path, motorway/trunk, motorroad dan ruas bertag toll dikecualikan. Akses khusus/private/bersyarat yang belum dapat dievaluasi ditolak. Gerbang memerlukan izin motor eksplisit. Graph tetap bergantung pada kelengkapan OSM.

Relasi pembatasan belok OSM ikut diambil. Karena routing berbasis status arah kedatangan belum diimplementasikan, ruas from/via pada relasi yang berlaku untuk motor **dikecualikan secara konservatif**, termasuk pembatasan bersyarat; pengecualian motorcycle diperhatikan. Ini dapat menimbulkan rute memutar atau tidak tersedia dan bukan implementasi lengkap navigasi turn-by-turn. Rambu aktual/penutupan jalan tetap harus diperiksa.

Kecepatan asumsi motor: primary 30, secondary 25, tertiary 20, residential/unclassified 15, service/living_street 10 km/jam; ruas penghubung 15-20 km/jam. Nilai dibatasi lagi oleh maxspeed numerik dan permukaan kasar. Waktu belum mencakup kemacetan, antrean lampu lalu lintas, parkir atau akses dari pin. Kalori diset null dan disembunyikan pada mode motor. Bayangan dihitung di garis geometri OSM, belum pada setiap lajur.

Referensi aturan moda: [motorcycle](https://wiki.openstreetmap.org/wiki/Key:motorcycle), [oneway](https://wiki.openstreetmap.org/wiki/Key:oneway), [restriction](https://wiki.openstreetmap.org/wiki/Relation:restriction).

## Mode Sekarang dan GPS opsional

Aktifkan **Sekarang · waktu WIB otomatis** untuk memperbarui bayangan dan dua kandidat rute setiap menit selama halaman terlihat. Saat kembali ke tab, jam segera disinkronkan. Tanggal/jam manual dinonaktifkan sementara dan dipertahankan ketika mode Sekarang dimatikan. Timestamp UTC resolusi menit (`at`) dikirim ke `/api/routes`; backend menurunkan tanggal/jam WIB darinya. Mode ini mendukung 24 jam, termasuk pergantian hari. Matahari di bawah horizon menghasilkan proyeksi bayangan kosong; ruas tertutup OSM masih bisa dianggap terlindung. Cuaca perbandingan tetap prakiraan slot per jam, bukan pengukuran setiap menit. Jam mengikuti perangkat pengguna.

Tekan **Aktifkan GPS**, lalu izinkan lokasi di browser. Memerlukan HTTPS atau localhost. Aplikasi memanggil watchPosition hanya setelah tombol ditekan. **Hentikan GPS** dan penutupan komponen menghentikan watch; posisi dihapus. Data pelacakan lokasi tidak disimpan dan tetap lokal; jika pengguna memilih memakai lokasi sebagai awal, koordinat titik A dikirim ke backend routing. Saat traffic diaktifkan, titik perjalanan diteruskan ke TomTom. Penyedia lokasi browser/perangkat mengikuti pengaturan privasi browser.

Posisi dan lingkaran akurasi tampil di peta tanpa menggeser peta otomatis. Panel menghitung sisa panjang sepanjang rute terpilih, bukan jarak lurus ke tujuan. ETA memakai kecepatan GPS yang wajar; jika speed tidak tersedia, memakai rata-rata estimasi moda. Saat berhenti, ETA ditunda. Tidak ada rerouting otomatis dari GPS: jika menyimpang, pengguna diminta mengedit titik. Sisa perjalanan dapat berubah saat kandidat rute diperbarui oleh mode Sekarang.

Lokasi lebih dari 30 detik, akurasi >50 m, posisi lebih dari 50 m dari jalur, atau proyeksi ambigu pada jalur berulang/persilangan tidak menghasilkan ETA. Dekat tujuan berarti dalam 20 m dari ujung jaringan dengan akurasi <=20 m, bukan kepastian tiba di pintu bangunan. Pengujian GPS memakai lokasi simulasi dan mock browser API; keakuratan perangkat nyata belum diuji.

## Lokasi saya dan pencarian tujuan

1. Tekan **Aktifkan GPS**, izinkan browser, lalu **Gunakan lokasi saya sebagai awal**. Posisi harus berusia <=30 detik, akurasi <=50 m, dan berada dalam batas layanan. A berubah satu kali; B dan persinggahan dipertahankan. Undo mengembalikan titik lama. GPS tidak terus-menerus menggeser A.
2. Isi **Cari lokasi tujuan** dan tekan **Cari**. Pilih salah satu hasil untuk mengganti B dan memusatkan peta. A serta persinggahan tetap. Pencarian mengambil nama/alias tempat dan jalan OSM dalam wilayah layanan (endpoint `GET /api/places?q=...`), bukan geocoder seluruh Indonesia. Data pencarian memakai cache OSM 6 jam; tidak melakukan autocomplete ke layanan publik. Titik area adalah titik perwakilan geometri, belum tentu pintu masuk. Penghitungan ulang kedua rute tetap mengikuti perilaku editor.

## Mengaktifkan traffic TomTom

Salin `.env.example` menjadi `.env.local` dan isi `TOMTOM_API_KEY` dengan key TomTom Routing API milikmu, lalu restart `npm run dev`. Di Vercel, isi nama environment yang sama dan redeploy. Jangan memakai awalan VITE_ dan jangan commit key. Key hanya digunakan di server.

Pilih Motor, centang **Gunakan traffic langsung**. Mode Sekarang otomatis aktif. Titik perjalanan dikirim ke TomTom Calculate Route (`travelMode=motorcycle`, `traffic=true`, `departAt=now`), dengan penghindaran tol, motorway, ferry, dan unpaved. Rute nyata yang dikembalikan penyedia dipakai sebagai geometri dan ETA, bukan sekadar menambah angka kemacetan ke garis OSM. Reguler dipilih dari kandidat dengan waktu tercepat; nyaman memakai model bayangan pada kandidat penyedia dengan batas tambahan jarak 35%. Maksimal dua alternatif diminta untuk A/B; perjalanan dengan persinggahan meminta satu kandidat. Dua pilihan dapat sama. Ruas tertutup yang dilaporkan pada hasil, ruas tol, motorway, ferry, moda lain, geometri di luar wilayah, atau snapping >100 m ditolak.

Request traffic diperbarui bersama mode Sekarang tiap menit saat halaman terlihat; request yang berubah dibatalkan oleh browser, namun penyedia mungkin tetap menghitung permintaan yang sudah diterima. Pertimbangkan kuota/biaya layanan untuk deployment publik; aplikasi belum memiliki autentikasi atau rate limit global. Tanpa key, UI menjelaskan bahwa rute OSM memakai estimasi tanpa traffic. Jika key sudah tersedia tetapi provider gagal, hasil rute tidak diganti diam-diam dengan rute tanpa traffic. Tidak ada nilai lalu lintas rekaan.

Traffic mencakup kemacetan dan penutupan/pengerjaan jalan **sejauh tersedia pada penyedia**. Timestamp di UI adalah waktu pengambilan, bukan waktu setiap sensor. Mode motorcycle TomTom masih beta dan cakupan pembatasan dapat tidak lengkap. Tidak tersedia telemetri khusus antrean/hitung mundur setiap lampu merah; delay traffic tidak membuktikan antrean lampu tertentu. GPS sisa perjalanan tetap memakai kecepatan pengguna/model rata-rata, bukan prediksi kemacetan di depan secara per ruas.

Integrasi penyedia diuji dengan fixture/mock; panggilan ber-key belum diverifikasi tanpa key pengguna. [Dokumentasi TomTom Calculate Route](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route).
