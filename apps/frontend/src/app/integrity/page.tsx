'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function IntegrityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.integrity.checkAll().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const t = data?.totales || {};
  const c = data?.coordenadas || {};
  const cap = data?.capacidad || {};
  const top = data?.topologia || {};

  const cards = [
    { label: 'Activos', value: String(t.activos || 0), sub: `${t.cajas} cajas · ${t.clientes} clientes`, color: 'text-slate-800', bg: 'bg-slate-50' },
    { label: 'Coordenadas inválidas', value: String(c?.coordenadasInvalidas?.length || 0), sub: `${c?.totalSinCoordenadas || 0} sin coordenadas`, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Capacidad crítica', value: String((cap?.porEstado?.SIN_CAPACIDAD || 0) + (cap?.porEstado?.ALTA_OCUPACION || 0)), sub: `${cap?.puertosTotales || 0} puertos · ${cap?.ocupacionPct || 0}% ocupación`, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Cajas aisladas', value: String(top?.totalCajasAisladas || 0), sub: `${top?.relacionesRotas || 0} relaciones rotas`, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <h1 className="text-xl font-bold text-slate-900">Network Integrity</h1>
        <p className="text-sm text-slate-400 mt-0.5">Diagnóstico permanente de la red</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {cards.map(card => (
            <div key={card.label} className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-4">
              <p className="text-xs text-slate-400 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Coordenadas inválidas</h2>
            {c?.coordenadasInvalidas?.length === 0 ? <p className="text-sm text-slate-400">Ninguna</p> : (
              <div className="space-y-1.5">
                {c?.coordenadasInvalidas?.map((ci: any) => (
                  <div key={ci.code} className="flex items-center gap-2 text-sm px-3 py-2 bg-red-50 rounded-xl text-red-700">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="font-medium">{ci.code}</span>
                    <span className="text-red-400 text-xs">({ci.lat}, {ci.lng})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Capacidad por estado</h2>
            <div className="space-y-2">
              {Object.entries(cap?.porEstado || {}).map(([k, v]: any) => {
                const colors: Record<string, string> = { DISPONIBLE: 'bg-emerald-500', ADVERTENCIA: 'bg-amber-500', ALTA_OCUPACION: 'bg-orange-500', SIN_CAPACIDAD: 'bg-red-500' };
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors[k] || 'bg-slate-400'} shrink-0`} />
                    <span className="text-sm text-slate-600 flex-1">{k}</span>
                    <span className="text-sm font-semibold text-slate-800">{v}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Cajas aisladas</h2>
          <details>
            <summary className="text-sm text-interplay-600 font-medium cursor-pointer hover:text-interplay-700">
              {top?.totalCajasAisladas || 0} cajas sin relaciones — mostrar lista
            </summary>
            <div className="mt-2 max-h-48 overflow-y-auto grid grid-cols-3 lg:grid-cols-6 gap-1">
              {top?.cajasAisladas?.map((c: string) => (
                <span key={c} className="text-xs text-slate-500 px-2 py-1 bg-slate-50 rounded">{c}</span>
              ))}
            </div>
          </details>
        </div>
      </div>
    </DashboardLayout>
  );
}
