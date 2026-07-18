'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    if (!id) return;
    api.assets.getById(id).then(setAsset).catch(() => setAsset(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <DashboardLayout><p className="text-slate-400">Cargando activo...</p></DashboardLayout>;
  if (!asset) return <DashboardLayout><p className="text-slate-400">Activo no encontrado</p></DashboardLayout>;

  const cap = asset.capacity || {};
  const pct = cap.occupancyPct || 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const certColors: Record<string, string> = { PENDIENTE: '#6b7280', VALIDADO: '#22c55e', CERTIFICADO: '#3b82f6' };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{asset.code}</h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${asset.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{asset.status}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: (certColors[asset.certStatus] || '#6b7280') + '22', color: certColors[asset.certStatus] || '#6b7280' }}>{asset.certStatus}</span>
        </div>
        <p className="text-slate-500 -mt-4">{asset.name} — {asset.assetType?.name || asset.assetType?.code}</p>

        <div className="flex gap-2 border-b">
          {['info', 'photos', 'timeline'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-interplay-500 text-interplay-500' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'info' ? 'Información' : t === 'photos' ? 'Fotografías' : 'Línea de Tiempo'}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="font-semibold text-lg">Detalles</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[['Código', asset.code], ['Nombre', asset.name], ['Tipo', asset.assetType?.name], ['Estado', asset.status],
                  ['Municipio', asset.municipality?.name], ['Departamento', asset.department?.name],
                  ['Latitud', asset.latitude?.toFixed(5) || '—'], ['Longitud', asset.longitude?.toFixed(5) || '—'],
                  ['Observaciones', asset.observations || '—'],
                ].map(([l, v]) => (
                  <div key={l as string}><span className="text-slate-500 text-xs">{l}</span><p className="font-medium text-sm mt-0.5">{v as string}</p></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="font-semibold text-lg">Capacidad</h2>
              {cap.totalPorts ? <>
                <div className="text-center"><span className="text-3xl font-bold">{pct}%</span><p className="text-sm text-slate-500">Ocupación</p></div>
                <div className="w-full bg-slate-200 rounded-full h-3"><div className={`${barColor} h-3 rounded-full`} style={{ width: `${pct}%` }}></div></div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  {[['Total', cap.totalPorts], ['Usados', cap.usedPorts], ['Libres', cap.freePorts]].map(([l, v]) => (
                    <div key={l as string}><span className="text-slate-500 text-xs">{l}</span><p className="font-bold text-lg">{v}</p></div>
                  ))}
                </div>
              </> : <p className="text-slate-400 text-sm">Sin datos de capacidad</p>}
            </div>
          </div>
        )}

        {tab === 'photos' && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-slate-400 text-sm">Sin fotografías. Disponible cuando el técnico las capture en campo.</p>
        </div>}

        {tab === 'timeline' && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-slate-400 text-sm">Línea de tiempo disponible próximamente.</p>
        </div>}
      </div>
    </DashboardLayout>
  );
}
