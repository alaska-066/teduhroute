import {validCoordinate} from './routeEditing.js';
export function gpsStartCoordinate(fix,now=Date.now()) {
 if(!fix || !Number.isFinite(fix.timestamp) || now-fix.timestamp>30000 || fix.timestamp>now+5000)throw new Error('Aktifkan GPS dan tunggu lokasi terbaru (maksimal 30 detik).');
 if(!Number.isFinite(fix.accuracy)||fix.accuracy<0||fix.accuracy>50)throw new Error('Akurasi GPS belum cukup. Tunggu hingga akurasi 50 m atau lebih baik.');
 const coordinate=[fix.latitude,fix.longitude];
 if(!validCoordinate(coordinate))throw new Error('Posisi Anda berada di luar wilayah layanan Sudirman–GBK. Titik awal belum diubah.');
 return coordinate;
}
