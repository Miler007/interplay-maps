'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function ValidationPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [itemsData, statsData] = await Promise.all([
        api.validation.getQueue(filter).catch(() => []),
        api.validation.getQueueStats().catch(() => null),
      ]);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setStats(statsData);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-16"><div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Validación</h1>
            <p className="text-sm text-slate-400 mt-0.5">Registros pendientes de revisión</p>
          </div>
          {stats && <div className="flex items-center gap-2 text-xs text-slate-500"><span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg font-semibold">{stats.pendiente || 0} pendientes</span></div>}
        </div>

        {stats && <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[['PENDIENTE', stats.pendiente, 'bg-amber-500'], ['APROBADO', stats.aprobado, 'bg-emerald-500'], ['CORREGIDO', stats.corregido, 'bg-blue-500'], ['FUSIONADO', stats.fusionado, 'bg-violet-500'], ['RECHAZADO', stats.rechazado, 'bg-red-500']].map(([k, v, bg]) => (
            <div key={k as string} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="text-xs text-slate-400">{k}</p>
              <p className="text-xl font-bold mt-1" style={{ color: bg === 'bg-amber-500' ? '#d97706' : bg === 'bg-emerald-500' ? '#059669' : bg === 'bg-blue-500' ? '#2563eb' : bg === 'bg-violet-500' ? '#7c3aed' : '#dc2626' }}>{v}</p>
            </div>
          ))}
        </div>}

        <div className="flex gap-2 mb-4 flex-wrap">
          {['', 'PENDIENTE', 'APROBADO', 'RECHAZADO'].map(k => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${filter === k ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              {k || 'Todos'}
            </button>
          ))}
        </div>

        {items.length === 0 ? <p className="text-center text-slate-400 py-12 text-sm">Sin registros</p> : (
          <div className="space-y-1.5">
            {items.map((item: any) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.suggestedName || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.reason}</p>
                    {item.suggestedLatitude && <p className="text-xs text-slate-400 mt-0.5">📍 {item.suggestedLatitude}, {item.suggestedLongitude}</p>}
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${item.status === 'PENDIENTE' ? 'bg-amber-50 text-amber-600' : item.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
