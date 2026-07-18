'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function MunicipalitiesPage() {
  const [depts, setDepts] = useState<any[]>([]);
  const [newDept, setNewDept] = useState('');
  const [newMun, setNewMun] = useState('');
  const [selDept, setSelDept] = useState('');
  const [token] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('token') : '');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const d = await api.municipalities.getDepartments(); setDepts(Array.isArray(d) ? d : []); } catch {}
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <h1 className="text-xl font-bold text-slate-900">Municipios</h1>
        <p className="text-sm text-slate-400 mt-0.5">{depts.length} departamentos</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Departamentos</h2>
            <div className="flex gap-2 mb-4">
              <input value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="Nombre del departamento" className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500" />
              <button onClick={async () => { if (!newDept.trim()) return; try { await api.municipalities.createDepartment(newDept); setNewDept(''); load(); } catch { alert('Error'); } }} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all">Añadir</button>
            </div>
            <div className="space-y-1.5">
              {depts.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700">{d.name}</span>
                  <span className="text-xs text-slate-400">{d.municipalities?.length || 0} municipios</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Nuevo Municipio</h2>
            <div className="space-y-3">
              <select value={selDept} onChange={e => setSelDept(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                <option value="">Seleccionar departamento</option>
                {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input value={newMun} onChange={e => setNewMun(e.target.value)} placeholder="Nombre del municipio" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-interplay-500" />
              <button onClick={async () => { if (!newMun.trim() || !selDept) return; try { await api.municipalities.create({ name: newMun, departmentId: selDept }); setNewMun(''); load(); } catch { alert('Error'); } }} className="w-full px-4 py-2.5 bg-interplay-500 hover:bg-interplay-600 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_4px_14px_rgba(99,102,241,0.25)]">Crear Municipio</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
