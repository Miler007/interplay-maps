'use client';

const tools = [
  { id: 'cursor', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>', label: 'Seleccionar' },
  { id: 'measure', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l16-16"/><path d="M20 8V4h-4"/></svg>', label: 'Medir' },
  { id: 'draw-line', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 20 6 16 10 18 14 14 18 16 22 12"/><circle cx="6" cy="16" r="1"/><circle cx="10" cy="18" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="18" cy="16" r="1"/></svg>', label: 'Fibra' },
  { id: 'draw-polygon', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></svg>', label: 'Cobertura' },
  { id: 'add-marker', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>', label: 'Marcador' },
  { id: 'delete-drawings', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', label: 'Borrar' },
];

export default function PremiumToolbar({ activeTool, onToolChange, onClearAll, distance }: {
  activeTool: string | null;
  onToolChange: (tool: string | null) => void;
  onClearAll: () => void;
  distance?: string;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/80 px-3 py-2">
      {tools.map((t) => (
        <button key={t.id}
          onClick={() => {
            if (t.id === 'delete-drawings') { onClearAll(); return; }
            onToolChange(activeTool === t.id ? null : t.id);
          }}
          className={`relative p-2 rounded-xl transition-all ${activeTool === t.id ? 'bg-interplay-500 text-white shadow-lg shadow-interplay-500/20 scale-110' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          title={t.label}
        >
          <span dangerouslySetInnerHTML={{ __html: t.icon }} />
        </button>
      ))}
      <div className="w-px h-6 bg-slate-200 mx-1" />
      <button onClick={onClearAll} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Limpiar todo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
      </button>
      {distance && <span className="text-xs font-mono text-slate-500 ml-2 px-2 py-1 bg-slate-100 rounded-lg">{distance}</span>}
    </div>
  );
}
