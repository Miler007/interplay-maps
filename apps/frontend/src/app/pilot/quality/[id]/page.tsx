'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { DataQualityReport, BulkOperation, CertificationStatus } from '@interplay/shared';

const certStatusLabels: Record<CertificationStatus, string> = {
  PENDIENTE: 'Pendiente',
  VALIDADO: 'Validado',
  CERTIFICADO: 'Certificado',
  HISTORICO: 'Histórico',
};

const certStatusColors: Record<CertificationStatus, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  VALIDADO: 'bg-blue-100 text-blue-700',
  CERTIFICADO: 'bg-green-100 text-green-700',
  HISTORICO: 'bg-purple-100 text-purple-700',
};

function generateMockQuality(id: string): DataQualityReport {
  return {
    municipalityId: id,
    municipalityName: 'Fresno',
    departmentName: 'Tolima',
    pilotStatus: 'EN_VALIDACION',
    qualityScore: 68,
    totalAssets: 62,
    validatedAssets: 34,
    certifiedAssets: 12,
    pendingAssets: 28,
    byStatus: [
      { status: 'ACTIVO', count: 40 },
      { status: 'EN_CONSTRUCCION', count: 8 },
      { status: 'EN_MANTENIMIENTO', count: 5 },
      { status: 'FUERA_DE_SERVICIO', count: 3 },
      { status: 'PENDIENTE_INSTALACION', count: 4 },
      { status: 'RETIRADO', count: 2 },
    ],
    byCertStatus: [
      { certStatus: 'PENDIENTE', count: 28 },
      { certStatus: 'VALIDADO', count: 22 },
      { certStatus: 'CERTIFICADO', count: 12 },
      { certStatus: 'HISTORICO', count: 0 },
    ],
    byType: [
      { type: 'CAJAS', count: 48 },
      { type: 'MUFLAS', count: 8 },
      { type: 'CTO', count: 3 },
      { type: 'SPLITTERS', count: 2 },
      { type: 'POSTES', count: 1 },
    ],
    invalidCoords: 7,
    duplicates: 2,
    orphans: 3,
    incompleteRelationships: 5,
    withoutPhotos: 12,
    coverage: {
      photos: 72,
      coordinates: 85,
      relationships: 65,
      verified: 55,
    },
    adoptionMetrics: {
      avgValidationTimeMin: 12,
      parserAccuracy: 0.92,
      falseDuplicates: 3,
      rejectedRelationships: 5,
      manualCorrections: 18,
      avgImportTimeMin: 45,
    },
    generatedAt: new Date().toISOString(),
  };
}

const MOCK_ISSUES = {
  invalidCoords: [
    { code: 'CAJ-012', name: 'Caja Fresno Este', lat: 0, lng: 0 },
    { code: 'CAJ-023', name: 'Caja Fresno Oeste', lat: 90.1, lng: -75.04 },
    { code: 'MUF-004', name: 'Mufla Secundaria', lat: 5.15, lng: 200 },
  ],
  orphans: [
    { code: 'CAJ-031', name: 'Caja Sin Conexión', type: 'CAJAS' },
    { code: 'MUF-007', name: 'Muflal Aislada', type: 'MUFLAS' },
    { code: 'CTO-003', name: 'CTO Desconectado', type: 'CTO' },
  ],
  noPhotos: [
    { code: 'CAJ-015', name: 'Caja Fresno Norte' },
    { code: 'CAJ-019', name: 'Caja Fresno Sur' },
    { code: 'MUF-002', name: 'Mufla Principal' },
    { code: 'CTO-001', name: 'CTO Fresno Centro' },
  ],
};

