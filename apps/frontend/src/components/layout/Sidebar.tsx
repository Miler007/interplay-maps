'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/operation-zero', label: 'Op. Zero', icon: '🚀' },
  { href: '/operation-zero/campo', label: 'Revisión Campo', icon: '📋' },
  { href: '/pilot', label: 'Piloto', icon: '✈' },
  { href: '/mapa', label: 'Mapa', icon: '🗺' },
  { href: '/assets', label: 'Activos', icon: '⊞' },
  { href: '/topology', label: 'Topología', icon: '⎊' },
  { href: '/relationships', label: 'Relaciones', icon: '⇄' },
  { href: '/import', label: 'Importar', icon: '↥' },
  { href: '/validation', label: 'Validación', icon: '✓' },
  { href: '/reports', label: 'Reportes', icon: '📊' },
  { href: '/integrity', label: 'Integridad', icon: '🛡️' },
  { href: '/operation-zero/baselines', label: 'Baselines', icon: '◈' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-[1001] bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs flex items-center gap-1.5 hover:bg-slate-800">
        <span>{open ? '✕' : '☰'}</span>
        <span className="hidden sm:inline">{open ? 'Cerrar' : 'Menú'}</span>
      </button>

      {open && <div className="fixed inset-0 bg-black/50 z-[1002] lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-[1003] w-64 bg-slate-900 text-white h-screen overflow-y-auto transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 lg:p-6 border-b border-slate-700">
          <h1 className="text-lg lg:text-xl font-bold text-interplay-400">Interplay Maps</h1>
          <p className="text-xs text-slate-400 mt-1">v1.0 — GIS FTTH</p>
        </div>
        <nav className="p-2 lg:p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg text-sm transition-colors ${isActive ? 'bg-interplay-500 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <Link href="/login" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <span className="w-5 text-center">↩</span>
            Cerrar sesión
          </Link>
        </div>
      </aside>
    </>
  );
}
