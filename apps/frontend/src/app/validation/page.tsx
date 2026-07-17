'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function ValidationPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit modal state
  const [editModal, setEditModal] = useState<{ id: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Merge modal state
  const [mergeModal, setMergeModal] = useState<{ id: string } | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');

  // Discard modal state
  const [discardModal, setDiscardModal] = useState<{ id: string } | null>(null);
  const [discardReason, setDiscardReason] = useState('');

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, statsData] = await Promise.all([
        api.validation.getQueue(filter || undefined),
        api.validation.getQueueStats(),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (action: string, ...args: any[]) => {
    if (!reviewerId) { alert('Ingresa un Reviewer ID primero'); return; }
    setActionLoading(action);
    try {
      switch (action) {
        case 'approve': await api.validation.approveQueue(args[0], reviewerId); break;
        case 'promote': await api.validation.promoteToAsset(args[0], reviewerId); break;
        case 'edit':
          await api.validation.editQueue(args[0], {
            name: args[1], latitude: args[2] ? parseFloat(args[2]) : undefined,
            longitude: args[3] ? parseFloat(args[3]) : undefined,
            notes: args[4], reviewerId,
          });
          break;
        case 'merge': await api.validation.mergeQueue(args[0], args[1], reviewerId); break;
        case 'discard': await api.validation.discardQueue(args[0], reviewerId, args[1] || undefined); break;
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Centro de Validación</h1>
            <p className="text-slate-500 mt-1">Registros que requieren revisión humana</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Reviewer ID:</label>
            <input
              type="text"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              placeholder="user-id"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-interplay-500"
            />
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Pendientes', value: stats.pendiente, color: 'text-amber-600 bg-amber-50' },
              { label: 'Aprobados', value: stats.aprobado, color: 'text-green-600 bg-green-50' },
              { label: 'Corregidos', value: stats.corregido, color: 'text-blue-600 bg-blue-50' },
              { label: 'Fusionados', value: stats.fusionado, color: 'text-purple-600 bg-purple-50' },
              { label: 'Rechazados', value: stats.rechazado, color: 'text-red-600 bg-red-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {['', 'PENDIENTE', 'APROBADO', 'CORREGIDO', 'FUSIONADO', 'RECHAZADO'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === status
                  ? 'bg-interplay-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status || 'Todos'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500">Cargando...</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-400">No hay registros en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        item.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                        item.status === 'APROBADO' ? 'bg-green-100 text-green-700' :
                        item.status === 'CORREGIDO' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'FUSIONADO' ? 'bg-purple-100 text-purple-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-400">{item.reason}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      Nombre: <span className="font-medium">{item.suggestedName || '—'}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Coordenadas: {item.suggestedLatitude?.toFixed(6)}, {item.suggestedLongitude?.toFixed(6) || '—'}
                    </p>
                    <p className="text-xs text-slate-400">Creado: {new Date(item.createdAt).toLocaleString()}</p>
                    <pre className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg max-h-24 overflow-y-auto">
                      {JSON.stringify(item.rawData, null, 2)}
                    </pre>
                  </div>
                  <div className="flex gap-2 flex-wrap ml-4">
                    <button onClick={() => doAction('approve', item.id)}
                      disabled={actionLoading === 'approve'}
                      className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                      Aprobar
                    </button>
                    <button onClick={() => { setEditModal({ id: item.id }); setEditName(item.suggestedName || ''); setEditLat(String(item.suggestedLatitude || '')); setEditLng(String(item.suggestedLongitude || '')); setEditNotes(item.notes || ''); }}
                      className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      Editar
                    </button>
                    <button onClick={() => { setMergeModal({ id: item.id }); setMergeTarget(''); }}
                      className="px-3 py-1.5 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                      Fusionar
                    </button>
                    <button onClick={() => { setDiscardModal({ id: item.id }); setDiscardReason(''); }}
                      className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">
                      Descartar
                    </button>
                    <button onClick={() => doAction('promote', item.id)}
                      disabled={actionLoading === 'promote'}
                      className="px-3 py-1.5 text-xs bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 disabled:opacity-50">
                      Promover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditModal(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Editar registro</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Nombre</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Latitud</label>
                    <input value={editLat} onChange={(e) => setEditLat(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Longitud</label>
                    <input value={editLng} onChange={(e) => setEditLng(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Notas</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditModal(null)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg">Cancelar</button>
                  <button onClick={() => { doAction('edit', editModal.id, editName, editLat, editLng, editNotes); setEditModal(null); }}
                    className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {mergeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMergeModal(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Fusionar con activo existente</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">ID del activo destino</label>
                  <input value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="asset-id..." />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setMergeModal(null)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg">Cancelar</button>
                  <button onClick={() => { doAction('merge', mergeModal.id, mergeTarget); setMergeModal(null); }}
                    className="flex-1 px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                    Fusionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {discardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDiscardModal(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Descartar registro</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Razón</label>
                  <textarea value={discardReason} onChange={(e) => setDiscardReason(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Opcional..." />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setDiscardModal(null)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg">Cancelar</button>
                  <button onClick={() => { doAction('discard', discardModal.id, discardReason); setDiscardModal(null); }}
                    className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
