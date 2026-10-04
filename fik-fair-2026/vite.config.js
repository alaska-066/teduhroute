import placesHandler from './api/places.js';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import osmHandler from './api/osm.js';
import analyzeHandler from './api/analyze.js';
import weatherHandler from './api/weather.js';
import routesHandler from './api/routes.js';

function localApi() {
  const install = (server) => { server.middlewares.use((req, res, next) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/places') return placesHandler(req,res);
    if (path === '/api/osm') return osmHandler(req, res);
    if (path === '/api/analyze') return analyzeHandler(req, res);
    if (path === '/api/weather') return weatherHandler(req, res);
    if (path === '/api/routes') return routesHandler(req, res);
    next();
  }); };
  return { name: 'teduhroute-local-api', configureServer: install, configurePreviewServer: install };
}

export default defineConfig(({mode}) => {
  const env=loadEnv(mode,process.cwd(),'');
  if(env.TOMTOM_API_KEY)process.env.TOMTOM_API_KEY=env.TOMTOM_API_KEY;
  return {plugins:[react(),localApi()]};
});
