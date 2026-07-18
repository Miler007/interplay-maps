'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function BaselinesPage() {
  const [baselines, setBaselines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.baselines.list('e4ff7e38-cd79-452c-a1d3-370d7080adb4')
      .then(setBaselines).catch(() => setBaselines([])).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-slate-900">Baselines</h1>
      <p className="text-slate-500 mt-1">Versiones congeladas del municipio</p>
      {loading ? <p className="text-slate-400 text-sm mt-4">Cargando...</p> : baselines.length === 0 ? (
        <p className="text-slate-400 text-sm mt-4">No hay baselines registrados. El baseline v1.0 de Fresno fue creado vía SQL.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {baselines.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold">{b.label || `Baseline ${b.version}`}</p>
                <p className="text-sm text-slate-500">v{b.version} · {b.totalAssets} activos · {b.qualityScore}% calidad</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{b.isActive ? 'Activo' : 'Inactivo'}</span>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
