import { useCallback, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { Circle, CircleMarker, GeoJSON, MapContainer, Marker, Polyline, Popup, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Crosshair, Droplets, Leaf, Minus, Plus, Snowflake, Sun } from 'lucide-react';
import { coolingShelters, waterStations } from '../data/routeData';
import { EDIT_BOUNDS } from '../lib/routeEditing';

function makeIcon(Icon, color) {
  return L.divIcon({ className: 'facility-marker', html: renderToStaticMarkup(<span className={`map-pin ${color}`}><Icon size={17} strokeWidth={2.3} /></span>), iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -22] });
}
const shelterIcon = makeIcon(Snowflake, 'cyan');
const waterIcon = makeIcon(Droplets, 'teal');
const vertexIcon = (label, route) => L.divIcon({ className: 'route-vertex', html: `<span class="vertex-pin ${route}">${label}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });

function MapControls({ focusRequest, selectedRoute, routes }) {
  const map = useMap();
  const fit = useCallback((points = [...routes.regular, ...routes.shaded]) => {
    const desktop = map.getSize().x >= 1024;
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: desktop ? [450, 150] : [40, 95], paddingBottomRight: desktop ? [100, 110] : [45, 85], maxZoom: 16, animate: false });
  }, [map, routes]);
  const latestFit = useRef(fit);
  latestFit.current = fit;
  const lastFocus = useRef(focusRequest);
  useEffect(() => {
    latestFit.current();
    const observer = new ResizeObserver(() => { map.invalidateSize(); latestFit.current(); });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // Refit on actual container resize; route selection alone preserves user pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useEffect(() => { if (focusRequest !== lastFocus.current) { lastFocus.current = focusRequest; fit(routes[selectedRoute]); } }, [focusRequest, fit, routes, selectedRoute]);
  return <div className="map-controls"><button aria-label="Perbesar peta" onClick={() => map.zoomIn()}><Plus size={19} /></button><button aria-label="Perkecil peta" onClick={() => map.zoomOut()}><Minus size={19} /></button><span /><button aria-label="Tampilkan semua rute" onClick={() => fit()}><Crosshair size={19} /></button></div>;
}

function EditablePoints({ editor, selectedRoute }) {
  useMapEvents({ click(event) { if (editor.editing && editor.adding) editor.update(selectedRoute, 'insert', null, [event.latlng.lat, event.latlng.lng]); } });
  const route = editor.waypoints;
  return <>
    {editor.editing && <Rectangle bounds={[[EDIT_BOUNDS[0], EDIT_BOUNDS[1]], [EDIT_BOUNDS[2], EDIT_BOUNDS[3]]]} interactive={false} pathOptions={{ color: '#477f65', weight: 1.5, dashArray: '6 6', fillOpacity: 0 }} />}
    {route.map((position, index) => {
      const endpoint = index === 0 || index === route.length - 1;
      const label = index === 0 ? 'A' : index === route.length - 1 ? 'B' : String(index);
      return <Marker key={`${selectedRoute}-${route.length}-${editor.editing}-${label}`} position={position} icon={vertexIcon(label, selectedRoute)} draggable={editor.editing} title={`${endpoint ? 'Titik' : 'Titik antara'} ${label}${editor.editing ? ' · geser untuk ubah' : ''}`} zIndexOffset={endpoint ? 900 : 800} eventHandlers={{ dragend(event) {
        const marker = event.target;
        const next = marker.getLatLng();
        if (!editor.update(selectedRoute, 'move', index, [next.lat, next.lng])) marker.setLatLng(position);
      } }}>
        {endpoint && <Tooltip permanent direction={index === 0 ? 'top' : 'bottom'} offset={[0, index === 0 ? -15 : 15]} className="endpoint-label">{label} · {index === 0 ? 'Awal perjalanan' : 'Tujuan perjalanan'}</Tooltip>}
        <Popup><strong>Titik {label}</strong><p>{position[0].toFixed(5)}, {position[1].toFixed(5)}</p>{editor.editing ? <><p>Geser pin atau gunakan formulir koordinat.</p>{!endpoint && <button className="retry-button" onClick={() => editor.update(selectedRoute, 'remove', index)}>Hapus titik {label}</button>}</> : <p>Aktifkan “Edit titik rute” untuk memindahkan pin.</p>}</Popup>
      </Marker>;
    })}
  </>;
}

function Facilities({ items, icon }) {
  return items.map((item) => <Marker key={item.id} position={item.coordinates} icon={icon} title={item.name}><Popup><div className="facility-popup"><span>{item.osm ? 'SUMBER OPENSTREETMAP' : 'LOKASI SIMULASI'}</span><h3>{item.name}</h3><p>{item.description}</p><small>Akses & ketersediaan saat ini belum diverifikasi.</small></div></Popup></Marker>);
}

export default function MapView({ showShelters, showWater, metrics, selectedRoute, focusRequest, context, showShadows, editor, routing, gps, locateTarget }) {
  const [tileError, setTileError] = useState(false);
  const routes = routing.result?.routes;
  const regularRoute = routes?.regular || [];
  const shadedRoute = routes?.shaded || [];
  const facilities = (amenity) => context.geojson.features.filter((f) => f.properties?.amenity === amenity && f.geometry.type === 'Point').map((f) => ({ id: f.id, osm: true, name: f.properties.name || (amenity === 'shelter' ? 'Shelter OSM' : 'Air minum OSM'), coordinates: [f.geometry.coordinates[1], f.geometry.coordinates[0]], description: `Tag OSM: ${amenity}. Akses: ${f.properties.access || 'tidak diketahui'}. Biaya: ${f.properties.fee || 'tidak diketahui'}.` }));
  return (
    <section className="map-region" aria-label="Peta interaktif koridor Sudirman–GBK">
      <MapContainer center={[-6.22, 106.808]} zoom={15} zoomControl={false} className="map-canvas" scrollWheelZoom>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }} />
        {showShadows && routing.result && <GeoJSON key={`${metrics.date}-${metrics.hour}-${metrics.sun.azimuth}-${routing.result.fetchedAt}`} data={metrics.shadows} interactive={false} style={(f) => ({ color: f.properties.kind === 'tree' ? '#528644' : '#5a6193', weight: 0.5, fillOpacity: 0.22, opacity: 0.35 })} />}
        {routing.result && <>
        <Polyline positions={regularRoute} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
        <Polyline positions={regularRoute} pathOptions={{ color: '#EF4444', weight: selectedRoute === 'regular' ? 6 : 4, opacity: 0.85, dashArray: metrics.heatWarning ? '9 9' : undefined }}><Tooltip sticky>Rute reguler · {metrics.regular.shadeCoverage ?? '—'}% bayangan model</Tooltip></Polyline>
        <Polyline positions={shadedRoute} pathOptions={{ color: '#10B981', weight: 18, opacity: 0.16, className: 'route-glow' }} />
        <Polyline positions={shadedRoute} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95 }} />
        <Polyline positions={shadedRoute} pathOptions={{ color: '#10B981', weight: selectedRoute === 'shaded' ? 6 : 5, opacity: 1 }}><Tooltip sticky>Rute nyaman · {metrics.shaded.shadeCoverage ?? '—'}% bayangan model</Tooltip></Polyline>
        </>}
        {routing.result?.snaps.filter((snap) => snap.distanceMeters > 1).map((snap, index) => <Polyline key={`snap-${index}`} positions={[snap.requested, snap.coordinate]} pathOptions={{ color: "#64748b", weight: 2, dashArray: "3 5" }}><Tooltip>Penyesuaian pin {snap.distanceMeters} m ke jaringan. Garis ini bukan jalur perjalanan.</Tooltip></Polyline>)}
        {gps.enabled && gps.fix && gps.now - gps.fix.timestamp <= 30000 && <><Circle center={[gps.fix.latitude,gps.fix.longitude]} radius={gps.fix.accuracy} pathOptions={{color:'#2563eb',weight:1,fillOpacity:0.08}} /><CircleMarker center={[gps.fix.latitude,gps.fix.longitude]} radius={7} pathOptions={{color:'white',weight:2,fillColor:'#2563eb',fillOpacity:1}}><Tooltip>Posisi GPS Anda · akurasi ±{Math.round(gps.fix.accuracy)} m</Tooltip></CircleMarker></>}
        <EditablePoints editor={editor} selectedRoute={selectedRoute} />
        {showShelters && <Facilities items={context ? facilities('shelter') : coolingShelters} icon={shelterIcon} />}
        {showWater && <Facilities items={context ? facilities('drinking_water') : waterStations} icon={waterIcon} />}
        <LocatePoint target={locateTarget} />
        <MapControls focusRequest={focusRequest} selectedRoute={selectedRoute} routes={routes || { regular: editor.waypoints, shaded: editor.waypoints }} />
      </MapContainer>
      <div className="map-location glass"><span className="status-dot" /><span>JAKARTA PUSAT</span><span className="location-divider">/</span> Sudirman – GBK</div>
      <div className="map-north" aria-hidden="true"><span>N</span><div>▲</div></div>
      {editor.editing && <div className="map-edit-notice" role="status">{editor.adding ? 'Klik peta untuk menambah titik rute' : 'Mode edit: geser A, B, atau pin bernomor'}{editor.message && <small>{editor.message}</small>}</div>}
      {tileError && <div role="status" className="tile-error">Peta dasar belum termuat. Periksa koneksi internet; hasil rute tetap ditampilkan jika tersedia.</div>}
      <div className="map-legend glass"><span><i className="legend-line shaded" /><Leaf size={13} /> Rute nyaman</span><span><i className="legend-line regular" /><Sun size={13} /> Rute reguler</span><span className="legend-note">Jaringan OSM</span></div>
    </section>
  );
}


function LocatePoint({target}) { const map=useMap(); useEffect(()=>{if(target)map.setView(target.coordinate,17,{animate:false});},[map,target]);return null;}
