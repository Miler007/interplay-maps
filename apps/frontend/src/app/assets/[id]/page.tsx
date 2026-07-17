'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatusDot } from '@/app/topology/components';

const MOCK_ASSETS: Record<string, any> = {
  'caja-1': { id: 'caja-1', code: 'CAJ-001', name: 'Caja B.0.1', type: 'CAJAS', status: 'ACTIVO', latitude: 5.153, longitude: -75.287, municipality: 'Fresno', department: 'Tolima', certStatus: 'VALIDADO', capacity: { totalPorts: 8, usedPorts: 6, freePorts: 2, occupancyPct: 75, status: 'ADVERTENCIA' }, photos: [{ id: 'p1', filename: 'caja-001-front.jpg', originalUrl: '/placeholder.jpg', thumbnailUrl: '/placeholder-thumb.jpg', takenAt: '2026-03-15', gpsLatitude: 5.153, gpsLongitude: -75.287, observations: 'Vista frontal' }, { id: 'p2', filename: 'caja-001-interior.jpg', originalUrl: '/placeholder.jpg', thumbnailUrl: '/placeholder-thumb.jpg', takenAt: '2026-03-15', observations: 'Distribución interna' }], timeline: [{ version: 1, changeType: 'create', description: 'Activo creado', createdAt: '2026-01-10' }, { version: 2, changeType: 'update', description: 'Cambio de coordenadas', createdAt: '2026-02-20' }, { version: 3, changeType: 'photo', description: 'Foto: caja-001-front.jpg', createdAt: '2026-03-15' }, { version: 4, changeType: 'update', description: 'Capacidad actualizada: 6/8 puertos', createdAt: '2026-04-01' }] },
  'caja-2': { id: 'caja-2', code: 'CAJ-002', name: 'Caja B.0.2', type: 'CAJAS', status: 'ACTIVO', latitude: 5.155, longitude: -75.285, municipality: 'Fresno', department: 'Tolima', certStatus: 'PENDIENTE', capacity: { totalPorts: 8, usedPorts: 3, freePorts: 5, occupancyPct: 37.5, status: 'DISPONIBLE' }, photos: [], timeline: [{ version: 1, changeType: 'create', description: 'Activo creado', createdAt: '2026-01-15' }] },
  'muf-1': { id: 'muf-1', code: 'MUF-01', name: 'Mufla Norte', type: 'MUFLAS', status: 'ACTIVO', latitude: 5.152, longitude: -75.288, municipality: 'Fresno', department: 'Tolima', certStatus: 'CERTIFICADO', capacity: { totalPorts: 48, usedPorts: 24, freePorts: 24, occupancyPct: 50, status: 'DISPONIBLE' }, photos: [], timeline: [{ version: 1, changeType: 'create', description: 'Activo creado', createdAt: '2025-06-01' }, { version: 2, changeType: 'update', description: 'Certificado', createdAt: '2026-07-01' }] },
};

function MockAsset({ id }: { id: string }) {
  const asset = MOCK_ASSETS[id] || { id, code: id.toUpperCase(), name: `Activo ${id}`, type: 'CAJAS', status: 'ACTIVO', municipality: 'Fresno', department: 'Tolima', certStatus: 'PENDIENTE', capacity: { totalPorts: 8, usedPorts: 0, freePorts: 8, occupancyPct: 0, status: 'DISPONIBLE' }, photos: [], timeline: [] };
  return asset;
}

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
  return <div className="w-full bg-slate-200 rounded-full h-3"><div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }}></div></div>;
}

const certColors: Record<string, string> = { PENDIENTE: '#6b7280', VALIDADO: '#22c55e', CERTIFICADO: '#3b82f6', HISTORICO: '#a855f7' };

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string || 'caja-1';
  const [tab, setTab] = useState('info');
  const asset = MockAsset({ id });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{asset.code}</h1>
          <StatusDot status={asset.status} />
          <span className="text-sm px-2 py-1 rounded" style={{ background: certColors[asset.certStatus] + '22', color: certColors[asset.certStatus], border: `1px solid ${certColors[asset.certStatus]}` }}>{asset.certStatus}</span>
        </div>
        <p className="text-slate-500 -mt-4">{asset.name} — {asset.type}</p>
        <div className="flex gap-2 border-b">
          {['info', 'photos', 'timeline'].map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-interplay-500 text-interplay-500' : 'text-slate-500 hover:text-slate-700'}`}>{t === 'info' ? 'Información' : t === 'photos' ? 'Fotografías' : 'Línea de Tiempo'}</button>)}
        </div>
        {tab === 'info' && <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 col-span-2 space-y-4">
            <h2 className="font-semibold text-lg">Detalles del Activo</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">{[
              ['Código', asset.code], ['Nombre', asset.name], ['Tipo', asset.type], ['Estado', asset.status],
              ['Municipio', asset.municipality], ['Departamento', asset.department],
              ['Latitud', asset.latitude?.toFixed(4) || '—'], ['Longitud', asset.longitude?.toFixed(4) || '—'],
            ].map(([l, v]) => <div key={l as string}><span className="text-slate-500">{l}</span><p className="font-medium">{v}</p></div>)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Capacidad</h2>
            <div className="text-center"><span className="text-3xl font-bold">{asset.capacity.occupancyPct}%</span><p className="text-sm text-slate-500">Ocupación</p></div>
            <OccupancyBar pct={asset.capacity.occupancyPct} />
            <div className="grid grid-cols-3 gap-2 text-center text-sm">{[
              ['Total', asset.capacity.totalPorts], ['Usados', asset.capacity.usedPorts], ['Libres', asset.capacity.freePorts],
            ].map(([l, v]) => <div key={l as string}><span className="text-slate-500">{l}</span><p className="font-bold">{v}</p></div>)}</div>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${asset.capacity.status === 'DISPONIBLE' ? 'bg-green-100 text-green-700' : asset.capacity.status === 'ADVERTENCIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{asset.capacity.status}</span>
          </div>
        </div>}
        {tab === 'photos' && <div><div className="grid grid-cols-3 gap-4">{asset.photos.length === 0 ? <p className="text-slate-400 col-span-3">Sin fotografías</p> : asset.photos.map((p: any) => <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2"><div className="h-32 bg-slate-100 rounded flex items-center justify-center text-slate-300">📷</div><p className="text-sm font-medium">{p.filename}</p><p className="text-xs text-slate-400">{p.takenAt}{p.gpsLatitude ? ` | ${p.gpsLatitude.toFixed(4)}, ${p.gpsLongitude?.toFixed(4)}` : ''}</p><p className="text-xs text-slate-500">{p.observations || ''}</p></div>)}</div><button className="mt-4 px-4 py-2 bg-interplay-500 text-white rounded-lg text-sm">Agregar fotografía</button></div>}
        {tab === 'timeline' && <div className="space-y-3">{asset.timeline.map((e: any, i: number) => <div key={i} className="flex gap-4 bg-white rounded-xl shadow-sm p-4"><div className="flex flex-col items-center"><div className={`w-3 h-3 rounded-full ${e.changeType === 'create' ? 'bg-green-500' : e.changeType === 'photo' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>{i < asset.timeline.length - 1 && <div className="w-0.5 h-full bg-slate-200"></div>}</div><div><p className="text-xs text-slate-400">{e.createdAt}</p><p className="text-sm">{e.description}</p></div></div>)}</div>}
      </div>
    </DashboardLayout>
  );
}
