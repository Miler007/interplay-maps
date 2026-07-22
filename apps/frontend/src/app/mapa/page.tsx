'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import { api } from '@/lib/api';
import { mockApi } from '@/lib/mockData';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then((m) => m.GeoJSON), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then((m) => m.ZoomControl), { ssr: false });
const MapClickHandler = dynamic(() => import('@/components/map/MapClickHandler'), { ssr: false });

const iconColors: Record<string, string> = {
  CAJA: '#10b981', CAJAS: '#10b981', CLIENTE: '#6366f1',
  NODO: '#06b6d4', NODOS: '#06b6d4', POSTE: '#ef4444', POSTES: '#ef4444',
  CTO: '#3b82f6', SPLITTER: '#8b5cf6', SPLITTERS: '#8b5cf6', MUFLAS: '#f59e0b',
};

const MAP_TYPES = [
  { key: 'satellite' as const, label: 'Satélite', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h2m-2 4h2m16-4h2m-2 4h2M4 8h2m12 0h2M8 4h2m4 0h2"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/></svg>' },
  { key: 'hybrid' as const, label: 'Híbrido', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' },
  { key: 'street' as const, label: 'Calle', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>' },
  { key: 'topo' as const, label: 'Topo', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 11 7 7 11 11 15 7 19 11 21 9"/><polyline points="3 17 7 13 11 17 15 13 19 17 21 15"/></svg>' },
];

const Svg = ({ html, className }: { html: string; className?: string }) =>
  <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;

function featureToPopup(feature: any) {
  const p = feature.properties;
  const color = iconColors[p.type] || '#64748b';
  return `<div style="min-width:200px;font-family:system-ui,sans-serif">
    <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <span style="background:${color};color:white;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600">${p.typeName || p.type}</span>
      <span style="background:${p.status === 'ACTIVO' ? '#d1fae5' : '#fef3c7'};color:${p.status === 'ACTIVO' ? '#065f46' : '#92400e'};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600">${p.status}</span>
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
  return L.circleMarker(latlng, { radius: 7, fillColor: iconColors[feature.properties?.type] || '#64748b', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.9 });
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
  const [panel, setPanel] = useState(true);
  const [addingCaja, setAddingCaja] = useState(false);
  const [addModeActive, setAddModeActive] = useState(false);
  const [addPos, setAddPos] = useState<{ lat: number; lng: number } | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newPorts, setNewPorts] = useState(16);
  const [newFree, setNewFree] = useState(16);
  const mapRef = useRef<any>(null);

  const [isOffline, setIsOffline] = useState(false);

  const loadLayers = useCallback(async () => {
    try { const d = await api.layers.getAll(); setLayers(d); if (d.length > 0) setActiveLayers(new Set([d[0].id])); }
    catch { try { const d = await mockApi.layers.getAll(); setLayers(d); setIsOffline(true); if (d.length > 0) setActiveLayers(new Set([d[0].id])); } catch {} }
  }, []);

  const loadGeoJSON = useCallback(async () => {
    try {
      const layerId = activeLayers.size === 1 ? Array.from(activeLayers)[0] : undefined;
      const p: Record<string, string> = {};
      if (layerId) p.layerId = layerId;
      const d = await api.gis.getGeoJSON(p);
      setGeoJSON(d);
    } catch {
      try {
        const layerId = activeLayers.size === 1 ? Array.from(activeLayers)[0] : undefined;
        const p: Record<string, string> = {};
        if (layerId) p.layerId = layerId;
        const d = await mockApi.gis.getGeoJSON(p);
        setGeoJSON(d);
        setIsOffline(true);
      } catch {}
    }
  }, [activeLayers]);

  useEffect(() => { setIsClient(true); loadLayers(); }, [loadLayers]);
  useEffect(() => { if (isClient) loadGeoJSON(); }, [loadGeoJSON, isClient]);

  const toggleLayer = (id: string) => {
    setActiveLayers(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { mapRef.current?.flyTo([p.coords.latitude, p.coords.longitude], 18); setLocating(false); },
      () => setLocating(false), { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const searchCaja = async () => {
    if (!query.trim()) return;
    try {
      const r = await api.assets.getAll({ search: query });
      const items = r.data || r || [];
      const list = Array.isArray(items) ? items.slice(0, 10) : [];
      setSearchResults(list);
      if (list.length > 0 && list[0].latitude) mapRef.current?.flyTo([list[0].latitude, list[0].longitude], 18);
    } catch {
      try {
        const r = await mockApi.assets.getAll({ search: query });
        const items = r.data || r || [];
        const list = Array.isArray(items) ? items.slice(0, 10) : [];
        setSearchResults(list);
        if (list.length > 0 && list[0].latitude) mapRef.current?.flyTo([list[0].latitude, list[0].longitude], 18);
      } catch {}
    }
  };

  const tileUrl = mapType === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : mapType === 'hybrid' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : mapType === 'topo' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const map = (
    <MapContainer ref={mapRef} center={[5.15, -75.04]} zoom={15} maxZoom={18} className="h-full w-full" zoomControl={false}>
      <ZoomControl position="topright" />
      <TileLayer url={tileUrl} attribution="" />
      {mapType === 'hybrid' && <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" opacity={0.5} />}
      {geoJSON && <GeoJSON key={JSON.stringify(activeLayers)} data={geoJSON} pointToLayer={pointToLayer as any} onEachFeature={onEachFeature as any} />}
      {addPos && addingCaja && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Agregar caja en ubicación</p>
        <p className="text-xs text-slate-400 mb-3 font-mono">{addPos.lat.toFixed(5)}, {addPos.lng.toFixed(5)}</p>
        <div className="space-y-2">
          <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Código (ej: 16.1)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500" />
          <div className="grid grid-cols-2 gap-2">
            <select value={newPorts} onChange={e => setNewPorts(Number(e.target.value))} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
              <option value={8}>8 puertos</option><option value={16}>16 puertos</option>
            </select>
            <input type="number" min={0} max={newPorts} value={newFree} onChange={e => setNewFree(Math.min(Number(e.target.value), newPorts))} placeholder="Libres" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={async () => {
              if (!newCode.trim() || !addPos) return;
              try {
                await api.assets.create({
                  code: newCode, name: `CAJA ${newCode}`, assetTypeId: '8e3e137d-791b-43c3-8dc8-29fe15bda19d',
                  departmentId: 'a84105b4-eda4-4246-8361-8678d41bd0e7', municipalityId: 'e4ff7e38-cd79-452c-a1d3-370d7080adb4',
                  projectId: '068e3d5c-877c-4c51-b1d4-4dc16102aa35', latitude: addPos.lat, longitude: addPos.lng, status: 'ACTIVO',
                });
                await api.capacity?.update?.(newCode, { totalPorts: newPorts, freePorts: newFree, usedPorts: newPorts - newFree })?.catch?.() || null;
              } catch {
                await mockApi.assets.create({
                  code: newCode, name: `CAJA ${newCode}`, latitude: addPos.lat, longitude: addPos.lng, status: 'ACTIVO',
                });
              }
              setAddingCaja(false); setAddModeActive(false); setNewCode(''); setAddPos(null); alert('✅ Caja agregada'); loadGeoJSON();
            }} className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600">✅ Agregar</button>
            <button onClick={() => { setAddingCaja(false); setAddModeActive(false); setAddPos(null); }} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200">✕</button>
          </div>
        </div>
      </div>}

      {addModeActive && !addingCaja && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-interplay-500 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <div className="animate-pulse w-2 h-2 bg-white rounded-full" />
        Haz clic en el mapa para colocar la caja
      </div>}

      <MapClickHandler onAddMode={addModeActive} onMapClick={(pos) => { setAddPos(pos); setAddingCaja(true); setAddModeActive(false); }} />
    </MapContainer>
  );

  if (!isClient) return <div className="flex h-dvh items-center justify-center bg-slate-50"><div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" /></div>;

  if (fullscreen) return (
    <div className="h-dvh w-full relative">
      {map}
      <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur rounded-xl shadow px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white transition-all">✕ Salir</button>
      <div className="absolute bottom-4 left-4 z-10 bg-white/80 backdrop-blur rounded-xl shadow px-3.5 py-2 text-xs text-slate-500">{geoJSON?.features?.length || 0} activos</div>
    </div>
  );

  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col lg:flex-row">
        {panel && <div className="lg:w-72 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Mapa</h2>
              <button onClick={() => setPanel(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Tipo de mapa</p>
              <div className="grid grid-cols-2 gap-1.5">
                {MAP_TYPES.map(({ key, label, icon }) => (
                  <button key={key} onClick={() => setMapType(key)}
                    className={`flex items-center gap-2 px-3 py-2.5 text-xs rounded-xl transition-all ${
                      mapType === key ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}>
                    <Svg html={icon} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Buscar</p>
              <div className="flex gap-1.5">
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchCaja()} placeholder="Código..." className="flex-1 text-xs bg-slate-50 rounded-xl px-3 py-2.5 outline-none text-slate-700 placeholder-slate-400 border border-slate-200 focus:border-interplay-500 focus:ring-1 focus:ring-interplay-500/20 transition-all" />
                <button onClick={searchCaja} className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
              </div>
              {searchResults.length > 0 && <div className="mt-1.5 max-h-32 overflow-y-auto border border-slate-100 rounded-xl">
                {searchResults.map((r: any) => (
                  <button key={r.id} onClick={() => { mapRef.current?.flyTo([r.latitude, r.longitude], 18); setSearchResults([]); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-slate-700 border-b border-slate-50 last:border-0 transition-colors">
                    <span style={{ background: iconColors[r.assetType?.code] || '#64748b' }} className="w-2 h-2 rounded-full shrink-0" />
                    <strong>{r.code}</strong>
                    <span className="truncate text-slate-400">{r.name}</span>
                  </button>
                ))}
              </div>}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Capas</p>
              {layers.length === 0 && <p className="text-xs text-slate-400">Sin capas</p>}
              {layers.map((l: any) => (
                <label key={l.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                  <div onClick={() => toggleLayer(l.id)} className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center ${activeLayers.has(l.id) ? 'bg-interplay-500 border-interplay-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                    {activeLayers.has(l.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span className="text-xs text-slate-600 truncate">{l.name}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Leyenda</p>
              <div className="space-y-1.5">
                {[['CAJA', 'Caja FTTH', '#10b981'], ['CLIENTE', 'Cliente', '#6366f1'], ['NODO', 'Nodo', '#06b6d4'], ['POSTE', 'Poste', '#ef4444'], ['CTO', 'CTO', '#3b82f6']].map(([k, v, c]) => (
                  <div key={k} className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                    <span className="text-xs text-slate-500">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5 pt-2">
              <button onClick={locateMe} disabled={locating} className="flex items-center justify-center gap-1.5 flex-1 text-xs bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2.5 text-slate-600 border border-slate-200 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>
                {locating ? '...' : 'GPS'}
              </button>
              <button onClick={() => { if (addModeActive) { setAddModeActive(false); return; } setAddModeActive(true); setAddingCaja(false); setAddPos(null); }} className={`flex items-center justify-center gap-1.5 flex-1 text-xs rounded-xl px-3 py-2.5 border transition-all ${addModeActive ? 'bg-interplay-500 text-white border-interplay-500' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {addModeActive ? '✕' : '+ Caja'}
              </button>
              <button onClick={() => setFullscreen(true)} className="flex items-center justify-center flex-1 text-xs bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2.5 text-slate-600 border border-slate-200 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                Full
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span>{geoJSON?.features?.length || 0} activos</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <button onClick={() => mapRef.current?.flyTo([5.15, -75.04], 15)} className="text-interplay-600 hover:text-interplay-700 font-semibold">📍 Fresno</button>
            </div>
          </div>
        </div>}

        {isOffline && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><path d="M12 10a2 2 0 0 1 2 2"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          Modo offline — datos de demostración
        </div>}

        {!panel && <button onClick={() => setPanel(true)} className="absolute top-4 left-20 z-10 bg-white/80 backdrop-blur rounded-xl shadow px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white transition-all lg:static lg:flex lg:self-start lg:m-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>}

        <div className="flex-1 min-h-0 relative">{map}</div>
      </main>
    </div>
  );
}
