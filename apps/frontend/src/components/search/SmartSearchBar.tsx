'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchAsset {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  municipality: string;
}

interface SearchSegment {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface SearchMunicipality {
  id: string;
  name: string;
}

interface SearchResults {
  assets: SearchAsset[];
  segments: SearchSegment[];
  municipalities: SearchMunicipality[];
}

const MOCK_DATA: SearchResults = {
  assets: [
    { id: 'caja-1', code: 'CAJ-001', name: 'Caja B.0.1', type: 'CAJAS', status: 'ACTIVO', municipality: 'Fresno' },
    { id: 'caja-2', code: 'CAJ-002', name: 'Caja B.0.2', type: 'CAJAS', status: 'ACTIVO', municipality: 'Fresno' },
    { id: 'caja-3', code: 'CAJ-003', name: 'Caja B.0.3', type: 'CAJAS', status: 'ADVERTENCIA', municipality: 'Fresno' },
    { id: 'caja-4', code: 'CAJ-004', name: 'Caja B.0.4', type: 'CAJAS', status: 'ALTA_OCUPACION', municipality: 'Fresno' },
    { id: 'caja-5', code: 'CAJ-005', name: 'Caja B.0.5', type: 'CAJAS', status: 'SIN_CAPACIDAD', municipality: 'Fresno' },
    { id: 'muf-1', code: 'MUF-01', name: 'Mufla Norte', type: 'MUFLAS', status: 'ACTIVO', municipality: 'Fresno' },
    { id: 'muf-2', code: 'MUF-02', name: 'Mufla Sur', type: 'MUFLAS', status: 'ACTIVO', municipality: 'Fresno' },
    { id: 'olt-1', code: 'OLT-001', name: 'OLT Fresno', type: 'OLT', status: 'ACTIVO', municipality: 'Fresno' },
  ],
  segments: [
    { id: 'seg-1', code: 'SEG-TR-001', name: 'Troncal Fresno Norte', type: 'TRONCAL' },
    { id: 'seg-2', code: 'SEG-DS-001', name: 'Distribución Centro', type: 'DISTRIBUCION' },
    { id: 'seg-3', code: 'SEG-FD-001', name: 'Fibra Dedicada Sur', type: 'FIBRA_DEDICADA' },
  ],
  municipalities: [
    { id: 'mun-1', name: 'Fresno' },
    { id: 'mun-2', name: 'Mariquita' },
    { id: 'mun-3', name: 'Herveo' },
  ],
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  ADVERTENCIA: 'bg-yellow-100 text-yellow-700',
  ALTA_OCUPACION: 'bg-orange-100 text-orange-700',
  SIN_CAPACIDAD: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<string, string> = {
  CAJAS: '⊞',
  MUFLAS: '◉',
  OLT: '◉',
  TRONCAL: '═',
  DISTRIBUCION: '─',
  FIBRA_DEDICADA: '┄',
};

function search(query: string): SearchResults {
  const q = query.toLowerCase().trim();
  if (!q) return { assets: [], segments: [], municipalities: [] };

  return {
    assets: MOCK_DATA.assets.filter(
      (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.municipality.toLowerCase().includes(q),
    ),
    segments: MOCK_DATA.segments.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    ),
    municipalities: MOCK_DATA.municipalities.filter(
      (m) => m.name.toLowerCase().includes(q),
    ),
  };
}

export default function SmartSearchBar({
  placeholder = 'Buscar activos, segmentos, municipios...',
  onResultSelect,
  className = '',
}: {
  placeholder?: string;
  onResultSelect?: (result: any) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ assets: [], segments: [], municipalities: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const totalResults = results.assets.length + results.segments.length + results.municipalities.length;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({ assets: [], segments: [], municipalities: [] });
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      setResults(search(query));
      setIsOpen(true);
      setActiveIndex(-1);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (item: any) => {
      onResultSelect?.(item);
      setQuery('');
      setIsOpen(false);
    },
    [onResultSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const total = totalResults;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < total) {
          const allItems = [
            ...results.municipalities.map((m) => ({ ...m, _type: 'municipality' as const })),
            ...results.assets.map((a) => ({ ...a, _type: 'asset' as const })),
            ...results.segments.map((s) => ({ ...s, _type: 'segment' as const })),
          ];
          handleSelect(allItems[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const allItems = [
    ...results.municipalities.map((m) => ({ ...m, _type: 'municipality' as const })),
    ...results.assets.map((a) => ({ ...a, _type: 'asset' as const })),
    ...results.segments.map((s) => ({ ...s, _type: 'segment' as const })),
  ];

  let globalIndex = -1;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (totalResults > 0) setIsOpen(true); }}
          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-interplay-500 focus:border-transparent"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">⏳</span>
        )}
      </div>

      {isOpen && totalResults > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {results.municipalities.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                Municipios
              </div>
              {results.municipalities.map((item) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <button
                    key={`mun-${item.id}`}
                    onClick={() => handleSelect({ ...item, _type: 'municipality' })}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                      activeIndex === idx ? 'bg-interplay-50 text-interplay-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-400">📍</span>
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {results.assets.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                Activos
              </div>
              {results.assets.map((item) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <button
                    key={`asset-${item.id}`}
                    onClick={() => handleSelect({ ...item, _type: 'asset' })}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                      activeIndex === idx ? 'bg-interplay-50 text-interplay-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-400">{TYPE_ICONS[item.type] || '?'}</span>
                    <span className="font-mono text-xs text-slate-500">{item.code}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'}`}>
                      {item.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {results.segments.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                Segmentos
              </div>
              {results.segments.map((item) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <button
                    key={`seg-${item.id}`}
                    onClick={() => handleSelect({ ...item, _type: 'segment' })}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                      activeIndex === idx ? 'bg-interplay-50 text-interplay-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-400">═</span>
                    <span className="font-mono text-xs text-slate-500">{item.code}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {item.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
