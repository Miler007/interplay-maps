'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { OperationZeroChecklist } from '@interplay/shared';

const MOCK_CHECKLIST: OperationZeroChecklist = {
  phase1: { rawWhatsAppSaved: true, excelSaved: true, kmlSaved: true, batchCodeAssigned: true },
  phase2: { simulationRun: true, simulationReport: 'FRESNO-2026-001-sim.json', simulationApproved: false },
  phase3: { technicalReviewDone: false, reviewedBy: '', reviewDate: '', pendingIssues: 12 },
  phase4: { officialImportDone: false, baselineCreated: false, municipalityPublished: false },
  overallProgress: 35,
};

const PHASES = [
  { key: 'phase1', title: 'Fase 1 — Congelar datos', icon: '📦' },
  { key: 'phase2', title: 'Fase 2 — Simulación', icon: '🔄' },
  { key: 'phase3', title: 'Fase 3 — Revisión técnica', icon: '👥' },
  { key: 'phase4', title: 'Fase 4 — Importación oficial', icon: '🚀' },
] as const;

type PhaseKey = 'phase1' | 'phase2' | 'phase3' | 'phase4';

function phaseStatus(checklist: OperationZeroChecklist, key: PhaseKey): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' {
  if (key === 'phase1') {
    const p = checklist.phase1;
    return p.rawWhatsAppSaved && p.excelSaved && p.kmlSaved && p.batchCodeAssigned ? 'COMPLETED' : 'IN_PROGRESS';
  }
  if (key === 'phase2') {
    if (checklist.phase2.simulationApproved) return 'COMPLETED';
    if (checklist.phase2.simulationRun) return 'IN_PROGRESS';
    return 'PENDING';
  }
  if (key === 'phase3') {
    if (checklist.phase3.technicalReviewDone) return 'COMPLETED';
    if (checklist.phase3.reviewedBy) return 'IN_PROGRESS';
    return 'PENDING';
  }
  if (key === 'phase4') {
    if (checklist.phase4.municipalityPublished) return 'COMPLETED';
    if (checklist.phase4.officialImportDone) return 'IN_PROGRESS';
    return 'PENDING';
  }
  return 'PENDING';
}

const statusBadge: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-slate-100 text-slate-500',
};

const statusLabel: Record<string, string> = {
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN PROGRESS',
  PENDING: 'PENDING',
};

