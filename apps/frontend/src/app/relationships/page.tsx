'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const RELATION_TYPES = ['ALIMENTADO_POR', 'ALIMENTA_A', 'CONECTADO_A', 'ENLACE_FIBRA', 'DEPENDE_DE'];

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assetFilter, setAssetFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ sourceAssetId: '', targetAssetId: '', relationType: RELATION_TYPES[0], description: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadRelationships = async () => {
    setLoading(true);
    try {
      const data = assetFilter
        ? await api.relationships.getByAsset(assetFilter)
        : await api.relationships.analyze().then((r: any) => r.edges || []).catch(() => []);
      setRelationships(data);
    } finally { setLoading(false); }
  };

  const loadAnalysis = async () => {
    try {
      const data = await api.relationships.analyze();
      setAnalysis(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadRelationships(); loadAnalysis(); }, [assetFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.relationships.create(form);
      setForm({ sourceAssetId: '', targetAssetId: '', relationType: RELATION_TYPES[0], description: '' });
      loadRelationships();
      loadAnalysis();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta relación?')) return;
    await api.relationships.delete(id);
    loadRelationships();
    loadAnalysis();
  };

  const filtered = relationships.filter((r) => (typeFilter ? r.relationType === typeFilter : true));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relaciones</h1>
          <p className="text-slate-500 mt-1">Conexiones entre activos de red</p>
        </div>

        {analysis && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Nodos</p>
              <p className="text-2xl font-bold text-slate-900">{analysis.nodeCount || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Aristas</p>
              <p className="text-2xl font-bold text-slate-900">{analysis.edgeCount || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Densidad</p>
              <p className="text-2xl font-bold text-slate-900">{analysis.density?.toFixed(4) || '—'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Filtrar por ID de activo..." value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500">
                <option value="">Todos los tipos</option>
                {RELATION_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>

            {loading ? <p className="text-slate-500">Cargando relaciones...</p> : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Origen</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Destino</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Descripción</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No hay relaciones que mostrar</td></tr>
                    ) : filtered.map((rel) => (
                      <tr key={rel.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{rel.sourceAsset?.code || rel.sourceAssetId}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{rel.targetAsset?.code || rel.targetAssetId}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs rounded-full bg-interplay-100 text-interplay-700 font-medium">{rel.relationType}</span></td>
                        <td className="px-4 py-3 text-sm text-slate-600">{rel.description || '—'}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(rel.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nueva Relación</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Activo origen (ID)</label>
                <input type="text" required value={form.sourceAssetId} onChange={(e) => setForm({ ...form, sourceAssetId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Activo destino (ID)</label>
                <input type="text" required value={form.targetAssetId} onChange={(e) => setForm({ ...form, targetAssetId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de relación</label>
                <select value={form.relationType} onChange={(e) => setForm({ ...form, relationType: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500">
                  {RELATION_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500 resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-interplay-600 hover:bg-interplay-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                {submitting ? 'Creando...' : 'Crear Relación'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
