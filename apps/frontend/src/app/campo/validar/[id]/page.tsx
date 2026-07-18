'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

export default function FieldValidationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [asset, setAsset] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState('');
  const [totalPorts, setTotalPorts] = useState(0);
  const [freePorts, setFreePorts] = useState(0);
  const [fiberColor, setFiberColor] = useState('');
  const [fiberCount, setFiberCount] = useState('');
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (!id) return;
    api.assets.getById(id).then((a) => {
      setAsset(a);
      setTotalPorts(a.capacity?.totalPorts || 0);
      setFreePorts(a.capacity?.freePorts || 0);
      setObservations(a.observations || '');
      const prefix = a.code;
      api.assets.getAll({ search: prefix, limit: '50' }).then((res: any) => {
        const items = res.data || res || [];
        setClients(Array.isArray(items) ? items.filter((c: any) => c.assetType?.code === 'CLIENTE') : []);
      }).catch(() => {});
    }).catch(() => setAsset(null)).finally(() => setLoading(false));
  }, [id]);

  const captureGps = () => {
    if (!navigator.geolocation) { setGpsStatus('GPS no disponible'); return; }
    setGpsStatus('Capturando GPS...');
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsStatus('✅ GPS capturado'); },
      () => { setGpsStatus('Error GPS. Ingrese manual.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id || '00000000-0000-0000-0000-000000000000';
      await api.assets.update(id, {
        latitude: gps?.lat || asset.latitude,
        longitude: gps?.lng || asset.longitude,
        observations: observations,
      });
      await api.certification.validate(id, {
        userId,
        gpsLatitude: gps?.lat,
        gpsLongitude: gps?.lng,
        observations: `Validado en campo. Puertos: ${totalPorts} totales, ${totalPorts - freePorts} usados, ${freePorts} libres. Fibra: ${fiberColor} ${fiberCount}`,
      });
      alert('✅ Caja validada correctamente');
      router.push('/certification/');
    } catch (e: any) {
      alert('Error: ' + (e?.message || 'desconocido'));
    }
    setSaving(false);
  };

  if (loading) return <DashboardLayout><p className="text-slate-400">Cargando...</p></DashboardLayout>;
  if (!asset) return <DashboardLayout><p className="text-slate-400">Activo no encontrado</p></DashboardLayout>;

  const usedPorts = totalPorts - freePorts;
  const isCaja = asset.assetType?.code === 'CAJA';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Validación en Campo</h1>
          <p className="text-slate-500">{asset.code} — {asset.name}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-lg">📍 Ubicación GPS</h2>
          <div className="flex items-center gap-3">
            <button onClick={captureGps} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">📡 Capturar GPS</button>
            <span className="text-sm text-slate-500">{gpsStatus || (asset.latitude ? `Actual: ${asset.latitude.toFixed(5)}, ${asset.longitude.toFixed(5)}` : 'Sin coordenadas')}</span>
          </div>
          {gps && <p className="text-sm text-emerald-600">Nuevas coordenadas: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>}
        </div>

        {isCaja && <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-lg">🔌 Puertos</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500">Puertos totales</label>
                <select value={totalPorts} onChange={e => setTotalPorts(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value={0}>—</option><option value={8}>8</option><option value={16}>16</option><option value={24}>24</option><option value={32}>32</option><option value={48}>48</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Puertos libres</label>
                <input type="number" min={0} max={totalPorts} value={freePorts} onChange={e => setFreePorts(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Puertos usados</label>
                <p className="mt-2 text-2xl font-bold">{usedPorts}</p>
              </div>
            </div>
            {totalPorts > 0 && <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div className={`h-full ${usedPorts / totalPorts > 0.8 ? 'bg-red-500' : usedPorts / totalPorts > 0.6 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${(usedPorts / totalPorts) * 100}%` }}></div>
            </div>}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-lg">🔗 Fibra</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500">Color de hilo</label>
                <select value={fiberColor} onChange={e => setFiberColor(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="">—</option>
                  {['Naranja', 'Verde', 'Azul', 'Rojo', 'Blanco', 'Amarillo', 'Café', 'Gris', 'Negro', 'Violeta', 'Rosado', 'Celeste'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Hilos de fibra</label>
                <select value={fiberCount} onChange={e => setFiberCount(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="">—</option><option value="12">12 hilos</option><option value="24">24 hilos</option><option value="48">48 hilos</option><option value="96">96 hilos</option><option value="144">144 hilos</option>
                </select>
              </div>
            </div>
          </div>
        </>}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-lg">📝 Observaciones</h2>
          <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Fibra, splitters, ubicación exacta, etc." />
        </div>

        {isCaja && clients.length > 0 && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
          <h2 className="font-semibold text-lg">👥 Clientes ({clients.length})</h2>
          <div className="max-h-48 overflow-y-auto text-sm space-y-1">
            {clients.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 py-1 px-2 hover:bg-slate-50 rounded">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="font-medium">{c.code}</span>
                <span className="text-slate-500 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>}

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
            {saving ? 'Guardando...' : '✅ Validar y Guardar'}
          </button>
          <button onClick={() => router.back()} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200">Cancelar</button>
        </div>
      </div>
    </DashboardLayout>
  );
}
