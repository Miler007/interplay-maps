'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const relIcons: Record<string, string> = {
  ALIMENTADO_POR: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  ALIMENTA_A: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  CONECTADO_A: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  ENLACE_FIBRA: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  DEPENDE_DE: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="7 4 3 10 7 10 7 18 11 18 11 10 15 10 11 4 7 4"/></svg>',
  DROP: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  FUSION: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  SPLITER_1X2: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 6 12 12 1 18"/><polyline points="23 6 12 12 23 18"/></svg>',
  ALIMENTA: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
};

const SvgIcon = ({ html }: { html: string }) => <span dangerouslySetInnerHTML={{ __html: html }} />;

export default function RelationshipsPage() {
  const [rels, setRels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.integrity.checkAll();
      const assets = await api.assets.getAll({ type: 'CAJA', limit: '20' });
      const items = assets?.data || assets || [];
      const list = Array.isArray(items) ? items : [];
      // Fetch relationships per asset
      const all: any[] = [];
      for (const a of list) {
        try { const r = await api.relationships.getByAsset(a.id); if (Array.isArray(r)) all.push(...r); } catch {}
      }
      setRels(all);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = typeFilter ? rels.filter(r => r.relationType === typeFilter) : rels;
  const types: Record<string, number> = {};
  rels.forEach(r => { types[r.relationType] = (types[r.relationType] || 0) + 1; });

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <h1 className="text-xl font-bold text-slate-900">Relaciones</h1>
        <p className="text-sm text-slate-400 mt-0.5">{rels.length} relaciones topológicas</p>

        <div className="flex gap-2 mt-6 overflow-x-auto pb-1 flex-wrap">
          {Object.entries(types).map(([k, v]) => (
            <button key={k} onClick={() => setTypeFilter(typeFilter === k ? '' : k)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === k ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}>
              <SvgIcon html={relIcons[k] || relIcons.CONECTADO_A} /> {k} ({v})
            </button>
          ))}
          {typeFilter && <button onClick={() => setTypeFilter('')} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-all">✕ Limpiar</button>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="space-y-1.5 mt-4">
            {filtered.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                    <SvgIcon html={relIcons[r.relationType] || relIcons.CONECTADO_A} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-semibold text-slate-800">{r.sourceAsset?.code || r.sourceAssetId?.slice(0, 8)}</span>
                      <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg text-[11px] font-semibold">{r.relationType}</span>
                      <span className="font-semibold text-slate-800">{r.targetAsset?.code || r.targetAssetId?.slice(0, 8)}</span>
                    </div>
                    {r.description && <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={async () => { if (confirm('Eliminar relación?')) try { await api.relationships.delete(r.id); load(); } catch {} }}
                      className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">✕</button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">Sin relaciones</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
