const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://interplay-maps.onrender.com/api/v1';

type RequestInitWithTimeout = RequestInit & { timeout?: number };

async function fetchApi<T>(endpoint: string, options?: RequestInitWithTimeout): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const controller = new AbortController();
  const timeout = options?.timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `Error ${res.status}` }));
      throw new Error(error.message || `Error ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado');
    throw err;
  }
}

export const api = {
  auth: {
    login: (email: string, password: string, timeout?: number) =>
      fetchApi<{ accessToken: string; refreshToken: string; expiresIn: number; user: any }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }), timeout,
      }),
    refresh: (refreshToken: string) =>
      fetchApi<any>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    register: (email: string, password: string, name: string) =>
      fetchApi<any>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  },

  municipalities: {
    getDepartments: () => fetchApi<any[]>('/municipalities/departments'),
    createDepartment: (name: string) =>
      fetchApi<any>('/municipalities/departments', { method: 'POST', body: JSON.stringify({ name }) }),
    getByDepartment: (departmentId: string) => fetchApi<any[]>(`/municipalities/department/${departmentId}`),
    create: (data: any) => fetchApi<any>('/municipalities', { method: 'POST', body: JSON.stringify(data) }),
    getProjects: (municipalityId: string) => fetchApi<any[]>(`/municipalities/${municipalityId}/projects`),
    createProject: (municipalityId: string, data: any) =>
      fetchApi<any>(`/municipalities/${municipalityId}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  },

  assetTypes: {
    getAll: () => fetchApi<any[]>('/asset-types'),
    getAttributes: (typeId: string) => fetchApi<any[]>(`/asset-types/${typeId}/attributes`),
  },

  assets: {
    getAll: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi<any>(`/assets${query}`);
    },
    getById: (id: string) => fetchApi<any>(`/assets/${id}`),
    create: (data: any) => fetchApi<any>('/assets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/assets/${id}`, { method: 'DELETE' }),
  },

  gis: {
    getGeoJSON: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi<any>(`/gis/geojson${query}`);
    },
    nearest: (lat: number, lng: number, type?: string) =>
      fetchApi<any>(`/gis/nearest?lat=${lat}&lng=${lng}${type ? `&type=${type}` : ''}`),
    boundingBox: (bounds: { north: number; south: number; east: number; west: number }, type?: string) => {
      let q = `/gis/bounding-box?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;
      if (type) q += `&type=${type}`;
      return fetchApi<any>(q);
    },
    distanceMatrix: (points: Array<{ lat: number; lng: number }>) =>
      fetchApi<any>('/gis/distance-matrix', { method: 'POST', body: JSON.stringify({ points }) }),
    spatialIndexValidation: (municipalityId?: string) =>
      fetchApi<any>(`/gis/spatial-index-validation${municipalityId ? `?municipalityId=${municipalityId}` : ''}`),
    distance: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
      fetchApi<any>(`/gis/distance?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`),
    clusters: (zoom: number, bounds?: { north: number; south: number; east: number; west: number }) => {
      let q = `/gis/clusters?zoom=${zoom}`;
      if (bounds) q += `&north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;
      return fetchApi<any>(q);
    },
    validateCoords: (lat: number, lng: number, municipalityId?: string) =>
      fetchApi<any>(`/gis/validate-coords?lat=${lat}&lng=${lng}${municipalityId ? `&municipalityId=${municipalityId}` : ''}`),
  },

  layers: {
    getAll: () => fetchApi<any[]>('/layers'),
    getAssets: (layerId: string) => fetchApi<any[]>(`/layers/${layerId}/assets`),
    create: (data: any) => fetchApi<any>('/layers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/layers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/layers/${id}`, { method: 'DELETE' }),
  },

  import: {
    simulate: (file: File, municipalityId?: string, projectId?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (municipalityId) formData.append('municipalityId', municipalityId);
      if (projectId) formData.append('projectId', projectId);
      return fetchApi<any>('/import/simulate', {
        method: 'POST', body: formData, timeout: 60000,
      });
    },
    execute: (file: File, simulation: any, municipalityId?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('simulation', JSON.stringify(simulation));
      if (municipalityId) formData.append('municipalityId', municipalityId);
      return fetchApi<any>('/import/execute', {
        method: 'POST', body: formData, timeout: 120000,
      });
    },
    upload: (file: File, municipalityId?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (municipalityId) formData.append('municipalityId', municipalityId);
      return fetchApi<any>('/import/upload', {
        method: 'POST', body: formData, timeout: 120000,
      });
    },
    getHistory: () => fetchApi<any[]>('/import/history'),
    getById: (id: string) => fetchApi<any>(`/import/${id}`),
  },

  validation: {
    getQueue: (status?: string) => fetchApi<any[]>(`/validation/queue${status ? `?status=${status}` : ''}`),
    getQueueStats: () => fetchApi<any>('/validation/queue/stats'),
    approveQueue: (id: string, reviewerId: string) =>
      fetchApi<any>(`/validation/queue/${id}/approve`, { method: 'POST', body: JSON.stringify({ reviewerId }) }),
    editQueue: (id: string, data: any) =>
      fetchApi<any>(`/validation/queue/${id}/edit`, { method: 'POST', body: JSON.stringify(data) }),
    mergeQueue: (id: string, targetAssetId: string, reviewerId: string) =>
      fetchApi<any>(`/validation/queue/${id}/merge/${targetAssetId}`, { method: 'POST', body: JSON.stringify({ reviewerId }) }),
    discardQueue: (id: string, reviewerId: string, reason?: string) =>
      fetchApi<any>(`/validation/queue/${id}/discard`, { method: 'POST', body: JSON.stringify({ reviewerId, reason }) }),
    promoteToAsset: (id: string, reviewerId: string) =>
      fetchApi<any>(`/validation/queue/${id}/promote`, { method: 'POST', body: JSON.stringify({ reviewerId }) }),
    getPending: (municipalityId?: string) => fetchApi<any[]>(`/validation/pending${municipalityId ? `?municipalityId=${municipalityId}` : ''}`),
    approve: (id: string, reviewerId: string) =>
      fetchApi<any>(`/validation/${id}/approve`, { method: 'POST', body: JSON.stringify({ reviewerId }) }),
    correct: (id: string, data: any) =>
      fetchApi<any>(`/validation/${id}/correct`, { method: 'POST', body: JSON.stringify(data) }),
    merge: (id: string, targetId: string, reviewerId: string) =>
      fetchApi<any>(`/validation/${id}/merge/${targetId}`, { method: 'POST', body: JSON.stringify({ reviewerId }) }),
    reject: (id: string, reviewerId: string, reason: string) =>
      fetchApi<any>(`/validation/${id}/reject`, { method: 'POST', body: JSON.stringify({ reviewerId, reason }) }),
  },

  relationships: {
    getByAsset: (assetId: string) => fetchApi<any[]>(`/relationships/${assetId}`),
    create: (data: any) => fetchApi<any>('/relationships', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/relationships/${id}`, { method: 'DELETE' }),
    analyze: () => fetchApi<any>('/relationships/analyze'),
  },

  dashboard: {
    getStats: () => fetchApi<any>('/dashboard'),
  },

  audit: {
    getAll: (page?: number) => fetchApi<{ data: any[]; meta: any }>(`/audit${page ? `?page=${page}` : ''}`),
  },

  health: {
    getConfig: () => fetchApi<any[]>('/health/config'),
    updateConfig: (id: string, data: any) =>
      fetchApi<any>(`/health/config/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    getScores: (municipalityId?: string) => fetchApi<any[]>(`/health${municipalityId ? `?municipalityId=${municipalityId}` : ''}`),
    getHistory: (assetId: string) => fetchApi<any[]>(`/health/${assetId}/history`),
    calculate: (assetId: string) => fetchApi<any>(`/health/${assetId}/calculate`, { method: 'POST' }),
    recalculate: () => fetchApi<any>('/health/recalculate', { method: 'POST' }),
  },

  confidence: {
    getConfig: () => fetchApi<any[]>('/confidence/config'),
    updateConfig: (id: string, data: any) =>
      fetchApi<any>(`/confidence/config/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    getScores: (municipalityId?: string) => fetchApi<any[]>(`/confidence${municipalityId ? `?municipalityId=${municipalityId}` : ''}`),
    getHistory: (assetId: string) => fetchApi<any[]>(`/confidence/${assetId}/history`),
    calculate: (assetId: string) => fetchApi<any>(`/confidence/${assetId}/calculate`, { method: 'POST' }),
    recalculate: () => fetchApi<any>('/confidence/recalculate', { method: 'POST' }),
  },

  network: {
    getTree: (assetId: string) => fetchApi<any>(`/network/tree/${assetId}`),
    getChildren: (assetId: string) => fetchApi<any[]>(`/network/children/${assetId}`),
    getPath: (fromId: string, toId: string) => fetchApi<any>(`/network/path/${fromId}/${toId}`),
    getRoute: (assetId: string) => fetchApi<any>(`/network/route/${assetId}`),
    getSegments: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi<any[]>(`/network/segments${query}`);
    },
    getSegment: (id: string) => fetchApi<any>(`/network/segments/${id}`),
    createSegment: (data: any) => fetchApi<any>('/network/segments', { method: 'POST', body: JSON.stringify(data) }),
    updateSegment: (id: string, data: any) => fetchApi<any>(`/network/segments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSegment: (id: string) => fetchApi<any>(`/network/segments/${id}`, { method: 'DELETE' }),
  },

  capacity: {
    getByAsset: (assetId: string) => fetchApi<any>(`/capacity/${assetId}`),
    update: (assetId: string, data: any) => fetchApi<any>(`/capacity/${assetId}`, { method: 'PUT', body: JSON.stringify(data) }),
    getSummary: () => fetchApi<any>('/capacity/stats/summary'),
    getSaturated: () => fetchApi<any[]>('/capacity/stats/saturated'),
    getHistory: (assetId: string) => fetchApi<any[]>(`/capacity/history/${assetId}`),
  },

  coverage: {
    getAll: () => fetchApi<any[]>('/coverage'),
    getById: (id: string) => fetchApi<any>(`/coverage/${id}`),
    calculate: (municipalityId: string) => fetchApi<any>(`/coverage/calculate/${municipalityId}`, { method: 'POST' }),
    update: (id: string, data: any) => fetchApi<any>(`/coverage/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  timeline: {
    getByAsset: (assetId: string) => fetchApi<any[]>(`/timeline/${assetId}`),
    getStateAt: (assetId: string, date: string) => fetchApi<any>(`/timeline/${assetId}/at?date=${date}`),
    getChanges: (from: string, to: string) => fetchApi<any>(`/timeline/changes?from=${from}&to=${to}`),
  },

  playback: {
    getState: (timestamp: string) => fetchApi<any>(`/playback/state?timestamp=${timestamp}`),
    getDiff: (from: string, to: string) => fetchApi<any>(`/playback/diff?from=${from}&to=${to}`),
    getTimeline: (assetId: string) => fetchApi<any>(`/playback/timeline?assetId=${assetId}`),
    getSnapshots: (page?: number, limit?: number) =>
      fetchApi<any>(`/playback/snapshots?page=${page || 1}&limit=${limit || 10}`),
  },

  queryEngine: {
    nearestAvailable: (lat: number, lng: number, type?: string, minFreePorts?: number) => {
      let q = `/query-engine/nearest-available/${lat}/${lng}`;
      const params: string[] = [];
      if (type) params.push(`type=${type}`);
      if (minFreePorts) params.push(`minFreePorts=${minFreePorts}`);
      if (params.length) q += '?' + params.join('&');
      return fetchApi<any>(q);
    },
    orphans: () => fetchApi<any[]>('/query-engine/orphans'),
    cycles: () => fetchApi<any[]>('/query-engine/cycles'),
    routes: (assetId: string) => fetchApi<any>(`/query-engine/routes/${assetId}`),
    expansion: (assetId: string, radius?: number) =>
      fetchApi<any>(`/query-engine/expansion/${assetId}${radius ? `?radius=${radius}` : ''}`),
  },

  search: {
    search: (q: string) => fetchApi<any[]>(`/search?q=${encodeURIComponent(q)}`),
    suggestions: (q: string) => fetchApi<any[]>(`/search/suggestions?q=${encodeURIComponent(q)}`),
  },

  integrity: {
    checkAll: (municipalityId?: string) => {
      const q = municipalityId ? `?municipalityId=${municipalityId}` : '';
      return fetchApi<any>(`/integrity${q}`);
    },
  },

  reports: {
    generate: (data: any) => fetchApi<any>('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),
    download: (id: string) => fetchApi<any>(`/reports/download/${id}`),
    history: () => fetchApi<any[]>('/reports/history'),
  },

  certification: {
    validate: (assetId: string, data: any) => fetchApi<any>(`/certification/${assetId}/validate`, { method: 'PUT', body: JSON.stringify(data) }),
    certify: (assetId: string, data: any) => fetchApi<any>(`/certification/${assetId}/certify`, { method: 'PUT', body: JSON.stringify(data) }),
    reject: (assetId: string, data: any) => fetchApi<any>(`/certification/${assetId}/reject`, { method: 'PUT', body: JSON.stringify(data) }),
    flag: (assetId: string, data: any) => fetchApi<any>(`/certification/${assetId}/flag`, { method: 'PUT', body: JSON.stringify(data) }),
    history: (assetId: string) => fetchApi<any[]>(`/certification/${assetId}/history`),
  },

  pilot: {
    quality: (municipalityId: string) => fetchApi<any>(`/pilot/quality/${municipalityId}`),
    status: () => fetchApi<any[]>('/pilot/status'),
    bulk: (data: any) => fetchApi<any>('/pilot/bulk', { method: 'POST', body: JSON.stringify(data) }),
    publish: (municipalityId: string) => fetchApi<any>(`/pilot/publish/${municipalityId}`, { method: 'POST' }),
    unpublish: (municipalityId: string) => fetchApi<any>(`/pilot/unpublish/${municipalityId}`, { method: 'POST' }),
    report: (municipalityId: string) => fetchApi<any>(`/pilot/report/${municipalityId}`),
    tour: (municipalityId: string, lat: number, lng: number) =>
      fetchApi<any>(`/pilot/tour/${municipalityId}`, { method: 'POST', body: JSON.stringify({ lat, lng }) }),
  },

  baselines: {
    create: (municipalityId: string, data: any) => fetchApi<any>(`/baseline/${municipalityId}`, { method: 'POST', body: JSON.stringify(data) }),
    list: (municipalityId: string) => fetchApi<any[]>(`/baseline/${municipalityId}`),
    get: (municipalityId: string, version: string) => fetchApi<any>(`/baseline/${municipalityId}/${version}`),
    activate: (municipalityId: string, version: string) => fetchApi<any>(`/baseline/${municipalityId}/${version}/activate`, { method: 'PUT' }),
    diff: (municipalityId: string, from: string, to: string) => fetchApi<any>(`/baseline/${municipalityId}/diff?from=${from}&to=${to}`),
    delete: (municipalityId: string, version: string) => fetchApi<any>(`/baseline/${municipalityId}/${version}`, { method: 'DELETE' }),
  },
};
