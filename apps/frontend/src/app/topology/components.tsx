'use client';

import { useState } from 'react';
import type { AssetStatus, TopologyNode, NetworkSegment } from '@interplay/shared';

export const STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVO: 'bg-green-500',
  EN_CONSTRUCCION: 'bg-yellow-500',
  EN_MANTENIMIENTO: 'bg-orange-500',
  FUERA_DE_SERVICIO: 'bg-red-500',
  PENDIENTE_INSTALACION: 'bg-blue-500',
  RETIRADO: 'bg-gray-400',
};

export function StatusDot({ status }: { status: AssetStatus }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[status] || 'bg-gray-300'}`}
      title={status}
    />
  );
}

export function CapacityBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const color =
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 font-mono w-10 text-right">{used}/{total}</span>
    </div>
  );
}

const TYPE_ICONS: Record<string, string> = {
  MUFLAS: '◉',
  CAJAS: '⊞',
  CTO: '⎔',
  SPLITTERS: '◈',
  POSTES: '⊦',
  NODOS: '◎',
  CAMARAS: '◐',
  EQUIPOS: '⚙',
};

export function TreeNode({
  node,
  onSelect,
}: {
  node: TopologyNode;
  onSelect?: (node: TopologyNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        <div
          onClick={() => onSelect?.(node)}
          className="bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-3 min-w-[180px] cursor-pointer hover:border-interplay-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={node.asset.status} />
            <span className="text-xs font-mono text-slate-400">{node.asset.code}</span>
            <span className="ml-auto text-xs text-slate-300 group-hover:text-interplay-500 transition-colors">
              {TYPE_ICONS[node.asset.type] || '?'}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800 truncate">{node.asset.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              {node.asset.type}
            </span>
            <span className="text-[10px] text-slate-400">{node.asset.municipality?.name}</span>
          </div>
          {node.asset.confidenceScore > 0 && (
            <div className="mt-1.5">
              <CapacityBar used={node.asset.confidenceScore} total={100} />
            </div>
          )}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="mt-1.5 text-[10px] text-interplay-500 hover:text-interplay-700 font-medium"
            >
              {expanded ? '▲ Ocultar' : `▼ ${node.children.length} ${node.children.length === 1 ? 'hijo' : 'hijos'}`}
            </button>
          )}
        </div>

        {hasChildren && expanded && (
          <>
            {node.segments.length > 0 && (
              <div className="my-2">
                <ConnectionLine label={node.segments[0].segmentType} status={node.segments[0].status} />
              </div>
            )}
            <div className="flex gap-6 relative">
              <div className="absolute top-0 left-1/2 w-px bg-slate-300 -translate-x-1/2" style={{ height: '100%' }} />
              {node.children.map((child, i) => (
                <div key={child.asset.id + i} className="relative">
                  <div className="absolute top-0 left-1/2 w-1/2 h-4 border-t border-l border-slate-300 rounded-tl-lg" />
                  <div className="pt-6">
                    <TreeNode node={child} onSelect={onSelect} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ConnectionLine({ label, status }: { label?: string; status?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-4 bg-slate-300" />
      {label && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          status === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {label.replace(/_/g, ' ')}
        </span>
      )}
      <div className="w-px h-4 bg-slate-300" />
    </div>
  );
}
