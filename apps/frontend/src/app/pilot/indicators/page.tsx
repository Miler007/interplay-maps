'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function IndicatorsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.getStats().catch(() => ({})),
      api.integrity.checkAll().catch(() => ({})),
      api.assets.getAll({ type: 'CAJA', limit: '200' }).catch(() => ({ data: [] })),
    ]).then(([dash, integrity, assetsRaw]) => {
      const items = assetsRaw?.data || assetsRaw || [];
      const list = Array.isArray(items) ? items : [];
      const cert: Record<string, number> = {};
      list.forEach((a: any) => { const s = a.certStatus || 'PENDIENTE'; cert[s] = (cert[s] || 0) + 1; });
      const withCoords = list.filter((a: any) => a.latitude && a.longitude).length;
      setData({ dash, integrity, total: list.length, cert, withCoords });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const t = data?.integrity?.totales || {};
  const cap = data?.integrity?.capacidad || {};
  const cert = data?.cert || {};
  const total = data?.total || 0;

  const indicators = [
    {
      label: 'Certificados', value: `${total ? Math.round(((cert.CERTIFICADO || 0) / total) * 100) : 0}%`,
      sub: `${cert.CERTIFICADO || 0} de ${total}`,
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      color: 'text-emerald-500', bg: 'bg-emerald-50', pct: total ? ((cert.CERTIFICADO || 0) / total) * 100 : 0,
    },
    {
      label: 'Coordenadas válidas', value: `${total ? Math.round((data.withCoords / total) * 100) : 0}%`,
      sub: `${data.withCoords} de ${total}`,
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>',
      color: 'text-blue-500', bg: 'bg-blue-50', pct: total ? (data.withCoords / total) * 100 : 0,
    },
    {
      label: 'Validados', value: `${total ? Math.round(((cert.VALIDADO || 0) / total) * 100) : 0}%`,
      sub: `${cert.VALIDADO || 0} de ${total}`,
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      color: 'text-blue-500', bg: 'bg-blue-50', pct: total ? ((cert.VALIDADO || 0) / total) * 100 : 0,
    },
    {
      label: 'Fotografías', value: '0%', sub: '0 de 146',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      color: 'text-purple-500', bg: 'bg-purple-50', pct: 0,
    },
    {
      label: 'Relaciones verificadas', value: '100%', sub: '20 relaciones',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
      color: 'text-amber-500', bg: 'bg-amber-50', pct: 100,
    },
    {
      label: 'Pendientes', value: `${total ? Math.round(((cert.PENDIENTE || 0) / total) * 100) : 0}%`,
      sub: `${cert.PENDIENTE || 0} de ${total}`,
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      color: 'text-slate-500', bg: 'bg-slate-50', pct: total ? ((cert.PENDIENTE || 0) / total) * 100 : 0,
    },
    {
      label: 'Ocupación puertos', value: `${cap.ocupacionPct || 0}%`,
      sub: `${cap.puertosUsados || 0} de ${cap.puertosTotales || 0}`,
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/></svg>',
      color: 'text-amber-500', bg: 'bg-amber-50', pct: cap.ocupacionPct || 0,
    },
    {
      label: 'Capacidad crítica', value: `${((cap.porEstado?.SIN_CAPACIDAD || 0) + (cap.porEstado?.ALTA_OCUPACION || 0))}`,
      sub: 'cajas',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      color: 'text-red-500', bg: 'bg-red-50', pct: 0,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <h1 className="text-xl font-bold text-slate-900">Indicadores</h1>
        <p className="text-sm text-slate-400 mt-0.5">Métricas de calidad — Fresno, Tolima</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {indicators.map(ind => (
            <div key={ind.label} className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 ${ind.bg} rounded-xl flex items-center justify-center`} dangerouslySetInnerHTML={{ __html: ind.icon }} />
                <span className="text-xs font-medium text-slate-400">{ind.label}</span>
              </div>
              <p className={`text-2xl font-bold ${ind.color}`}>{ind.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{ind.sub}</p>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full ${ind.color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(ind.pct, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Estado de certificación</h2>
            <div className="space-y-3">
              {[['CERTIFICADO', 'bg-emerald-500'], ['VALIDADO', 'bg-blue-500'], ['PENDIENTE', 'bg-slate-400'], ['REQUIERE_REVISION', 'bg-red-500']].map(([k, bg]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{k}</span><span className="font-semibold text-slate-800">{cert[k] || 0}</span></div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bg}`} style={{ width: `${total ? ((cert[k] || 0) / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Resumen ejecutivo</h2>
            <div className="grid grid-cols-2 gap-4">
              {[['Total cajas', total, 'text-slate-800'], ['Certificadas', cert.CERTIFICADO || 0, 'text-emerald-600'], ['Validadas', cert.VALIDADO || 0, 'text-blue-600'], ['Pendientes', cert.PENDIENTE || 0, 'text-slate-600'], ['Puertos totales', cap.puertosTotales || 0, 'text-amber-600'], ['Clientes', t.clientes || 0, 'text-indigo-600']].map(([l, v, c]) => (
                <div key={l as string} className="px-3 py-2.5 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className={`text-lg font-bold ${c}`}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4 pb-8">Actualizado: {new Date().toLocaleString('es-CO')}</p>
      </div>
    </DashboardLayout>
  );
}
