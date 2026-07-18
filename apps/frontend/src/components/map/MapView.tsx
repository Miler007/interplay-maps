'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
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

const clusterOptions = {
  chunkedLoading: true, maxClusterRadius: 50,
  spiderfyOnMaxZoom: true, showCoverageOnHover: false,
  iconCreateFunction: (c: any) => {
    const count = c.getChildCount();
    const size = count < 10 ? 36 : count < 50 ? 44 : 52;
    const color = count < 10 ? '#10b981' : count < 50 ? '#f59e0b' : '#ef4444';
    return (window as any).L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${color};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid rgba(255,255,255,.8);box-shadow:0 2px 8px rgba(0,0,0,.3)">${count}</div>`,
      className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
  },
};

function featureToPopup(feature: any) {
  const p = feature.properties;
  const color = iconColors[p.type] || '#64748b';
  return `<div style="min-width:220px;font-family:system-ui,sans-serif">
    <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
      <span style="background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">${p.typeName || p.type}</span>
      <span style="background:${p.status === 'ACTIVO' ? '#d1fae5' : '#fef3c7'};color:${p.status === 'ACTIVO' ? '#065f46' : '#92400e'};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">${p.status}</span>
    </div>
    <div style="font-weight:700;font-size:15px;color:#0f172a">${p.name}</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:4px">${p.code}</div>
    <div style="font-size:11px;color:#64748b">${p.department} &middot; ${p.municipality}</div>
    <div style="margin-top:8px;display:flex;gap:8px;font-size:11px">
      <span style="background:#f1f5f9;padding:4px 8px;border-radius:6px;flex:1;text-align:center">Confianza <strong style="color:#0f172a">${p.confidenceScore || 0}%</strong></span>
      <span style="background:#f1f5f9;padding:4px 8px;border-radius:6px;flex:1;text-align:center">Salud <strong style="color:#0f172a">${p.healthScore || 0}%</strong></span>
    </div>
    ${p.layers?.length ? `<div style="margin-top:6px;font-size:11px;color:#64748b">Capas: ${p.layers.map((l: any) => l.name).join(', ')}</div>` : ''}
  </div>`;
}

function pointToLayer(feature: any, latlng: L.LatLng) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const color = iconColors[feature.properties?.type] || '#64748b';
  return L.circleMarker(latlng, {
    radius: 8, fillColor: color, color: '#ffffff',
    weight: 2, opacity: 1, fillOpacity: 0.9,
  });
}

function onEachFeature(feature: any, layer: L.Layer) {
  if (feature.properties) layer.bindPopup(featureToPopup(feature));
}

