'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function MunicipalitiesPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [newDept, setNewDept] = useState('');
  const [newMun, setNewMun] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const depts = await api.municipalities.getDepartments();
    setDepartments(depts);
  };

  const handleCreateDept = async () => {
    if (!newDept) return;
    await api.municipalities.createDepartment(newDept);
    setNewDept('');
    loadDepartments();
  };

  const handleCreateMun = async () => {
    if (!newMun || !selectedDept) return;
    await api.municipalities.create({ name: newMun, departmentId: selectedDept });
    setNewMun('');
    loadDepartments();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipios</h1>
          <p className="text-slate-500 mt-1">Gestión de departamentos y municipios</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nuevo Departamento</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                placeholder="Nombre del departamento"
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-interplay-500"
              />
              <button
                onClick={handleCreateDept}
                className="bg-interplay-600 hover:bg-interplay-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Crear
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nuevo Municipio</h2>
            <div className="space-y-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-interplay-500"
              >
                <option value="">Seleccionar departamento</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMun}
                  onChange={(e) => setNewMun(e.target.value)}
                  placeholder="Nombre del municipio"
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-interplay-500"
                />
                <button
                  onClick={handleCreateMun}
                  className="bg-interplay-600 hover:bg-interplay-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {departments.map((dept: any) => (
            <div key={dept.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">{dept.name}</h3>
              </div>
              {dept.municipalities?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {dept.municipalities.map((mun: any) => (
                    <div key={mun.id} className="px-6 py-3 flex items-center justify-between">
                      <span className="text-sm text-slate-700">{mun.name}</span>
                      <span className="text-xs text-slate-400">
                        {(mun as any)._count?.assets || 0} activos
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-4 text-sm text-slate-400">
                  Sin municipios registrados
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
