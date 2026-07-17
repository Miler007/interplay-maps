'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatusDot } from '@/app/topology/components';

const MOCK_SNAPSHOTS: Record<string, any> = {
  '2026-01-01': {
    timestamp: '2026-01-01T00:00:00',
    totalAssets: 35,
    activeAssets: 20,
    segments: 8,
    assetsByType: { CAJAS: 20, MUFLAS: 8, CTO: 3, SPLITTERS: 2, POSTES: 2 },
    assetsByStatus: { ACTIVO: 20, EN_CONSTRUCCION: 10, PENDIENTE_INSTALACION: 5 },
  },
  '2026-04-01': {
    timestamp: '2026-04-01T00:00:00',
    totalAssets: 48,
    activeAssets: 35,
    segments: 14,
    assetsByType: { CAJAS: 30, MUFLAS: 10, CTO: 3, SPLITTERS: 3, POSTES: 2 },
    assetsByStatus: { ACTIVO: 35, EN_CONSTRUCCION: 8, EN_MANTENIMIENTO: 2, PENDIENTE_INSTALACION: 3 },
  },
  '2026-07-01': {
    timestamp: '2026-07-01T00:00:00',
    totalAssets: 62,
    activeAssets: 48,
    segments: 22,
    assetsByType: { CAJAS: 38, MUFLAS: 12, CTO: 4, SPLITTERS: 6, POSTES: 2 },
    assetsByStatus: { ACTIVO: 48, EN_CONSTRUCCION: 6, EN_MANTENIMIENTO: 3, FUERA_DE_SERVICIO: 2, PENDIENTE_INSTALACION: 3, RETIRADO: 0 },
  },
};

const PRESET_DATES = [
  { label: 'Hoy', value: () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }},
  { label: '1 Enero 2026', value: () => '2026-01-01' },
  { label: 'Inicio del proyecto', value: () => '2025-11-01' },
  { label: 'Último mes', value: () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  }},
];

export default function PlaybackPage() {
  const [date, setDate] = useState('2026-07-01');
  const [time, setTime] = useState('12:00');
  const [snapshot, setSnapshot] = useState<any>(MOCK_SNAPSHOTS['2026-07-01']);
  const [compareMode, setCompareMode] = useState(false);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-07-01');
  const [diff, setDiff] = useState<any>(null);
  const [viewed, setViewed] = useState(false);

  const handleViewState = () => {
    const key = date;
    const found = MOCK_SNAPSHOTS[key];
    if (found) {
      setSnapshot(found);
    } else {
      setSnapshot({
        timestamp: `${date}T${time}:00`,
        totalAssets: 55,
        activeAssets: 42,
        segments: 18,
        assetsByType: { CAJAS: 34, MUFLAS: 11, CTO: 4, SPLITTERS: 4, POSTES: 2 },
        assetsByStatus: { ACTIVO: 42, EN_CONSTRUCCION: 7, EN_MANTENIMIENTO: 2, FUERA_DE_SERVICIO: 1, PENDIENTE_INSTALACION: 3 },
      });
    }
    setViewed(true);
    if (compareMode) {
      const snapFrom = MOCK_SNAPSHOTS[dateFrom] || MOCK_SNAPSHOTS['2026-01-01'];
      const snapTo = MOCK_SNAPSHOTS[dateTo] || MOCK_SNAPSHOTS['2026-07-01'];
      if (snapFrom && snapTo) {
        setDiff({
          from: snapFrom,
          to: snapTo,
          assetsAdded: snapTo.totalAssets - snapFrom.totalAssets,
          assetsRemoved: 0,
          assetsChanged: 5,
        });
      }
    } else {
      setDiff(null);
    }
  };

  const handleCompare = () => {
    const snapFrom = MOCK_SNAPSHOTS[dateFrom] || MOCK_SNAPSHOTS['2026-01-01'];
    const snapTo = MOCK_SNAPSHOTS[dateTo] || MOCK_SNAPSHOTS['2026-07-01'];
    setSnapshot(snapTo);
    setViewed(true);
    setDiff({
      from: snapFrom,
      to: snapTo,
      assetsAdded: snapTo.totalAssets - snapFrom.totalAssets,
      assetsRemoved: 0,
      assetsChanged: 5,
    });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reproducción de Red</h1>
          <p className="text-slate-500 mt-1">Visualiza el estado de la red en cualquier momento</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {!compareMode ? (
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hora</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500" />
              </div>
              <button onClick={handleViewState}
                className="bg-interplay-600 hover:bg-interplay-700 text-white px-5 py-2 rounded-lg text-sm transition-colors">
                Ver estado
              </button>
              <div className="flex flex-wrap gap-2 ml-auto">
                {PRESET_DATES.map((preset) => (
                  <button key={preset.label} onClick={() => { setDate(preset.value()); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500" />
              </div>
              <button onClick={handleCompare}
                className="bg-interplay-600 hover:bg-interplay-700 text-white px-5 py-2 rounded-lg text-sm transition-colors">
                Comparar
              </button>
              <div className="flex gap-2 ml-auto">
                {PRESET_DATES.map((preset) => (
                  <button key={preset.label} onClick={() => { setDateFrom('2026-01-01'); setDateTo(preset.value()); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-100">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={compareMode} onChange={() => setCompareMode(!compareMode)} className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-interplay-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-interplay-600" />
            </label>
            <span className="text-sm text-slate-600">Comparar dos fechas</span>
          </div>
        </div>

        {viewed && snapshot && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-500">Total Activos</p>
                <p className="text-2xl font-bold text-slate-900">{snapshot.totalAssets}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-500">Activos Activos</p>
                <p className="text-2xl font-bold text-green-600">{snapshot.activeAssets}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-500">Segmentos</p>
                <p className="text-2xl font-bold text-slate-900">{snapshot.segments}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-500">Fecha</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{formatDate(snapshot.timestamp)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Activos por Tipo</h2>
                {snapshot.assetsByType && (
                  <div className="space-y-3">
                    {Object.entries(snapshot.assetsByType).map(([type, count]: [string, any]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-slate-600">{type}</span>
                        <span className="font-medium text-slate-900">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Activos por Estado</h2>
                {snapshot.assetsByStatus && (
                  <div className="space-y-3">
                    {Object.entries(snapshot.assetsByStatus).map(([status, count]: [string, any]) => (
                      <div key={status} className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-2 text-slate-600">
                          <StatusDot status={status as any} />
                          {status.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium text-slate-900">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {diff && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Resultados de Comparación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Activos Agregados</p>
                <p className="text-2xl font-bold text-green-700">+{diff.assetsAdded}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 font-medium">Activos Eliminados</p>
                <p className="text-2xl font-bold text-red-700">{diff.assetsRemoved > 0 ? `-${diff.assetsRemoved}` : 0}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Activos Modificados</p>
                <p className="text-2xl font-bold text-blue-700">{diff.assetsChanged}</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Comparando: {formatDate(diff.from.timestamp)} → {formatDate(diff.to.timestamp)}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
