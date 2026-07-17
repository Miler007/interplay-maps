'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const STEPS = [
  'Seleccionar archivo',
  'Seleccionar municipio',
  'Previsualización',
  'Errores y duplicados',
  'Importar',
  'Reporte',
];

const ALLOWED_TYPES = ['.txt', '.csv', '.xlsx', '.kml', '.gpx', '.json'];

type ImportReport = {
  totalMessages?: number;
  registrosDetectados?: number;
  creados?: number;
  actualizados?: number;
  duplicados?: number;
  errores?: number;
  pendientes?: number;
  relaciones?: number;
  tiempoSegundos?: number;
};

export default function ImportWizardPage() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedMun, setSelectedMun] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<any>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<any[]>([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.municipalities.getDepartments().then(setDepartments).catch(() => {});
  }, []);

  const loadMunicipalities = async (deptId: string) => {
    setSelectedDept(deptId);
    setSelectedMun('');
    if (!deptId) { setMunicipalities([]); return; }
    try {
      const muns = await api.municipalities.getByDepartment(deptId);
      setMunicipalities(muns);
    } catch {
      setMunicipalities([]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const canNext = () => {
    if (step === 0) return !!file;
    if (step === 1) return !!selectedMun;
    if (step === 2) return !!simulation;
    if (step === 3) return !!simulation;
    if (step === 4) return true;
    return false;
  };

  const nextStep = () => {
    setError('');
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError('');
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSimulate = async () => {
    if (!file || !selectedMun) return;
    setLoading(true);
    setError('');
    setSimulation(null);
    try {
      const res = await api.import.simulate(file, selectedMun);
      setSimulation(res);
      nextStep();
    } catch (err: any) {
      setError(err.message || 'Error en la simulación');
      if (err.details) setErrorDetails(err.details);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!file || !simulation || !selectedMun) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.import.execute(file, simulation, selectedMun);
      setReport(res);
      nextStep();
    } catch (err: any) {
      setError(err.message || 'Error al importar');
      if (err.details) setErrorDetails(err.details);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(0);
    setFile(null);
    setSelectedDept('');
    setSelectedMun('');
    setSimulation(null);
    setReport(null);
    setError('');
    setErrorDetails([]);
    setShowErrorDetails(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asistente de Importación</h1>
          <p className="text-slate-500 mt-1">Importa datos de infraestructura en 6 pasos</p>
        </div>

        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < step
                    ? 'bg-green-500 text-white'
                    : i === step
                    ? 'bg-interplay-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? 'text-interplay-700 font-semibold' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 last:hidden" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <p>{error}</p>
            {errorDetails.length > 0 && (
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-red-600 underline mt-1 text-xs"
              >
                {showErrorDetails ? 'Ocultar detalles' : 'Ver detalles'}
              </button>
            )}
            {showErrorDetails && errorDetails.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {errorDetails.map((d, i) => (
                  <p key={i} className="text-xs text-red-500">- {typeof d === 'string' ? d : JSON.stringify(d)}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`bg-white rounded-xl shadow-sm border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-interplay-500 bg-interplay-50' : 'border-slate-300'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div>
                <p className="text-lg font-medium text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB &middot; {file.type || 'Desconocido'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-3 text-sm text-red-500 hover:text-red-700"
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 text-slate-300">&#128196;</div>
                <p className="text-slate-600 font-medium">Arrastra un archivo aquí o haz clic para seleccionar</p>
                <p className="text-sm text-slate-400 mt-1">.txt .csv .xlsx .kml .gpx .json</p>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Seleccionar municipio</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                <select
                  value={selectedDept}
                  onChange={(e) => loadMunicipalities(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-interplay-500"
                >
                  <option value="">Seleccionar</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Municipio</label>
                <select
                  value={selectedMun}
                  onChange={(e) => setSelectedMun(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-interplay-500"
                >
                  <option value="">Seleccionar</option>
                  {municipalities.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && simulation && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Previsualización de datos</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{simulation.totalMessages ?? '-'}</p>
                <p className="text-xs text-blue-700">Mensajes totales</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{simulation.registrosDetectados ?? simulation.detectedEntities ?? simulation.entities ?? '-'}</p>
                <p className="text-xs text-indigo-700">Entidades detectadas</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-600">{simulation.noiseFiltered ?? simulation.filtered ?? 0}</p>
                <p className="text-xs text-slate-700">Ruido filtrado</p>
              </div>
            </div>
            {simulation.preview && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Vista previa</h3>
                <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {typeof simulation.preview === 'string'
                    ? simulation.preview
                    : JSON.stringify(simulation.preview, null, 2)}
                </pre>
              </div>
            )}
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full bg-interplay-600 hover:bg-interplay-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Analizando...' : 'Ejecutar simulación'}
            </button>
          </div>
        )}

        {step === 3 && simulation && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Errores y duplicados</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{simulation.errores ?? simulation.errors?.length ?? 0}</p>
                <p className="text-xs text-red-700">Errores</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{simulation.duplicados ?? simulation.duplicates?.length ?? 0}</p>
                <p className="text-xs text-yellow-700">Duplicados</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{simulation.relaciones ?? simulation.relationships ?? 0}</p>
                <p className="text-xs text-amber-700">Relaciones detectadas</p>
              </div>
            </div>
            {simulation.errors?.length > 0 && (
              <div>
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="text-sm text-interplay-600 underline"
                >
                  {showErrorDetails ? 'Ocultar' : 'Mostrar'} detalles de errores
                </button>
                {showErrorDetails && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {simulation.errors.map((err: any, i: number) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">
                        {typeof err === 'string' ? err : err.message || JSON.stringify(err)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {simulation.duplicates?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Registros duplicados ({simulation.duplicates.length})</h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {simulation.duplicates.map((d: any, i: number) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-xs text-yellow-700">
                      {typeof d === 'string' ? d : d.name || d.id || JSON.stringify(d)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Resumen de importación</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Archivo</p>
                <p className="text-sm font-medium text-slate-900 truncate">{file?.name}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Municipio</p>
                <p className="text-sm font-medium text-slate-900">
                  {municipalities.find((m) => m.id === selectedMun)?.name || selectedMun}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Entidades a importar</p>
                <p className="text-sm font-medium text-slate-900">{simulation?.registrosDetectados ?? simulation?.detectedEntities ?? '-'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Duplicados</p>
                <p className="text-sm font-medium text-slate-900">{simulation?.duplicados ?? simulation?.duplicates?.length ?? 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Errores</p>
                <p className="text-sm font-medium text-slate-900">{simulation?.errores ?? simulation?.errors?.length ?? 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600">Modo simulación</p>
                <p className="text-sm font-medium text-green-700">Previsualización completada</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              Se importarán los datos en modo simulación. Confirma para ejecutar la importación real.
            </div>
            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-full bg-interplay-600 hover:bg-interplay-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Importando...' : 'Confirmar e importar'}
            </button>
          </div>
        )}

        {step === 5 && report && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl">&#10003;</div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Importación completada</h2>
                <p className="text-sm text-slate-500">Reporte final de importación</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{report.totalMessages ?? '-'}</p>
                <p className="text-xs text-blue-700">Mensajes totales</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{report.registrosDetectados ?? '-'}</p>
                <p className="text-xs text-indigo-700">Registros detectados</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{report.creados ?? 0}</p>
                <p className="text-xs text-green-700">Creados</p>
              </div>
              <div className="text-center p-4 bg-teal-50 rounded-lg">
                <p className="text-2xl font-bold text-teal-600">{report.actualizados ?? 0}</p>
                <p className="text-xs text-teal-700">Actualizados</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{report.duplicados ?? 0}</p>
                <p className="text-xs text-yellow-700">Duplicados</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{report.errores ?? 0}</p>
                <p className="text-xs text-red-700">Errores</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{report.pendientes ?? 0}</p>
                <p className="text-xs text-amber-700">Pendientes</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{report.relaciones ?? 0}</p>
                <p className="text-xs text-purple-700">Relaciones</p>
              </div>
            </div>
            {report.tiempoSegundos !== undefined && (
              <div className="text-center text-sm text-slate-500">
                Tiempo de procesamiento: <span className="font-semibold text-slate-700">{report.tiempoSegundos}s</span>
              </div>
            )}
            <button
              onClick={resetWizard}
              className="w-full bg-interplay-600 hover:bg-interplay-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Nueva importación
            </button>
          </div>
        )}

        {step < 5 && (
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Anterior
            </button>
            {step < 2 ? (
              <button
                onClick={step === 1 ? handleSimulate : nextStep}
                disabled={!canNext() || loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-interplay-600 rounded-lg hover:bg-interplay-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : step === 1 ? 'Simular' : 'Siguiente'}
              </button>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
