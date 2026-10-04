import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Leaf, Route, CloudSun, LocateFixed, Layers, X } from 'lucide-react';

export default function Navbar({ activeSection, onSectionChange }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open && !dialogRef.current.open) dialogRef.current.showModal();
    if (!open && dialogRef.current.open) dialogRef.current.close();
  }, [open]);

  return (
    <>
      <header className="navbar glass">
        <a href="#main" className="brand" aria-label="TeduhRoute beranda">
          <span className="brand-icon"><Leaf size={23} /></span>
          <span>Teduh<span className="font-normal">Route</span><span className="brand-dot">.</span></span>
        </a>
        <nav className="feature-nav" aria-label="Fitur TeduhRoute"><div role="tablist" aria-label="Panel fitur">{[['routes','Rute',Route],['weather','Cuaca',CloudSun],['gps','GPS',LocateFixed],['layers','Layer Peta',Layers]].map(([id,label,Icon],index)=><button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={activeSection===id} aria-controls={`panel-${id}`} tabIndex={activeSection===id?0:-1} onClick={()=>onSectionChange(id)} onKeyDown={event=>{const keys=['ArrowRight','ArrowLeft','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const buttons=event.currentTarget.parentElement.querySelectorAll('[role="tab"]');const next=event.key==='Home'?0:event.key==='End'?3:(index+(event.key==='ArrowRight'?1:3))%4;buttons[next].focus();buttons[next].click();}}><Icon size={16}/><span>{label}</span></button>)}</div></nav>
        <button className="about-button" onClick={() => setOpen(true)}>Tentang <ArrowUpRight size={16} /></button>
      </header>
      <dialog ref={dialogRef} className="about-dialog" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === dialogRef.current) setOpen(false); }} aria-labelledby="about-title">
        <div className="p-7 sm:p-9">
          <div className="flex items-center justify-between"><span className="eyebrow">FIK FAIR 2026 · PROTOTIPE</span><button autoFocus aria-label="Tutup tentang inovasi" className="icon-button" onClick={() => setOpen(false)}><X size={20} /></button></div>
          <span className="brand-icon my-6"><Leaf size={25} /></span>
          <h2 id="about-title" className="text-3xl font-semibold tracking-tight text-forest">Kota yang lebih sejuk,<br />dimulai dari langkah kita.</h2>
          <p className="mt-5 text-sm leading-7 text-slate-600">TeduhRoute mengeksplorasi navigasi mikro untuk menghadapi Urban Heat Island. Pilih jalur berkanopi, temukan tempat berteduh, dan rencanakan waktu berjalan di koridor Sudirman–Gelora Bung Karno.</p>
          <div className="my-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-orange-50 p-4"><strong className="text-orange-700">SDG 11</strong><p className="mt-1 text-xs leading-5">Kota dan permukiman berkelanjutan</p></div><div className="rounded-xl bg-emerald-50 p-4"><strong className="text-emerald-800">SDG 13</strong><p className="mt-1 text-xs leading-5">Penanganan perubahan iklim</p></div></div>
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">Geser titik rute untuk memperbarui jarak dan proyeksi bayangan SunCalc + Turf + OSM. Cuaca terkini dan prakiraan jam pilihan berasal dari Open-Meteo, diperbarui otomatis setiap 5 menit. Ini data model kawasan, bukan pengukuran suhu tiap trotoar. Suhu permukaan tidak tersedia. Tinggi bangunan/pohon yang tidak tercatat memakai asumsi. Rute otomatis mengikuti jaringan pejalan kaki OSM. Reguler mengutamakan waktu; nyaman menimbang bayangan dengan tambahan jarak maksimal 35%. Akses lapangan tetap perlu diverifikasi. Shelter OSM tidak menjamin AC; air minum tidak menjamin gratis.</p>
        </div>
      </dialog>
    </>
  );
}
