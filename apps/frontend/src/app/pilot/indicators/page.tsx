'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function IndicatorsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.getStats().catch(() => null),
      api.integrity.checkAll().catch(() => null),
      api.assets.getAll({ type: 'CAJA', limit: '200' }).catch(() => null),
    ]).then(([dash, integrity, assetsRaw]) => {
      const assets = assetsRaw?.data || assetsRaw || [];
      const list = Array.isArray(assets) ? assets : [];
      const totalCajas = list.length;

      const certCounts: Record<string, number> = { PENDIENTE: 0, VALIDADO: 0, CERTIFICADO: 0 };
      list.forEach((a: any) => { if (a.certStatus in certCounts) certCounts[a.certStatus]++; });

      const withCoords = list.filter((a: any) => a.latitude && a.longitude).length;
      const withValidCoords = list.filter((a: any) => a.latitude && a.longitude && a.latitude < 10 && a.latitude > 4 && a.longitude < -74 && a.longitude > -76).length;

      setData({
        dash,
        integrity,
        totalCajas,
        certificados: certCounts.CERTIFICADO || 0,
        validados: certCounts.VALIDADO || 0,
        pendientes: certCounts.PENDIENTE || 0,
        withCoords,
        withValidCoords,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><p className="text-slate-400">Cargando indicadores...</p></DashboardLayout>;

  const indicators = [
    {
      label: 'Activos certificados',
      value: data.totalCajas ? (data.certificados / data.totalCajas * 100).toFixed(1) : '0',
      max: '100',
      color: 'bg-emerald-500',
      icon: '✅',
    },
    {
      label: 'Coordenadas verificadas',
      value: data.totalCajas ? (data.withCoords / data.totalCajas * 100).toFixed(1) : '0',
      max: '100',
      color: 'bg-blue-500',
      icon: '📍',
    },
    {
      label: 'Coordenadas válidas',
      value: data.totalCajas ? (data.withValidCoords / data.totalCajas * 100).toFixed(1) : '0',
      max: '100',
      color: 'bg-teal-500',
      icon: '🧭',
    },
    {
      label: 'Fotografías',
      value: '0',
      max: '100',
      color: 'bg-purple-500',
      icon: '📷',
    },
    {
      label: 'Relaciones verificadas',
      value: data.integrity?.totales?.relaciones ? '100' : '0',
      max: '100',
      color: 'bg-amber-500',
      icon: '🔗',
    },
    {
      label: 'Activos pendientes',
      value: data.totalCajas ? (data.pendientes / data.totalCajas * 100).toFixed(1) : '0',
      max: '100',
      color: 'bg-slate-500',
      icon: '⏳',
    },
    {
      label: 'Importados (WhatsApp)',
      value: data.integrity?.totales?.activos ? ((data.integrity.totales.activos - 0) / data.integrity.totales.activos * 100).toFixed(1) : '0',
      max: '100',
      color: 'bg-green-500',
      icon: '📥',
    },
    {
      label: 'Cobertura de puertos',
      value: data.integrity?.capacidad?.ocupacionPct?.toFixed(1) || '0',
      max: '100',
      color: data.integrity?.capacidad?.ocupacionPct > 80 ? 'bg-red-500' : data.integrity?.capacidad?.ocupacionPct > 60 ? 'bg-amber-500' : 'bg-emerald-500',
      icon: '🔌',
    },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-slate-900">Indicadores del Piloto</h1>
      <p className="text-slate-500 mt-1">Métricas de calidad — Municipio Fresno</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {indicators.map((ind) => {
          const pct = Math.min(parseFloat(ind.value) / parseFloat(ind.max) * 100, 100);
          return (
            <div key={ind.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{ind.icon}</span>
                <span className="text-xs font-semibold text-slate-500 uppercase">{ind.label}</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{ind.value}%</div>
              <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${ind.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase">Resumen ejecutivo</h2>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Total cajas</p>
            <p className="text-2xl font-bold text-slate-900">{data.totalCajas}</p>
          </div>
          <div>
            <p className="text-slate-400">Certificadas</p>
            <p className="text-2xl font-bold text-emerald-600">{data.certificados}</p>
          </div>
          <div>
            <p className="text-slate-400">Validadas</p>
            <p className="text-2xl font-bold text-blue-600">{data.validados}</p>
          </div>
          <div>
            <p className="text-slate-400">Pendientes</p>
            <p className="text-2xl font-bold text-slate-600">{data.pendientes}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-400">
        Última actualización: {new Date().toLocaleString('es-CO')}
      </div>
    </DashboardLayout>
  );
}
