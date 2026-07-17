'use client';

import { useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { ExecutiveDashboard } from '@interplay/shared';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  ACTIVO: '#22c55e',
  EN_CONSTRUCCION: '#eab308',
  EN_MANTENIMIENTO: '#f97316',
  FUERA_DE_SERVICIO: '#ef4444',
  PENDIENTE_INSTALACION: '#3b82f6',
  RETIRADO: '#6b7280',
};

const capacityColors: Record<string, string> = {
  DISPONIBLE: '#22c55e',
  ADVERTENCIA: '#eab308',
  ALTA_OCUPACION: '#f97316',
  SIN_CAPACIDAD: '#ef4444',
};

const MOCK_EXEC_DASHBOARD: ExecutiveDashboard = {
  municipalities: 1,
  totalAssets: 62,
  activeAssets: 48,
  assetsByType: [
    { code: 'CAJAS', name: 'Cajas', count: 48 },
    { code: 'MUFLAS', name: 'Muflas', count: 8 },
    { code: 'CTO', name: 'CTO', count: 3 },
    { code: 'SPLITTERS', name: 'Splitters', count: 2 },
    { code: 'POSTES', name: 'Postes', count: 1 },
  ],
  assetsByStatus: [
    { status: 'ACTIVO', count: 40 },
    { status: 'EN_CONSTRUCCION', count: 8 },
    { status: 'EN_MANTENIMIENTO', count: 5 },
    { status: 'FUERA_DE_SERVICIO', count: 3 },
    { status: 'PENDIENTE_INSTALACION', count: 4 },
    { status: 'RETIRADO', count: 2 },
  ],
  capacitySummary: {
    totalPorts: 384,
    usedPorts: 297,
    freePorts: 87,
    saturatedAssets: 5,
  },
  coverage: {
    totalMunicipalities: 1,
    withCoverage: 1,
    avgCoveragePct: 73.4,
  },
  recentActivity: {
    assets: [
      { id: '1', code: 'CAJ-001', name: 'Caja Fresno Centro', type: 'CAJAS', departmentId: 'tolima', municipalityId: 'fresno', latitude: 5.1523, longitude: -75.0365, status: 'ACTIVO', confidenceScore: 0.95, createdAt: new Date(), updatedAt: new Date('2026-07-16T10:30:00'), photos: [] },
      { id: '2', code: 'CAJ-002', name: 'Caja Fresno Norte', type: 'CAJAS', departmentId: 'tolima', municipalityId: 'fresno', latitude: 5.1589, longitude: -75.0401, status: 'EN_CONSTRUCCION', confidenceScore: 0.88, createdAt: new Date(), updatedAt: new Date('2026-07-15T14:20:00'), photos: [] },
      { id: '3', code: 'MUF-001', name: 'Mufla Principal Fresno', type: 'MUFLAS', departmentId: 'tolima', municipalityId: 'fresno', latitude: 5.1531, longitude: -75.0372, status: 'ACTIVO', confidenceScore: 0.92, createdAt: new Date(), updatedAt: new Date('2026-07-14T08:00:00'), photos: [] },
      { id: '4', code: 'CTO-001', name: 'CTO Fresno Sur', type: 'CTO', departmentId: 'tolima', municipalityId: 'fresno', latitude: 5.1498, longitude: -75.0342, status: 'ACTIVO', confidenceScore: 0.97, createdAt: new Date(), updatedAt: new Date('2026-07-13T16:45:00'), photos: [] },
      { id: '5', code: 'CAJ-003', name: 'Caja Fresno Oriental', type: 'CAJAS', departmentId: 'tolima', municipalityId: 'fresno', latitude: 5.1555, longitude: -75.031, status: 'EN_MANTENIMIENTO', confidenceScore: 0.85, createdAt: new Date(), updatedAt: new Date('2026-07-12T11:10:00'), photos: [] },
    ],
    imports: [
      { id: 'imp-1', source: 'WHATSAPP', filename: 'whatsapp_export_20260710.txt', departmentId: 'tolima', municipalityId: 'fresno', assetType: 'CAJAS', totalRecords: 12, validRecords: 10, duplicateRecords: 1, pendingReview: 1, importedById: 'usr-1', createdAt: new Date('2026-07-10T09:00:00') },
      { id: 'imp-2', source: 'EXCEL', filename: 'inventario_fresno.xlsx', departmentId: 'tolima', municipalityId: 'fresno', assetType: 'MUFLAS', totalRecords: 5, validRecords: 5, duplicateRecords: 0, pendingReview: 0, importedById: 'usr-1', createdAt: new Date('2026-07-08T14:30:00') },
    ],
    timeline: [
      { version: 1, changeType: 'CREACION', changedById: 'usr-1', changes: { assetId: 'CAJ-001', action: 'create' }, snapshot: {}, createdAt: new Date('2026-07-10T09:05:00') },
      { version: 2, changeType: 'ACTUALIZACION', changedById: 'usr-1', changes: { assetId: 'CAJ-001', field: 'status', old: 'EN_CONSTRUCCION', new: 'ACTIVO' }, snapshot: {}, createdAt: new Date('2026-07-12T10:00:00') },
      { version: 3, changeType: 'IMPORTACION', changedById: 'usr-1', changes: { importId: 'imp-2', records: 5 }, snapshot: {}, createdAt: new Date('2026-07-08T14:35:00') },
    ],
  },
};

