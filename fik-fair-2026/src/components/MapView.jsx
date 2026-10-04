import { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Crosshair, Droplets, Leaf, Minus, Plus, Snowflake, Sun } from 'lucide-react';
import { coolingShelters, regularRoute, routeEndpoints, shadedRoute, waterStations } from '../data/routeData';

function makeIcon(Icon, color) {
  return L.divIcon({ className: 'facility-marker', html: renderToStaticMarkup(<span className={`map-pin ${color}`}><Icon size={17} strokeWidth={2.3} /></span>), iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -22] });
}
const shelterIcon = makeIcon(Snowflake, 'cyan');
const waterIcon = makeIcon(Droplets, 'teal');
const allPoints = [...regularRoute, ...shadedRoute];

function MapControls({ focusRequest, selectedRoute }) {
  const map = useMap();
  const fit = (points = allPoints) => {
    const desktop = map.getSize().x >= 1024;
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: desktop ? [450, 150] : [40, 95], paddingBottomRight: desktop ? [100, 110] : [45, 85], maxZoom: 16, animate: false });
  };
  useEffect(() => {
    fit();
    const observer = new ResizeObserver(() => { map.invalidateSize(); fit(); });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // Refit on actual container resize; route selection alone preserves user pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useEffect(() => { if (focusRequest > 0) fit(selectedRoute === 'shaded' ? shadedRoute : regularRoute); }, [focusRequest]);
  return <div className="map-controls"><button aria-label="Perbesar peta" onClick={() => map.zoomIn()}><Plus size={19} /></button><button aria-label="Perkecil peta" onClick={() => map.zoomOut()}><Minus size={19} /></button><span /><button aria-label="Tampilkan semua rute" onClick={() => fit()}><Crosshair size={19} /></button></div>;
}

function Facilities({ items, icon }) {
  return items.map((item) => <Marker key={item.id} position={item.coordinates} icon={icon} title={item.name}><Popup><div className="facility-popup"><span>LOKASI SIMULASI</span><h3>{item.name}</h3><p>{item.description}</p><small>Lokasi & ketersediaan belum diverifikasi.</small></div></Popup></Marker>);
}

export default function MapView({ showShelters, showWater, metrics, selectedRoute, focusRequest }) {
  const [tileError, setTileError] = useState(false);
  return (
    <section className="map-region" aria-label="Peta interaktif koridor Sudirman–GBK">
      <MapContainer center={[-6.22, 106.808]} zoom={15} zoomControl={false} className="map-canvas" scrollWheelZoom>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }} />
        <Polyline positions={regularRoute} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
        <Polyline positions={regularRoute} pathOptions={{ color: '#EF4444', weight: selectedRoute === 'regular' ? 6 : 4, opacity: 0.85, dashArray: metrics.heatWarning ? '9 9' : undefined }}><Tooltip sticky>Rute reguler · {metrics.regular.feelsLike}°C terasa</Tooltip></Polyline>
        <Polyline positions={shadedRoute} pathOptions={{ color: '#10B981', weight: 18, opacity: 0.16, className: 'route-glow' }} />
        <Polyline positions={shadedRoute} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95 }} />
        <Polyline positions={shadedRoute} pathOptions={{ color: '#10B981', weight: selectedRoute === 'shaded' ? 6 : 5, opacity: 1 }}><Tooltip sticky>Rute teduh · {metrics.shaded.canopyCoverage}% terlindungi</Tooltip></Polyline>
        {Object.entries(routeEndpoints).map(([key, point]) => <CircleMarker key={key} center={point.coordinates} radius={8} pathOptions={{ fillColor: key === 'start' ? '#fff' : '#123e32', color: '#123e32', weight: 3, fillOpacity: 1 }}><Tooltip permanent direction={key === 'start' ? 'top' : 'bottom'} offset={[0, key === 'start' ? -12 : 12]} className="endpoint-label">{key === 'start' ? 'A' : 'B'} · {point.name}</Tooltip></CircleMarker>)}
        {showShelters && <Facilities items={coolingShelters} icon={shelterIcon} />}
        {showWater && <Facilities items={waterStations} icon={waterIcon} />}
        <MapControls focusRequest={focusRequest} selectedRoute={selectedRoute} />
      </MapContainer>
      <div className="map-location glass"><span className="status-dot" /><span>JAKARTA PUSAT</span><span className="location-divider">/</span> Sudirman – GBK</div>
      <div className="map-north" aria-hidden="true"><span>N</span><div>▲</div></div>
      {tileError && <div role="status" className="tile-error">Peta dasar belum termuat. Periksa koneksi internet; jalur simulasi tetap tersedia.</div>}
      <div className="map-legend glass"><span><i className="legend-line shaded" /><Leaf size={13} /> Jalur teduh</span><span><i className="legend-line regular" /><Sun size={13} /> Jalur terik</span><span className="legend-note">Rute ilustratif</span></div>
    </section>
  );
}
