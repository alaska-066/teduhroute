import { useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, RotateCcw, Undo2 } from 'lucide-react';

export default function RouteEditor({ editor }) {
  const [index, setIndex] = useState(0);
  const route = editor.waypoints;
  const safeIndex = Math.min(index, route.length - 1);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  useEffect(() => { setLat(String(route[safeIndex][0])); setLng(String(route[safeIndex][1])); }, [route, safeIndex]);
  return <section className="route-editor" aria-label="Editor titik rute">
    <button className="edit-toggle" onClick={editor.toggle} aria-expanded={editor.editing}><Pencil size={15} /> {editor.editing ? 'Selesai edit titik' : 'Edit titik rute'}<span>{editor.editing ? 'AKTIF' : 'GESER PIN'}</span></button>
    {editor.editing && <>
      <p>Geser A/B atau persinggahan. Rute reguler dan nyaman otomatis dicari ulang mengikuti jaringan jalan yang sama. Perubahan berlaku selama sesi ini.</p>
      <div className="editor-actions"><button onClick={() => editor.setAdding(!editor.adding)} aria-pressed={editor.adding}><Plus size={13} /> {editor.adding ? 'Batal tambah' : 'Tambah persinggahan'}</button><button disabled={!editor.canUndo} onClick={editor.undo}><Undo2 size={13} /> Undo</button><button onClick={editor.reset}><RotateCcw size={13} /> Reset rute</button></div>
      {editor.adding && <p className="editor-hint">Klik peta dekat jalan. Persinggahan baru ditambahkan sebelum tujuan dan dilalui kedua rute.</p>}
      <form onSubmit={(event) => { event.preventDefault(); editor.update(null, 'move', safeIndex, [Number(lat), Number(lng)]); }}>
        <label>Pilih titik<select aria-label="Titik yang diedit" value={safeIndex} onChange={(e) => setIndex(Number(e.target.value))}>{route.map((_, i) => <option key={i} value={i}>{i === 0 ? 'A · Awal' : i === route.length - 1 ? 'B · Tujuan' : `Persinggahan ${i}`}</option>)}</select></label>
        <div className="coordinate-inputs"><label>Latitude<input aria-label="Latitude titik" type="number" step="any" required value={lat} onChange={(e) => setLat(e.target.value)} /></label><label>Longitude<input aria-label="Longitude titik" type="number" step="any" required value={lng} onChange={(e) => setLng(e.target.value)} /></label></div>
        <div className="editor-actions"><button type="submit"><MapPin size={13} /> Terapkan koordinat</button><button type="button" disabled={safeIndex === 0 || safeIndex === route.length - 1} onClick={() => editor.update(null, 'remove', safeIndex)}>Hapus titik</button></div>
      </form>
      <p>Area studi diperluas 2×. Geser peta atau perkecil zoom untuk melihat batasnya. Maksimum 6 persinggahan; pin disesuaikan ke jalan terdekat hingga 100 m.</p>
    </>}
    {editor.message && <p role="status" className="editor-hint">{editor.message}</p>}
  </section>;
}
