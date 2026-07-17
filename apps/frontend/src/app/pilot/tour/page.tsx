'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { VerificationAction } from '@interplay/shared';

interface TourAsset {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  certStatus: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

const MOCK_ASSETS_FOR_TOUR: TourAsset[] = [
  { id: 'a1', code: 'CAJ-001', name: 'Caja Fresno Centro', type: 'CAJAS', status: 'ACTIVO', certStatus: 'PENDIENTE', latitude: 5.1523, longitude: -75.0365 },
  { id: 'a2', code: 'CAJ-002', name: 'Caja Fresno Norte', type: 'CAJAS', status: 'EN_CONSTRUCCION', certStatus: 'PENDIENTE', latitude: 5.1589, longitude: -75.0401 },
  { id: 'a3', code: 'MUF-001', name: 'Mufla Principal Fresno', type: 'MUFLAS', status: 'ACTIVO', certStatus: 'VALIDADO', latitude: 5.1531, longitude: -75.0372 },
  { id: 'a4', code: 'CTO-001', name: 'CTO Fresno Sur', type: 'CTO', status: 'ACTIVO', certStatus: 'PENDIENTE', latitude: 5.1498, longitude: -75.0342 },
  { id: 'a5', code: 'CAJ-003', name: 'Caja Fresno Oriental', type: 'CAJAS', status: 'EN_MANTENIMIENTO', certStatus: 'PENDIENTE', latitude: 5.1555, longitude: -75.0310 },
  { id: 'a6', code: 'CAJ-004', name: 'Caja Fresno Occidental', type: 'CAJAS', status: 'ACTIVO', certStatus: 'PENDIENTE', latitude: 5.1510, longitude: -75.0390 },
  { id: 'a7', code: 'MUF-002', name: 'Mufla Secundaria Fresno', type: 'MUFLAS', status: 'ACTIVO', certStatus: 'VALIDADO', latitude: 5.1548, longitude: -75.0355 },
  { id: 'a8', code: 'SPL-001', name: 'Splitter Principal', type: 'SPLITTERS', status: 'ACTIVO', certStatus: 'PENDIENTE', latitude: 5.1528, longitude: -75.0369 },
  { id: 'a9', code: 'CAJ-005', name: 'Caja Fresno Parque', type: 'CAJAS', status: 'PENDIENTE_INSTALACION', certStatus: 'PENDIENTE', latitude: 5.1505, longitude: -75.0330 },
  { id: 'a10', code: 'CTO-002', name: 'CTO Fresno Norte', type: 'CTO', status: 'ACTIVO', certStatus: 'CERTIFICADO', latitude: 5.1595, longitude: -75.0410 },
  { id: 'a11', code: 'CAJ-006', name: 'Caja Fresno Estadio', type: 'CAJAS', status: 'ACTIVO', certStatus: 'PENDIENTE', latitude: 5.1535, longitude: -75.0325 },
  { id: 'a12', code: 'MUF-003', name: 'Mufla Terciaria', type: 'MUFLAS', status: 'FUERA_DE_SERVICIO', certStatus: 'PENDIENTE', latitude: 5.1560, longitude: -75.0380 },
  { id: 'a13', code: 'CAJ-007', name: 'Caja Fresno Río', type: 'CAJAS', status: 'ACTIVO', certStatus: 'VALIDADO', latitude: 5.1480, longitude: -75.0358 },
  { id: 'a14', code: 'SPL-002', name: 'Splitter Secundario', type: 'SPLITTERS', status: 'ACTIVO', certStatus: 'PENDIENTE', latitude: 5.1540, longitude: -75.0345 },
  { id: 'a15', code: 'POST-001', name: 'Poste Principal Fresno', type: 'POSTES', status: 'ACTIVO', certStatus: 'CERTIFICADO', latitude: 5.1520, longitude: -75.0375 },
];

const MOCK_MUNICIPALITIES = [
  { id: 'm1', name: 'Fresno' },
  { id: 'm2', name: 'Mariquita' },
  { id: 'm3', name: 'Herveo' },
];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TourPage() {
  const [municipalityId, setMunicipalityId] = useState('');
  const [tourStarted, setTourStarted] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [validatedIds, setValidatedIds] = useState<Set<string>>(new Set());
  const [validationModal, setValidationModal] = useState<TourAsset | null>(null);
  const [validationAction, setValidationAction] = useState<VerificationAction>('CONFIRMADO');
  const [validationObs, setValidationObs] = useState('');
  const [validationLat, setValidationLat] = useState('');
  const [validationLng, setValidationLng] = useState('');
  const [validationPhotos, setValidationPhotos] = useState<File[]>([]);

  const assets = useMemo(() => {
    if (!gpsPosition) return MOCK_ASSETS_FOR_TOUR;
    return MOCK_ASSETS_FOR_TOUR.map((a) => ({
      ...a,
      distance: haversine(gpsPosition.lat, gpsPosition.lng, a.latitude, a.longitude),
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [gpsPosition]);

  const pendingAssets = assets.filter((a) => !validatedIds.has(a.id));
  const validatedCount = validatedIds.size;
  const totalCount = assets.length;
  const progressPct = totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0;

  const startTour = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no disponible en este navegador');
      setGpsPosition({ lat: 5.1523, lng: -75.0365 });
      setTourStarted(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setTourStarted(true);
      },
      () => {
        alert('No se pudo obtener la posición GPS. Usando ubicación por defecto.');
        setGpsPosition({ lat: 5.1523, lng: -75.0365 });
        setTourStarted(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const openValidation = (asset: TourAsset) => {
    setValidationModal(asset);
    setValidationAction('CONFIRMADO');
    setValidationObs('');
    setValidationLat(asset.latitude.toString());
    setValidationLng(asset.longitude.toString());
    setValidationPhotos([]);
  };

  const submitValidation = () => {
    if (!validationModal) return;
    setValidatedIds((prev) => new Set(prev).add(validationModal.id));
    setValidationModal(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recorrido Técnico</h1>
          <p className="text-slate-500 mt-1">Validación en campo de activos FTTH</p>
        </div>

        {!tourStarted && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="max-w-md">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Seleccionar municipio</label>
              <select
                value={municipalityId}
                onChange={(e) => setMunicipalityId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500 mb-4"
              >
                <option value="">Seleccione...</option>
                {MOCK_MUNICIPALITIES.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                onClick={startTour}
                disabled={!municipalityId}
                className="px-6 py-3 bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Iniciar recorrido
              </button>
              <p className="text-xs text-slate-400 mt-2">El navegador solicitará acceso a tu ubicación GPS</p>
            </div>
          </div>
        )}

        {tourStarted && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">Progreso</span>
                  <span className="text-lg font-bold text-slate-900">{validatedCount} de {totalCount}</span>
                  <span className="text-xs text-slate-400">activos validados</span>
                </div>
                <span className="text-sm font-medium text-interplay-600">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className="bg-interplay-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {validatedCount === totalCount ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <h2 className="text-xl font-bold text-green-800 mb-2">¡Recorrido completado!</h2>
                <p className="text-green-700">Todos los activos han sido validados en este municipio.</p>
                <button
                  onClick={() => { setTourStarted(false); setValidatedIds(new Set()); setGpsPosition(null); }}
                  className="mt-4 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Finalizar recorrido
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAssets.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-400">{a.code}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                            a.certStatus === 'CERTIFICADO' ? 'bg-green-100 text-green-700' :
                            a.certStatus === 'VALIDADO' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {a.certStatus}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate">{a.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{a.type}</span>
                          <span className="text-xs text-slate-400">{a.status.replace(/_/g, ' ')}</span>
                          {a.distance !== undefined && (
                            <span className="text-xs text-slate-400">
                              {a.distance < 1 ? `${Math.round(a.distance * 1000)} m` : `${a.distance.toFixed(1)} km`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openValidation(a)}
                        className="ml-4 px-4 py-2 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600 transition-colors shrink-0"
                      >
                        Validar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {validationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setValidationModal(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Validar Activo</h3>

              <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-1">
                <p className="text-sm"><span className="text-slate-500">Código:</span> <span className="font-mono font-medium">{validationModal.code}</span></p>
                <p className="text-sm"><span className="text-slate-500">Nombre:</span> <span className="font-medium">{validationModal.name}</span></p>
                <p className="text-sm"><span className="text-slate-500">Tipo:</span> <span className="font-medium">{validationModal.type}</span></p>
                <p className="text-sm"><span className="text-slate-500">Coordenadas:</span> <span className="font-mono">{validationModal.latitude}, {validationModal.longitude}</span></p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Acción</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['CONFIRMADO', '✅ Confirmado'],
                    ['CORREGIDO', '✏️ Corregido'],
                    ['NUEVO', '➕ Nuevo'],
                    ['RETIRADO', '❌ Retirado'],
                    ['REQUIERE_REVISION', '⚠️ Requiere revisión'],
                  ] as [VerificationAction, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setValidationAction(value)}
                      className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                        validationAction === value
                          ? 'border-interplay-500 bg-interplay-50 text-interplay-700 font-medium'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-slate-500">Latitud (GPS)</label>
                  <input
                    value={validationLat}
                    onChange={(e) => setValidationLat(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Longitud (GPS)</label>
                  <input
                    value={validationLng}
                    onChange={(e) => setValidationLng(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-500">Observaciones</label>
                <textarea
                  value={validationObs}
                  onChange={(e) => setValidationObs(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-500">Fotografías</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setValidationPhotos(Array.from(e.target.files || []))}
                  className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-interplay-50 file:text-interplay-700 hover:file:bg-interplay-100"
                />
                {validationPhotos.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{validationPhotos.length} archivo(s) seleccionado(s)</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setValidationModal(null)} className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg">
                  Cancelar
                </button>
                <button
                  onClick={submitValidation}
                  className="flex-1 px-4 py-2.5 text-sm bg-interplay-500 text-white rounded-lg hover:bg-interplay-600"
                >
                  Guardar validación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
