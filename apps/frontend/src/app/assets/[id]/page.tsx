'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [asset, setAsset] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    if (!id) return;
    api.assets.getById(id).then((a) => {
      setAsset(a);
      const prefix = a.code;
      api.assets.getAll({ search: prefix, limit: '50' }).then((res: any) => {
        const items = res.data || res || [];
        const list = Array.isArray(items) ? items.filter((c: any) => c.assetType?.code === 'CLIENTE' && c.code.includes(prefix)) : [];
        setClients(list);
      }).catch(() => {});
    }).catch(() => setAsset(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <DashboardLayout><p className="text-slate-400">Cargando activo...</p></DashboardLayout>;
  if (!asset) return <DashboardLayout><p className="text-slate-400">Activo no encontrado</p></DashboardLayout>;

  const cap = asset.capacity || {};
  const pct = cap.occupancyPct || 0;
  const isCaja = asset.assetType?.code === 'CAJA';
  const isCliente = asset.assetType?.code === 'CLIENTE';
  const obs = asset.observations || '';

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{asset.code}</h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${asset.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{asset.status}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${asset.certStatus === 'CERTIFICADO' ? 'bg-emerald-100 text-emerald-700' : asset.certStatus === 'VALIDADO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{asset.certStatus}</span>
          <button onClick={() => router.push(`/mapa?caja=${asset.code}`)} className="text-xs bg-interplay-500 text-white px-3 py-1 rounded-lg hover:bg-interplay-600">📍 Ver en mapa</button>
        </div>

        <p className="text-slate-500 -mt-4">{asset.name} — {asset.assetType?.name || asset.assetType?.code}</p>

        <div className="flex gap-2 border-b">
          {['info', 'clientes', 'timeline'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-interplay-500 text-interplay-500' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'info' ? 'Información' : t === 'clientes' ? 'Clientes' : 'Historial'}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="font-semibold text-lg">Detalles</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Código', asset.code], ['Nombre', asset.name],
                  ['Tipo', asset.assetType?.name], ['Estado', asset.status],
                  ['Municipio', asset.municipality?.name], ['Departamento', asset.department?.name],
                  ['Latitud', asset.latitude?.toFixed(5) || '—'], ['Longitud', asset.longitude?.toFixed(5) || '—'],
                ].map(([l, v]) => (
                  <div key={l as string}><span className="text-slate-500 text-xs">{l}</span><p className="font-medium text-sm mt-0.5">{v as string}</p></div>
                ))}
              </div>
              {obs && <div className="pt-2 border-t border-slate-100"><span className="text-xs text-slate-500">Fibra / Alimentación</span><p className="text-sm mt-0.5 font-medium">{obs}</p></div>}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="font-semibold text-lg">Capacidad</h2>
              {cap.totalPorts ? <>
                <div className="text-center"><span className="text-3xl font-bold">{pct}%</span><p className="text-sm text-slate-500">Ocupación</p></div>
                <div className="w-full bg-slate-200 rounded-full h-3"><div className={`h-3 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}></div></div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  {[['Total', cap.totalPorts], ['Usados', cap.usedPorts], ['Libres', cap.freePorts]].map(([l, v]) => (
                    <div key={l as string}><span className="text-slate-500 text-xs">{l}</span><p className="font-bold text-lg">{v}</p></div>
                  ))}
                </div>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${cap.status === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-700' : cap.status === 'ADVERTENCIA' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{cap.status}</span>
              </> : <p className="text-slate-400 text-sm">Sin datos de capacidad</p>}
              {clients.length > 0 && <div className="pt-2 border-t border-slate-100 text-center"><p className="text-xs text-slate-500">Clientes conectados</p><p className="text-2xl font-bold text-interplay-600">{clients.length}</p></div>}
            </div>
          </div>
        )}

        {tab === 'clientes' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-lg mb-4">Clientes en esta caja ({clients.length})</h2>
            {clients.length === 0 ? <p className="text-slate-400 text-sm">Sin clientes registrados</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="pb-2 pr-4">Código</th><th className="pb-2 pr-4">Nombre</th><th className="pb-2">Documento</th></tr></thead>
                  <tbody>
                    {clients.map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/assets/${c.id}`)}>
                        <td className="py-2 pr-4 font-medium">{c.code}</td>
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 text-slate-400">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'timeline' && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-slate-400 text-sm">Historial disponible cuando se implemente el registro de cambios.</p>
        </div>}
      </div>
    </DashboardLayout>
  );
}
