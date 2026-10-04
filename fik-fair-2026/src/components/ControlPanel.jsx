import LocationSearch from './LocationSearch';
import GpsPanel from './GpsPanel';
import { ArrowDown, ArrowUpRight, Check, Clock3, Droplets, Flame, Footprints, Leaf, MapPin, ShieldCheck, Snowflake, Sun, Thermometer, Trees } from 'lucide-react';
import RouteEditor from './RouteEditor';
import WeatherCard from './WeatherCard';

function Metric({ icon: Icon, label, value }) {
  return <div className="route-metric"><span><Icon size={13} />{label}</span><strong>{value}</strong></div>;
}

function RouteCard({ mode, shaded, metrics, selected, onSelect }) {
  return (
    <button className={`route-card ${shaded ? 'shaded-card' : 'regular-card'} ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[13px] font-semibold">{shaded ? <Leaf size={15} /> : <Sun size={15} />}{shaded ? 'Rute Nyaman' : 'Rute Reguler'}</span><span className="selection-dot">{selected && <Check size={10} />}</span></div>
      <p className="route-description">{shaded ? 'Prioritas kenyamanan' : 'Estimasi waktu terpendek'}</p>
      <div className="route-time-primary">{metrics.durationMinutes ?? '—'}<span>menit</span></div>
      <div className="mt-4 space-y-2">
        <Metric icon={Trees} label="Bayangan*" value={metrics.shadeCoverage == null ? '—' : `${metrics.shadeCoverage}%`} />
        <div className="canopy-track"><span style={{ width: `${metrics.shadeCoverage ?? 0}%` }} /></div>
      </div>
      <div className="route-card-footer"><span><Clock3 size={12} /> {metrics.durationMinutes ?? '-'} mnt</span>{mode === 'walking' && <span><Flame size={12} /> {metrics.calories ?? '-'} kkal</span>}</div>
      <span className="route-distance">{metrics.distanceKm?.toLocaleString('id-ID') ?? '-'} km · {mode === 'motorcycle' ? 'motor' : 'jalan kaki'}</span>
    </button>
  );
}

function LayerToggle({ icon: Icon, label, detail, checked, onChange, color }) {
  return <label className="layer-toggle"><span className={`layer-icon ${color}`}><Icon size={17} /></span><span className="flex-1"><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} /><span className="switch-track" aria-hidden="true" /></label>;
}

export default function ControlPanel({ activeSection, traffic, setTraffic, onLocate, live, setLive, clock, gps, mode, setMode, hour, setHour, metrics, showShelters, setShowShelters, showWater, setShowWater, selectedRoute, setSelectedRoute, onFocusRoute, date, setDate, osm, showShadows, setShowShadows, editor, weather, routing }) {
  return (
    <aside className="control-panel glass backdrop-blur-md bg-white/90 border shadow-xl" aria-label="Perencanaan jalur teduh">
      <div className="panel-heading"><span className="eyebrow">SUDIRMAN · GBK</span><h1>{({routes:'Rencanakan perjalanan',weather:'Cuaca & bayangan',gps:'Lokasi & perjalanan',layers:'Tampilan peta'})[activeSection]}</h1><p>{({routes:'Pilih tujuan dan jalur yang paling sesuai.',weather:'Atur waktu, lihat kondisi kawasan.',gps:'Pantau posisi dan sisa perjalananmu.',layers:'Pilih informasi yang ingin kamu lihat.'})[activeSection]}</p></div>
      <div id="panel-routes" role="tabpanel" aria-labelledby="tab-routes" hidden={activeSection !== 'routes'} tabIndex={0}>
      <fieldset className="travel-mode"><legend>Moda perjalanan</legend><div>{[['walking','Jalan kaki'],['motorcycle','Motor']].map(([value,label]) => <label key={value}><input type="radio" name="travel-mode" value={value} checked={mode === value} onChange={() => setMode(value)} /><span>{label}</span></label>)}</div><p>{mode === 'motorcycle' ? 'Pilih pin di jalan umum; titik jalan kaki di dalam GBK belum tentu terhubung untuk motor. Dalam mode OSM tanpa traffic, ruas dengan pembatasan belok dikecualikan sementara.' : 'Rute melalui jaringan pejalan kaki.'}</p></fieldset>
      {mode === 'motorcycle' && <section className="routing-status" aria-label="Traffic langsung"><label><input type="checkbox" checked={traffic && live} onChange={e=>{setTraffic(e.target.checked);if(e.target.checked)setLive(true);}} /> Gunakan traffic langsung</label><p>Mengaktifkan mode Sekarang. Titik perjalanan dikirim ke TomTom untuk rute motor. Memerlukan konfigurasi layanan.</p><p>{routing.result?.traffic?.message || 'Traffic belum diterapkan pada hasil rute.'}</p>{routing.result?.traffic?.status==='live' && <><p><a href="https://www.tomtom.com/" target="_blank" rel="noreferrer">© TomTom</a> · diambil {new Date(routing.result.traffic.fetchedAt).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta'})} WIB</p><p>Penundaan traffic: reguler {routing.result.regular.trafficDelaySeconds == null ? 'tidak tersedia' : Math.ceil(routing.result.regular.trafficDelaySeconds/60)+' menit'} / nyaman {routing.result.comfortable.trafficDelaySeconds == null ? 'tidak tersedia' : Math.ceil(routing.result.comfortable.trafficDelaySeconds/60)+' menit'}. Cakupan dan aturan motor penyedia dapat tidak lengkap.</p></>}</section>}
      <div className="journey"><div className="journey-icons"><span className="origin-dot" /><span className="journey-line" /><MapPin size={17} /></div><div className="flex-1"><div className="journey-location"><small>A · TITIK AWAL</small><strong>{editor.waypoints[0].map((v) => v.toFixed(5)).join(', ')}</strong></div><div className="journey-location"><small>B · TUJUAN</small><strong>{editor.waypoints.at(-1).map((v) => v.toFixed(5)).join(', ')}</strong></div></div><Footprints className="text-slate-400" size={20} /></div>
      <LocationSearch editor={editor} onLocate={onLocate} />
      <RouteEditor editor={editor} selectedRoute={selectedRoute} setSelectedRoute={setSelectedRoute} />
      <section aria-labelledby="route-title"><div className="section-heading mb-3"><h2 id="route-title">Pilih jalurmu</h2><span className="text-[10px] text-slate-400">{weather.stale && weather.data ? 'PRAKIRAAN TERSIMPAN' : 'PRAKIRAAN + GEOMETRI'}</span></div><div className="route-grid"><RouteCard mode={mode} metrics={metrics.regular} selected={selectedRoute === 'regular'} onSelect={() => { setSelectedRoute('regular'); editor.setAdding(false); }} /><RouteCard mode={mode} shaded metrics={metrics.shaded} selected={selectedRoute === 'shaded'} onSelect={() => { setSelectedRoute('shaded'); editor.setAdding(false); }} /></div></section>
      <div className="benefit"><ShieldCheck size={17} /><p>{!routing.result ? 'Perbandingan tersedia setelah pencarian selesai.' : routing.result.sameRoute ? 'Kedua pilihan memakai jalur yang sama; belum ditemukan alternatif lebih nyaman dalam batas jarak.' : `Rute nyaman: selisih jarak ${routing.result.extraDistancePercent}% dari reguler (batas tambahan 35%).`}</p><ArrowDown size={14} /></div>
      {Math.max(metrics.regular.insideBuildingPercent, metrics.shaded.insideBuildingPercent) > 0 && <p className="geometry-warning">Jaringan rute bertumpang tindih dengan tapak bangunan OSM (reguler {metrics.regular.insideBuildingPercent}%, teduh {metrics.shaded.insideBuildingPercent}% sampel). Bagian ini tidak dihitung sebagai jalur teduh kecuali lorong tertutup yang dipetakan; akses perlu verifikasi.</p>}
      <RoutingStatus mode={mode} routing={routing} />
      <button className="explore-button" disabled={!routing.result} onClick={onFocusRoute}><Footprints size={18} /> Lihat {selectedRoute === 'shaded' ? 'rute nyaman' : 'rute reguler'}<ArrowUpRight size={18} /></button>
      </div>
      <div id="panel-weather" role="tabpanel" aria-labelledby="tab-weather" hidden={activeSection !== 'weather'} tabIndex={0}>
      <section className="routing-status" aria-label="Mode waktu bayangan"><label><input type="checkbox" checked={live} onChange={(event)=>setLive(event.target.checked)} /> Sekarang · waktu WIB otomatis</label><p>{live ? `${clock.date} ${String(clock.hour).padStart(2,'0')}:${String(clock.minute).padStart(2,'0')} WIB · diperbarui setiap menit saat halaman aktif.` : 'Mode manual: pilih tanggal dan jam perjalanan.'}</p>{live && metrics.sun.altitude <= 0 && <p>Matahari di bawah horizon; proyeksi bayangan matahari tidak ditampilkan.</p>}<p>Bayangan adalah model geometri, bukan pengamatan langsung.</p></section>
      <WeatherCard weather={weather} metrics={metrics} />
      <section className="analysis-status" aria-label="Sumber analisis">
        <label className="analysis-date">Tanggal perjalanan<input type="date" aria-label="Tanggal perjalanan WIB" disabled={live} value={date} min="2000-01-01" max="2100-12-31" onInput={(e) => { if (e.currentTarget.value && e.currentTarget.validity.valid) setDate(e.currentTarget.value); }} onChange={(e) => { if (e.target.value && e.target.validity.valid) setDate(e.target.value); }} /></label>
        <details className="panel-details"><summary>Sumber & detail model</summary><p role="status">{osm.status === 'loading' ? 'Mengambil bangunan & pohon dari OSM…' : osm.status === 'error' ? osm.error : `${metrics.featureCount} objek OSM · ${new Date(osm.context.fetchedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`}</p>
        {osm.status === 'error' && <button className="retry-button" onClick={osm.retry}>Coba muat OSM lagi</button>}
        <p>Matahari: elevasi {metrics.sun.altitude.toFixed(1)}° · azimut {metrics.sun.azimuth.toFixed(1)}°</p>
        {osm.context && <p>Fasilitas titik OSM: {osm.context.geojson.features.filter((f) => f.properties?.amenity === 'shelter').length} shelter · {osm.context.geojson.features.filter((f) => f.properties?.amenity === 'drinking_water').length} air minum. Tidak tercatat bukan berarti tidak ada.</p>}
        <p>*Bayangan: model geometri, bukan pengukuran. Peta pohon OSM dapat tidak lengkap. Cuaca kawasan berlaku untuk kedua rute; perbedaan suhu trotoar belum diukur.</p>
        </details>
      </section>
      <section className="time-section" aria-labelledby="time-title"><div className="section-heading"><h2 id="time-title"><Clock3 size={15} /> Waktu perjalanan</h2><output htmlFor="hour-slider" className="time-value">{String(hour).padStart(2, '0')}:{live ? String(clock.minute).padStart(2,'0') : '00'} <span>WIB</span></output></div><input id="hour-slider" disabled={live} aria-label="Jam perjalanan dalam WIB" aria-valuetext={`${hour}:00 WIB`} type="range" min="8" max="17" step="1" value={Math.min(17,Math.max(8,hour))} onChange={(event) => setHour(Number(event.target.value))} style={{ '--progress': `${((hour - 8) / 9) * 100}%` }} /><div className="time-labels"><span>08:00</span><span><Sun size={12} /> Siang hari</span><span>17:00</span></div></section>
      <div className={`heat-notice ${metrics.heatWarning && !weather.stale ? 'extreme' : 'mild'}`} role="status"><Sun size={18} /><div><strong>{!metrics.selectedWeather ? 'Cuaca jam pilihan belum tersedia' : weather.stale ? 'Prakiraan tersimpan · belum terbaru' : metrics.heatWarning ? 'Prakiraan suhu terasa tinggi' : 'Prakiraan sesuai jam perjalanan'}</strong><p>{metrics.selectedWeather ? `${date} · ${String(hour).padStart(2, '0')}:00 WIB · Open-Meteo` : 'Analisis geometri tetap berjalan tanpa angka cuaca rekaan.'}</p></div></div>
      </div>
      <div id="panel-gps" role="tabpanel" aria-labelledby="tab-gps" hidden={activeSection !== 'gps'} tabIndex={0}>
      <GpsPanel editor={editor} onLocate={onLocate} gps={gps} mode={mode} route={selectedRoute === 'regular' ? routing.result?.regular : routing.result?.comfortable} />
      </div>
      <div id="panel-layers" role="tabpanel" aria-labelledby="tab-layers" hidden={activeSection !== 'layers'} tabIndex={0}>
      <section className="layer-section" aria-labelledby="layer-title"><div className="section-heading mb-2"><h2 id="layer-title">Teman di perjalanan</h2><span className="text-[10px] text-slate-400">LAYER PETA</span></div><LayerToggle icon={Trees} label="Proyeksi bayangan" detail="Bangunan & pohon OSM · estimasi" checked={showShadows} onChange={setShowShadows} color="teal" /><LayerToggle icon={Snowflake} label="Cooling Shelter" detail={osm.context ? 'Shelter bertag OSM · AC tidak diketahui' : 'Titik demo · belum terverifikasi'} checked={showShelters} onChange={setShowShelters} color="cyan" /><LayerToggle icon={Droplets} label="Water Refill" detail={osm.context ? 'Air minum OSM · biaya belum diketahui' : 'Usulan titik isi air gratis'} checked={showWater} onChange={setShowWater} color="teal" /></section>
      </div>
      <p className="panel-footnote">Jaringan OSM · OSM © contributors · Bukan navigasi real-time</p>
    </aside>
  );
}


function RoutingStatus({ routing, mode }) {
  const result = routing.result;
  return <section className="routing-status" aria-label="Status pencarian rute" aria-live="polite" aria-busy={routing.status === 'loading'}>
    <strong>{routing.status === 'loading' ? 'Mencari dua rute di jaringan jalan...' : result ? `Rute ${mode === 'motorcycle' ? 'motor' : 'jalan kaki'} · ${result.traffic?.status === 'live' ? 'TomTom + bayangan OSM' : 'jaringan OSM'}` : 'Rute belum tersedia'}</strong>
    {routing.error && <><p>{routing.error}</p><button className="retry-button" onClick={routing.retry}>Cari rute lagi</button></>}
    {result && <details className="panel-details"><summary>Detail rute & akses</summary>{mode === 'walking' && Math.max(result.regular.unverifiedSidewalkMeters || 0, result.comfortable.unverifiedSidewalkMeters || 0) > 0 && <p>Informasi trotoar belum tersedia atau belum terkonfirmasi pada sebagian rute: reguler {result.regular.unverifiedSidewalkMeters} m / nyaman {result.comfortable.unverifiedSidewalkMeters} m. Periksa kondisi berjalan di lokasi.</p>}<p>Reguler {result.regular.distanceMeters} m / Nyaman {result.comfortable.distanceMeters} m</p><p>{result.sameRoute ? 'Satu jalur terbaik tersedia untuk kedua pilihan.' : 'Dua pilihan melalui titik awal, persinggahan, dan tujuan yang sama.'}</p>{result.snaps.some((snap) => snap.distanceMeters > 1) && <p>Penyesuaian pin ke jaringan: {result.snaps.map((snap, index) => `${index === 0 ? 'A' : index === result.snaps.length - 1 ? 'B' : index} ${snap.distanceMeters} m`).join(' / ')}. Garis putus abu-abu bukan jalur perjalanan; akses dari pin perlu diperiksa.</p>}</details>}
  </section>;
}