const saturatedAssets = [
  { code: 'CAJ-015', name: 'Caja Fresno Centro', occupancyPct: 94, status: 'ALTA_OCUPACION' },
  { code: 'CAJ-022', name: 'Caja Fresno Norte', occupancyPct: 88, status: 'ADVERTENCIA' },
  { code: 'MUF-003', name: 'Mufla Secundaria', occupancyPct: 100, status: 'SIN_CAPACIDAD' },
  { code: 'CAJ-008', name: 'Caja Fresno Sur', occupancyPct: 91, status: 'ALTA_OCUPACION' },
  { code: 'CTO-001', name: 'CTO Fresno Sur', occupancyPct: 76, status: 'ADVERTENCIA' },
];

const recentTimeline = [
  { action: 'Actualización CAJ-001', detail: 'Estado cambiado a ACTIVO', time: '2026-07-16 10:30' },
  { action: 'Importación WhatsApp', detail: '10 registros válidos', time: '2026-07-10 09:00' },
  { action: 'Creación CAJ-002', detail: 'Caja Fresno Norte', time: '2026-07-15 14:20' },
  { action: 'Actualización MUF-001', detail: 'Coordenadas corregidas', time: '2026-07-14 08:00' },
  { action: 'Importación Excel', detail: '5 muflas inventariadas', time: '2026-07-08 14:30' },
  { action: 'Creación CTO-001', detail: 'CTO Fresno Sur', time: '2026-07-13 16:45' },
  { action: 'CAJ-003 en mantenimiento', detail: 'Programado', time: '2026-07-12 11:10' },
  { action: 'Revisión de confianza', detail: 'CAJ-001 score 0.95', time: '2026-07-11 15:00' },
  { action: 'Carga masiva inicial', detail: '35 activos base', time: '2026-07-05 09:00' },
  { action: 'Proyecto Fresno creado', detail: 'Digital Twin FTTH', time: '2026-07-01 08:00' },
];

