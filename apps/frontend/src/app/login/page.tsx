'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const BgGradient = () => (
  <div className="fixed inset-0 -z-10">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-interplay-500/10 rounded-full blur-3xl" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@interplay-maps.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.login(email, password);
      localStorage.setItem('token', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Credenciales inválidas');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative">
      <BgGradient />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Interplay Maps</h1>
          <p className="text-sm text-slate-400 mt-1">Digital Twin FTTH</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-interplay-500/40 focus:border-interplay-500/50 transition-all"
              placeholder="admin@interplay-maps.com" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-interplay-500/40 focus:border-interplay-500/50 transition-all"
              placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading}
            className="w-full px-4 py-3 bg-interplay-500 hover:bg-interplay-600 text-white font-semibold rounded-xl text-sm transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] disabled:opacity-50">
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-4 p-4 bg-white/5 backdrop-blur rounded-2xl border border-white/10">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Credenciales del sistema</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
            <span className="text-slate-300 font-medium">admin@interplay-maps.com</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">Admin2026!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
