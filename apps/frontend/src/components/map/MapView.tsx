'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then((m) => m.GeoJSON), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then((m) => m.ZoomControl), { ssr: false });

const iconColors: Record<string, string> = {
  MUFLAS: '#f59e0b',
  CAJAS: '#10b981',
  CTO: '#3b82f6',
  SPLITTERS: '#8b5cf6',
  POSTES: '#ef4444',
  NODOS: '#06b6d4',
};

function featureToPopup(feature: any) {
  const p = feature.properties;
  const color = iconColors[p.type] || '#64748b';
  return `
    <div style="min-width:220px;font-family:system-ui,sans-serif">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <span style="background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">${p.type}</span>
        <span style="background:${p.status === 'ACTIVO' ? '#d1fae5' : '#fef3c7'};color:${p.status === 'ACTIVO' ? '#065f46' : '#92400e'};padding:2px 8px;border-radius:12px;font-size:11px">${p.status}</span>
      </div>
      <div style="font-weight:600;font-size:14px;color:#0f172a">${p.name}</div>
      <div style="font-size:12px;color:#64748b">${p.code}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">${p.department} / ${p.municipality}</div>
      <div style="margin-top:6px;display:flex;gap:12px;font-size:11px">
        <span>Confianza: <strong>${p.confidenceScore}%</strong></span>
        <span>Salud: <strong>${p.healthScore}%</strong></span>
      </div>
      ${p.layers?.length ? `<div style="margin-top:4px;font-size:11px;color:#64748b">Capas: ${p.layers.map((l: any) => l.name).join(', ')}</div>` : ''}
    </div>
  `;
}

function pointToLayer(feature: any, latlng: L.LatLng) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const color = iconColors[feature.properties?.type] || '#64748b';
  return L.circleMarker(latlng, {
    radius: 8,
    fillColor: color,
    color: '#ffffff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9,
  });
}

function onEachFeature(feature: any, layer: L.Layer) {
  if (feature.properties) {
    layer.bindPopup(featureToPopup(feature));
  }
}

export default function MapView() {
  const [geoJSON, setGeoJSON] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isClient, setIsClient] = useState(false);

  const loadLayers = useCallback(async () => {
    try {
      const data = await api.layers.getAll();
      setLayers(data);
      if (data.length > 0) {
        setActiveLayers(new Set([data[0].id]));
      }
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
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  if (!isClient) {
    return <div className="h-[calc(100vh-8rem)] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">Cargando mapa...</div>;
  }

  return (
    <div className="relative h-[calc(100vh-8rem)] rounded-xl overflow-hidden">
      <MapContainer center={[5.0, -75.0]} zoom={7} className="h-full w-full" zoomControl={false}>
        <ZoomControl position="topright" />
        <TileLayer
          url={mapType === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          attribution='&copy; OSM'
        />
        {geoJSON && (
          <GeoJSON
            key={JSON.stringify(activeLayers)}
            data={geoJSON}
            pointToLayer={pointToLayer as any}
            onEachFeature={onEachFeature as any}
          />
        )}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="bg-white rounded-lg shadow-lg p-2 flex gap-1">
          <button onClick={() => setMapType('street')}
            className={`px-3 py-1.5 text-xs rounded-md ${mapType === 'street' ? 'bg-interplay-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Calle
          </button>
          <button onClick={() => setMapType('satellite')}
            className={`px-3 py-1.5 text-xs rounded-md ${mapType === 'satellite' ? 'bg-interplay-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Satélite
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-3 min-w-[200px]">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Capas</p>
          {layers.map((layer: any) => (
            <label key={layer.id} className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.has(layer.id)}
                onChange={() => toggleLayer(layer.id)}
                className="rounded border-slate-300 text-interplay-600 focus:ring-interplay-500"
              />
              <span className="text-sm text-slate-700">{layer.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-3 py-2 text-xs text-slate-500">
        {geoJSON?.features?.length || 0} activos visibles
      </div>
    </div>
  );
}
