'use client';

import { useState, useMemo } from 'react';

interface TreeNode {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  portUsage?: string;
  children?: TreeNode[];
}

interface ProjectNode {
  name: string;
  nodes: TreeNode[];
}

interface MunicipalityNode {
  name: string;
  projects: ProjectNode[];
}

interface TreeData {
  department: string;
  municipalities: MunicipalityNode[];
}

const MOCK_TREE: TreeData = {
  department: 'Tolima',
  municipalities: [
    {
      name: 'Fresno',
      projects: [
        {
          name: 'Proyecto Fresno Centro',
          nodes: [
            {
              id: 'olt-1', code: 'OLT-001', name: 'OLT Fresno', type: 'OLT', status: 'ACTIVO',
              children: [
                {
                  id: 'muf-1', code: 'MUF-01', name: 'Mufla Norte', type: 'MUFLAS', status: 'ACTIVO',
                  children: [
                    { id: 'caja-1', code: 'CAJ-001', name: 'Caja B.0.1', type: 'CAJAS', status: 'ACTIVO', portUsage: '6/8' },
                    { id: 'caja-2', code: 'CAJ-002', name: 'Caja B.0.2', type: 'CAJAS', status: 'ACTIVO', portUsage: '3/8' },
                    { id: 'caja-3', code: 'CAJ-003', name: 'Caja B.0.3', type: 'CAJAS', status: 'ADVERTENCIA', portUsage: '6/8' },
                  ],
                },
                {
                  id: 'muf-2', code: 'MUF-02', name: 'Mufla Sur', type: 'MUFLAS', status: 'ACTIVO',
                  children: [
                    { id: 'caja-4', code: 'CAJ-004', name: 'Caja B.0.4', type: 'CAJAS', status: 'ALTA_OCUPACION', portUsage: '7/8' },
                    { id: 'caja-5', code: 'CAJ-005', name: 'Caja B.0.5', type: 'CAJAS', status: 'SIN_CAPACIDAD', portUsage: '8/8' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const STATUS_DOT: Record<string, string> = {
  ACTIVO: 'bg-green-500',
  ADVERTENCIA: 'bg-yellow-500',
  ALTA_OCUPACION: 'bg-orange-500',
  SIN_CAPACIDAD: 'bg-red-500',
};

const TYPE_ICONS: Record<string, string> = {
  OLT: '◉',
  MUFLAS: '◉',
  CAJAS: '⊞',
};

function StatusDot({ status }: { status: string }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[status] || 'bg-gray-300'}`} title={status} />;
}

function flattenNodes(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenNodes(n.children));
  }
  return result;
}

function matchesFilter(node: TreeNode, filter: string): boolean {
  const q = filter.toLowerCase();
  return node.code.toLowerCase().includes(q) || node.name.toLowerCase().includes(q);
}

function hasMatchingDescendant(node: TreeNode, filter: string): boolean {
  if (!filter) return true;
  if (matchesFilter(node, filter)) return true;
  if (node.children) return node.children.some((c) => hasMatchingDescendant(c, filter));
  return false;
}

export default function InfrastructureTree({
  municipalityId,
  onSelectAsset,
}: {
  municipalityId?: string;
  onSelectAsset?: (assetId: string) => void;
}) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['dept-0', 'mun-0', 'proj-0']));
  const [activeAssetId, setActiveAssetId] = useState<string | undefined>();
  const [searchFilter, setSearchFilter] = useState('');

  const allAssets = useMemo(() => {
    const assets: TreeNode[] = [];
    for (const mun of MOCK_TREE.municipalities) {
      for (const proj of mun.projects) {
        assets.push(...flattenNodes(proj.nodes));
      }
    }
    return assets;
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string) => {
    setActiveAssetId(id);
    onSelectAsset?.(id);
  };

  return (
    <aside className="w-72 bg-slate-900 text-white h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Infraestructura</h2>
        <div className="relative mt-2">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Filtrar por código o nombre..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-interplay-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          onClick={() => toggleExpand('dept-0')}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <span className="text-[10px]">{expandedNodes.has('dept-0') ? '▼' : '▶'}</span>
          🏢 {MOCK_TREE.department}
        </button>

        {expandedNodes.has('dept-0') &&
          MOCK_TREE.municipalities
            .filter((m) => !municipalityId || m.name === municipalityId)
            .map((mun, mi) => {
              const munKey = `mun-${mi}`;
              const isExpanded = expandedNodes.has(munKey);
              return (
                <div key={munKey} className="ml-3 space-y-1">
                  <button
                    onClick={() => toggleExpand(munKey)}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                    📍 {mun.name}
                  </button>

                  {isExpanded &&
                    mun.projects.map((proj, pi) => {
                      const projKey = `proj-${mi}-${pi}`;
                      return (
                        <div key={projKey} className="ml-3">
                          <button
                            onClick={() => toggleExpand(projKey)}
                            className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <span className="text-[10px]">{expandedNodes.has(projKey) ? '▼' : '▶'}</span>
                            📁 {proj.name}
                          </button>

                          {expandedNodes.has(projKey) && (
                            <div className="ml-3 space-y-0.5 mt-0.5">
                              {proj.nodes
                                .filter((n) => !searchFilter || hasMatchingDescendant(n, searchFilter))
                                .map((node) => (
                                  <TreeNodeItem
                                    key={node.id}
                                    node={node}
                                    activeAssetId={activeAssetId}
                                    searchFilter={searchFilter}
                                    onSelect={handleSelect}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            })}
      </div>

      <div className="p-3 border-t border-slate-700 text-[10px] text-slate-500">
        {allAssets.length} activos en total
      </div>
    </aside>
  );
}

function TreeNodeItem({
  node,
  activeAssetId,
  searchFilter,
  onSelect,
}: {
  node: TreeNode;
  activeAssetId?: string;
  searchFilter: string;
  onSelect: (id: string) => void;
}) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeAssetId === node.id;
  const hasFilterMatch = !searchFilter || matchesFilter(node, searchFilter);

  const filteredChildren = useMemo(() => {
    if (!node.children) return [];
    if (!searchFilter) return node.children;
    return node.children.filter((c) => hasMatchingDescendant(c, searchFilter));
  }, [node.children, searchFilter]);

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={`flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
          isActive
            ? 'bg-interplay-500 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {hasChildren && (
          <span
            className="text-[10px] text-slate-500 mr-0.5"
            onClick={(e) => { e.stopPropagation(); setLocalExpanded(!localExpanded); }}
          >
            {localExpanded ? '▼' : '▶'}
          </span>
        )}
        <StatusDot status={node.status} />
        <span className="font-mono text-[10px] opacity-70">{node.code}</span>
        <span className="truncate flex-1">{node.name}</span>
        {node.portUsage && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            node.status === 'SIN_CAPACIDAD' ? 'bg-red-900 text-red-300' :
            node.status === 'ALTA_OCUPACION' ? 'bg-orange-900 text-orange-300' :
            node.status === 'ADVERTENCIA' ? 'bg-yellow-900 text-yellow-300' :
            'bg-slate-700 text-slate-300'
          }`}>
            {node.portUsage}
          </span>
        )}
      </button>

      {hasChildren && localExpanded && filteredChildren.length > 0 && (
        <div className="ml-3 border-l border-slate-700 pl-2 space-y-0.5 mt-0.5">
          {filteredChildren.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              activeAssetId={activeAssetId}
              searchFilter={searchFilter}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