export default function OperationZeroPage() {
  const [checklist, setChecklist] = useState<OperationZeroChecklist>(MOCK_CHECKLIST);
  const [expanded, setExpanded] = useState<PhaseKey>('phase1');
  const [batchCode, setBatchCode] = useState('FRESNO-2026-001');
  const [reviewerName, setReviewerName] = useState('');
  const [simApproved, setSimApproved] = useState(false);
  const [techDone, setTechDone] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const togglePhase = (key: PhaseKey) => {
    setExpanded(expanded === key ? 'phase1' : key);
  };

  const handleRunSimulation = () => {
    setChecklist((prev) => ({
      ...prev,
      phase2: { ...prev.phase2, simulationRun: true },
      overallProgress: 50,
    }));
  };

  const handleApproveImport = () => {
    setChecklist((prev) => ({
      ...prev,
      phase2: { ...prev.phase2, simulationApproved: true },
      overallProgress: 60,
    }));
    setSimApproved(true);
  };

  const handleStartReview = () => {
    setChecklist((prev) => ({
      ...prev,
      phase3: { ...prev.phase3, reviewedBy: reviewerName || 'Usuario', reviewDate: new Date().toISOString() },
      overallProgress: 75,
    }));
  };

  const handleCompleteReview = () => {
    setChecklist((prev) => ({
      ...prev,
      phase3: { ...prev.phase3, technicalReviewDone: true },
      overallProgress: 85,
    }));
    setTechDone(true);
  };

  const handleExecuteImport = () => {
    setChecklist((prev) => ({
      ...prev,
      phase4: { ...prev.phase4, officialImportDone: true },
      overallProgress: 90,
    }));
  };

  const handleCreateBaseline = () => {
    setChecklist((prev) => ({
      ...prev,
      phase4: { ...prev.phase4, baselineCreated: true },
      overallProgress: 95,
    }));
  };

  const handlePublish = () => {
    setChecklist((prev) => ({
      ...prev,
      phase4: { ...prev.phase4, municipalityPublished: true },
      overallProgress: 100,
    }));
    setAllDone(true);
  };

  const getStatus = (key: PhaseKey) => phaseStatus(checklist, key);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operation Zero — Fresno</h1>
          <p className="text-slate-500 mt-1">Certificación del primer municipio</p>
        </div>

        {allDone && (
          <div className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-xl p-8 text-center shadow-lg">
            <div className="text-5xl mb-3">🎉🎊✨</div>
            <h2 className="text-2xl font-bold text-white">¡Fresno está certificado!</h2>
            <p className="text-green-50 mt-2">
              Baseline v1.0 creado — municipio publicado exitosamente
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase">Progreso general</h2>
            <span className="text-lg font-bold text-interplay-600">{checklist.overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-interplay-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${checklist.overallProgress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {PHASES.map((phase) => {
            const key = phase.key as PhaseKey;
            const status = getStatus(key);
            const isOpen = expanded === key;

            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                  onClick={() => togglePhase(key)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{phase.icon}</span>
                    <span className="text-lg font-semibold text-slate-900">{phase.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${statusBadge[status]}`}>
                      {statusLabel[status]}
                    </span>
                    <span className="text-slate-400 text-xl">{isOpen ? '▾' : '▸'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                    {key === 'phase1' && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">✅</span>
                            <span className="text-slate-700">WhatsApp original guardado (FRESNO-2026-001.txt)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">✅</span>
                            <span className="text-slate-700">Excel de inventario guardado</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">✅</span>
                            <span className="text-slate-700">KML existente respaldado</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">✅</span>
                            <span className="text-slate-700">Código de lote asignado: <span className="font-mono font-medium">{batchCode}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-slate-600">Batch code:</label>
                          <input
                            type="text"
                            value={batchCode}
                            onChange={(e) => setBatchCode(e.target.value)}
                            className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-interplay-400"
                          />
                        </div>
                      </>
                    )}

                    {key === 'phase2' && (
                      <>
                        {getStatus('phase2') === 'PENDING' && (
                          <button
                            onClick={handleRunSimulation}
                            className="px-4 py-2 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors"
                          >
                            Ejecutar simulación
                          </button>
                        )}
                        {checklist.phase2.simulationRun && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-900">62</p>
                                <p className="text-xs text-slate-500 mt-1">Activos detectados</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-900">38</p>
                                <p className="text-xs text-slate-500 mt-1">Relaciones</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-amber-600">4</p>
                                <p className="text-xs text-slate-500 mt-1">Duplicados</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-red-600">3</p>
                                <p className="text-xs text-slate-500 mt-1">Coordenadas inválidas</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-green-600">87%</p>
                                <p className="text-xs text-slate-500 mt-1">Confianza promedio</p>
                              </div>
                            </div>
                            {!simApproved && (
                              <button
                                onClick={handleApproveImport}
                                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              >
                                Aprobar importación
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {key === 'phase3' && (
                      <>
                        {getStatus('phase3') === 'PENDING' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <label className="text-sm font-medium text-slate-600">Revisor:</label>
                              <input
                                type="text"
                                value={reviewerName}
                                onChange={(e) => setReviewerName(e.target.value)}
                                placeholder="Nombre del revisor"
                                className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-interplay-400"
                              />
                            </div>
                            <button
                              onClick={handleStartReview}
                              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              Iniciar revisión técnica
                            </button>
                          </div>
                        )}
                        {(getStatus('phase3') === 'IN_PROGRESS' || getStatus('phase3') === 'COMPLETED') && (
                          <div className="space-y-3">
                            <p className="text-sm text-slate-600">Revisor: <span className="font-medium">{checklist.phase3.reviewedBy}</span></p>
                            <div className="space-y-2">
                              {[
                                '¿Esta caja realmente existe?',
                                '¿Esta relación es correcta?',
                                '¿La alimentación es la esperada?',
                                '¿Falta algún activo?',
                              ].map((q, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm bg-slate-50 px-4 py-3 rounded-lg">
                                  <span className="text-interplay-500 mt-0.5">•</span>
                                  <span className="text-slate-700">{q}</span>
                                </div>
                              ))}
                            </div>
                            {!techDone && (
                              <button
                                onClick={handleCompleteReview}
                                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              >
                                Revisión completada
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {key === 'phase4' && (
                      <div className="space-y-3">
                        {!checklist.phase4.officialImportDone && (
                          <button
                            onClick={handleExecuteImport}
                            className="px-4 py-2 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors"
                          >
                            Ejecutar importación
                          </button>
                        )}
                        {checklist.phase4.officialImportDone && !checklist.phase4.baselineCreated && (
                          <button
                            onClick={handleCreateBaseline}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Crear Baseline v1.0
                          </button>
                        )}
                        {checklist.phase4.baselineCreated && !checklist.phase4.municipalityPublished && (
                          <button
                            onClick={handlePublish}
                            className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Publicar municipio
                          </button>
                        )}
                        {allDone && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p className="text-green-700 font-medium">¡Fresno publicado exitosamente!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
