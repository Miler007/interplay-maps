'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatusDot, STATUS_COLORS } from '../components';
import type { Asset, NetworkSegment, SegmentType } from '@interplay/shared';

const SEGMENT_TYPES: SegmentType[] = ['CABLE_TRONCAL', 'CABLE_DISTRIBUCION', 'DROP', 'ENLACE', 'DERIVACION'];

const SEGMENT_TYPE_COLORS: Record<SegmentType, string> = {
  CABLE_TRONCAL: 'border-blue-400 bg-blue-50',
  CABLE_DISTRIBUCION: 'border-emerald-400 bg-emerald-50',
  DROP: 'border-amber-400 bg-amber-50',
  ENLACE: 'border-purple-400 bg-purple-50',
  DERIVACION: 'border-rose-400 bg-rose-50',
};

const MOCK_ASSETS: Asset[] = [
  { id: 'a1', code: 'OLT-001', name: 'OLT Principal', type: 'NODOS', status: 'ACTIVO', confidenceScore: 98, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
  { id: 'a2', code: 'CAJ-001', name: 'Caja Principal NORTE', type: 'CAJAS', status: 'ACTIVO', confidenceScore: 92, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
  { id: 'a3', code: 'CAJ-002', name: 'Caja Principal SUR', type: 'CAJAS', status: 'ACTIVO', confidenceScore: 88, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
  { id: 'a4', code: 'CTO-001', name: 'CTO Edificio A', type: 'CTO', status: 'EN_CONSTRUCCION', confidenceScore: 65, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
  { id: 'a5', code: 'CTO-002', name: 'CTO Edificio B', type: 'CTO', status: 'PENDIENTE_INSTALACION', confidenceScore: 30, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
  { id: 'a6', code: 'SPL-001', name: 'Splitter 1:8', type: 'SPLITTERS', status: 'ACTIVO', confidenceScore: 90, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
  { id: 'a7', code: 'MUF-001', name: 'Mufla Troncal 1', type: 'MUFLAS', status: 'ACTIVO', confidenceScore: 82, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
  { id: 'a8', code: 'POS-001', name: 'Poste Principal', type: 'POSTES', status: 'FUERA_DE_SERVICIO', confidenceScore: 45, departmentId: 'd1', municipalityId: 'm1', latitude: 0, longitude: 0, createdAt: new Date(), updatedAt: new Date(), photos: [], department: { id: 'd1', name: 'Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] }, municipality: { id: 'm1', name: 'Ciudad', departmentId: 'd1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] } },
];

let mockSegments: NetworkSegment[] = [
  { id: 's1', code: 'SEG-TRC-001', name: 'Troncal OLT-CAJ', segmentType: 'CABLE_TRONCAL', sourceAssetId: 'a1', targetAssetId: 'a2', fiberCount: 48, fiberColor: 'Azul', status: 'ACTIVO', departmentId: 'd1', municipalityId: 'm1', createdAt: new Date(), updatedAt: new Date() },
  { id: 's2', code: 'SEG-DST-001', name: 'Distribución CAJ-CTO', segmentType: 'CABLE_DISTRIBUCION', sourceAssetId: 'a2', targetAssetId: 'a4', fiberCount: 24, fiberColor: 'Rojo', status: 'ACTIVO', departmentId: 'd1', municipalityId: 'm1', createdAt: new Date(), updatedAt: new Date() },
  { id: 's3', code: 'SEG-DRP-001', name: 'Drop A', segmentType: 'DROP', sourceAssetId: 'a4', targetAssetId: 'a6', fiberCount: 2, fiberColor: 'Verde', status: 'ACTIVO', departmentId: 'd1', municipalityId: 'm1', createdAt: new Date(), updatedAt: new Date() },
];

function fetchAssets(): Promise<Asset[]> {
  return new Promise((resolve) => setTimeout(() => resolve([...MOCK_ASSETS]), 200));
}

function fetchSegments(): Promise<NetworkSegment[]> {
  return new Promise((resolve) => setTimeout(() => resolve([...mockSegments]), 200));
}

function createSegment(data: { sourceAssetId: string; targetAssetId: string; segmentType: SegmentType; fiberCount?: number; fiberColor?: string }): Promise<NetworkSegment> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const seg: NetworkSegment = {
        id: `s-${Date.now()}`,
        code: `SEG-${data.segmentType.substring(0, 3)}-${String(mockSegments.length + 1).padStart(3, '0')}`,
        name: `${data.segmentType.replace(/_/g, ' ')} ${mockSegments.length + 1}`,
        segmentType: data.segmentType,
        sourceAssetId: data.sourceAssetId,
        targetAssetId: data.targetAssetId,
        fiberCount: data.fiberCount,
        fiberColor: data.fiberColor,
        status: 'ACTIVO',
        departmentId: 'd1',
        municipalityId: 'm1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSegments = [...mockSegments, seg];
      resolve(seg);
    }, 300);
  });
}

function updateSegment(id: string, data: Partial<NetworkSegment>): Promise<NetworkSegment> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const idx = mockSegments.findIndex((s) => s.id === id);
      if (idx === -1) { reject(new Error('Segmento no encontrado')); return; }
      mockSegments[idx] = { ...mockSegments[idx], ...data, updatedAt: new Date() };
      resolve(mockSegments[idx]);
    }, 300);
  });
}