export default function QualityPage() {
  const params = useParams();
  const id = params.id as string;
  const [data] = useState(() => generateMockQuality(id));
  const [bulkModal, setBulkModal] = useState(false);
  const [publishWarning, setPublishWarning] = useState(false);

  const qualityColor = data.qualityScore >= 80 ? 'text-green-600' : data.qualityScore >= 50 ? 'text-yellow-600' : 'text-red-600';
  const qualityBg = data.qualityScore >= 80 ? 'stroke-green-500' : data.qualityScore >= 50 ? 'stroke-yellow-500' : 'stroke-red-500';

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (data.qualityScore / 100) * circumference;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.municipalityName}</h1>
            <p className="text-slate-500 mt-1">
              Reporte de Calidad de Datos · {data.departmentName}
              <span className={`ml-2 text-lg font-bold ${qualityColor}`}>— {data.qualityScore}%</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Calidad General</h2>
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke={data.qualityScore >= 80 ? '#22c55e' : data.qualityScore >= 50 ? '#eab308' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <p className={`text-4xl font-bold mt-4 ${qualityColor}`}>{data.qualityScore}%</p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium mb-1">Cobertura de Fotografías</p>
              <p className="text-3xl font-bold text-slate-900">{data.coverage.photos}%</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div className="bg-interplay-500 h-2 rounded-full" style={{ width: `${data.coverage.photos}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium mb-1">Coordenadas Válidas</p>
              <p className="text-3xl font-bold text-slate-900">{data.coverage.coordinates}%</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div className="bg-interplay-500 h-2 rounded-full" style={{ width: `${data.coverage.coordinates}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium mb-1">Relaciones Verificadas</p>
              <p className="text-3xl font-bold text-slate-900">{data.coverage.relationships}%</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div className="bg-interplay-500 h-2 rounded-full" style={{ width: `${data.coverage.relationships}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium mb-1">Activos Certificados</p>
              <p className="text-3xl font-bold text-slate-900">{data.coverage.verified}%</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div className="bg-interplay-500 h-2 rounded-full" style={{ width: `${data.coverage.verified}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Por Estado del Activo</h2>
            <div className="space-y-3">
              {data.byStatus.map((s) => (
                <div key={s.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{s.status.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-slate-900">{s.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-interplay-400 h-2 rounded-full" style={{ width: `${(s.count / Math.max(...data.byStatus.map((x) => x.count), 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Por Certificación</h2>
            <div className="space-y-3">
              {data.byCertStatus.map((s) => (
                <div key={s.certStatus}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${certStatusColors[s.certStatus]}`}>
                      {certStatusLabels[s.certStatus]}
                    </span>
                    <span className="font-medium text-slate-900">{s.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${s.certStatus === 'CERTIFICADO' ? 'bg-green-500' : s.certStatus === 'VALIDADO' ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${(s.count / Math.max(...data.byCertStatus.map((x) => x.count), 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Por Tipo de Activo</h2>
            <div className="space-y-3">
              {data.byType.map((t) => (
                <div key={t.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{t.type}</span>
                    <span className="font-medium text-slate-900">{t.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-interplay-500 h-2 rounded-full" style={{ width: `${(t.count / Math.max(...data.byType.map((x) => x.count), 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Incidencias</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-3">Coordenadas Inválidas ({data.invalidCoords})</h3>
              <div className="space-y-2">
                {MOCK_ISSUES.invalidCoords.map((a) => (
                  <div key={a.code} className="flex items-center gap-2 text-xs bg-red-50 px-3 py-2 rounded-lg">
                    <span className="font-mono text-red-700">{a.code}</span>
                    <span className="text-red-600">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-orange-600 mb-3">Activos Huérfanos ({data.orphans})</h3>
              <div className="space-y-2">
                {MOCK_ISSUES.orphans.map((a) => (
                  <div key={a.code} className="flex items-center gap-2 text-xs bg-orange-50 px-3 py-2 rounded-lg">
                    <span className="font-mono text-orange-700">{a.code}</span>
                    <span className="text-orange-600">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-600 mb-3">Sin Fotografías ({data.withoutPhotos})</h3>
              <div className="space-y-2">
                {MOCK_ISSUES.noPhotos.map((a) => (
                  <div key={a.code} className="flex items-center gap-2 text-xs bg-amber-50 px-3 py-2 rounded-lg">
                    <span className="font-mono text-amber-700">{a.code}</span>
                    <span className="text-amber-600">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors">
            Recalcular calidad
          </button>
          <button
            onClick={() => setBulkModal(true)}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Ejecutar validación masiva
          </button>
          <button
            onClick={() => setPublishWarning(true)}
            className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Publicar municipio
          </button>
          <Link
            href={`/pilot/report/${id}`}
            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Ver informe de cierre
          </Link>
        </div>

        {bulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBulkModal(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Validación Masiva</h3>
              <div className="space-y-3">
                {[
                  { type: 'APPROVE', label: 'Aprobar todos los pendientes' },
                  { type: 'CERTIFY', label: 'Certificar todos los validados' },
                  { type: 'REGENERATE_TOPOLOGY', label: 'Regenerar topología' },
                  { type: 'RECALCULATE_HEALTH', label: 'Recalcular health score' },
                  { type: 'RECALCULATE_CONFIDENCE', label: 'Recalcular confidence score' },
                ].map((op) => (
                  <button
                    key={op.type}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-interplay-400 hover:bg-interplay-50 transition-colors text-sm font-medium text-slate-700"
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setBulkModal(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg">
                  Cancelar
                </button>
                <button onClick={() => { setBulkModal(false); alert('Operación masiva ejecutada (mock)'); }} className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Ejecutar
                </button>
              </div>
            </div>
          </div>
        )}

        {publishWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPublishWarning(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Publicar Municipio</h3>
              {data.qualityScore < 95 ? (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-700 font-medium">Advertencia: La calidad actual ({data.qualityScore}%) es inferior al 95% requerido.</p>
                    <p className="text-xs text-red-600 mt-1">Se recomienda completar la validación y certificación antes de publicar.</p>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">¿Desea publicar de todas formas?</p>
                </>
              ) : (
                <p className="text-sm text-slate-600 mb-4">La calidad cumple con el mínimo requerido. ¿Confirmar publicación?</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setPublishWarning(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg">
                  Cancelar
                </button>
                <button onClick={() => { setPublishWarning(false); alert('Municipio publicado (mock)'); }} className="flex-1 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600">
                  Publicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
