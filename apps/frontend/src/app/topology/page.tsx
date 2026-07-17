'use client';

import { useState, useCallback, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TreeNode } from './components';
import type { TopologyNode, Asset, NetworkSegment } from '@interplay/shared';

function createMockTopology(rootAsset: Asset): TopologyNode {
  const childrenAssets: Asset[] = [
    { ...rootAsset, id: 'child-1', code: 'CAJ-001', name: 'Caja Principal', type: 'CAJAS', status: 'ACTIVO', confidenceScore: 85 },
    { ...rootAsset, id: 'child-2', code: 'CTO-002', name: 'CTO Secundario', type: 'CTO', status: 'EN_CONSTRUCCION', confidenceScore: 60 },
    { ...rootAsset, id: 'child-3', code: 'SPL-003', name: 'Splitter Zona B', type: 'SPLITTERS', status: 'ACTIVO', confidenceScore: 90 },
  ];

  const segments: NetworkSegment[] = [
    { id: 'seg-1', code: 'SEG-001', name: 'Troncal A', segmentType: 'CABLE_TRONCAL', sourceAssetId: rootAsset.id, targetAssetId: 'child-1', fiberCount: 48, fiberColor: 'Azul', status: 'ACTIVO', departmentId: '', municipalityId: '', createdAt: new Date(), updatedAt: new Date() },
    { id: 'seg-2', code: 'SEG-002', name: 'Distribución 1', segmentType: 'CABLE_DISTRIBUCION', sourceAssetId: rootAsset.id, targetAssetId: 'child-2', fiberCount: 24, fiberColor: 'Rojo', status: 'EN_CONSTRUCCION', departmentId: '', municipalityId: '', createdAt: new Date(), updatedAt: new Date() },
    { id: 'seg-3', code: 'SEG-003', name: 'Drop A', segmentType: 'DROP', sourceAssetId: rootAsset.id, targetAssetId: 'child-3', fiberCount: 2, fiberColor: 'Verde', status: 'ACTIVO', departmentId: '', municipalityId: '', createdAt: new Date(), updatedAt: new Date() },
  ];

  return {
    asset: rootAsset,
    depth: 0,
    segments,
    children: childrenAssets.map((a, i) => ({
      asset: a,
      depth: 1,
      segments: i === 0 ? [{ ...segments[0], id: 'seg-1-1', segmentType: 'DERIVACION' as const }] : [],
      children: i === 0
        ? [
            { asset: { ...rootAsset, id: 'grandchild-1', code: 'DROP-001', name: 'Drop Residencial A', type: 'CAJAS', status: 'PENDIENTE_INSTALACION', confidenceScore: 30 }, depth: 2, segments: [], children: [] },
            { asset: { ...rootAsset, id: 'grandchild-2', code: 'DROP-002', name: 'Drop Residencial B', type: 'CAJAS', status: 'ACTIVO', confidenceScore: 95 }, depth: 2, segments: [], children: [] },
          ]
        : [],
    })),
  };
}

function createMockAsset(code: string): Asset {
  return {
    id: 'root-1',
    code: code.toUpperCase(),
    name: code.toUpperCase() === 'OLT-001' ? 'OLT Principal' : `Equipo ${code.toUpperCase()}`,
    type: 'NODOS',
    departmentId: 'dept-1',
    municipalityId: 'mun-1',
    latitude: 0,
    longitude: 0,
    status: 'ACTIVO',
    confidenceScore: 92,
    createdAt: new Date(),
    updatedAt: new Date(),
    photos: [],
    department: { id: 'dept-1', name: 'Departamento Central', createdAt: new Date(), updatedAt: new Date(), municipalities: [] },
    municipality: { id: 'mun-1', name: 'Municipio Demo', departmentId: 'dept-1', createdAt: new Date(), updatedAt: new Date(), assets: [], projects: [] },
  };
}

function fetchAssetById(id: string): Promise<Asset> {
  return new Promise((resolve) => setTimeout(() => resolve(createMockAsset(id)), 300));
}

function fetchTopologyTree(assetId: string): Promise<TopologyNode> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const asset = createMockAsset(assetId);
      resolve(createMockTopology(asset));
    }, 500);
  });
}

export default function TopologyPage() {
  const [searchCode, setSearchCode] = useState('');
  const [topology, setTopology] = useState<TopologyNode | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    const code = searchCode.trim();
    if (!code) return;
    setLoading(true);
    setError('');
    setTopology(null);
    setSelectedAsset(null);
    try {
      const asset = await fetchAssetById(code);
      setSelectedAsset(asset);
      const tree = await fetchTopologyTree(asset.id);
      setTopology(tree);
    } catch {
      setError('No se encontró el activo. Intenta con OLT-001, OLT-002, etc.');
    } finally {
      setLoading(false);
    }
  }, [searchCode]);

  useEffect(() => {
    if (!searchCode) {
      setTopology(null);
      setSelectedAsset(null);
      setError('');
    }
  }, [searchCode]);

  const handleSelectNode = (node: TopologyNode) => {
    setSelectedAsset(node.asset);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-400 mb-1">
            <span className="text-slate-300">/ </span>
            <span className="text-slate-500">Topología de Red</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Topología de Red</h1>
          <p className="text-slate-500 mt-1">Visualización jerárquica de la red de fibra óptica</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por código de activo (ej: OLT-001)..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchCode.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-interplay-600 disabled:opacity-40"
            >
              {loading ? '⌛' : '🔍'}
            </button>
          </div>
          {loading && <p className="text-sm text-slate-400">Cargando topología...</p>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {selectedAsset && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 text-sm">
            <span className="font-medium text-slate-700">Seleccionado:</span>
            <span className="font-mono text-interplay-600">{selectedAsset.code}</span>
            <span className="text-slate-500">—</span>
            <span className="text-slate-700">{selectedAsset.name}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">{selectedAsset.type}</span>
            <span className="ml-auto text-xs text-slate-400">
              {selectedAsset.municipality?.name} — {selectedAsset.department?.name}
            </span>
          </div>
        )}

        {topology && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
            <div className="flex justify-center min-w-[600px]">
              <TreeNode node={topology} onSelect={handleSelectNode} />
            </div>
          </div>
        )}

        {!topology && !loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
            <div className="text-4xl text-slate-300 mb-4">◉</div>
            <p className="text-slate-500 font-medium">Ingresa un código de activo para visualizar su topología</p>
            <p className="text-sm text-slate-400 mt-1">Ejemplo: OLT-001, CAJ-045, CTO-012</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