function deleteSegment(id: string): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockSegments = mockSegments.filter((s) => s.id !== id);
      resolve();
    }, 200);
  });
}

export default function TopologyEditorPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [segments, setSegments] = useState<NetworkSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetSearch, setAssetSearch] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [segmentType, setSegmentType] = useState<SegmentType>('CABLE_DISTRIBUCION');
  const [fiberCount, setFiberCount] = useState('12');
  const [fiberColor, setFiberColor] = useState('');
  const [editingSegment, setEditingSegment] = useState<NetworkSegment | null>(null);
  const [editFiberCount, setEditFiberCount] = useState('');
  const [editFiberColor, setEditFiberColor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([fetchAssets(), fetchSegments()]);
      setAssets(a);
      setSegments(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]));
  const filteredAssets = assets.filter((a) =>
    a.code.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) { setError('Selecciona origen y destino'); return; }
    if (sourceId === targetId) { setError('Origen y destino no pueden ser iguales'); return; }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await createSegment({
        sourceAssetId: sourceId,
        targetAssetId: targetId,
        segmentType,
        fiberCount: parseInt(fiberCount, 10) || undefined,
        fiberColor: fiberColor || undefined,
      });
      setSuccess(`Segmento ${segmentType.replace(/_/g, ' ')} creado`);
      setSourceId('');
      setTargetId('');
      setFiberCount('12');
      setFiberColor('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear segmento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (segment: NetworkSegment) => {
    setEditingSegment(segment);
    setEditFiberCount(String(segment.fiberCount ?? ''));
    setEditFiberColor(segment.fiberColor ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingSegment) return;
    setSubmitting(true);
    setError('');
    try {
      await updateSegment(editingSegment.id, {
        fiberCount: parseInt(editFiberCount, 10) || undefined,
        fiberColor: editFiberColor || undefined,
      });
      setSuccess('Segmento actualizado');
      setEditingSegment(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este segmento definitivamente?')) return;
    setError('');
    setSuccess('');
    try {
      await deleteSegment(id);
      setSuccess('Segmento eliminado');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const handleChangeFeeding = async (segmentId: string, newTargetId: string) => {
    if (!confirm(`¿Reasignar segmento al activo ${assetMap[newTargetId]?.code || newTargetId}?`)) return;
    setError('');
    setSuccess('');
    try {
      await updateSegment(segmentId, { targetAssetId: newTargetId });
      setSuccess('Alimentación reasignada');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al reasignar');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-400 mb-1">
            <span className="text-slate-300">/ Topología / </span>
            <span className="text-slate-500">Editor de Topología</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Editor de Topología</h1>
          <p className="text-slate-500 mt-1">Crea y gestiona conexiones entre activos de red</p>
        </div>

        {(error || success) && (
          <div className={`px-4 py-3 rounded-lg text-sm ${error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {error || success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Asset List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-fit lg:sticky lg:top-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Activos disponibles</h2>
            <input
              type="text"
              placeholder="Buscar activo..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500 mb-3"
            />
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filteredAssets.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No hay activos que coincidan</p>
              ) : filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', asset.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing transition-colors border ${
                    sourceId === asset.id || targetId === asset.id
                      ? 'border-interplay-400 bg-interplay-50'
                      : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-slate-300 cursor-grab text-xs">⠿</span>
                  <StatusDot status={asset.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-slate-500">{asset.code}</p>
                    <p className="text-slate-800 text-xs truncate">{asset.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSourceId(asset.id)}
                      title="Seleccionar como origen"
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        sourceId === asset.id
                          ? 'bg-interplay-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-interplay-100 hover:text-interplay-600'
                      }`}
                    >
                      O
                    </button>
                    <button
                      onClick={() => setTargetId(asset.id)}
                      title="Seleccionar como destino"
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        targetId === asset.id
                          ? 'bg-interplay-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-interplay-100 hover:text-interplay-600'
                      }`}
                    >
                      D
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Canvas + Form + Segments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Canvas area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Canvas de conexiones</h2>
              {segments.length === 0 ? (
                <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-400">Selecciona origen y destino para crear la primera conexión</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {segments.map((seg) => {
                    const source = assetMap[seg.sourceAssetId];
                    const target = assetMap[seg.targetAssetId];
                    const borderColor = SEGMENT_TYPE_COLORS[seg.segmentType] || 'border-slate-200';
                    return (
                      <div
                        key={seg.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 ${borderColor} bg-white`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-interplay-600">{source?.code || seg.sourceAssetId}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-mono text-interplay-600">{target?.code || seg.targetAssetId}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {seg.segmentType.replace(/_/g, ' ')}
                            {seg.fiberCount ? ` · ${seg.fiberCount} fibras` : ''}
                            {seg.fiberColor ? ` · Color: ${seg.fiberColor}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleEdit(seg)} className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-interplay-100 hover:text-interplay-600 transition-colors">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(seg.id)} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create connection form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Nueva Conexión</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Activo origen</label>
                    <select
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                    >
                      <option value="">Seleccionar origen</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Activo destino</label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                    >
                      <option value="">Seleccionar destino</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de segmento</label>
                  <select
                    value={segmentType}
                    onChange={(e) => setSegmentType(e.target.value as SegmentType)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                  >
                    {SEGMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Fibras</label>
                    <input
                      type="number" min={1} max={288}
                      value={fiberCount}
                      onChange={(e) => setFiberCount(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
                    <input
                      type="text" placeholder="Ej: Azul, Rojo..."
                      value={fiberColor}
                      onChange={(e) => setFiberColor(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !sourceId || !targetId}
                  className="w-full bg-interplay-600 hover:bg-interplay-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creando...' : 'Crear Conexión'}
                </button>
              </form>
            </div>

            {/* Edit segment modal */}
            {editingSegment && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingSegment(null)}>
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Editar Segmento</h3>
                  <p className="text-sm text-slate-500 mb-4 font-mono">{editingSegment.code} — {editingSegment.segmentType.replace(/_/g, ' ')}</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Fibras</label>
                      <input
                        type="number" min={1} max={288}
                        value={editFiberCount}
                        onChange={(e) => setEditFiberCount(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
                      <input
                        type="text"
                        value={editFiberColor}
                        onChange={(e) => setEditFiberColor(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Reasignar alimentación (destino)</label>
                      <select
                        value={editingSegment.targetAssetId}
                        onChange={(e) => handleChangeFeeding(editingSegment.id, e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
                      >
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setEditingSegment(null)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={submitting}
                      className="flex-1 bg-interplay-600 hover:bg-interplay-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {submitting ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
