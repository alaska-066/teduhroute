import useLiveTime from './hooks/useLiveTime';
import useGpsTracking from './hooks/useGpsTracking';
import { useMemo, useState } from 'react';
import { Leaf } from 'lucide-react';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel';
import { todayWib } from './lib/routeAnalysis';
import useOsmContext from './hooks/useOsmContext';
import useRouteEditor from './hooks/useRouteEditor';
import useWeather from './hooks/useWeather';
import useWalkingRoutes from './hooks/useWalkingRoutes';
import { displayRoutingMetrics } from './lib/routingMetrics';

export default function App() {
  const [manualHour, setHour] = useState(() => Math.min(17, Math.max(8, Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hourCycle: 'h23' }).format(new Date())))));
  const [activeSection,setActiveSection]=useState('routes');
  const [locateTarget,setLocateTarget]=useState(null);
  const onLocate=(coordinate)=>setLocateTarget({coordinate,id:Date.now()});
  const [mode, setMode] = useState('walking');
  const [showShelters, setShowShelters] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState('shaded');
  const [focusRequest, setFocusRequest] = useState(0);
  const [manualDate, setDate] = useState(todayWib);
  const [showShadows, setShowShadows] = useState(true);
  const [traffic,setTraffic]=useState(false);
  const [live, setLive] = useState(false);
  const clock = useLiveTime(live);
  const date = live ? clock.date : manualDate;
  const hour = live ? clock.hour : manualHour;
  const at = live ? clock.at : null;
  const gps = useGpsTracking();
  const osm = useOsmContext();
  const editor = useRouteEditor();
  const weather = useWeather();
  const routing = useWalkingRoutes(editor.waypoints, date, hour, mode, at, traffic && live && mode === 'motorcycle');
  const metrics = useMemo(() => displayRoutingMetrics(routing.result, { date, hour, context: osm.context, weather: weather.data, at }), [at, date, hour, osm.context, routing.result, weather.data]);
  const changeSection=(section)=>{setActiveSection(section);if(section!=='routes' && editor.editing)editor.toggle();document.querySelector('.control-panel')?.scrollTo({top:0});if(window.matchMedia('(max-width: 1023px)').matches)document.querySelector('#controls')?.scrollIntoView({behavior:'smooth',block:'start'});};
  const focusRoute = () => {
    setFocusRequest((value) => value + 1);
    if (window.matchMedia('(max-width: 1023px)').matches) document.querySelector('.map-region')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return <div className="app-shell"><a href="#controls" className="skip-link">Ke kontrol perjalanan</a><Navbar activeSection={activeSection} onSectionChange={changeSection} /><main id="main"><MapView {...{ showShelters, showWater, metrics, selectedRoute, focusRequest, showShadows, editor, routing, gps, locateTarget }} context={osm.context} /><div id="controls"><ControlPanel {...{ activeSection, traffic, setTraffic, onLocate, live, setLive, clock, gps, mode, setMode, hour, setHour, metrics, showShelters, setShowShelters, showWater, setShowWater, selectedRoute, setSelectedRoute, date, setDate, osm, showShadows, setShowShadows, editor, weather, routing }} onFocusRoute={focusRoute} /></div><div className="map-story glass"><span className="story-icon"><Leaf size={21} /></span><div><strong>Bayangan berubah. Pilihanmu juga.</strong><p>Rute reguler & nyaman · Mengikuti jalan OpenStreetMap.</p></div></div></main><footer className="app-footer"><span>Dirancang untuk langkah yang lebih baik.</span><span>FIK FAIR 2026 <span className="mx-2">/</span> <strong>TEDUH</strong></span></footer></div>;
}