export default function MapView() {
  const [geoJSON, setGeoJSON] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [mapType, setMapType] = useState<'satellite' | 'street' | 'topo' | 'hybrid'>('satellite');
  const [isClient, setIsClient] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [locating, setLocating] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const mapRef = useRef<any>(null);

  const loadLayers = useCallback(async () => {
    try {
      const data = await api.layers.getAll();
      setLayers(data);
      if (data.length > 0) setActiveLayers(new Set([data[0].id]));
    } catch {}
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
      if (list.length > 0 && list[0].latitude) {
        mapRef.current?.flyTo([list[0].latitude, list[0].longitude], 18);
      }
    } catch {}
  };

  if (!isClient) {
    return <div className="h-[calc(100dvh-8rem)] lg:h-[calc(100vh-8rem)] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">Cargando mapa...</div>;
  }

  return (
    <div className="relative h-[calc(100dvh-8rem)] lg:h-[calc(100vh-8rem)] rounded-xl overflow-hidden">
      <MapContainer ref={mapRef} center={[5.15, -75.04]} zoom={15} maxZoom={19} className="h-full w-full" zoomControl={false}>
        <ZoomControl position="topright" />
        <TileLayer
          url={mapType === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : mapType === 'hybrid' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : mapType === 'topo' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          attribution={mapType === 'street' ? '&copy; OpenStreetMap' : '&copy; Esri'}
        />
        {mapType === 'hybrid' && <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" opacity={0.6} />}
        {geoJSON && (
          <GeoJSON key={JSON.stringify(activeLayers)} data={geoJSON} pointToLayer={pointToLayer as any} onEachFeature={onEachFeature as any} />
        )}
      </MapContainer>

      <button onClick={() => setShowControls(!showControls)} className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white">
        {showControls ? '✕ Cerrar' : '☰ Panel'}
      </button>

      {showControls && <div className="absolute top-10 lg:top-12 left-2 lg:left-4 right-2 lg:right-4 z-10 flex flex-col gap-1.5 lg:gap-2 max-h-[calc(100dvh-12rem)] overflow-y-auto">

        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-1.5 lg:p-2">
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setMapType('satellite')} className={`px-2 lg:px-3 py-1.5 text-xs rounded-md ${mapType === 'satellite' ? 'bg-interplay-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>🛰 Sat</button>
            <button onClick={() => setMapType('hybrid')} className={`px-2 lg:px-3 py-1.5 text-xs rounded-md ${mapType === 'hybrid' ? 'bg-interplay-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>🛰 Hib</button>
            <button onClick={() => setMapType('street')} className={`px-2 lg:px-3 py-1.5 text-xs rounded-md ${mapType === 'street' ? 'bg-interplay-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>🗺 Calle</button>
            <button onClick={() => setMapType('topo')} className={`px-2 lg:px-3 py-1.5 text-xs rounded-md ${mapType === 'topo' ? 'bg-interplay-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>🏔 Topo</button>
            <button onClick={locateMe} disabled={locating} className="px-2 lg:px-3 py-1.5 text-xs rounded-md text-slate-600 hover:bg-slate-100">{locating ? '📍...' : '📍 GPS'}</button>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-2 flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchCaja()} placeholder="Buscar (ej: 2.1)" className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400" />
          <button onClick={searchCaja} className="text-xs font-semibold text-interplay-600">🔍</button>
        </div>
        {searchResults.length > 0 && <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-2 max-h-32 overflow-y-auto">
          {searchResults.map((r: any) => (
            <button key={r.id} onClick={() => { mapRef.current?.flyTo([r.latitude, r.longitude], 18); setSearchResults([]); }}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-xs text-slate-700">
              <span style={{ background: iconColors[r.assetType?.code] || '#64748b' }} className="w-2 h-2 rounded-full inline-block" />
              <strong>{r.code}</strong> <span className="text-slate-400">-</span> {r.name}
            </button>
          ))}
        </div>}

        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-2 lg:p-3">
          <details open>
            <summary className="text-[11px] font-semibold text-slate-500 uppercase cursor-pointer">Capas</summary>
            {layers.map((layer: any) => (
              <label key={layer.id} className="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={activeLayers.has(layer.id)} onChange={() => toggleLayer(layer.id)} className="rounded border-slate-300 text-interplay-600 w-3.5 h-3.5" />
                <span className="text-xs text-slate-700 truncate">{layer.name}</span>
              </label>
            ))}
          </details>
          <details className="mt-2 pt-2 border-t border-slate-100">
            <summary className="text-[11px] font-semibold text-slate-500 uppercase cursor-pointer">Leyenda</summary>
            {[['CAJA', 'Caja FTTH'], ['CLIENTE', 'Cliente'], ['NODO', 'Nodo'], ['POSTE', 'Poste'], ['CTO', 'CTO']].map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: iconColors[k] || '#64748b' }} />
                <span className="text-xs text-slate-500">{v}</span>
              </div>
            ))}
          </details>
        </div>
      </div>}

      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg px-3 py-1.5 text-[11px] text-slate-500 flex items-center gap-3">
        <span>{geoJSON?.features?.length || 0} activos</span>
        <button onClick={() => { mapRef.current?.flyTo([5.15, -75.04], 15); }} className="text-interplay-600 hover:text-interplay-700 font-semibold">📍 Fresno</button>
      </div>
    </div>
  );
}
