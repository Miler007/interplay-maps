'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.audit.getAll().then((res) => setLogs(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auditoría</h1>
          <p className="text-slate-500 mt-1">Registro de todas las acciones del sistema</p>
        </div>

        {loading ? (
          <p className="text-slate-500">Cargando...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Entidad</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">ID</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.entityType}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{log.entityId || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 text-right">
                      {new Date(log.createdAt).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
