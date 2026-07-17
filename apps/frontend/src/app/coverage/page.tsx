'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const MOCK_COVERAGE = {
  municipalities: {
    total: 1,
    withCoverage: 1,
    avgCoveragePct: 73.4,
    totalHomes: 2840,
    coveredHomes: 2085,
  },
  areas: [
    { id: 'cov-1', name: 'Casco Urbano Fresno', municipality: 'Fresno', totalHomes: 1200, coveredHomes: 1050, coveragePct: 87.5, status: 'AUTO_CALCULATED' },
    { id: 'cov-2', name: 'Vereda La Trinidad', municipality: 'Fresno', totalHomes: 450, coveredHomes: 320, coveragePct: 71.1, status: 'MANUAL' },
    { id: 'cov-3', name: 'Vereda El Retiro', municipality: 'Fresno', totalHomes: 380, coveredHomes: 210, coveragePct: 55.3, status: 'AUTO_CALCULATED' },
    { id: 'cov-4', name: 'Sector Centro', municipality: 'Fresno', totalHomes: 350, coveredHomes: 310, coveragePct: 88.6, status: 'AUTO_CALCULATED' },
    { id: 'cov-5', name: 'Vereda San Mateo', municipality: 'Fresno', totalHomes: 280, coveredHomes: 120, coveragePct: 42.9, status: 'MANUAL' },
    { id: 'cov-6', name: 'Sector Industrial', municipality: 'Fresno', totalHomes: 180, coveredHomes: 75, coveragePct: 41.7, status: 'AUTO_CALCULATED' },
  ],
  polygons: [
    { id: 'poly-1', name: 'Zona Centro', coveragePct: 88, color: '#22c55e' },
    { id: 'poly-2', name: 'Zona Norte', coveragePct: 71, color: '#eab308' },
    { id: 'poly-3', name: 'Zona Oriente', coveragePct: 55, color: '#eab308' },
    { id: 'poly-4', name: 'Zona Sur', coveragePct: 42, color: '#ef4444' },
    { id: 'poly-5', name: 'Zona Industrial', coveragePct: 41, color: '#ef4444' },
  ],
};

const MUNICIPALITIES = ['Fresno', 'Mariquita', 'Honda', 'Armero', 'Lérida'];

function coverageColor(pct: number): string {
  if (pct >= 80) return 'text-green-600';
  if (pct >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function coverageBg(pct: number): string {
  if (pct >= 80) return 'bg-green-100 text-green-700';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function coverageBarColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function CoveragePage() {
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [coverage] = useState(MOCK_COVERAGE);

  const handleRecalculate = async () => {
    if (!selectedMunicipality) return;
    setCalculating(true);
    await new Promise((r) => setTimeout(r, 1500));
    setCalculating(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cobertura de Red</h1>
          <p className="text-slate-500 mt-1">Monitoreo de cobertura FTTH por municipio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Municipios</p>
            <p className="text-3xl font-bold text-slate-900">{coverage.municipalities.total}</p>
            <p className="text-xs text-slate-400 mt-1">{coverage.municipalities.withCoverage} con cobertura</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Cobertura Promedio</p>
            <p className="text-3xl font-bold text-slate-900">{coverage.municipalities.avgCoveragePct}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Hogares Totales</p>
            <p className="text-3xl font-bold text-slate-900">{coverage.municipalities.totalHomes.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Hogares Cubiertos</p>
            <p className="text-3xl font-bold text-green-600">{coverage.municipalities.coveredHomes.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Municipio</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Hogares Totales</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Cubiertos</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Cobertura</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.areas.map((area) => (
                    <tr key={area.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{area.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{area.municipality}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{area.totalHomes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{area.coveredHomes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium ${coverageColor(area.coveragePct)}`}>
                          {area.coveragePct}%
                        </span>
                        <div className="w-24 ml-auto mt-1 bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${coverageBarColor(area.coveragePct)}`} style={{ width: `${area.coveragePct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          area.status === 'AUTO_CALCULATED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {area.status === 'AUTO_CALCULATED' ? 'Automático' : 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-4">
                <select
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                >
                  <option value="">Seleccionar municipio</option>
                  {MUNICIPALITIES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button
                  onClick={handleRecalculate}
                  disabled={!selectedMunicipality || calculating}
                  className="bg-interplay-600 hover:bg-interplay-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  {calculating ? 'Calculando...' : 'Recalcular Cobertura'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Mapa de Cobertura</h2>
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="text-4xl mb-2">🗺</div>
                <p className="text-sm font-medium">Mapa de Cobertura</p>
                <p className="text-xs mt-1">Visualización de polígonos de cobertura</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Leyenda</h2>
              <div className="space-y-3">
                {coverage.polygons.map((poly) => (
                  <div key={poly.id} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: poly.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{poly.name}</p>
                    </div>
                    <span className={`text-xs font-medium ${coverageColor(poly.coveragePct)}`}>
                      {poly.coveragePct}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span>&gt;80%</span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500 ml-2" />
                  <span>&gt;50%</span>
                  <span className="w-3 h-3 rounded-full bg-red-500 ml-2" />
                  <span>&lt;50%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
