'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Caja {
  id: string; code: string; name: string; total: number; free: number;
  lat: number; lng: number; priority: string; obs: string;
}

export default function CampoPage() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('campo-checked');
    if (saved) setChecked(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    localStorage.setItem('campo-checked', JSON.stringify([...checked]));
  }, [checked]);

  useEffect(() => {
    api.assets.getAll({ type: 'CAJA', limit: '200' }).then(data => {
        const items = data.data || data;
        const list: Caja[] = items.filter((c: any) => c.assetType?.code === 'CAJA').map((c: any) => {
          const lat = c.latitude || 0, lng = c.longitude || 0;
          let priority = 'BAJA';
          if (lat > 10 || lat < 4 || lng > -74 || lng < -76) priority = 'ALTA';
          else if (c.code?.startsWith('B.')) priority = 'MEDIA';
          else if (!lat || !lng) priority = 'ALTA';
          return {
            id: c.id, code: c.code, name: c.name,
            total: c.capacity?.totalPorts || 0, free: c.capacity?.freePorts || 0,
            lat, lng, priority, obs: c.observations || '',
          };
        });
        list.sort((a, b) => {
          const p = { ALTA: 0, MEDIA: 1, BAJA: 2 };
          return p[a.priority as keyof typeof p] - p[b.priority as keyof typeof p];
        });
        setCajas(list);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pct = cajas.length ? Math.round(checked.size / cajas.length * 100) : 0;
  const stats = { ALTA: cajas.filter(c => c.priority === 'ALTA').length, MEDIA: cajas.filter(c => c.priority === 'MEDIA').length, BAJA: cajas.filter(c => c.priority === 'BAJA').length };

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900">Revisión en Campo</h1>
        <p className="text-slate-500 mt-1">Operation Zero — Fresno · {checked.size}/{cajas.length} validadas ({pct}%)</p>

        <div className="w-full h-2 bg-slate-200 rounded-full mt-4 mb-4 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: pct + '%' }} />
        </div>

        <div className="flex gap-3 mb-6 text-sm flex-wrap">
          <div className="bg-red-50 px-4 py-2 rounded-lg"><span className="font-bold text-red-600">{stats.ALTA}</span> <span className="text-red-500">Prioridad alta</span></div>
          <div className="bg-amber-50 px-4 py-2 rounded-lg"><span className="font-bold text-amber-600">{stats.MEDIA}</span> <span className="text-amber-500">Prioridad media</span></div>
          <div className="bg-emerald-50 px-4 py-2 rounded-lg"><span className="font-bold text-emerald-600">{stats.BAJA}</span> <span className="text-emerald-500">Prioridad baja</span></div>
        </div>

        {loading ? <p className="text-slate-400 text-sm">Cargando cajas...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                  <th className="p-3 w-10">✅</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Puertos</th>
                  <th className="p-3">Libres</th>
                  <th className="p-3">Coordenadas</th>
                  <th className="p-3">Prioridad</th>
                  <th className="p-3">Obs</th>
                </tr>
              </thead>
              <tbody>
                {cajas.map(c => {
                  const isChecked = checked.has(c.id);
                  const border = c.priority === 'ALTA' ? 'border-l-red-500' : c.priority === 'MEDIA' ? 'border-l-amber-500' : 'border-l-emerald-500';
                  return (
                    <tr key={c.id} onClick={() => toggle(c.id)} className={`border-l-4 ${border} cursor-pointer hover:bg-slate-50 ${isChecked ? 'opacity-60' : ''}`}>
                      <td className="p-3"><input type="checkbox" checked={isChecked} onChange={() => toggle(c.id)} className="w-4 h-4 rounded border-slate-300 text-interplay-600" /></td>
                      <td className="p-3 font-medium">{c.code}</td>
                      <td className="p-3 text-slate-500">{c.total}</td>
                      <td className="p-3">{c.free}</td>
                      <td className="p-3 text-slate-500 text-[11px]">{c.lat ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : '—'}</td>
                      <td className="p-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.priority === 'ALTA' ? 'bg-red-100 text-red-700' : c.priority === 'MEDIA' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.priority}</span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px] max-w-[150px] truncate">{c.obs || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">🖨️ Imprimir</button>
          <button onClick={() => { if (confirm('¿Reinificar todo?')) { setChecked(new Set()); } }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200">🔄 Reiniciar</button>
          <a href="/mapa" className="px-4 py-2 bg-interplay-500 text-white rounded-lg text-sm font-medium hover:bg-interplay-600 text-center">🗺️ Ir al mapa</a>
        </div>
      </div>
    </DashboardLayout>
  );
}
