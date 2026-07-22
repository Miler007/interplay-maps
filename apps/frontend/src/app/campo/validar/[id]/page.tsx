'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

const S = {
  container: "max-w-2xl mx-auto space-y-4",
  card: "bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden",
  cardHeader: "px-5 pt-5 pb-3 flex items-center gap-3",
  cardBody: "px-5 pb-5",
  badge: (active: boolean) =>
    `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
      active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
    }`,
  input: "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-interplay-500/20 focus:border-interplay-500 transition-all",
  select: "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-interplay-500/20 focus:border-interplay-500 transition-all appearance-none cursor-pointer",
  statBox: "bg-slate-50 rounded-xl p-4 text-center",
  statLabel: "text-[11px] font-medium text-slate-400 uppercase tracking-wide",
  statValue: "text-2xl font-bold text-slate-800 mt-1",
  btn: "flex-1 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50",
};

const Icons = {
  gps: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>',
  ports: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>',
  fiber: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  client: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  alert: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

function purpleIcon() {
  if (typeof window === 'undefined') return undefined;
  try { return (window as any).L.divIcon({ className: '', html: '<div style="width:28px;height:28px;background:#a855f7;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 2px 16px rgba(168,85,247,.6),0 0 0 4px rgba(168,85,247,.2);cursor:grab"></div><div style="width:2px;height:16px;background:rgba(168,85,247,.4);margin:0 auto"></div>', iconSize: [28, 46], iconAnchor: [14, 46] }); }
  catch { return undefined; }
}
function SvgIcon({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

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
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', doc: '', addr: '' });
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!id) return;
    api.assets.getById(id).then((a: any) => {
      setAsset(a);
      setTotalPorts(a.capacity?.totalPorts || 0);
      setFreePorts(a.capacity?.freePorts || 0);
      setObs(a.observations || '');
      api.assets.getAll({ search: 'CLI-', limit: '200' }).then((res: any) => {
        const items = res.data || res || [];
        const list = Array.isArray(items) ? items : [];
        setClients(list.filter((c: any) => c.assetType?.code === 'CLIENTE' && c.code.endsWith('-' + a.code)));
      }).catch(() => {});
    }).catch(() => setError('Error al cargar')).finally(() => setLoading(false));
  }, [id]);

  const captureGps = () => {
    if (!navigator.geolocation) { setGpsStatus('GPS no disponible'); return; }
    setGpsStatus('Capturando...');
    navigator.geolocation.getCurrentPosition(
      (p) => { const pos = { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }; setGps(pos); setGpsStatus('Listo'); },
      () => setGpsStatus('Error'), { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id || '00000000-0000-0000-0000-000000000000';
      const newObs = [obs, `Puertos: ${totalPorts}T / ${totalPorts - freePorts}U / ${freePorts}L`, fiberColor && `Fibra: ${fiberColor} ${fiberCount}h`].filter(Boolean).join('. ');
      await api.certification.validate(id, { userId, gpsLatitude: gps?.lat, gpsLongitude: gps?.lng, observations: newObs });
      if (gps) {
        await api.assets.update(id, { latitude: gps.lat, longitude: gps.lng }).catch(() => {});
      }
      alert('✅ Caja validada correctamente');
      router.push('/certification/');
    } catch (e: any) { alert('Error: ' + (e?.message || 'desconocido')); }
    setSaving(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-interplay-500 border-t-transparent rounded-full" /></div></DashboardLayout>;
  if (error) return <DashboardLayout><p className="p-8 text-red-500">{error}</p></DashboardLayout>;
  if (!asset) return <DashboardLayout><p className="p-8 text-slate-400">Activo no encontrado</p></DashboardLayout>;

  const usedPorts = totalPorts - freePorts;
  const pct = totalPorts > 0 ? usedPorts / totalPorts : 0;
  const barColor = pct >= 0.85 ? 'bg-red-500' : pct >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <DashboardLayout>
      <div className={S.container}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/certification/')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><SvgIcon html={Icons.arrowLeft} /></button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{asset.code}</h1>
            <p className="text-sm text-slate-400">{asset.name}</p>
          </div>
          <div className="ml-auto flex gap-1.5">
            <span className={S.badge(asset.status === 'ACTIVO')}>{asset.status}</span>
            <span className={S.badge(asset.certStatus === 'CERTIFICADO')}>{asset.certStatus}</span>
          </div>
        </div>

        <div className={S.card}>
          <div className={S.cardHeader}><SvgIcon html={Icons.gps} className="text-blue-500" /><h2 className="font-semibold text-sm text-slate-800">Ubicación GPS</h2></div>
          <div className={S.cardBody}>
            <button onClick={captureGps} className="w-full mb-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
              <SvgIcon html={Icons.gps} /> {gpsStatus || 'Capturar ubicación actual'}
            </button>
            {gps && <p className="text-xs text-slate-400 mb-2 text-center">Arrastra el marcador 🟣 sobre el mapa para ajustar la ubicación exacta</p>}
            {gps && isClient && <div className="h-56 rounded-xl overflow-hidden border border-slate-200 relative">
              <MapContainer center={[gps.lat, gps.lng]} zoom={19} className="h-full w-full" zoomControl={false} scrollWheelZoom={true}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="" />
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="" opacity={0.5} />
                <Marker position={[gps.lat, gps.lng]} draggable={true} icon={purpleIcon()}
                  eventHandlers={{ dragend: (e: any) => { const p = e.target.getLatLng(); setGps({ lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) }); } }}
                />
              </MapContainer>
            </div>}
            {!gps && asset.latitude && isClient && <div className="h-40 rounded-xl overflow-hidden border border-slate-200 opacity-60">
              <MapContainer center={[asset.latitude, asset.longitude]} zoom={16} className="h-full w-full" zoomControl={false} scrollWheelZoom={false}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="" />
              </MapContainer>
            </div>}
            {gps && <p className="text-xs text-slate-400 mt-2 text-center font-mono">{gps.lat}, {gps.lng}</p>}
          </div>
        </div>

        <div className={S.card}>
          <div className={S.cardHeader}><SvgIcon html={Icons.ports} className="text-amber-500" /><h2 className="font-semibold text-sm text-slate-800">Puertos</h2></div>
          <div className={S.cardBody}>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">Totales</p>
                <select value={totalPorts} onChange={e => { const v = +e.target.value; setTotalPorts(v); if (v < freePorts) setFreePorts(v); }} className={S.select}>
                  <option value={0}>—</option><option value={8}>8</option><option value={16}>16</option>
                </select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">Libres</p>
                <input type="number" min={0} max={totalPorts} value={freePorts} onChange={e => setFreePorts(Math.min(+e.target.value, totalPorts))} className={S.input} />
              </div>
              <div className={S.statBox}><p className={S.statLabel}>Usados</p><p className={S.statValue}>{usedPorts}</p></div>
            </div>
            {totalPorts > 0 && <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct * 100}%` }}></div></div>}
            {totalPorts > 0 && <p className="text-[11px] text-slate-400 mt-2">{Math.round(pct * 100)}% ocupado · {freePorts} puertos libres</p>}
          </div>
        </div>

        <div className={S.card}>
          <div className={S.cardHeader}><SvgIcon html={Icons.fiber} className="text-violet-500" /><h2 className="font-semibold text-sm text-slate-800">Fibra óptica</h2></div>
          <div className={S.cardBody}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">Color del hilo</p>
                <select value={fiberColor} onChange={e => setFiberColor(e.target.value)} className={S.select}>
                  <option value="">Seleccionar</option>
                  {[{c:'Azul',n:'#1'},{c:'Naranja',n:'#2'},{c:'Verde',n:'#3'},{c:'Café',n:'#4'},{c:'Pizarra',n:'#5'},{c:'Blanco',n:'#6'},{c:'Rojo',n:'#7'},{c:'Negro',n:'#8'},{c:'Amarillo',n:'#9'},{c:'Violeta',n:'#10'},{c:'Rosado',n:'#11'},{c:'Celeste',n:'#12'}].map(({c,n}) => <option key={c} value={c}>{c} {n}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">Hilos</p>
                <select value={fiberCount} onChange={e => setFiberCount(e.target.value)} className={S.select}>
                  <option value="">—</option>
                  {[1,2,3,4,8,12,24,48,96,144].map(n => <option key={n} value={n}>{n} hilos</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={S.card}>
          <div className={S.cardHeader}><SvgIcon html={Icons.client} className="text-indigo-500" /><h2 className="font-semibold text-sm text-slate-800">Clientes <span className="text-slate-400 font-normal">({clients.length})</span></h2></div>
          <div className={S.cardBody}>
            {totalPorts > 0 && <div className={`mb-3 text-xs font-medium px-3 py-2 rounded-xl ${clients.length > totalPorts ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {clients.length > totalPorts ? `${clients.length} clientes exceden los ${totalPorts} puertos` : `${clients.length} de ${totalPorts} puertos ocupados (${Math.round(clients.length/totalPorts*100)}%)`}
            </div>}
            <div className="max-h-44 overflow-y-auto space-y-0.5 mb-4">
              {clients.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">Sin clientes registrados</p> : clients.map((c: any) => (
                <div key={c.id} className="group flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 min-w-[60px]">{c.code.replace('CLI-','')}</span>
                  <span className="text-xs text-slate-500 truncate flex-1">{c.name}</span>
                  <button onClick={async () => { if (!confirm(`Retirar a "${c.name}"?`)) return; try { await api.assets.delete(c.id); setFreePorts(p => Math.min(p + 1, totalPorts)); setClients(prev => prev.filter(x => x.id !== c.id)); } catch {} }} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all" title="Retirar cliente"><SvgIcon html={Icons.x} /></button>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <button onClick={() => setShowAddClient(!showAddClient)} className="flex items-center gap-2 text-sm font-semibold text-interplay-600 hover:text-interplay-700 transition-colors">
                <SvgIcon html={Icons.plus} /> {showAddClient ? 'Cancelar' : 'Añadir cliente'}
              </button>
              {showAddClient && <div className="mt-3 space-y-2.5">
                <input value={newClient.name} onChange={e => setNewClient(p => ({...p, name: e.target.value}))} placeholder="Nombre completo" className={S.input} />
                <div className="grid grid-cols-2 gap-2.5">
                  <input value={newClient.doc} onChange={e => setNewClient(p => ({...p, doc: e.target.value}))} placeholder="Cédula" className={S.input} />
                  <input value={newClient.addr} onChange={e => setNewClient(p => ({...p, addr: e.target.value}))} placeholder="Dirección" className={S.input} />
                </div>
                <button onClick={async () => {
                  if (!newClient.name.trim()) return;
                  if (freePorts <= 0) { alert('No hay puertos libres'); return; }
                  try { await api.assets.create({ code: `CLI-${Date.now()}-${asset.code}`, name: newClient.name, assetTypeId: 'd5ba7941-8e96-4521-b710-807be644059a', departmentId: asset.departmentId, municipalityId: asset.municipalityId, projectId: asset.projectId, observations: `Doc: ${newClient.doc}, Dir: ${newClient.addr}` }); setFreePorts(p => p - 1); setShowAddClient(false); setNewClient({name:'',doc:'',addr:''}); location.reload(); } catch (e: any) { alert('Error: ' + (e?.message || '')); }
                }} className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  <SvgIcon html={Icons.plus} /> Ocupar puerto ({freePorts} libres)
                </button>
              </div>}
            </div>
          </div>
        </div>

        <div className={S.card}>
          <div className={S.cardHeader}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-slate-400"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><h2 className="font-semibold text-sm text-slate-800">Notas</h2></div>
          <div className={S.cardBody}>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} className={S.input} placeholder="Splitters, referencia de ubicación, observaciones..." />
          </div>
        </div>

        <div className="flex gap-3 pb-8">
          <button onClick={handleSave} disabled={saving} className={`${S.btn} bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2`}>
            <SvgIcon html={Icons.check} /> {saving ? 'Guardando...' : 'Validar caja'}
          </button>
          <button onClick={() => router.push('/certification/')} className={`${S.btn} bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center gap-2`}>
            <SvgIcon html={Icons.x} /> Cancelar
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
