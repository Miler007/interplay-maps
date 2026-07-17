'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MOCK_USERS = [
  { email: 'admin@interplay.com', password: 'admin123', name: 'Admin Interplay', role: 'ADMIN' },
  { email: 'tecnico@interplay.com', password: 'tecnico123', name: 'Técnico Campo', role: 'SUPERVISOR' },
  { email: 'visor@interplay.com', password: 'visor123', name: 'Visualizador', role: 'VISUALIZADOR' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@interplay.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const user = MOCK_USERS.find(u => u.email === email && u.password === password);

    if (user) {
      localStorage.setItem('token', 'mock-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify({ email: user.email, name: user.name, role: user.role }));
      router.push('/dashboard');
    } else {
      setError('Credenciales inválidas. Prueba: admin@interplay.com / admin123');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-interplay-600">Interplay Maps</h1>
          <p className="text-slate-500 mt-2">Digital Twin FTTH — v1.0</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-interplay-500 focus:border-transparent outline-none"
              placeholder="admin@interplay.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-interplay-500 focus:border-transparent outline-none"
              placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-interplay-600 hover:bg-interplay-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">Credenciales de prueba:</p>
          <p>👑 Admin: <strong>admin@interplay.com</strong> / <strong>admin123</strong></p>
          <p>🔧 Técnico: <strong>tecnico@interplay.com</strong> / <strong>tecnico123</strong></p>
          <p>👁 Visor: <strong>visor@interplay.com</strong> / <strong>visor123</strong></p>
        </div>
      </div>
    </div>
  );
}
