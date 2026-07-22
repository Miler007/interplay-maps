'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import PremiumToolbar from '@/components/map/PremiumToolbar';
import StatusBar from '@/components/map/StatusBar';
import { api } from '@/lib/api';
import { mockApi } from '@/lib/mockData';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then((m) => m.GeoJSON), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then((m) => m.Polygon), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const ScaleControl = dynamic(() => import('react-leaflet').then((m) => m.ScaleControl), { ssr: false });
const MapClickHandler = dynamic(() => import('@/components/map/MapClickHandler'), { ssr: false });

const COLORS: Record<string, string> = {
  CAJA: '#10b981', CAJAS: '#10b981', CLIENTE: '#6366f1',
  NODO: '#06b6d4', NODOS: '#06b6d4', POSTE: '#ef4444', POSTES: '#ef4444',
  CTO: '#3b82f6', SPLITTER: '#8b5cf6', SPLITTERS: '#8b5cf6', MUFLAS: '#f59e0b',
};

const MAP_TYPES = [
  { key: 'satellite', label: 'Satélite', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' },
  { key: 'hybrid', label: 'Híbrido', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' },
  { key: 'street', label: 'Calle', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>' },
  { key: 'topo', label: 'Topo', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 11 7 7 11 11 15 7 19 11 21 9"/><polyline points="3 17 7 13 11 17 15 13 19 17 21 15"/></svg>' },
];

const ASSET_TYPES = [
  { code: 'CAJA', label: 'Cajas', color: '#10b981' },
  { code: 'NODO', label: 'Nodos', color: '#06b6d4' },
  { code: 'POSTE', label: 'Postes', color: '#ef4444' },
  { code: 'CLIENTE', label: 'Clientes', color: '#6366f1' },
  { code: 'CTO', label: 'CTOs', color: '#3b82f6' },
  { code: 'SPLITTER', label: 'Splitters', color: '#8b5cf6' },
  { code: 'MUFLAS', label: 'Muflas', color: '#f59e0b' },
];

const STATUSES = ['ACTIVO', 'PENDIENTE', 'INACTIVO'];

function pointToLayer(feature: any, latlng: any) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  return L.circleMarker(latlng, { radius: 7, fillColor: COLORS[feature.properties?.type] || '#64748b', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9 });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPage() {
  const [geoJSON, setGeoJSON] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [mapType, setMapType] = useState('satellite');
  const [isClient, setIsClient] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [locating, setLocating] = useState(false);
  const [addingCaja, setAddingCaja] = useState(false);
  const [addModeActive, setAddModeActive] = useState(false);
  const [addPos, setAddPos] = useState<{ lat: number; lng: number } | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newPorts, setNewPorts] = useState(16);
  const [newFree, setNewFree] = useState(16);
  const [addType, setAddType] = useState('CAJA');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [editingFeature, setEditingFeature] = useState<any>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editLat, setEditLat] = useState(0);
  const [editLng, setEditLng] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [mouseLat, setMouseLat] = useState(0);
  const [mouseLng, setMouseLng] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [measurePoints, setMeasurePoints] = useState<Array<[number, number]>>([]);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const measureCountRef = useRef(0);

  const tileUrl = mapType === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : mapType === 'hybrid' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : mapType === 'topo' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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

  const filteredFeatures = useCallback(() => {
    if (!geoJSON) return null;
    let features = geoJSON.features;
    if (typeFilter) features = features.filter((f: any) => f.properties?.type === typeFilter);
    if (statusFilter) features = features.filter((f: any) => f.properties?.status === statusFilter);
    return { ...geoJSON, features };
  }, [geoJSON, typeFilter, statusFilter]);

  const toggleLayer = (id: string) => setActiveLayers(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

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

  const clearDrawings = () => { setMeasurePoints([]); setDrawings([]); measureCountRef.current = 0; };

  const handleMapClick = useCallback((pos: { lat: number; lng: number }) => {
    if (addModeActive) { setAddPos(pos); setAddingCaja(true); setAddModeActive(false); return; }
    if (activeTool === 'measure') {
      setMeasurePoints(prev => [...prev, [pos.lat, pos.lng]]);
      measureCountRef.current += 1;
      return;
    }
    if (activeTool === 'add-marker') {
      setAddPos(pos); setAddingCaja(true); setAddModeActive(false); setActiveTool(null); return;
    }
  }, [addModeActive, activeTool]);

  const handleContextMenu = useCallback((pos: { lat: number; lng: number }, e: MouseEvent) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, lat: pos.lat, lng: pos.lng });
  }, []);

  const handleMouseMove = useCallback((pos: { lat: number; lng: number }) => {
    setMouseLat(pos.lat); setMouseLng(pos.lng);
  }, []);

  const totalDistance = measurePoints.length > 1
    ? measurePoints.reduce((sum, p, i) => i > 0 ? sum + haversineKm(measurePoints[i - 1][0], measurePoints[i - 1][1], p[0], p[1]) : sum, 0)
    : 0;

  const distStr = totalDistance > 0 ? `${totalDistance < 1 ? (totalDistance * 1000).toFixed(0) + ' m' : totalDistance.toFixed(2) + ' km'}` : '';

  return (
    <div className="flex h-dvh bg-slate-900">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 flex">
          {!isClient && <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>}

          {/* Side Panel - no overlap, pushes map */}
          <div className="w-72 shrink-0 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Interplay Maps
                </h2>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Tipo de mapa</p>
                <div className="grid grid-cols-2 gap-1">
                  {MAP_TYPES.map(({ key, label, icon }) => (
                    <button key={key} onClick={() => setMapType(key)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 text-[11px] rounded-xl transition-all ${mapType === key ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                      <span dangerouslySetInnerHTML={{ __html: icon }} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Buscar activo</p>
                <div className="flex gap-1">
                  <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchCaja()}
                    placeholder="Código o nombre..." className="flex-1 text-[11px] bg-slate-50 rounded-xl px-3 py-2 outline-none text-slate-700 placeholder-slate-400 border border-slate-200 focus:border-interplay-500" />
                  <button onClick={searchCaja} className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </button>
                </div>
                {searchResults.length > 0 && <div className="mt-1.5 max-h-32 overflow-y-auto border border-slate-100 rounded-xl bg-white">
                  {searchResults.map((r: any) => (
                    <button key={r.id} onClick={() => { mapRef.current?.flyTo([r.latitude, r.longitude], 18); setSearchResults([]); }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-50 text-[11px] text-slate-700 border-b border-slate-50 last:border-0">
                      <span style={{ background: COLORS[r.assetType?.code] || '#64748b' }} className="w-2 h-2 rounded-full shrink-0" />
                      <strong>{r.code}</strong>
                      <span className="truncate text-slate-400">{r.name}</span>
                    </button>
                  ))}
                </div>}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Filtros</p>
                <div className="flex flex-wrap gap-1">
                  {ASSET_TYPES.map(t => (
                    <button key={t.code} onClick={() => setTypeFilter(typeFilter === t.code ? null : t.code)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${typeFilter === t.code ? 'text-white border-transparent' : 'text-slate-500 border-slate-200 hover:border-slate-300'}`}
                      style={typeFilter === t.code ? { background: t.color, borderColor: t.color } : {}}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {typeFilter && <button onClick={() => setTypeFilter(null)} className="text-[10px] text-slate-400 hover:text-slate-600 mt-1">✕ Limpiar filtro</button>}
                <div className="flex gap-1 mt-2">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Capas ({layers.length})</p>
                {layers.length === 0 && <p className="text-xs text-slate-400">Sin capas</p>}
                {layers.map((l: any) => (
                  <label key={l.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                    <div onClick={() => toggleLayer(l.id)} className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center ${activeLayers.has(l.id) ? 'bg-interplay-500 border-interplay-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                      {activeLayers.has(l.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className="text-xs text-slate-600 truncate">{l.name}</span>
                  </label>
                ))}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Leyenda</p>
                <div className="grid grid-cols-2 gap-1">
                  {ASSET_TYPES.map(({ code, label, color }) => (
                    <div key={code} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[11px] text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button onClick={locateMe} disabled={locating} className="flex items-center justify-center gap-1.5 text-[11px] bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 text-slate-600 border border-slate-200 transition-all">
                  📍 {locating ? '...' : 'GPS'}
                </button>
                <button onClick={() => { if (addModeActive) { setAddModeActive(false); return; } setAddModeActive(true); setAddingCaja(false); setAddPos(null); }}
                  className={`flex items-center justify-center gap-1.5 text-[11px] rounded-xl px-3 py-2 border transition-all ${addModeActive ? 'bg-interplay-500 text-white border-interplay-500' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                  {addModeActive ? '✕' : '+ Activo'}
                </button>
                <button onClick={() => mapRef.current?.zoomIn()} className="flex items-center justify-center gap-1.5 text-[11px] bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 text-slate-600 border border-slate-200 transition-all">
                  🔍 Acercar
                </button>
                <button onClick={() => mapRef.current?.flyTo([5.15, -75.04], 15)} className="flex items-center justify-center gap-1.5 text-[11px] bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 text-slate-600 border border-slate-200 transition-all">
                  🏠 Fresno
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 relative">
          {isClient && <MapContainer ref={mapRef} center={[5.15, -75.04]} zoom={15} maxZoom={19} className="h-full w-full" zoomControl={false}>
            <TileLayer url={tileUrl} attribution="" />
            {mapType === 'hybrid' && <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" opacity={0.5} />}
            <ScaleControl position="bottomleft" metric={true} imperial={false} />
            {filteredFeatures() && <GeoJSON key={JSON.stringify(activeLayers) + typeFilter + statusFilter} data={filteredFeatures()!} pointToLayer={pointToLayer as any}
              onEachFeature={(f: any, l: any) => { if (f.properties) l.on({
                click: () => setSelectedFeature(f),
                contextmenu: (e: any) => { e.originalEvent.preventDefault(); setCtxMenu({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, lat: e.latlng.lat, lng: e.latlng.lng, feature: f }); },
              }); }}
            />}
            {measurePoints.length >= 2 && <Polyline positions={measurePoints} pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '8 4' }} />}
            {measurePoints.map((p, i) => (
              <Marker key={`m-${i}`} position={p} icon={(window as any).L?.divIcon?.({ className: '', html: `<div style="width:20px;height:20px;background:#f59e0b;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid rgba(255,255,255,.8)">${i + 1}</div>`, iconSize: [20, 20], iconAnchor: [10, 10] })} />
            ))}
            {drawings.map((d: any, i: number) => d.type === 'line' ? <Polyline key={`d-${i}`} positions={d.positions} pathOptions={{ color: '#8b5cf6', weight: 4 }} /> : null)}
            {drawings.map((d: any, i: number) => d.type === 'polygon' ? <Polygon key={`dp-${i}`} positions={d.positions} pathOptions={{ color: '#3b82f6', fillOpacity: 0.15 }} /> : null)}
            {editingFeature && <Marker position={[editLat, editLng]} draggable={true}
              eventHandlers={{ dragend: (e: any) => { const p = e.target.getLatLng(); setEditLat(+p.lat.toFixed(5)); setEditLng(+p.lng.toFixed(5)); } }}
            />}
            <MapClickHandler onAddMode={addModeActive || activeTool === 'measure' || activeTool === 'add-marker' || activeTool === 'draw-line' || activeTool === 'draw-polygon'}
              onMapClick={handleMapClick} onContextMenu={handleContextMenu} onMouseMove={handleMouseMove} onZoomChange={setZoomLevel}
            />
          </MapContainer>}



          {/* Info Card */}
          {selectedFeature && !editingFeature && (() => {
            const p = selectedFeature.properties; const g = selectedFeature.geometry;
            const color = COLORS[p.type] || '#64748b';
            return <div className="absolute top-3 right-3 z-10 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: color }}>{p.typeName || p.type}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${p.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                  </div>
                  <button onClick={() => setSelectedFeature(null)} className="text-slate-300 hover:text-slate-500">✕</button>
                </div>
                <p className="text-sm font-bold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-400 font-mono">{p.code}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.department} / {p.municipality}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                  <div className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-slate-400 text-[10px]">Confianza</p>
                    <p className="font-bold text-slate-800">{p.confidenceScore || 0}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-slate-400 text-[10px]">Salud</p>
                    <p className="font-bold text-slate-800">{p.healthScore || 0}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-slate-400 text-[10px]">Coordenadas</p>
                    <p className="font-bold text-slate-800 font-mono text-[10px]">{g?.coordinates[1].toFixed(5)}, {g?.coordinates[0].toFixed(5)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-slate-400 text-[10px]">Puertos</p>
                    <p className="font-bold text-slate-800">{p.totalPorts || '—'} total / {p.freePorts ?? '—'} libres</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => {
                    setEditingFeature({ id: p.id, code: p.code, name: p.name, type: p.type, lat: g.coordinates[1], lng: g.coordinates[0] });
                    setEditCode(p.code); setEditName(p.name); setEditLat(g.coordinates[1]); setEditLng(g.coordinates[0]); setConfirmDelete(false); setSelectedFeature(null);
                  }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all">✏️ Editar</button>
                  <button onClick={async () => {
                    try { await api.assets.delete(p.id); } catch { try { await mockApi.assets.delete(p.id); } catch {} }
                    setSelectedFeature(null); loadGeoJSON();
                  }} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-semibold border border-red-200 transition-all">🗑️</button>
                </div>
              </div>
            </div>;
          })()}

          {/* Edit Form */}
          {editingFeature && <div className="absolute top-3 right-3 z-10 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">✏️ Editar {editingFeature.type}</p>
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Código</label>
                    <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Nombre</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Latitud</label>
                    <input type="number" step="0.00001" value={editLat} onChange={e => setEditLat(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1 font-mono" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Longitud</label>
                    <input type="number" step="0.00001" value={editLng} onChange={e => setEditLng(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1 font-mono" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">Arrastra el marcador 🟣 en el mapa o edita las coordenadas</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={async () => {
                    if (!editCode.trim()) return;
                    try { await api.assets.update(editingFeature.id, { code: editCode, name: editName, latitude: editLat, longitude: editLng }); }
                    catch { try { await mockApi.assets.update(editingFeature.id, { code: editCode, name: editName, latitude: editLat, longitude: editLng }); } catch {} }
                    setEditingFeature(null); loadGeoJSON();
                  }} className="flex-1 px-3 py-2 bg-interplay-500 text-white rounded-xl text-xs font-semibold hover:bg-interplay-600">💾 Guardar</button>
                  <button onClick={() => setEditingFeature(null)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200">✕</button>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} className="px-3 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-semibold hover:bg-red-100 border border-red-200">🗑️</button>
                  ) : (
                    <button onClick={async () => {
                      try { await api.assets.delete(editingFeature.id); } catch { try { await mockApi.assets.delete(editingFeature.id); } catch {} }
                      setEditingFeature(null); setConfirmDelete(false); loadGeoJSON();
                    }} className="px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600">Confirmar</button>
                  )}
                </div>
              </div>
            </div>
          </div>}

          {/* Add Form */}
          {addPos && addingCaja && <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">➕ Nuevo activo</p>
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-slate-400 text-[10px] font-semibold uppercase">Tipo</label>
                  <select value={addType} onChange={e => setAddType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1">
                    {ASSET_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Código</label>
                    <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ej: 16.1" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Coordenadas</label>
                    <p className="text-xs font-mono text-slate-600 mt-2.5">{addPos.lat.toFixed(5)}, {addPos.lng.toFixed(5)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Puertos totales</label>
                    <select value={newPorts} onChange={e => setNewPorts(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1">
                      <option value={4}>4</option><option value={8}>8</option><option value={16}>16</option><option value={32}>32</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold uppercase">Puertos libres</label>
                    <input type="number" min={0} max={newPorts} value={newFree} onChange={e => setNewFree(Math.min(Number(e.target.value), newPorts))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500 mt-1" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={async () => {
                    if (!newCode.trim() || !addPos) return;
                    try {
                      await api.assets.create({
                        code: newCode, name: `${addType} ${newCode}`, assetTypeId: '8e3e137d-791b-43c3-8dc8-29fe15bda19d',
                        departmentId: 'a84105b4-eda4-4246-8361-8678d41bd0e7', municipalityId: 'e4ff7e38-cd79-452c-a1d3-370d7080adb4',
                        projectId: '068e3d5c-877c-4c51-b1d4-4dc16102aa35', latitude: addPos.lat, longitude: addPos.lng, status: 'ACTIVO',
                      });
                      await api.capacity?.update?.(newCode, { totalPorts: newPorts, freePorts: newFree, usedPorts: newPorts - newFree })?.catch?.() || null;
                    } catch { await mockApi.assets.create({ code: newCode, name: `${addType} ${newCode}`, latitude: addPos.lat, longitude: addPos.lng, status: 'ACTIVO' }); }
                    setAddingCaja(false); setAddModeActive(false); setNewCode(''); setAddPos(null); loadGeoJSON();
                  }} className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600">✅ Crear</button>
                  <button onClick={() => { setAddingCaja(false); setAddModeActive(false); setAddPos(null); }} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200">✕</button>
                </div>
              </div>
            </div>
          </div>}

          {/* Add mode hint */}
          {addModeActive && !addingCaja && <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-interplay-500 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="animate-pulse w-2 h-2 bg-white rounded-full" />
            Haz clic en el mapa para colocar el activo
          </div>}

          {/* Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <PremiumToolbar activeTool={activeTool} onToolChange={setActiveTool} onClearAll={clearDrawings} distance={activeTool === 'measure' ? distStr : undefined} />
          </div>

          {/* Status bar */}
          <div className="absolute bottom-4 right-4 z-20">
            <StatusBar lat={mouseLat} lng={mouseLng} zoom={zoomLevel} count={filteredFeatures()?.features?.length || 0}
              layerName={activeLayers.size === 1 ? layers.find(l => l.id === Array.from(activeLayers)[0])?.name : undefined}
              isOffline={isOffline} isClient={isClient}
              onZoomIn={() => mapRef.current?.zoomIn()} onZoomOut={() => mapRef.current?.zoomOut()}
            />
          </div>

          {/* Context Menu */}
          {ctxMenu && <>
            <div className="fixed inset-0 z-30" onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} />
            <div className="fixed z-40 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 w-52" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
              {ctxMenu.feature ? <>
                <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-all" onClick={() => {
                  const p = ctxMenu.feature.properties; const g = ctxMenu.feature.geometry;
                  setEditingFeature({ id: p.id, code: p.code, name: p.name, type: p.type, lat: ctxMenu.lat, lng: ctxMenu.lng });
                  setEditCode(p.code); setEditName(p.name); setEditLat(g?.coordinates[1] || ctxMenu.lat); setEditLng(g?.coordinates[0] || ctxMenu.lng);
                  setConfirmDelete(false); setSelectedFeature(null); setCtxMenu(null);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/></svg> Editar
                </button>
                <button className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-all" onClick={async () => {
                  const id = ctxMenu.feature.properties.id;
                  try { await api.assets.delete(id); } catch { try { await mockApi.assets.delete(id); } catch {} }
                  setCtxMenu(null); loadGeoJSON();
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar
                </button>
                <hr className="my-1 border-slate-100" />
              </> : null}
              <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-all" onClick={() => { setAddModeActive(false); setAddPos({ lat: ctxMenu.lat, lng: ctxMenu.lng }); setAddingCaja(true); setCtxMenu(null); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Agregar activo
              </button>
              <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-all" onClick={() => { setCtxMenu(null); mapRef.current?.flyTo([ctxMenu.lat, ctxMenu.lng], 18); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg> Centrar aquí
              </button>
              <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-all" onClick={() => { alert(`📍 ${ctxMenu.lat.toFixed(5)}, ${ctxMenu.lng.toFixed(5)}`); setCtxMenu(null); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ¿Qué hay aquí?
              </button>
            </div>
          </>}
        </div>
        </div>
      </main>
    </div>
  );
}
