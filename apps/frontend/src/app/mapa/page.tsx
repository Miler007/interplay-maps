'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import { api } from '@/lib/api';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then((m) => m.GeoJSON), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then((m) => m.ZoomControl), { ssr: false });

const iconColors: Record<string, string> = {
  CAJA: '#10b981', CAJAS: '#10b981', CLIENTE: '#6366f1',
  NODO: '#06b6d4', NODOS: '#06b6d4', POSTE: '#ef4444', POSTES: '#ef4444',
  CTO: '#3b82f6', SPLITTER: '#8b5cf6', SPLITTERS: '#8b5cf6', MUFLAS: '#f59e0b',
};

const MAP_TYPES = [
  { key: 'satellite' as const, label: '🛰 Satélite' },
  { key: 'hybrid' as const, label: '🛰 Híbrido' },
  { key: 'street' as const, label: '🗺 Calle' },
  { key: 'topo' as const, label: '🏔 Topo' },
];

function featureToPopup(feature: any) {
  const p = feature.properties;
  const color = iconColors[p.type] || '#64748b';
  return `<div style="min-width:200px;font-family:system-ui,sans-serif">
    <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <span style="background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">${p.typeName || p.type}</span>
      <span style="background:${p.status === 'ACTIVO' ? '#d1fae5' : '#fef3c7'};color:${p.status === 'ACTIVO' ? '#065f46' : '#92400e'};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">${p.status}</span>
    </div>
    <div style="font-weight:700;font-size:14px;color:#0f172a">${p.name}</div>
    <div style="font-size:11px;color:#64748b">${p.code}</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">${p.department} / ${p.municipality}</div>
    <div style="margin-top:6px;display:flex;gap:6px;font-size:11px">
      <span style="background:#f1f5f9;padding:3px 6px;border-radius:6px;flex:1;text-align:center">Confianza <strong style="color:#0f172a">${p.confidenceScore || 0}%</strong></span>
      <span style="background:#f1f5f9;padding:3px 6px;border-radius:6px;flex:1;text-align:center">Salud <strong style="color:#0f172a">${p.healthScore || 0}%</strong></span>
    </div></div>`;
}

function pointToLayer(feature: any, latlng: L.LatLng) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const color = iconColors[feature.properties?.type] || '#64748b';
  return L.circleMarker(latlng, { radius: 8, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.9 });
}

function onEachFeature(feature: any, layer: L.Layer) {
  if (feature.properties) layer.bindPopup(featureToPopup(feature));
}

