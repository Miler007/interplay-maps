'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function CampoPage() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('TODOS');

  useEffect(() => {
    const saved = localStorage.getItem('campo-checked');
    if (saved) setChecked(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    localStorage.setItem('campo-checked', JSON.stringify([...checked]));
  }, [checked]);

  useEffect(() => {
    api.assets.getAll({ type: 'CAJA', limit: '200' }).then((res: any) => {
      const items = res.data || res || [];
      const list: any[] = (Array.isArray(items) ? items : []).map((c: any) => {
        const lat = c.latitude || 0;
        let p = 'BAJA';
        if (lat > 10 || lat < 4 || (!c.latitude && !c.longitude)) p = 'ALTA';
        else if (c.code?.startsWith('B.')) p = 'MEDIA';
        return { ...c, _priority: p };
      });
      const orden: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };
      list.sort((a, b) => (orden[a._priority] || 0) - (orden[b._priority] || 0));
      setCajas(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const stats: Record<string, number> = {};
  cajas.forEach((c: any) => { const p = c._priority as string; stats[p] = (stats[p] || 0) + 1; });

  const filtered = filter === 'TODOS' ? cajas : cajas.filter(c => c._priority === filter);
  const pct = cajas.length ? Math.round(checked.size / cajas.length * 100) : 0;

  const priorityConfig: Record<string, { color: string; bg: string; text: string; label: string }> = {
    ALTA: { color: 'text-red-600', bg: 'bg-red-50', text: 'text-red-700', label: 'Alta' },
    MEDIA: { color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Media' },
    BAJA: { color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Baja' },
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Revisión en Campo</h1>
            <p className="text-sm text-slate-400">Operation Zero — Fresno</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-500">{pct}%</p>
            <p className="text-[11px] text-slate-400">{checked.size}/{cajas.length} validados</p>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px] grid grid-cols-3 gap-2">
            {[['ALTA', '🔴'], ['MEDIA', '🟡'], ['BAJA', '🟢']].map(([k, emoji]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all text-center ${filter === k ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                {emoji} {k} ({stats[k] || 0})
              </button>
            ))}
          </div>
          <button onClick={() => setFilter('TODOS')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === 'TODOS' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
            Todos ({cajas.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((c: any) => {
              const cfg = priorityConfig[c._priority] || priorityConfig.BAJA;
              const isChecked = checked.has(c.id);
              return (
                <div key={c.id} onClick={() => toggle(c.id)}
                  className={`bg-white rounded-2xl border border-slate-100 p-4 cursor-pointer transition-all hover:shadow-md ${
                    isChecked ? 'opacity-50' : 'shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div onClick={e => { e.stopPropagation(); toggle(c.id); }} className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-slate-400'
                    }`}>
                      {isChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{c.code}</h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.capacity?.totalPorts || '?'} puertos · {c.capacity?.freePorts || '?'} libres</p>
                    </div>

                    <a href={`/campo/validar/${c.id}/`} onClick={e => e.stopPropagation()}
                      className="px-3.5 py-2 bg-interplay-500 hover:bg-interplay-600 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_2px_8px_rgba(99,102,241,0.25)] shrink-0">
                      Validar
                    </a>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">Sin cajas</p>}
          </div>
        )}

        <div className="mt-6 flex gap-3 pb-8">
          <button onClick={() => window.print()} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir
          </button>
          <button onClick={() => { if (confirm('Reiniciar todo?')) setChecked(new Set()); }} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all">
            Reiniciar
          </button>
          <a href="/mapa" className="px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            Mapa
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
