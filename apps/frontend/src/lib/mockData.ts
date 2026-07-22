const CENTER_LAT = 5.150;
const CENTER_LNG = -75.04;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randOffset(rand: () => number, range: number) {
  return (rand() - 0.5) * range * 2;
}

function generateFeatures(): GeoJSON.FeatureCollection {
  const rand = rng(42);
  const features: GeoJSON.Feature[] = [];

  const types: Record<string, { name: string; color: string }> = {
    CAJA: { name: 'Caja FTTH', color: '#10b981' },
    NODO: { name: 'Nodo Óptico', color: '#06b6d4' },
    POSTE: { name: 'Poste', color: '#ef4444' },
    CLIENTE: { name: 'Cliente', color: '#6366f1' },
    CTO: { name: 'CTO', color: '#3b82f6' },
    SPLITTER: { name: 'Splitter', color: '#8b5cf6' },
    MUFLAS: { name: 'Mufa', color: '#f59e0b' },
  };

  const statuses = ['ACTIVO', 'ACTIVO', 'ACTIVO', 'ACTIVO', 'PENDIENTE', 'INACTIVO'];
  const prefixes: Record<string, string> = {
    CAJA: 'CAJ', NODO: 'NOD', POSTE: 'PST', CLIENTE: 'CLI', CTO: 'CTO', SPLITTER: 'SPL', MUFLAS: 'MUF',
  };

  const generatePoints = (type: string, count: number, spread: number) => {
    for (let i = 0; i < count; i++) {
      const lat = CENTER_LAT + randOffset(rand, spread / 111);
      const lng = CENTER_LNG + randOffset(rand, spread / (111 * Math.cos(CENTER_LAT * Math.PI / 180)));
      const status = statuses[Math.floor(rand() * statuses.length)];
      const seq = String(i + 1).padStart(4, '0');
      const code = `${prefixes[type]}-${seq}`;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          id: `mock-${type.toLowerCase()}-${seq}`,
          type,
          typeName: types[type].name,
          name: `${types[type].name} ${code}`,
          code,
          status,
          department: 'Tolima',
          municipality: 'Fresno',
          confidenceScore: Math.floor(rand() * 40 + 60),
          healthScore: Math.floor(rand() * 35 + 65),
          totalPorts: type === 'CAJA' ? 16 : type === 'CTO' ? 8 : undefined,
          freePorts: type === 'CAJA' ? Math.floor(rand() * 8) : type === 'CTO' ? Math.floor(rand() * 4) : undefined,
          usedPorts: type === 'CAJA' ? 16 - Math.floor(rand() * 8) : type === 'CTO' ? 8 - Math.floor(rand() * 4) : undefined,
        },
      });
    }
  };

  generatePoints('NODO', 5, 0.02);
  generatePoints('POSTE', 25, 0.03);
  generatePoints('CAJA', 18, 0.025);
  generatePoints('CTO', 8, 0.02);
  generatePoints('SPLITTER', 6, 0.025);
  generatePoints('MUFLAS', 4, 0.02);
  generatePoints('CLIENTE', 20, 0.03);

  return { type: 'FeatureCollection', features };
}

export const mockLayers = [
  { id: 'layer-1', name: 'Red Principal', description: 'Nodos y CTOs principales', color: '#06b6d4' },
  { id: 'layer-2', name: 'Red Secundaria', description: 'Cajas y postes', color: '#10b981' },
  { id: 'layer-3', name: 'Clientes', description: 'Clientes activos', color: '#6366f1' },
  { id: 'layer-4', name: 'Splitter / Muflas', description: 'Splitters y muflas', color: '#8b5cf6' },
];

let cachedGeoJSON: GeoJSON.FeatureCollection | null = null;

function getFilteredGeoJSON(layerId?: string): GeoJSON.FeatureCollection {
  if (!cachedGeoJSON) cachedGeoJSON = generateFeatures();

  if (!layerId) return cachedGeoJSON;

  const typeMap: Record<string, string[]> = {
    'layer-1': ['NODO', 'CTO'],
    'layer-2': ['CAJA', 'POSTE'],
    'layer-3': ['CLIENTE'],
    'layer-4': ['SPLITTER', 'MUFLAS'],
  };

  const allowedTypes = typeMap[layerId];
  if (!allowedTypes) return { type: 'FeatureCollection', features: [] };

  return {
    type: 'FeatureCollection',
    features: cachedGeoJSON.features.filter(
      (f) => f.properties && allowedTypes.includes(f.properties.type)
    ),
  };
}

export const mockApi = {
  layers: {
    getAll: () => Promise.resolve(mockLayers),
  },
  gis: {
    getGeoJSON: (params?: Record<string, string>) =>
      Promise.resolve(getFilteredGeoJSON(params?.layerId)),
  },
  assets: {
    getAll: (params?: Record<string, string>) => {
      if (!cachedGeoJSON) cachedGeoJSON = generateFeatures();
      const items = cachedGeoJSON.features
        .filter((f) => f.properties)
        .map((f: any) => ({
          id: f.properties.id,
          code: f.properties.code,
          name: f.properties.name,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          status: f.properties.status,
          assetType: { code: f.properties.type },
        }));
      if (params?.search) {
        const q = params.search.toLowerCase();
        return Promise.resolve({ data: items.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) });
      }
      return Promise.resolve({ data: items });
    },
    create: (data: any) => Promise.resolve({ id: 'mock-' + Date.now(), ...data }),
  },
  capacity: {
    update: (code: string, data: any) => Promise.resolve({ code, ...data }),
  },
};
