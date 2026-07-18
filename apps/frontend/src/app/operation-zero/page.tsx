'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function OperationZeroPage() {
  const [stats, setStats] = useState({ cajas: 0, certificadas: 0, progreso: 45 });
  const [activePhase, setActivePhase] = useState<string | null>(null);

  useEffect(() => {
    api.integrity.checkAll().then((d: any) => {
      const total = d?.totales?.cajas || 0;
      const certificadas = d?.totales?.cajas || 0;
      const pct = total > 0 ? Math.round((certificadas / total) * 100) : 0;
      setStats({ cajas: total, certificadas, progreso: Math.min(pct + 45, 100) });
    }).catch(() => {});
  }, []);

  const phases = [
    { key: 'phase1', title: 'Fase 1 — Congelar datos', icon: '📦', done: true, items: ['WhatsApp export', 'CSV procesados', 'Código de lote FRESNO-2026-001'] },
    { key: 'phase2', title: 'Fase 2 — Importación', icon: '🔄', done: true, items: ['146 cajas importadas', '979 clientes importados', '24 relaciones', 'Baseline v1.0 creado'] },
    { key: 'phase3', title: 'Fase 3 — Revisión técnica', icon: '👥', done: false, items: [`${stats.cajas} cajas pendientes`, 'Corregir coordenadas', 'Tomar fotografías', 'Validar en campo'] },
    { key: 'phase4', title: 'Fase 4 — Publicación', icon: '🚀', done: stats.progreso >= 95, items: ['Certificar 95%+ activos', 'Publicar municipio', 'Generar LESSONS_LEARNED'] },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-slate-900">Operation Zero</h1>
      <p className="text-slate-500 mt-1">Certificación del municipio de Fresno</p>

      <div className="w-full h-3 bg-slate-200 rounded-full mt-4 mb-2 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${stats.progreso}%` }} />
      </div>
      <p className="text-xs text-slate-400 mb-6">{stats.progreso}% completado · {stats.cajas} cajas · {stats.certificadas} certificadas</p>

      <div className="space-y-3">
        {phases.map((phase) => (
          <div key={phase.key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button onClick={() => setActivePhase(activePhase === phase.key ? null : phase.key)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50">
              <span className="text-2xl">{phase.icon}</span>
              <div className="flex-1">
                <p className="font-semibold">{phase.title}</p>
                <p className="text-sm text-slate-500">{phase.done ? '✅ Completada' : '⏳ Pendiente'}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${phase.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{phase.done ? 'COMPLETADO' : 'EN PROGRESO'}</span>
            </button>
            {activePhase === phase.key && (
              <div className="px-4 pb-4 space-y-1">
                {phase.items.map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600 ml-12">
                    <span>•</span> {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
