'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const statusColors: Record<string, string> = {
  ACTIVO: '#22c55e', EN_CONSTRUCCION: '#eab308', EN_MANTENIMIENTO: '#f97316',
  FUERA_DE_SERVICIO: '#ef4444', PENDIENTE_INSTALACION: '#3b82f6', RETIRADO: '#6b7280',
};

const capacityColors: Record<string, string> = {
  DISPONIBLE: '#22c55e', ADVERTENCIA: '#eab308', ALTA_OCUPACION: '#f97316', SIN_CAPACIDAD: '#ef4444',
};

export default function ExecutiveDashboardPage() {
  const [dash, setDash] = useState<any>({});
  const [integrity, setIntegrity] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [error, setError] = useState('');

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
    }).catch(() => setError('Error al cargar'));
  }, []);

  const t = integrity?.totales || {};
  const cap = integrity?.capacidad || {};
  const coords = integrity?.coordenadas || {};

  const data = useMemo(() => ({
    municipalities: 1,
    totalAssets: t.activos || 0,
    activeAssets: t.activos || 0,
    assetsByType: [
      { code: 'CAJA', name: 'Cajas', count: t.cajas || 0 },
      { code: 'CLIENTE', name: 'Clientes', count: t.clientes || 0 },
    ],
    assetsByStatus: [{ status: 'ACTIVO', count: t.activos || 0 }],
    capacitySummary: {
      totalPorts: cap.puertosTotales || 0,
      usedPorts: cap.puertosUsados || 0,
      freePorts: cap.puertosLibres || 0,
      saturatedAssets: (cap.porEstado?.SIN_CAPACIDAD || 0) + (cap.porEstado?.ALTA_OCUPACION || 0),
    },
    recentActivity: {
      assets: recent,
      imports: [],
      timeline: [],
    },
  }), [t, cap, recent]);

  const maxTypeCount = Math.max(...data.assetsByType.map((t) => t.count), 1);
  const maxStatusCount = Math.max(...data.assetsByStatus.map((s) => s.count), 1);
  const totalOccupied = data.capacitySummary.usedPorts + data.capacitySummary.freePorts;
  const capacityPie = totalOccupied > 0
    ? `conic-gradient(${capacityColors.DISPONIBLE} 0% ${(data.capacitySummary.freePorts / totalOccupied) * 100}%, ${capacityColors.ALTA_OCUPACION} ${(data.capacitySummary.freePorts / totalOccupied) * 100}% 100%)`
    : 'conic-gradient(#e5e7eb 0% 100%)';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Ejecutivo</h1>
          <p className="text-slate-500 mt-1">Digital Twin — Red FTTH · Fresno, Tolima</p>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3"><span className="text-2xl">🏛</span><p className="text-sm text-slate-500 font-medium">Municipios</p></div>
            <p className="text-3xl font-bold text-slate-900">{data.municipalities}</p>
            <p className="text-xs text-slate-400 mt-1">Departamento: Tolima</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3"><span className="text-2xl">📦</span><p className="text-sm text-slate-500 font-medium">Activos Totales</p></div>
            <p className="text-3xl font-bold text-slate-900">{data.totalAssets}</p>
            <p className="text-xs text-slate-400 mt-1">{data.activeAssets} activos</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3"><span className="text-2xl">🔌</span><p className="text-sm text-slate-500 font-medium">Puertos</p></div>
            <p className="text-3xl font-bold text-slate-900">{data.capacitySummary.totalPorts}</p>
            <p className="text-xs text-slate-400 mt-1">{data.capacitySummary.usedPorts} usados · {data.capacitySummary.freePorts} libres</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3"><span className="text-2xl">⚠️</span><p className="text-sm text-slate-500 font-medium">Saturados</p></div>
            <p className="text-3xl font-bold text-red-600">{data.capacitySummary.saturatedAssets}</p>
            <p className="text-xs text-slate-400 mt-1">Activos sin capacidad</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">Activos por Tipo</h2>
            <div className="space-y-3">
              {data.assetsByType.map((t) => (
                <div key={t.code}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-700">{t.name}</span><span className="font-semibold">{t.count}</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-interplay-500 h-2.5 rounded-full" style={{ width: `${(t.count / Math.max(maxTypeCount, 1)) * 100}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">Capacidad</h2>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full mb-4" style={{ background: capacityPie }}></div>
              <div className="text-center"><span className="text-2xl font-bold">{cap.ocupacionPct || 0}%</span><p className="text-sm text-slate-500">Ocupación general</p></div>
              <div className="mt-4 w-full space-y-1.5 text-xs">
                {Object.entries(cap.porEstado || {}).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between"><span style={{ color: capacityColors[k] || '#6b7280' }}>● {k}</span><span className="font-semibold">{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-4">Actividad Reciente</h2>
          {recent.length === 0 ? <p className="text-slate-400 text-sm">Sin actividad reciente</p> : (
            <div className="space-y-3">
              {recent.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: statusColors[a.status] || '#6b7280' }}></span>
                  <span className="font-medium">{a.code}</span>
                  <span className="text-slate-400">{a.name}</span>
                  <span className="text-slate-300 ml-auto">{new Date(a.createdAt).toLocaleDateString('es-CO')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
