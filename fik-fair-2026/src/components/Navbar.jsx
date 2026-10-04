import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Leaf, Sprout, X } from 'lucide-react';

export default function Navbar() {
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
        <span className="nav-tag"><Sprout size={14} /> SDG 11 &amp; 13 Innovation</span>
        <button className="about-button" onClick={() => setOpen(true)}>Tentang Inovasi <ArrowUpRight size={16} /></button>
      </header>
      <dialog ref={dialogRef} className="about-dialog" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === dialogRef.current) setOpen(false); }} aria-labelledby="about-title">
        <div className="p-7 sm:p-9">
          <div className="flex items-center justify-between"><span className="eyebrow">FIK FAIR 2026 · PROTOTIPE</span><button autoFocus aria-label="Tutup tentang inovasi" className="icon-button" onClick={() => setOpen(false)}><X size={20} /></button></div>
          <span className="brand-icon my-6"><Leaf size={25} /></span>
          <h2 id="about-title" className="text-3xl font-semibold tracking-tight text-forest">Kota yang lebih sejuk,<br />dimulai dari langkah kita.</h2>
          <p className="mt-5 text-sm leading-7 text-slate-600">TeduhRoute mengeksplorasi navigasi mikro untuk menghadapi Urban Heat Island. Pilih jalur berkanopi, temukan tempat berteduh, dan rencanakan waktu berjalan di koridor Sudirman–Gelora Bung Karno.</p>
          <div className="my-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-orange-50 p-4"><strong className="text-orange-700">SDG 11</strong><p className="mt-1 text-xs leading-5">Kota dan permukiman berkelanjutan</p></div><div className="rounded-xl bg-emerald-50 p-4"><strong className="text-emerald-800">SDG 13</strong><p className="mt-1 text-xs leading-5">Penanganan perubahan iklim</p></div></div>
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">Demo 100% client-side. Geometri jalur, suhu, UV, dan fasilitas merupakan simulasi, bukan data sensor atau panduan navigasi terverifikasi. Titik air gratis dan akses shelter masih berupa usulan. Estimasi kalori memakai asumsi orang dewasa 60 kg. Peta dasar memerlukan internet.</p>
        </div>
      </dialog>
    </>
  );
}
