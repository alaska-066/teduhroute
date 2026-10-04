import { useState } from 'react';
import { Leaf } from 'lucide-react';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel';
import { getRouteMetrics } from './data/routeData';

export default function App() {
  const [hour, setHour] = useState(12);
  const [showShelters, setShowShelters] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState('shaded');
  const [focusRequest, setFocusRequest] = useState(0);
  const metrics = getRouteMetrics(hour);
  const focusRoute = () => {
    setFocusRequest((value) => value + 1);
    if (window.matchMedia('(max-width: 1023px)').matches) document.querySelector('.map-region')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return <div className="app-shell"><a href="#controls" className="skip-link">Ke kontrol perjalanan</a><Navbar /><main id="main"><MapView {...{ showShelters, showWater, metrics, selectedRoute, focusRequest }} /><div id="controls"><ControlPanel {...{ hour, setHour, metrics, showShelters, setShowShelters, showWater, setShowWater, selectedRoute, setSelectedRoute }} onFocusRoute={focusRoute} /></div><div className="map-story glass"><span className="story-icon"><Leaf size={21} /></span><div><strong>Rute terbaik tak selalu yang tercepat.</strong><p>Yang membuatmu nyaman, juga layak jadi pilihan.</p></div></div></main><footer className="app-footer"><span>Dirancang untuk langkah yang lebih baik.</span><span>FIK FAIR 2026 <span className="mx-2">/</span> <strong>TEDUHROUTE</strong></span></footer></div>;
}
