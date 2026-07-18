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

  if (loading) return <DashboardLayout><p className="text-slate-400 text-sm">Ejecutando diagnóstico...</p></DashboardLayout>;

  const t = data?.totales;
  const c = data?.coordenadas;
  const cap = data?.capacidad;
  const top = data?.topologia;
  const diag = data?.diagnosticos;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-slate-900">Network Integrity</h1>
      <p className="text-slate-500 mt-1">Diagnóstico permanente de la red FTTH</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Totales</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Activos</span><strong>{t?.activos}</strong></div>
            <div className="flex justify-between"><span>Cajas</span><strong>{t?.cajas}</strong></div>
            <div className="flex justify-between"><span>Clientes</span><strong>{t?.clientes}</strong></div>
            <div className="flex justify-between"><span>Relaciones</span><strong>{t?.relaciones}</strong></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Coordenadas</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between text-red-600"><span>⚠ Inválidas</span><strong>{c?.coordenadasInvalidas?.length || 0}</strong></div>
            <div className="flex justify-between"><span>Sin coordenadas</span><strong>{c?.totalSinCoordenadas}</strong></div>
            <div className="mt-2 text-xs text-slate-400">Clientes sin ubicación</div>
            {c?.coordenadasInvalidas?.map((ci: any) => (
              <div key={ci.code} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">{ci.code}: ({ci.lat}, {ci.lng})</div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Capacidad</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Puertos totales</span><strong>{cap?.puertosTotales}</strong></div>
            <div className="flex justify-between"><span>Usados</span><strong>{cap?.puertosUsados}</strong></div>
            <div className="flex justify-between"><span>Libres</span><strong>{cap?.puertosLibres}</strong></div>
            <div className="flex justify-between"><span>Ocupación</span><strong>{cap?.ocupacionPct}%</strong></div>
            <div className="mt-2 space-y-1 text-xs">
              {Object.entries(cap?.porEstado || {}).map(([k, v]: any) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <strong className={k === 'SIN_CAPACIDAD' ? 'text-red-600' : k === 'ALTA_OCUPACION' ? 'text-amber-600' : ''}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Topología</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between text-red-600"><span>⚠ Cajas aisladas</span><strong>{top?.totalCajasAisladas}</strong></div>
            <div className="flex justify-between"><span>Relaciones rotas</span><strong>{top?.relacionesRotas}</strong></div>
            <div className="flex justify-between"><span>Códigos duplicados</span><strong>{top?.codigosDuplicados?.length || 0}</strong></div>
            <details className="mt-2">
              <summary className="text-xs text-interplay-600 cursor-pointer font-semibold">Ver cajas aisladas</summary>
              <div className="mt-1 max-h-32 overflow-y-auto text-xs text-slate-500 space-y-0.5">
                {top?.cajasAisladas?.map((c: string) => <div key={c}>{c}</div>)}
              </div>
            </details>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Diagnósticos</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Clientes sin caja</span><strong>{diag?.clientesSinCaja}</strong></div>
            <div className="flex justify-between"><span>Ciclos topológicos</span><strong>{diag?.ciclos}</strong></div>
            <div className="flex justify-between text-amber-600"><span>⚠ Fotos faltantes</span><strong>{diag?.fotosFaltantes}</strong></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-2">🛡️</div>
          <p className="text-sm font-semibold text-slate-700">Estado General</p>
          <p className="text-xs text-slate-400 mt-1">Monitorización permanente activa</p>
        </div>

      </div>
    </DashboardLayout>
  );
}
