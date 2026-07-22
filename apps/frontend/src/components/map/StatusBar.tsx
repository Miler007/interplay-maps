'use client';

export default function StatusBar({ lat, lng, zoom, count, layerName, isOffline, isClient, onZoomIn, onZoomOut }: {
  lat?: number; lng?: number; zoom?: number; count: number; layerName?: string;
  isOffline: boolean; isClient: boolean;
  onZoomIn: () => void; onZoomOut: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/80 px-4 py-2 text-[11px] min-w-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 font-mono text-slate-500">
          <span className="text-slate-400">lat</span>
          <span className="text-slate-700 font-semibold min-w-[4.5rem]">{lat?.toFixed(5) ?? '—'}</span>
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <div className="flex items-center gap-2 font-mono text-slate-500">
          <span className="text-slate-400">lng</span>
          <span className="text-slate-700 font-semibold min-w-[4.5rem]">{lng?.toFixed(5) ?? '—'}</span>
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
          <span className="font-semibold text-slate-700">{zoom ?? '—'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>
          <span className="font-semibold text-slate-700">{count}</span>
          <span className="text-slate-400">activos</span>
        </div>
        {layerName && <>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-slate-500 truncate max-w-[120px]">{layerName}</span>
        </>}
        {isClient && <div className="w-px h-4 bg-slate-200" />}
        {isClient && (
          <span className={`flex items-center gap-1 font-semibold ${isOffline ? 'text-amber-600' : 'text-emerald-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {isOffline ? 'Demo' : 'Online'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onZoomOut} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button onClick={onZoomIn} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>
  );
}
