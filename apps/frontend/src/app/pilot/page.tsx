'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { PilotStatus } from '@interplay/shared';
import Link from 'next/link';

const MOCK_PILOTS = [
  { municipalityId: 'm1', municipalityName: 'Fresno', departmentName: 'Tolima', pilotStatus: 'EN_VALIDACION' as const, totalAssets: 62, validatedAssets: 34, certifiedAssets: 12, qualityScore: 68 },
  { municipalityId: 'm2', municipalityName: 'Mariquita', departmentName: 'Tolima', pilotStatus: 'EN_PREPARACION' as const, totalAssets: 45, validatedAssets: 0, certifiedAssets: 0, qualityScore: 0 },
  { municipalityId: 'm3', municipalityName: 'Herveo', departmentName: 'Tolima', pilotStatus: 'EN_CERTIFICACION' as const, totalAssets: 38, validatedAssets: 38, certifiedAssets: 30, qualityScore: 87 },
  { municipalityId: 'm4', municipalityName: 'Casabianca', departmentName: 'Tolima', pilotStatus: 'PUBLICADO' as const, totalAssets: 55, validatedAssets: 55, certifiedAssets: 55, qualityScore: 96 },
  { municipalityId: 'm5', municipalityName: 'Villahermosa', departmentName: 'Tolima', pilotStatus: 'HISTORICO' as const, totalAssets: 41, validatedAssets: 41, certifiedAssets: 41, qualityScore: 93 },
];

const MOCK_QUICK_STATS = {
  noCoords: 7,
  orphans: 3,
  noPhotos: 12,
  incompleteRelationships: 5,
};

const pilotStatusStyles: Record<PilotStatus, string> = {
  EN_PREPARACION: 'bg-slate-100 text-slate-700',
  EN_VALIDACION: 'bg-amber-100 text-amber-700',
  EN_CERTIFICACION: 'bg-blue-100 text-blue-700',
  PUBLICADO: 'bg-green-100 text-green-700',
  HISTORICO: 'bg-purple-100 text-purple-700',
};

const pilotStatusLabels: Record<PilotStatus, string> = {
  EN_PREPARACION: 'En Preparación',
  EN_VALIDACION: 'En Validación',
  EN_CERTIFICACION: 'En Certificación',
  PUBLICADO: 'Publicado',
  HISTORICO: 'Histórico',
};

export default function PilotPage() {
  const [pilots] = useState(MOCK_PILOTS);
  const quickStats = useMemo(() => MOCK_QUICK_STATS, []);

  const municipalitiesInPilot = pilots.length;
  const totalAssets = pilots.reduce((s, p) => s + p.totalAssets, 0);
  const avgQuality = Math.round(pilots.reduce((s, p) => s + p.qualityScore, 0) / pilots.length);
  const pendingToValidate = pilots.reduce((s, p) => s + (p.totalAssets - p.validatedAssets), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proyecto Piloto — Validación de Red</h1>
          <p className="text-slate-500 mt-1">Gestión técnica del piloto FTTH</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏛</span>
              <p className="text-sm text-slate-500 font-medium">Municipios en piloto</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{municipalitiesInPilot}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📦</span>
              <p className="text-sm text-slate-500 font-medium">Activos totales</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalAssets}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⭐</span>
              <p className="text-sm text-slate-500 font-medium">Certificación promedio</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{avgQuality}%</p>
            <p className="text-xs text-slate-400 mt-1">calidad general del piloto</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⏳</span>
              <p className="text-sm text-slate-500 font-medium">Pendientes por validar</p>
            </div>
            <p className="text-3xl font-bold text-amber-600">{pendingToValidate}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Municipios</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Municipio</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Dpto</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Activos</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Validados</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Certificados</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Calidad</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pilots.map((p) => (
                  <tr key={p.municipalityId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-900">{p.municipalityName}</td>
                    <td className="px-3 py-3 text-slate-600">{p.departmentName}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${pilotStatusStyles[p.pilotStatus]}`}>
                        {pilotStatusLabels[p.pilotStatus]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-800">{p.totalAssets}</td>
                    <td className="px-3 py-3 text-right text-slate-800">{p.validatedAssets}</td>
                    <td className="px-3 py-3 text-right text-slate-800">{p.certifiedAssets}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${p.qualityScore >= 80 ? 'bg-green-500' : p.qualityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${p.qualityScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500 w-8 text-right">{p.qualityScore}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/pilot/quality/${p.municipalityId}`}
                          className="px-2.5 py-1 text-xs bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors"
                        >
                          Ver calidad
                        </Link>
                        <button className="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                          Gestionar
                        </button>
                        {p.qualityScore >= 95 && (
                          <button className="px-2.5 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                            Publicar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Estadísticas Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{quickStats.noCoords}</p>
              <p className="text-xs text-red-700 mt-1">Activos sin coordenadas</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{quickStats.orphans}</p>
              <p className="text-xs text-orange-700 mt-1">Activos huérfanos</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{quickStats.noPhotos}</p>
              <p className="text-xs text-amber-700 mt-1">Sin fotografías</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{quickStats.incompleteRelationships}</p>
              <p className="text-xs text-blue-700 mt-1">Relaciones incompletas</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
