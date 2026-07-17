'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadAssets();
  }, [filter]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter) params.type = filter;
      const result = await api.assets.getAll(params);
      setAssets(result.data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este activo?')) return;
    await api.assets.delete(id);
    loadAssets();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Activos</h1>
            <p className="text-slate-500 mt-1">Gestión de cajas, muflas y más</p>
          </div>
          <a
            href="/import"
            className="bg-interplay-600 hover:bg-interplay-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Importar
          </a>
        </div>

        <div className="flex gap-2">
          {['', 'MUFLAS', 'CAJAS', 'CTO', 'SPLITTERS', 'POSTES', 'NODOS'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === type
                  ? 'bg-interplay-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type || 'Todos'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500">Cargando activos...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Municipio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Confianza</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{asset.code}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{asset.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-interplay-100 text-interplay-700 font-medium">
                        {asset.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{asset.municipality?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        asset.status === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-interplay-500 h-1.5 rounded-full"
                            style={{ width: `${asset.confidenceScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{asset.confidenceScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Eliminar
                      </button>
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
