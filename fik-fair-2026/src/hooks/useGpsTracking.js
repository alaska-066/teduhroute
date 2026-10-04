import { useEffect, useRef, useState } from 'react';
import { subscribeGps } from '../lib/gpsProgress.js';
export default function useGpsTracking() {
  const [enabled,setEnabled]=useState(false);
  const [fix,setFix]=useState(null);
  const [error,setError]=useState(null);
  const [now,setNow]=useState(Date.now);
  const stopRef=useRef(null);
  const stop=()=>{stopRef.current?.();stopRef.current=null;setEnabled(false);setFix(null);setError(null);};
  const start=()=>{
    if (!window.isSecureContext || !navigator.geolocation) { setError('GPS memerlukan HTTPS (atau localhost) dan browser yang mendukung lokasi.'); return; }
    setError(null);setFix(null);setEnabled(true);
  };
  useEffect(()=>{
    if (!enabled) return;
    let active=true;
    const cleanup=subscribeGps(navigator.geolocation,(next)=>{if(active){setFix(next);setError(null);setNow(Date.now());}},(err)=>{
      if (!active) return;
      setFix(null);
      setError(err.code===1 ? 'Izin lokasi ditolak. Izinkan lokasi melalui pengaturan browser, lalu coba lagi.' : err.code===3 ? 'GPS melewati batas waktu. Menunggu pembaruan lokasi.' : 'Lokasi belum tersedia. Menunggu sinyal GPS.');
      if(err.code===1)setEnabled(false);
    });
    stopRef.current=cleanup;
    const timer=setInterval(()=>setNow(Date.now()),5000);
    return()=>{active=false;cleanup();stopRef.current=null;clearInterval(timer);};
  },[enabled]);
  return {enabled,fix,error,now,start,stop};
}
