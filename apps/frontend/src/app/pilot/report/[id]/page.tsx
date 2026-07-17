'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useParams } from 'next/navigation';
import type { PilotClosureReport } from '@interplay/shared';
import Link from 'next/link';

function generateMockClosure(id: string): PilotClosureReport {
  return {
    municipalityName: 'Fresno',
    departmentName: 'Tolima',
    totalAssets: 62,
    initialQuality: 34,
    finalQuality: 87,
    correctionsMade: 18,
    newAssets: 7,
    retiredAssets: 3,
    photosAdded: 45,
    totalTimeSpentHours: 128,
    verifiedRelationships: 52,
    adoptionMetrics: {
      avgValidationTimeMin: 12,
      parserAccuracy: 0.92,
      falseDuplicates: 3,
      rejectedRelationships: 5,
    },
    recommendations: [
      'Completar la instalación de las cajas pendientes en la zona norte del municipio.',
      'Actualizar las coordenadas de los activos CAJ-012 y CAJ-023 que presentan valores inválidos.',
      'Agregar registro fotográfico a los 12 activos que aún no tienen fotografías asociadas.',
      'Revisar las relaciones topológicas de la mufla MUF-007 que se encuentra desconectada.',
      'Programar mantenimiento preventivo para los activos con más del 80% de ocupación.',
      'Capacitar al personal técnico en el uso de la herramienta de captura GPS móvil.',
    ],
    generatedAt: new Date().toISOString(),
  };
}

const MOCK_CORRECTIONS = [
  { code: 'CAJ-005', field: 'latitude', oldValue: '5.1500', newValue: '5.1505', reason: 'GPS corregido' },
  { code: 'MUF-002', field: 'status', oldValue: 'EN_CONSTRUCCION', newValue: 'ACTIVO', reason: 'Construcción finalizada' },
  { code: 'CAJ-008', field: 'name', oldValue: 'Caja F. Sur 1', newValue: 'Caja Fresno Sur', reason: 'Nombre normalizado' },
  { code: 'CTO-001', field: 'capacity', oldValue: '16', newValue: '32', reason: 'Ampliación de puertos' },
  { code: 'SPL-001', field: 'longitude', oldValue: '-75.0400', newValue: '-75.0369', reason: 'Coordenada precisa' },
  { code: 'CAJ-012', field: 'latitude', oldValue: '0', newValue: '5.1510', reason: 'Coordenada faltante' },
];

const MOCK_NEW_ASSETS = [
  { code: 'CAJ-048', name: 'Caja Fresno Nueva', type: 'CAJAS', status: 'ACTIVO' },
  { code: 'CAJ-049', name: 'Caja Fresno Ampliación', type: 'CAJAS', status: 'EN_CONSTRUCCION' },
  { code: 'MUF-009', name: 'Mufla Nuevo Sector', type: 'MUFLAS', status: 'ACTIVO' },
  { code: 'CTO-004', name: 'CTO Fresno Este', type: 'CTO', status: 'PENDIENTE_INSTALACION' },
  { code: 'SPL-003', name: 'Splitter Nueva Zona', type: 'SPLITTERS', status: 'ACTIVO' },
  { code: 'POST-002', name: 'Poste Fresno Norte', type: 'POSTES', status: 'ACTIVO' },
  { code: 'CAJ-050', name: 'Caja Fresno Industrial', type: 'CAJAS', status: 'EN_CONSTRUCCION' },
];