export default function ExecutiveDashboardPage() {
  const data = useMemo(() => MOCK_EXEC_DASHBOARD, []);

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
          <p className="text-slate-500 mt-1">Digital Twin — Red FTTH</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏛</span>
              <p className="text-sm text-slate-500 font-medium">Municipios</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.municipalities}</p>
            <p className="text-xs text-slate-400 mt-1">Departamento: Tolima</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📦</span>
              <p className="text-sm text-slate-500 font-medium">Activos</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.totalAssets}</p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-green-600 font-medium">{data.activeAssets}</span> activos
              {' / '}
              <span className="text-orange-600 font-medium">{data.totalAssets - data.activeAssets}</span> inactivos
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔌</span>
              <p className="text-sm text-slate-500 font-medium">Capacidad</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.capacitySummary.usedPorts}</p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-green-600 font-medium">{data.capacitySummary.freePorts}</span> libres
              {' / '}
              <span className="text-slate-600">{data.capacitySummary.totalPorts}</span> totales
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📍</span>
              <p className="text-sm text-slate-500 font-medium">Cobertura</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.coverage.avgCoveragePct}%</p>
            <p className="text-xs text-slate-400 mt-1">
              {data.coverage.withCoverage} de {data.coverage.totalMunicipalities} municipios cubiertos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Activos por Tipo</h2>
            <div className="space-y-3">
              {data.assetsByType.map((item) => (
                <div key={item.code}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="font-medium text-slate-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-interplay-500 h-2 rounded-full transition-all"
                      style={{ width: `${(item.count / maxTypeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Activos por Estado</h2>
            <div className="space-y-3">
              {data.assetsByStatus.map((item) => (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: statusColors[item.status] || '#6b7280' }}
                      />
                      <span className="text-slate-700">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <span className="font-medium text-slate-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(item.count / maxStatusCount) * 100}%`,
                        backgroundColor: statusColors[item.status] || '#6b7280',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Estado de Capacidad</h2>
            <div className="flex flex-col items-center">
              <div
                className="w-40 h-40 rounded-full mb-4"
                style={{ background: capacityPie }}
              />
              <div className="space-y-2 w-full">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: capacityColors.DISPONIBLE }} />
                    <span className="text-slate-700">Libres</span>
                  </span>
                  <span className="font-medium text-slate-900">{data.capacitySummary.freePorts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#ef4444' }} />
                    <span className="text-slate-700">Usados</span>
                  </span>
                  <span className="font-medium text-slate-900">{data.capacitySummary.usedPorts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: capacityColors.ALTA_OCUPACION }} />
                    <span className="text-slate-700">Saturados</span>
                  </span>
                  <span className="font-medium text-red-600">{data.capacitySummary.saturatedAssets}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Actividad Reciente</h2>
            <div className="space-y-3">
              {recentTimeline.slice(0, 10).map((entry, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-interplay-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{entry.action}</p>
                    <p className="text-xs text-slate-500">{entry.detail}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{entry.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Activos Saturados</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-2 py-2 text-xs font-medium text-slate-500 uppercase">Código</th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-slate-500 uppercase">Nombre</th>
                      <th className="text-right px-2 py-2 text-xs font-medium text-slate-500 uppercase">Ocupación</th>
                      <th className="text-right px-2 py-2 text-xs font-medium text-slate-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saturatedAssets.map((a) => (
                      <tr key={a.code} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-mono text-slate-600">{a.code}</td>
                        <td className="px-2 py-2 text-slate-800">{a.name}</td>
                        <td className="px-2 py-2 text-right">
                          <span className={`font-medium ${a.occupancyPct >= 100 ? 'text-red-600' : a.occupancyPct >= 90 ? 'text-orange-600' : 'text-yellow-600'}`}>
                            {a.occupancyPct}%
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span
                            className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
                            style={{ backgroundColor: capacityColors[a.status] || '#6b7280' }}
                          >
                            {a.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Accesos Rápidos</h2>
              <div className="grid grid-cols-3 gap-3">
                <Link
                  href="/reports"
                  className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg bg-slate-50 hover:bg-interplay-50 border border-slate-200 hover:border-interplay-300 transition-colors text-center"
                >
                  <span className="text-2xl">📊</span>
                  <span className="text-xs font-medium text-slate-700">Reportes</span>
                </Link>
                <Link
                  href="/mapa"
                  className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg bg-slate-50 hover:bg-interplay-50 border border-slate-200 hover:border-interplay-300 transition-colors text-center"
                >
                  <span className="text-2xl">🗺</span>
                  <span className="text-xs font-medium text-slate-700">Topología</span>
                </Link>
                <Link
                  href="/assets"
                  className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg bg-slate-50 hover:bg-interplay-50 border border-slate-200 hover:border-interplay-300 transition-colors text-center"
                >
                  <span className="text-2xl">✏️</span>
                  <span className="text-xs font-medium text-slate-700">Editor</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
