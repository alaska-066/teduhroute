import {useEffect,useRef,useState} from 'react';
export default function LocationSearch({editor,onLocate}) {
 const [query,setQuery]=useState(''),[state,setState]=useState({status:'idle',results:[]});
 const controller=useRef(null);const revision=useRef(0);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const search=async(event)=>{
  event.preventDefault();controller.current?.abort();const request=++revision.current;const abort=new AbortController();controller.current=abort;
  setState({status:'loading',results:[]});const timeout=setTimeout(()=>abort.abort(),30000);
  try{const response=await fetch(`/api/places?q=${encodeURIComponent(query.trim())}`,{signal:abort.signal});const data=await response.json();if(!response.ok)throw new Error(data.error);if(request===revision.current)setState({status:'ready',results:data.results});}
  catch(error){if(request===revision.current)setState({status:'error',results:[],message:abort.signal.aborted?'Pencarian dibatalkan atau melewati batas waktu.':error.message});}
  finally{clearTimeout(timeout);}
 };
 return <section className="routing-status" aria-label="Cari tujuan"><strong>Cari lokasi tujuan</strong><form onSubmit={search} className="place-search"><input aria-label="Nama lokasi tujuan" placeholder="Contoh: Istora, Senayan" minLength={2} maxLength={100} required value={query} onChange={e=>{setQuery(e.target.value);controller.current?.abort();revision.current++;setState({status:'idle',results:[]});}}/><button className="retry-button" disabled={state.status==='loading'}>Cari</button></form><p>Nama tempat/jalan OSM dalam wilayah layanan. Hasil dipakai sebagai titik B, bukan jaminan pintu masuk.</p><div aria-live="polite">{state.status==='loading'&&<p>Mencari lokasi…</p>}{state.message&&<p>{state.message}</p>}{state.status==='ready'&&!state.results.length&&<p>Tidak ditemukan. Coba nama lain; pencarian terbatas pada tempat yang tercatat di OSM.</p>}</div><ul className="place-results">{state.results.map(place=><li key={place.id}><button onClick={()=>{if(editor.update(null,'move',editor.waypoints.length-1,place.coordinates)){onLocate(place.coordinates);setState({status:'selected',results:[],message:`Tujuan dipindahkan ke ${place.name}.`});}}}>{place.name}<small>{place.kind} · {place.coordinates.map(v=>v.toFixed(5)).join(', ')}</small></button></li>)}</ul></section>;
}