export default function MapPage() {
  const [geoJSON, setGeoJSON] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [mapType, setMapType] = useState<'satellite' | 'street' | 'topo' | 'hybrid'>('satellite');
  const [isClient, setIsClient] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [locating, setLocating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mapRef = useRef<any>(null);

  const loadLayers = useCallback(async () => {
    try { const data = await api.layers.getAll(); setLayers(data); if (data.length > 0) setActiveLayers(new Set([data[0].id])); } catch {}
  }, []);

  const loadGeoJSON = useCallback(async () => {
    try {
      const layerId = activeLayers.size === 1 ? Array.from(activeLayers)[0] : undefined;
      const params: Record<string, string> = {};
      if (layerId) params.layerId = layerId;
      const data = await api.gis.getGeoJSON(params);
      setGeoJSON(data);
    } catch {}
  }, [activeLayers]);

  useEffect(() => { setIsClient(true); loadLayers(); }, [loadLayers]);
  useEffect(() => { if (isClient) loadGeoJSON(); }, [loadGeoJSON, isClient]);

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) => { const next = new Set(prev); if (next.has(layerId)) next.delete(layerId); else next.add(layerId); return next; });
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 18); setLocating(false); },
      () => setLocating(false), { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const searchCaja = async () => {
    if (!query.trim()) return;
    try {
      const res = await api.assets.getAll({ search: query });
      const items = res.data || res;
      const list = Array.isArray(items) ? items.slice(0, 10) : [];
      setSearchResults(list);
      if (list.length > 0 && list[0].latitude) mapRef.current?.flyTo([list[0].latitude, list[0].longitude], 18);
    } catch {}
  };

  const tileUrl = mapType === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : mapType === 'hybrid' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : mapType === 'topo' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const map = (
    <MapContainer ref={mapRef} center={[5.15, -75.04]} zoom={15} maxZoom={19} className="h-full w-full" zoomControl={false}>
      <ZoomControl position="topright" />
      <TileLayer url={tileUrl} attribution={mapType === 'street' ? '&copy; OSM' : '&copy; Esri'} />
      {mapType === 'hybrid' && <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" opacity={0.6} />}
      {geoJSON && <GeoJSON key={JSON.stringify(activeLayers)} data={geoJSON} pointToLayer={pointToLayer as any} onEachFeature={onEachFeature as any} />}
    </MapContainer>
  );

  if (!isClient) return <div className="flex h-dvh items-center justify-center text-slate-400 text-sm">Cargando...</div>;

  if (fullscreen) return (
    <div className="h-dvh w-full relative">
      {map}
      <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 z-10 bg-white/90 rounded-lg shadow px-3 py-2 text-xs text-slate-600 hover:bg-white">✕ Salir</button>
      <div className="absolute top-4 left-4 z-10 bg-white/90 rounded-lg shadow px-3 py-1.5 text-xs text-slate-500">{geoJSON?.features?.length || 0} activos</div>
    </div>
  );

  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col lg:flex-row">
        <div className="lg:w-72 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto">
          <div className="p-3 lg:p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Mapa</h2>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Tipo de mapa</p>
              <div className="grid grid-cols-2 gap-1">
                {MAP_TYPES.map(({ key, label }) => (
                  <button key={key} onClick={() => setMapType(key)}
                    className={`px-2 py-2 text-xs rounded-md text-center ${mapType === key ? 'bg-interplay-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Buscar</p>
              <div className="flex gap-1">
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchCaja()} placeholder="Código de caja..." className="flex-1 text-xs bg-slate-50 rounded px-2 py-2 outline-none text-slate-700 placeholder-slate-400 border border-slate-200" />
                <button onClick={searchCaja} className="text-xs font-semibold text-white bg-interplay-500 hover:bg-interplay-600 px-3 rounded">🔍</button>
              </div>
              {searchResults.length > 0 && <div className="mt-1 max-h-28 overflow-y-auto border border-slate-200 rounded">
                {searchResults.map((r: any) => (
                  <button key={r.id} onClick={() => { mapRef.current?.flyTo([r.latitude, r.longitude], 18); setSearchResults([]); }}
                    className="flex items-center gap-1.5 w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded text-xs text-slate-700 border-b border-slate-100 last:border-0">
                    <span style={{ background: iconColors[r.assetType?.code] || '#64748b' }} className="w-2 h-2 rounded-full inline-block shrink-0" />
                    <strong className="shrink-0">{r.code}</strong>
                    <span className="truncate text-slate-400">{r.name}</span>
                  </button>
                ))}
              </div>}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Capas</p>
              {layers.length === 0 && <p className="text-xs text-slate-400">Sin capas</p>}
              {layers.map((layer: any) => (
                <label key={layer.id} className="flex items-center gap-1.5 py-1 cursor-pointer">
                  <input type="checkbox" checked={activeLayers.has(layer.id)} onChange={() => toggleLayer(layer.id)} className="rounded border-slate-300 text-interplay-600 w-3.5 h-3.5" />
                  <span className="text-xs text-slate-700 truncate">{layer.name}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Leyenda</p>
              {[['CAJA', 'Caja FTTH', '#10b981'], ['CLIENTE', 'Cliente', '#6366f1'], ['NODO', 'Nodo', '#06b6d4'], ['POSTE', 'Poste', '#ef4444'], ['CTO', 'CTO', '#3b82f6']].map(([k, v, c]) => (
                <div key={k} className="flex items-center gap-1.5 py-0.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: c }} />
                  <span className="text-xs text-slate-500">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5 pt-1">
              <button onClick={locateMe} disabled={locating} className="flex-1 text-xs bg-slate-50 hover:bg-slate-100 rounded px-3 py-2 text-slate-600 border border-slate-200">{locating ? '📍...' : '📍 GPS'}</button>
              <button onClick={() => setFullscreen(true)} className="flex-1 text-xs bg-slate-50 hover:bg-slate-100 rounded px-3 py-2 text-slate-600 border border-slate-200">⛶ Pantalla completa</button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-slate-100">
              <span>{geoJSON?.features?.length || 0} activos visibles</span>
              <button onClick={() => mapRef.current?.flyTo([5.15, -75.04], 15)} className="text-interplay-600 hover:text-interplay-700 font-semibold">📍 Fresno</button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative">
          {map}
        </div>
      </main>
    </div>
  );
}