const MOCK_RETIRED_ASSETS = [
  { code: 'CAJ-010', name: 'Caja Fresno Obsoleta', type: 'CAJAS', reason: 'Reubicación' },
  { code: 'MUF-005', name: 'Mufla Dañada', type: 'MUFLAS', reason: 'Daño estructural' },
  { code: 'POST-003', name: 'Poste en Desuso', type: 'POSTES', reason: 'Fuera de servicio' },
];

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [report] = useState(() => generateMockClosure(id));

  const qualityChange = report.finalQuality - report.initialQuality;
  const qualityColor = qualityChange >= 0 ? 'text-green-600' : 'text-red-600';
  const qualityArrow = qualityChange >= 0 ? '↑' : '↓';

  const downloadPDF = () => {
    const lines = [
      `INFORME DE CIERRE — ${report.municipalityName}`,
      `Departamento: ${report.departmentName}`,
      `Generado: ${new Date(report.generatedAt).toLocaleString()}`,
      '',
      '=== RESUMEN ===',
      `Calidad inicial: ${report.initialQuality}%`,
      `Calidad final: ${report.finalQuality}%`,
      `Total activos: ${report.totalAssets}`,
      `Correcciones realizadas: ${report.correctionsMade}`,
      `Nuevos activos: ${report.newAssets}`,
      `Activos retirados: ${report.retiredAssets}`,
      `Fotografías agregadas: ${report.photosAdded}`,
      `Relaciones verificadas: ${report.verifiedRelationships}`,
      `Tiempo total: ${report.totalTimeSpentHours} horas`,
      '',
      '=== RECOMENDACIONES ===',
      ...report.recommendations.map((r, i) => `${i + 1}. ${r}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-cierre-${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const rows = [
      ['Código', 'Nombre', 'Tipo', 'Campo', 'Valor Anterior', 'Valor Nuevo', 'Razón'].join(','),
      ...MOCK_CORRECTIONS.map((c) => [c.code, c.field, c.oldValue, c.newValue, c.reason].join(',')),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correcciones-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Informe de Cierre — {report.municipalityName}</h1>
            <p className="text-slate-500 mt-1">{report.departmentName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadPDF} className="px-4 py-2 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors">
              Descargar PDF
            </button>
            <button onClick={downloadExcel} className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              Descargar Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:border-0 print:shadow-none print:p-0">
          <div className="text-center mb-8 print:mb-6">
            <h2 className="text-xl font-bold text-slate-900">INFORME DE CIERRE</h2>
            <p className="text-slate-500">Proyecto Piloto — Validación de Red FTTH</p>
            <p className="text-slate-400 text-sm mt-1">{report.municipalityName} · {report.departmentName}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Calidad Inicial</p>
              <p className="text-2xl font-bold text-slate-600">{report.initialQuality}%</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Calidad Final</p>
              <p className={`text-2xl font-bold ${report.finalQuality >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{report.finalQuality}%</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Variación</p>
              <p className={`text-2xl font-bold ${qualityColor}`}>{qualityArrow} {Math.abs(qualityChange)}%</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Total Activos</p>
              <p className="text-2xl font-bold text-slate-900">{report.totalAssets}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{report.correctionsMade}</p>
              <p className="text-xs text-slate-500">Correcciones realizadas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{report.newAssets}</p>
              <p className="text-xs text-slate-500">Nuevos activos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{report.retiredAssets}</p>
              <p className="text-xs text-slate-500">Activos retirados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{report.photosAdded}</p>
              <p className="text-xs text-slate-500">Fotografías agregadas</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Correcciones Realizadas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Código</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Campo</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Valor Anterior</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Valor Nuevo</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Razón</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CORRECTIONS.map((c, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-mono text-slate-700">{c.code}</td>
                      <td className="px-3 py-2 text-slate-600">{c.field}</td>
                      <td className="px-3 py-2 text-slate-500">{c.oldValue}</td>
                      <td className="px-3 py-2 text-green-700 font-medium">{c.newValue}</td>
                      <td className="px-3 py-2 text-slate-500">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Nuevos Activos Encontrados</h3>
              <div className="space-y-2">
                {MOCK_NEW_ASSETS.map((a) => (
                  <div key={a.code} className="flex items-center gap-3 bg-green-50 px-4 py-2.5 rounded-lg text-sm">
                    <span className="font-mono text-green-700">{a.code}</span>
                    <span className="text-green-800 flex-1">{a.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-200 text-green-800">{a.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Activos Retirados</h3>
              <div className="space-y-2">
                {MOCK_RETIRED_ASSETS.map((a) => (
                  <div key={a.code} className="flex items-center gap-3 bg-red-50 px-4 py-2.5 rounded-lg text-sm">
                    <span className="font-mono text-red-700">{a.code}</span>
                    <span className="text-red-800 flex-1">{a.name}</span>
                    <span className="text-xs text-red-600">{a.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Datos del Proceso</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500">Fotografías agregadas</p>
                <p className="text-lg font-bold text-slate-900">{report.photosAdded}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500">Relaciones verificadas</p>
                <p className="text-lg font-bold text-slate-900">{report.verifiedRelationships}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500">Tiempo total</p>
                <p className="text-lg font-bold text-slate-900">{report.totalTimeSpentHours} h</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500">Correcciones</p>
                <p className="text-lg font-bold text-slate-900">{report.correctionsMade}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Recomendaciones</h3>
            <ul className="space-y-2">
              {report.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-interplay-500 mt-0.5 shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center print:mt-6">
            Generado el {new Date(report.generatedAt).toLocaleString()} · Interplay Maps v1.0
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
