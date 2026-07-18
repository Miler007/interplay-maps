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
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.assets.getById(id).then((a: any) => {
      setAsset(a);
      setTotalPorts(a.capacity?.totalPorts || 0);
      setFreePorts(a.capacity?.freePorts || 0);
      setObs(a.observations || '');
      const boxCode = a.code;
      api.assets.getAll({ search: 'CLI-', limit: '200' }).then((res: any) => {
        const items = res.data || res || [];
        const list = Array.isArray(items) ? items : [];
        setClients(list.filter((c: any) => c.assetType?.code === 'CLIENTE' && c.code.endsWith('-' + boxCode)));
      }).catch(() => {});
    }).catch(() => setError('Error al cargar')).finally(() => setLoading(false));
  }, [id]);

  const captureGps = () => {
    if (!navigator.geolocation) { setGpsStatus('GPS no disponible'); return; }
    setGpsStatus('Capturando...');
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsStatus('✅ OK'); },
      () => setGpsStatus('Error GPS'), { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id || '00000000-0000-0000-0000-000000000000';
      const newObs = `Puertos: ${totalPorts} totales, ${totalPorts - freePorts} usados, ${freePorts} libres. Fibra: ${fiberColor} ${fiberCount}. ${obs}`;
      await api.certification.validate(id, { userId, gpsLatitude: gps?.lat, gpsLongitude: gps?.lng, observations: newObs });
      alert('✅ Caja validada');
      router.push('/certification/');
    } catch (e: any) {
      alert('Error: ' + (e?.message || 'desconocido'));
    }
    setSaving(false);
  };

  if (loading) return <DashboardLayout><p className="p-8 text-slate-400">Cargando...</p></DashboardLayout>;
  if (error) return <DashboardLayout><p className="p-8 text-red-500">{error}</p></DashboardLayout>;
  if (!asset) return <DashboardLayout><p className="p-8 text-slate-400">Activo no encontrado</p></DashboardLayout>;

  const usedPorts = totalPorts - freePorts;

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6 p-4">
        <div>
          <h1 className="text-xl font-bold">Validar: {asset.code}</h1>
          <p className="text-slate-500 text-sm">{asset.name}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="font-semibold">📍 Ubicación</h2>
          <div className="flex gap-2 items-center">
            <button onClick={captureGps} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">📡 GPS</button>
            <span className="text-sm text-slate-500">{gpsStatus || (asset.latitude ? `${asset.latitude.toFixed(5)}, ${asset.longitude.toFixed(5)}` : 'Sin coordenadas')}</span>
          </div>
          {gps && <p className="text-xs text-emerald-600">Nuevo: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="font-semibold">🔌 Puertos</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500">Totales</label>
              <select value={totalPorts} onChange={e => { setTotalPorts(Number(e.target.value)); if (Number(e.target.value) < freePorts) setFreePorts(Number(e.target.value)); }} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
                <option value={0}>—</option><option value={8}>8</option><option value={16}>16</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">Solo 8 o 16 puertos</p>
            </div>
            <div>
              <label className="text-xs text-slate-500">Libres</label>
              <input type="number" min={0} max={totalPorts} value={freePorts} onChange={e => setFreePorts(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Usados</label>
              <p className="mt-2 text-xl font-bold">{usedPorts}</p>
            </div>
          </div>
          {totalPorts > 0 && <div className="w-full bg-slate-200 rounded-full h-3"><div className={`h-full rounded-full ${usedPorts/totalPorts > 0.8 ? 'bg-red-500' : usedPorts/totalPorts > 0.6 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${(usedPorts/totalPorts)*100}%` }}></div></div>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="font-semibold">🔗 Fibra</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Color</label>
              <select value={fiberColor} onChange={e => setFiberColor(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">—</option>
                {[
                  {c:'Azul', n:'1'}, {c:'Naranja', n:'2'}, {c:'Verde', n:'3'}, {c:'Café', n:'4'},
                  {c:'Pizarra', n:'5'}, {c:'Blanco', n:'6'}, {c:'Rojo', n:'7'}, {c:'Negro', n:'8'},
                  {c:'Amarillo', n:'9'}, {c:'Violeta', n:'10'}, {c:'Rosado', n:'11'}, {c:'Celeste', n:'12'},
                ].map(({c, n}) => <option key={c} value={c}>{c} (#{n})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Hilos</label>
              <select value={fiberCount} onChange={e => setFiberCount(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">—</option>                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="8">8</option><option value="12">12</option><option value="24">24</option><option value="48">48</option><option value="96">96</option><option value="144">144</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
          <h2 className="font-semibold">👥 Clientes ({clients.length})</h2>
          {totalPorts > 0 && clients.length > totalPorts && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg font-semibold">⚠ {clients.length} clientes para {totalPorts} puertos — excede la capacidad</div>}
          {totalPorts > 0 && clients.length <= totalPorts && <div className="bg-emerald-50 text-emerald-600 text-xs px-3 py-2 rounded-lg">{clients.length} de {totalPorts} puertos ocupados ({Math.round(clients.length/totalPorts*100)}%)</div>}
          {clients.length === 0 ? <p className="text-sm text-slate-400">Sin clientes</p> : (
            <div className="max-h-40 overflow-y-auto text-sm space-y-1">
              {clients.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 py-1 px-2 hover:bg-slate-50 rounded">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="font-medium">{c.code}</span>
                  <span className="text-slate-500 truncate">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <label className="text-xs text-slate-500">Observaciones</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
            {saving ? 'Guardando...' : '✅ Validar'}
          </button>
          <button onClick={() => router.push('/certification/')} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200">← Volver</button>
        </div>
      </div>
    </DashboardLayout>
  );
}
