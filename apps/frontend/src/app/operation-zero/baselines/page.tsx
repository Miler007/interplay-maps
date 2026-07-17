'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { MunicipalityBaseline, BaselineDiff } from '@interplay/shared';

const MOCK_BASELINES: MunicipalityBaseline[] = [
  { id: 'b1', municipalityId: 'fresno', version: '1.0', label: 'Importación inicial Fresno', createdAt: '2026-07-16', totalAssets: 62, totalSegments: 24, totalRelations: 38, qualityScore: 96, isActive: true, snapshot: null },
  { id: 'b2', municipalityId: 'fresno', version: '0.9', label: 'Pre-certificación', createdAt: '2026-07-14', totalAssets: 58, totalSegments: 22, totalRelations: 32, qualityScore: 72, isActive: false, snapshot: null },
];

const MOCK_DIFF: BaselineDiff = {
  fromVersion: '0.9',
  toVersion: '1.0',
  assetsAdded: 6,
  assetsRemoved: 2,
  assetsChanged: 4,
  segmentsAdded: 3,
  segmentsRemoved: 1,
  relationsAdded: 7,
  relationsRemoved: 1,
  qualityChange: 24,
  details: {
    added: [
      { code: 'CAJ-042', name: 'Caja Fresno Norte Extensión', type: 'CAJAS' },
      { code: 'CAJ-043', name: 'Caja Fresno Sur Ampliación', type: 'CAJAS' },
      { code: 'MUF-009', name: 'Mufla Terciaria', type: 'MUFLAS' },
      { code: 'SPL-005', name: 'Splitter 1:32', type: 'SPLITTERS' },
      { code: 'CTO-004', name: 'CTO Nuevo Barrio', type: 'CTO' },
      { code: 'CAJ-044', name: 'Caja Vereda La Vega', type: 'CAJAS' },
    ],
    removed: [
      { code: 'CAJ-005', name: 'Caja Duplicada', type: 'CAJAS' },
      { code: 'MUF-003', name: 'Mufla Obsoleta', type: 'MUFLAS' },
    ],
    changed: [
      { code: 'CAJ-012', name: 'Caja Fresno Centro', type: 'CAJAS', change: 'Coordenadas corregidas' },
      { code: 'CAJ-018', name: 'Caja Fresno Oeste', type: 'CAJAS', change: 'Estado actualizado' },
      { code: 'MUF-001', name: 'Mufla Principal', type: 'MUFLAS', change: 'Capacidad actualizada' },
      { code: 'CTO-002', name: 'CTO Urbano', type: 'CTO', change: 'Relación corregida' },
    ],
  },
};

export default function BaselinesPage() {
  const [baselines] = useState<MunicipalityBaseline[]>(MOCK_BASELINES);
  const [fromVersion, setFromVersion] = useState('0.9');
  const [toVersion, setToVersion] = useState('1.0');
  const [showDiff, setShowDiff] = useState(false);

  const activeBaseline = baselines.find((b) => b.isActive);

  const handleCompare = () => {
    setShowDiff(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Línea Base — Fresno</h1>
          <p className="text-slate-500 mt-1">Gestión de baselines del municipio</p>
        </div>

        {activeBaseline && (
          <div className="bg-gradient-to-br from-interplay-500 to-interplay-700 rounded-xl p-6 text-white shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Baseline Activo — v{activeBaseline.version}</h2>
              <span className="px-3 py-1 text-xs bg-white/20 rounded-full font-medium">ACTIVE</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-white/70">Versión</p>
                <p className="text-xl font-bold">{activeBaseline.version}</p>
              </div>
              <div>
                <p className="text-sm text-white/70">Creado</p>
                <p className="text-xl font-bold">{activeBaseline.createdAt}</p>
              </div>
              <div>
                <p className="text-sm text-white/70">Activos</p>
                <p className="text-xl font-bold">{activeBaseline.totalAssets}</p>
              </div>
              <div>
                <p className="text-sm text-white/70">Segmentos</p>
                <p className="text-xl font-bold">{activeBaseline.totalSegments}</p>
              </div>
              <div>
                <p className="text-sm text-white/70">Relaciones</p>
                <p className="text-xl font-bold">{activeBaseline.totalRelations}</p>
              </div>
              <div>
                <p className="text-sm text-white/70">Calidad</p>
                <p className="text-xl font-bold">{activeBaseline.qualityScore}%</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Todas las líneas base</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Versión</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Fecha</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Activos</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Segmentos</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Relaciones</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Calidad</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {baselines.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 font-mono font-medium text-slate-900">v{b.version}</td>
                    <td className="px-3 py-3 text-slate-600">{b.createdAt}</td>
                    <td className="px-3 py-3 text-right text-slate-800">{b.totalAssets}</td>
                    <td className="px-3 py-3 text-right text-slate-800">{b.totalSegments}</td>
                    <td className="px-3 py-3 text-right text-slate-800">{b.totalRelations}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${b.qualityScore >= 80 ? 'bg-green-500' : b.qualityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${b.qualityScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500 w-8 text-right">{b.qualityScore}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {b.isActive ? 'Active' : 'Archive'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-4 px-4 py-2 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors">
            Crear nuevo baseline
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Comparar Baselines</h2>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
              <select
                value={fromVersion}
                onChange={(e) => { setFromVersion(e.target.value); setShowDiff(false); }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-interplay-400"
              >
                {baselines.map((b) => (
                  <option key={b.id} value={b.version}>{b.version} — {b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
              <select
                value={toVersion}
                onChange={(e) => { setToVersion(e.target.value); setShowDiff(false); }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-interplay-400"
              >
                {baselines.map((b) => (
                  <option key={b.id} value={b.version}>{b.version} — {b.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              className="px-4 py-2 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors"
            >
              Comparar
            </button>
          </div>

          {showDiff && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">+{MOCK_DIFF.assetsAdded}</p>
                  <p className="text-xs text-green-700 mt-1">Activos añadidos</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">-{MOCK_DIFF.assetsRemoved}</p>
                  <p className="text-xs text-red-700 mt-1">Activos eliminados</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{MOCK_DIFF.assetsChanged}</p>
                  <p className="text-xs text-amber-700 mt-1">Activos modificados</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">+{MOCK_DIFF.qualityChange}%</p>
                  <p className="text-xs text-blue-700 mt-1">Cambio de calidad</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-green-600 mb-3">Añadidos ({MOCK_DIFF.details.added.length})</h3>
                  <div className="space-y-2">
                    {MOCK_DIFF.details.added.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-green-50 px-3 py-2 rounded-lg">
                        <span className="font-mono text-green-700">{a.code}</span>
                        <span className="text-green-600">{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-600 mb-3">Eliminados ({MOCK_DIFF.details.removed.length})</h3>
                  <div className="space-y-2">
                    {MOCK_DIFF.details.removed.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-red-50 px-3 py-2 rounded-lg">
                        <span className="font-mono text-red-700">{a.code}</span>
                        <span className="text-red-600">{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-amber-600 mb-3">Modificados ({MOCK_DIFF.details.changed.length})</h3>
                  <div className="space-y-2">
                    {MOCK_DIFF.details.changed.map((a: any, i: number) => (
                      <div key={i} className="text-xs bg-amber-50 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-700">{a.code}</span>
                          <span className="text-amber-600">{a.name}</span>
                        </div>
                        <p className="text-amber-500 mt-0.5">{a.change}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
