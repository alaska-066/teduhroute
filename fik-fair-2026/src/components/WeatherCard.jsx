import { CloudSun, RefreshCw } from 'lucide-react';
import { formatWeatherTime, weatherDescription } from '../lib/weather';

const show = (value, unit = '') => value == null ? '—' : `${value}${unit}`;
export default function WeatherCard({ weather, metrics }) {
  const { data, loading, stale, error, refresh } = weather;
  return <section className="weather-card" aria-label="Cuaca terkini">
    <div className="section-heading"><h2><CloudSun size={17} /> Cuaca terkini</h2><span className={`weather-badge ${data && !stale ? 'fresh' : ''}`}>{loading ? 'Memperbarui…' : data && !stale ? 'TERHUBUNG' : 'BELUM TERBARU'}</span></div>
    {data ? <>
      <div className="weather-main"><strong>{show(data.current.temperature, '°C')}</strong><div>{weatherDescription(data.current.weatherCode)}<small>Terasa {show(data.current.apparentTemperature, '°C')}</small></div></div>
      <div className="weather-values"><span>Kelembapan <b>{show(data.current.humidity, '%')}</b></span><span>Angin <b>{show(data.current.windSpeed, ' km/jam')}</b></span><span>Hujan <b>{show(data.current.precipitation, ' mm')}</b></span><span>UV kawasan <b>{show(data.current.uvIndex)}</b></span></div>
      <p>Berlaku {formatWeatherTime(data.current.time)} WIB · akumulasi hujan {data.current.interval ? Math.round(data.current.interval / 60) : '—'} menit.</p>
      <p>Diambil {formatWeatherTime(Date.parse(data.fetchedAt) / 1000)} WIB.</p>
      {stale && <p className="weather-error" role="status">Data tersimpan belum terbaru. Periksa waktu berlaku; pembaruan akan dicoba kembali.</p>}
    </> : <p role="status">{loading ? 'Mengambil cuaca kawasan Sudirman–GBK…' : 'Data cuaca belum tersedia.'}</p>}
    {error && <p className="weather-error" role="status">{error}</p>}
    <div className="weather-source"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo · CC BY 4.0</a><button type="button" disabled={loading} onClick={refresh} aria-label="Perbarui cuaca"><RefreshCw size={12} /> Perbarui</button></div>
    <p>Otomatis setiap 5 menit. Data model cuaca kawasan, bukan sensor di trotoar.</p>
    <p className="forecast-note">{metrics.selectedWeather ? `Kartu rute: prakiraan ${formatWeatherTime(metrics.selectedWeather.time)} WIB${stale ? ' (data tersimpan)' : ''}.` : 'Prakiraan jam perjalanan ini belum tersedia. Pilih tanggal dalam 7 hari cakupan prakiraan.'} Bayangan tetap model geometri; awan/hujan dapat mengurangi sinar langsung.</p>
  </section>;
}
