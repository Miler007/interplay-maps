'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const capColors: Record<string, string> = { DISPONIBLE: '#22c55e', ADVERTENCIA: '#eab308', ALTA_OCUPACION: '#f97316', SIN_CAPACIDAD: '#ef4444' };

export default function DashboardPage() {
  const [dash, setDash] = useState<any>({});
  const [integrity, setIntegrity] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.dashboard.getStats().catch(() => ({})),
      api.integrity.checkAll().catch(() => ({})),
      api.assets.getAll({ limit: '5' }).catch(() => ({ data: [] })),
    ]).then(([d, i, a]) => {
      setDash(d || {});
      setIntegrity(i || {});
      const items = a?.data || a || [];
      setRecent(Array.isArray(items) ? items.slice(0, 5) : []);
    });
  }, []);

  const t = integrity?.totales || {};
  const cap = integrity?.capacidad || {};
  const coords = integrity?.coordenadas || {};

  const stats = [
    { label: 'Municipios', value: '1', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Activos totales', value: String(t.activos || 0), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', color: 'text-violet-500', bg: 'bg-violet-50' },
    { label: 'Puertos totales', value: String(cap.puertosTotales || 0), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>', color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Clientes', value: String(t.clientes || 0), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  const ocup = cap.ocupacionPct || 0;
  const saturadas = (cap.porEstado?.SIN_CAPACIDAD || 0) + (cap.porEstado?.ALTA_OCUPACION || 0);
  const pctCert = t.cajas ? Math.round(((t.cajas - 0) / t.cajas) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <h1 className="text-xl font-bold text-slate-900">Panel Ejecutivo</h1>
        <p className="text-sm text-slate-400 mt-0.5">Fresno, Tolima</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`} dangerouslySetInnerHTML={{ __html: s.icon.replace('stroke="currentColor"', `stroke="${s.color === 'text-blue-500' ? '#3b82f6' : s.color === 'text-violet-500' ? '#8b5cf6' : s.color === 'text-amber-500' ? '#f59e0b' : '#6366f1'}"`) }} />
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Activos por tipo</h2>
            <div className="space-y-3">
              {[['Cajas FTTH', t.cajas || 0, '#10b981'], ['Clientes', t.clientes || 0, '#6366f1']].map(([name, count, color]) => (
                <div key={name as string}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{name}</span><span className="font-semibold text-slate-800">{count}</span></div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((count as number) / Math.max(t.activos || 1, 1) * 100, 100)}%`, background: color as string }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Capacidad</h2>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-slate-800">{ocup}%</p>
              <p className="text-xs text-slate-400">Ocupación general</p>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div className={`h-full rounded-full ${ocup >= 80 ? 'bg-red-500' : ocup >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${ocup}%` }} />
            </div>
            <div className="space-y-1.5 text-xs">
              {Object.entries(cap.porEstado || {}).map(([k, v]: any) => (
                <div key={k} className="flex justify-between"><span style={{ color: capColors[k] || '#6b7280' }}>● {k}</span><span className="font-semibold text-slate-700">{v}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Alertas</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-red-50 rounded-xl text-sm"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-700 font-medium">{saturadas} cajas</span><span className="text-red-500 text-xs">con capacidad crítica</span></div>
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-amber-50 rounded-xl text-sm"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /><span className="text-amber-700 font-medium">{coords?.coordenadasInvalidas?.length || 0}</span><span className="text-amber-500 text-xs">coordenadas inválidas</span></div>
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-blue-50 rounded-xl text-sm"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /><span className="text-blue-700 font-medium">{t.cajas || 0}</span><span className="text-blue-500 text-xs">cajas por certificar</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Actividad reciente</h2>
            {recent.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Sin actividad</p> : (
              <div className="space-y-1.5">
                {recent.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-sm">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.status === 'ACTIVO' ? '#22c55e' : '#eab308' }} />
                    <span className="font-medium text-slate-700">{a.code}</span>
                    <span className="text-slate-400 truncate">{a.name}</span>
                    <span className="text-[11px] text-slate-400 ml-auto">{new Date(a.createdAt).toLocaleDateString('es-CO')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
