'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const Icons = {
  pending: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  validated: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  certified: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  arrowRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
};

const Svg = ({ html, className }: { html: string; className?: string }) =>
  <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;

const FILTERS = ['PENDIENTE', 'VALIDADO', 'CERTIFICADO', 'REQUIERE_REVISION', 'TODOS'] as const;
const STATUS_STYLES: Record<string, string> = {
  PENDIENTE: 'bg-slate-100 text-slate-600',
  VALIDADO: 'bg-blue-50 text-blue-600',
  CERTIFICADO: 'bg-emerald-50 text-emerald-600',
  REQUIERE_REVISION: 'bg-red-50 text-red-600',
};

export default function CertificationPage() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDIENTE');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.assets.getAll({ type: 'CAJA', limit: '200' });
      const items = res.data || res || [];
      setCajas(Array.isArray(items) ? items : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = cajas.filter((c: any) => filter === 'TODOS' || c.certStatus === filter);
  const counts: Record<string, number> = {};
  cajas.forEach((c: any) => { counts[c.certStatus] = (counts[c.certStatus] || 0) + 1; });
  const total = cajas.length;
  const pct = total ? Math.round(((counts['CERTIFICADO'] || 0) / total) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Certificación</h1>
            <p className="text-sm text-slate-400">Fresno, Tolima</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-500">{pct}%</p>
            <p className="text-[11px] text-slate-400">Certificado</p>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 flex-wrap">
          {FILTERS.map(k => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filter === k ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}>
              {k === 'TODOS' ? `Todos (${total})` : `${k} (${counts[k] || 0})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c: any) => {
              const cap = c.capacity || {};
              const used = (cap.totalPorts || 0) - (cap.freePorts || 0);
              const pctCap = cap.totalPorts ? Math.round((used / cap.totalPorts) * 100) : 0;
              const capColor = pctCap >= 85 ? 'bg-red-500' : pctCap >= 70 ? 'bg-amber-500' : pctCap >= 1 ? 'bg-emerald-500' : 'bg-slate-200';
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-800">{c.code}</h3>
                        <span className="text-xs text-slate-400 truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span>{cap.totalPorts || '?'} puertos</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{used} usados</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{cap.freePorts || '?'} libres</span>
                        {c.observations?.includes('Fibra') && <>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="truncate max-w-[120px]">{c.observations}</span>
                        </>}
                      </div>
                      {cap.totalPorts > 0 && <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden max-w-[200px]">
                        <div className={`h-full rounded-full ${capColor}`} style={{ width: `${pctCap}%` }} />
                      </div>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[c.certStatus] || 'bg-slate-100 text-slate-600'}`}>
                        {c.certStatus}
                      </span>
                      {c.certStatus === 'PENDIENTE' && (
                        <a href={`/campo/validar/${c.id}/`} className="px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(59,130,246,0.25)]">
                          <Svg html={Icons.arrowRight} /> Validar
                        </a>
                      )}
                      {c.certStatus === 'VALIDADO' && (
                        <button onClick={async () => {
                          try { const user = JSON.parse(localStorage.getItem('user') || '{}'); await api.certification.certify(c.id, { userId: user.id }); load(); }
                          catch (e: any) { alert(e?.message || 'Error'); }
                        }} className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(16,185,129,0.25)]">
                          <Svg html={Icons.certified} /> Certificar
                        </button>
                      )}
                      <a href={`/assets/${c.id}/`} className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                        Detalle
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">Sin resultados</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
