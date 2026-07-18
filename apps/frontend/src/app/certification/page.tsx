'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function CertificationPage() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDIENTE');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.assets.getAll({ type: 'CAJA', limit: '200' });
      const items = res.data || res || [];
      const list = Array.isArray(items) ? items : [];
      setCajas(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = cajas.filter((c: any) => filter === 'TODOS' || c.certStatus === filter);
  const counts: Record<string, number> = { PENDIENTE: 0, VALIDADO: 0, CERTIFICADO: 0, REQUIERE_REVISION: 0 };
  cajas.forEach((c: any) => { if (c.certStatus in counts) counts[c.certStatus]++; });

  const pct = cajas.length ? Math.round((counts.CERTIFICADO / cajas.length) * 100) : 0;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-slate-900">Certificación</h1>
      <p className="text-slate-500 mt-1">{pct}% certificado — {counts.CERTIFICADO}/{cajas.length} cajas</p>

      <div className="w-full h-2 bg-slate-200 rounded-full mt-4 mb-6 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: pct + '%' }} />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(counts).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {k} ({v})
          </button>
        ))}
        <button onClick={() => setFilter('TODOS')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          Todos ({cajas.length})
        </button>
      </div>

      {loading ? <p className="text-slate-400 text-sm">Cargando...</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="p-3">Código</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Certificación</th>
                <th className="p-3">Puertos</th>
                <th className="p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const statusColor: Record<string, string> = {
                  PENDIENTE: 'bg-slate-100 text-slate-600',
                  VALIDADO: 'bg-blue-100 text-blue-700',
                  CERTIFICADO: 'bg-emerald-100 text-emerald-700',
                  REQUIERE_REVISION: 'bg-red-100 text-red-700',
                };
                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium">{c.code}</td>
                    <td className="p-3 text-slate-500">{c.name}</td>
                    <td className="p-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span></td>
                    <td className="p-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[c.certStatus] || 'bg-slate-100 text-slate-600'}`}>{c.certStatus}</span></td>
                    <td className="p-3 text-slate-500">{c.capacity?.totalPorts || '-'}/{c.capacity?.freePorts || '-'}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {c.certStatus === 'PENDIENTE' && <button onClick={async () => { try { const user = JSON.parse(localStorage.getItem('user') || '{}'); const pos = await new Promise<any>((res) => { if (!navigator.geolocation) { res({}); } else { navigator.geolocation.getCurrentPosition((p) => res({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => res({}), { enableHighAccuracy: true, timeout: 10000 }); }}); await api.certification.validate(c.id, { userId: user.id, ...pos }); load(); } catch { alert('Error al validar'); } }} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">📍 Validar</button>}
                        {c.certStatus === 'VALIDADO' && <button onClick={async () => { try { const user = JSON.parse(localStorage.getItem('user') || '{}'); await api.certification.certify(c.id, { userId: user.id }); load(); } catch (e: any) { alert(e?.message || 'Error'); } }} className="text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600">✅ Certificar</button>}
                        <a href={`/assets/${c.id}`} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">Ver</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
