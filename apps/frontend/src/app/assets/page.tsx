'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const typeColors: Record<string, string> = {
  CAJA: '#10b981', CAJAS: '#10b981', CLIENTE: '#6366f1',
  NODO: '#06b6d4', NODOS: '#06b6d4', POSTE: '#ef4444', POSTES: '#ef4444',
  CTO: '#3b82f6', SPLITTER: '#8b5cf6', SPLITTERS: '#8b5cf6',
};

const statusColors: Record<string, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  EN_CONSTRUCCION: 'bg-amber-100 text-amber-700',
  FUERA_DE_SERVICIO: 'bg-red-100 text-red-700',
  PENDIENTE_INSTALACION: 'bg-blue-100 text-blue-700',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadAssets = async (type?: string) => {
    setLoading(true);
    try {
      const p: Record<string, string> = {};
      if (type) p.type = type;
      const r = await api.assets.getAll(p);
      const items = r.data || r || [];
      setAssets(Array.isArray(items) ? items : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAssets(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este activo?')) return;
    try { await api.assets.delete(id); setAssets(prev => prev.filter(a => a.id !== id)); } catch { alert('Error'); }
  };

  const counts: Record<string, number> = {};
  assets.forEach((a: any) => { const t = a.assetType?.code || 'OTROS'; counts[t] = (counts[t] || 0) + 1; });

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Activos</h1>
            <p className="text-sm text-slate-400">{assets.length} registros</p>
          </div>
          <div className="flex gap-2">
            {[['', 'Todos'], ['CAJA', 'Cajas'], ['CLIENTE', 'Clientes']].map(([k, label]) => (
              <button key={k} onClick={() => { setFilter(k); loadAssets(k || undefined); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${filter === k ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                {label} {k && (counts[k] || 0) > 0 && `(${counts[k]})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="space-y-1.5">
            {assets.map((a: any) => {
              const typeCode = a.assetType?.code || 'OTROS';
              const typeName = a.assetType?.name || typeCode;
              const typeColor = typeColors[typeCode] || '#64748b';
              const cap = a.capacity || {};
              return (
                <div key={a.id} className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: typeColor + '18' }}>
                      <span className="w-3.5 h-3.5 rounded-full" style={{ background: typeColor }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={`/assets/${a.id}/`} className="font-bold text-sm text-slate-800 hover:text-interplay-600 transition-colors">{a.code}</a>
                        <span className="text-xs text-slate-400 truncate">{a.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span style={{ color: typeColor }}>{typeName}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className={statusColors[a.status] || 'bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded'}>{a.status}</span>
                        {cap.totalPorts > 0 && <><span className="w-1 h-1 rounded-full bg-slate-300" /><span>{cap.totalPorts} puertos, {cap.freePorts} libres</span></>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a href={`/assets/${a.id}/`} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">Ver</a>
                      <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
