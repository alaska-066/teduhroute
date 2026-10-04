import { ArrowDown, ArrowUpRight, Check, Clock3, Droplets, Flame, Footprints, Leaf, MapPin, ShieldCheck, Snowflake, Sun, Thermometer, Trees } from 'lucide-react';

function Metric({ icon: Icon, label, value }) {
  return <div className="route-metric"><span><Icon size={13} />{label}</span><strong>{value}</strong></div>;
}

function RouteCard({ shaded, metrics, selected, onSelect }) {
  return (
    <button className={`route-card ${shaded ? 'shaded-card' : 'regular-card'} ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[13px] font-semibold">{shaded ? <Leaf size={15} /> : <Sun size={15} />}{shaded ? 'Rute Teduh' : 'Rute Reguler'}</span><span className="selection-dot">{selected && <Check size={10} />}</span></div>
      <p className="route-description">{shaded ? 'Lebih sejuk, lebih nyaman' : 'Jalur protokol terbuka'}</p>
      <div className="route-temperature">{metrics.feelsLike}<span>°C</span></div><p className="text-[10px] text-slate-500">suhu terasa</p>
      <div className="mt-4 space-y-2">
        <Metric icon={Trees} label="Teduh" value={`${metrics.canopyCoverage}%`} />
        <div className="canopy-track"><span style={{ width: `${metrics.canopyCoverage}%` }} /></div>
        <Metric icon={Thermometer} label="Permukaan" value={`${metrics.surfaceTemperature}°C`} />
        <Metric icon={Sun} label="Indeks UV" value={metrics.uvIndex} />
      </div>
      <div className="route-card-footer"><span><Clock3 size={12} /> {metrics.durationMinutes} mnt</span><span><Flame size={12} /> {metrics.calories} kkal</span></div>
      <span className="route-distance">{metrics.distanceKm.toLocaleString('id-ID')} km · jalan kaki</span>
    </button>
  );
}

function LayerToggle({ icon: Icon, label, detail, checked, onChange, color }) {
  return <label className="layer-toggle"><span className={`layer-icon ${color}`}><Icon size={17} /></span><span className="flex-1"><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} /><span className="switch-track" aria-hidden="true" /></label>;
}

export default function ControlPanel({ hour, setHour, metrics, showShelters, setShowShelters, showWater, setShowWater, selectedRoute, setSelectedRoute, onFocusRoute }) {
  return (
    <aside className="control-panel glass backdrop-blur-md bg-white/90 border shadow-xl" aria-label="Perencanaan jalur teduh">
      <div className="panel-intro"><span className="eyebrow"><span className="status-dot" /> URBAN WALKING, REIMAGINED</span><h1>Langkah kecil.<br /><span>Lebih sejuk.</span></h1><p>Jelajahi kota, hindari teriknya.</p></div>
      <div className="journey"><div className="journey-icons"><span className="origin-dot" /><span className="journey-line" /><MapPin size={17} /></div><div className="flex-1"><div className="journey-location"><small>TITIK AWAL</small><strong>Koridor Sudirman</strong></div><div className="journey-location"><small>TUJUAN</small><strong>Gelora Bung Karno</strong></div></div><Footprints className="text-slate-400" size={20} /></div>
      <section className="time-section" aria-labelledby="time-title"><div className="section-heading"><h2 id="time-title"><Clock3 size={15} /> Waktu perjalanan</h2><output htmlFor="hour-slider" className="time-value">{String(hour).padStart(2, '0')}:00 <span>WIB</span></output></div><input id="hour-slider" aria-label="Jam perjalanan dalam WIB" aria-valuetext={`${hour}:00 WIB`} type="range" min="8" max="17" step="1" value={hour} onChange={(event) => setHour(Number(event.target.value))} style={{ '--progress': `${((hour - 8) / 9) * 100}%` }} /><div className="time-labels"><span>08:00</span><span><Sun size={12} /> Siang hari</span><span>17:00</span></div></section>
      <div className={`heat-notice ${metrics.heatWarning ? 'extreme' : 'mild'}`} role="status"><Sun size={18} /><div><strong>{metrics.heatWarning ? 'Heat Warning: Ekstrem' : 'Waktu yang lebih bersahabat'}</strong><p>{metrics.heatWarning ? `Suhu Terasa ${metrics.regular.feelsLike}°C` : `Suhu terasa jalur terbuka ${metrics.regular.feelsLike}°C`}<span> · Pilih langkah yang teduh.</span></p></div></div>
      <section aria-labelledby="route-title"><div className="section-heading mb-3"><h2 id="route-title">Pilih jalurmu</h2><span className="text-[10px] text-slate-400">ESTIMASI SIMULASI</span></div><div className="route-grid"><RouteCard metrics={metrics.regular} selected={selectedRoute === 'regular'} onSelect={() => setSelectedRoute('regular')} /><RouteCard shaded metrics={metrics.shaded} selected={selectedRoute === 'shaded'} onSelect={() => setSelectedRoute('shaded')} /></div></section>
      <div className="benefit"><ShieldCheck size={17} /><p><strong>{Math.round(metrics.regular.feelsLike - metrics.shaded.feelsLike)}°C lebih sejuk</strong> melalui jalur teduh</p><ArrowDown size={14} /></div>
      <section className="layer-section" aria-labelledby="layer-title"><div className="section-heading mb-2"><h2 id="layer-title">Teman di perjalanan</h2><span className="text-[10px] text-slate-400">LAYER PETA</span></div><LayerToggle icon={Snowflake} label="Cooling Shelter" detail="Tempat singgah & berteduh" checked={showShelters} onChange={setShowShelters} color="cyan" /><LayerToggle icon={Droplets} label="Water Refill" detail="Usulan titik isi air gratis" checked={showWater} onChange={setShowWater} color="teal" /></section>
      <button className="explore-button" onClick={onFocusRoute}><Footprints size={18} /> Lihat {selectedRoute === 'shaded' ? 'rute teduh' : 'rute reguler'}<ArrowUpRight size={18} /></button>
      <p className="panel-footnote">Data demonstrasi · Bukan navigasi real-time</p>
    </aside>
  );
}
