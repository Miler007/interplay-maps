export type AssetTypeName = 'MUFLAS' | 'CAJAS' | 'CTO' | 'SPLITTERS' | 'POSTES' | 'NODOS' | 'CAMARAS' | 'EQUIPOS';

export type AssetStatus = 'ACTIVO' | 'EN_CONSTRUCCION' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO' | 'PENDIENTE_INSTALACION' | 'RETIRADO';

export type SegmentType = 'CABLE_TRONCAL' | 'CABLE_DISTRIBUCION' | 'DROP' | 'ENLACE' | 'DERIVACION';

export type SegmentStatus = 'ACTIVO' | 'EN_CONSTRUCCION' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO';

export type CapacityStatus = 'DISPONIBLE' | 'ADVERTENCIA' | 'ALTA_OCUPACION' | 'SIN_CAPACIDAD';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'VISUALIZADOR';

export type ImportSource = 'WHATSAPP' | 'EXCEL' | 'CSV' | 'KML' | 'GPX' | 'JSON';

export type ValidationStatus = 'PENDIENTE' | 'APROBADO' | 'CORREGIDO' | 'FUSIONADO' | 'RECHAZADO';

export type ConfidenceLevel = 'ALTA' | 'MEDIA' | 'BAJA';

export type DetectedEntityType = 'CAJA' | 'MUFFLE' | 'CTO' | 'SPLITTER' | 'POSTE' | 'NODO';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Department {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  municipalities: Municipality[];
}

export interface Municipality {
  id: string;
  name: string;
  departmentId: string;
  department?: Department;
  bounds?: GeoBounds;
  createdAt: Date;
  updatedAt: Date;
  projects: Project[];
  assets: Asset[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  municipalityId: string;
  municipality?: Municipality;
  createdAt: Date;
  updatedAt: Date;
  assets: Asset[];
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  type: AssetTypeName;
  departmentId: string;
  municipalityId: string;
  projectId?: string;
  latitude: number;
  longitude: number;
  status: AssetStatus;
  observations?: string;
  confidenceScore: number;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  photos: Photo[];
  department?: Department;
  municipality?: Municipality;
  project?: Project;
}

export interface Photo {
  id: string;
  assetId: string;
  url: string;
  filename: string;
  createdAt: Date;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ImportRecord {
  id: string;
  source: ImportSource;
  filename: string;
  departmentId: string;
  municipalityId: string;
  projectId?: string;
  assetType: AssetTypeName;
  observations?: string;
  totalRecords: number;
  validRecords: number;
  duplicateRecords: number;
  pendingReview: number;
  importedById: string;
  createdAt: Date;
}

export interface ValidationQueueItem {
  id: string;
  rawData: Record<string, unknown>;
  suggestedName?: string;
  suggestedLatitude?: number;
  suggestedLongitude?: number;
  reason: string;
  status: ValidationStatus;
  reviewedById?: string;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkSegment {
  id: string;
  code: string;
  name: string;
  segmentType: SegmentType;
  sourceAssetId: string;
  sourceAsset?: Asset;
  targetAssetId: string;
  targetAsset?: Asset;
  lengthMeters?: number;
  fiberCount?: number;
  fiberColor?: string;
  capacityTotal?: number;
  capacityUsed?: number;
  status: SegmentStatus;
  geojson?: any;
  departmentId: string;
  municipalityId: string;
  projectId?: string;
  observations?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapacityInfo {
  id: string;
  assetId: string;
  totalPorts: number;
  usedPorts: number;
  freePorts: number;
  occupancyPct: number;
  status: CapacityStatus;
  updatedAt: Date;
}

export interface CapacityHistory {
  id: string;
  assetId: string;
  totalPorts: number;
  usedPorts: number;
  freePorts: number;
  occupancyPct: number;
  recordedAt: Date;
}

export interface CoverageArea {
  id: string;
  municipalityId: string;
  municipality?: Municipality;
  name: string;
  geojson: any;
  totalHomes?: number;
  coveredHomes?: number;
  coveragePct?: number;
  isAutoCalculated: boolean;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetPhotoFull {
  id: string;
  assetId: string;
  filename: string;
  originalUrl: string;
  thumbnailUrl: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  takenAt?: Date;
  uploadedById?: string;
  observations?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface TimelineEntry {
  version: number;
  changeType?: string;
  changedById?: string;
  changes?: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  createdAt: Date;
}

export interface TopologyNode {
  asset: Asset;
  children: TopologyNode[];
  segments: NetworkSegment[];
  depth: number;
}

export interface ExecutiveDashboard {
  municipalities: number;
  totalAssets: number;
  activeAssets: number;
  assetsByType: { code: string; name: string; count: number }[];
  assetsByStatus: { status: string; count: number }[];
  capacitySummary: {
    totalPorts: number;
    usedPorts: number;
    freePorts: number;
    saturatedAssets: number;
  };
  coverage: {
    totalMunicipalities: number;
    withCoverage: number;
    avgCoveragePct: number;
  };
  recentActivity: {
    assets: Asset[];
    imports: ImportRecord[];
    timeline: TimelineEntry[];
  };
}

export interface ReportRequest {
  type: 'infrastructure' | 'capacity' | 'topology' | 'inventory';
  municipalityId?: string;
  departmentId?: string;
  projectId?: string;
  format: 'pdf' | 'excel';
  filters?: Record<string, unknown>;
}

export interface SmartSearchResult {
  type: 'asset' | 'segment' | 'municipality' | 'coverage';
  id: string;
  code?: string;
  name: string;
  subtitle?: string;
  relevance: number;
  data: any;
}

export interface QueryResult {
  query: string;
  results: SmartSearchResult[];
  totalMs: number;
}

export interface PlaybackState {
  timestamp: Date;
  assetSnapshots: Record<string, any>;
  segmentSnapshots: Record<string, any>;
  relationships: any[];
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

export interface DashboardStats {
  totalMunicipalities: number;
  totalAssets: number;
  totalCajas: number;
  totalMuflas: number;
  totalImports: number;
  totalDuplicates: number;
  pendingReview: number;
  assetsByMunicipality: { municipality: string; count: number }[];
  recentImports: ImportRecord[];
}

/** PARSED RAW MESSAGE FROM WHATSAPP */
export interface ParsedMessage {
  raw: string;
  date?: string;
  time?: string;
  sender?: string;
  text: string;
}

/** TECHNICAL EXTRACTED DATA */
export interface ExtractedData {
  entityType?: DetectedEntityType;
  code?: string;
  name?: string;
  coordinates?: Coordinates;
  power?: number;
  ports?: number;
  freePorts?: number;
  fiberCount?: number;
  fiberColor?: string;
  observations?: string;
  rawConfidence: number;
}

/** RELATIONSHIP RULE */
export interface ExtractedRelationship {
  sourceType?: DetectedEntityType;
  sourceCode?: string;
  sourceName?: string;
  targetType?: DetectedEntityType;
  targetCode?: string;
  targetName?: string;
  relationType: string;
  description?: string;
  rawText: string;
  confidence: number;
}

/** PIPELINE STAGE RESULT */
export interface PipelineStageResult {
  stage: string;
  success: boolean;
  data?: any;
  errors: string[];
  warnings: string[];
  metrics?: Record<string, number>;
}

/** FULL PARSE RESULT */
export interface ParseResult {
  fileName: string;
  totalMessages: number;
  parsedMessages: ParsedMessage[];
  detectedEntities: ExtractedData[];
  relationships: ExtractedRelationship[];
  noiseMessages: number;
  duplicados: ExtractedData[];
  estadisticas: {
    porTipo: Record<string, number>;
    conCoordenadas: number;
    sinCoordenadas: number;
    conPotencia: number;
    conPuertos: number;
    conFibra: number;
  };
  errores: string[];
  tiempoMs: number;
}

/** SIMULATION IMPORT RESULT */
export interface SimulationResult {
  totalMessages: number;
  registrosDetectados: number;
  recordsToCreate: ExtractedData[];
  recordsToUpdate: { existing: Asset; nuevo: ExtractedData }[];
  duplicados: { original: Asset; candidate: ExtractedData; distancia: number }[];
  errores: { entity: ExtractedData; reason: string }[];
  pendientes: ExtractedData[];
  relacionesDetectadas: ExtractedRelationship[];
  estadisticas: {
    total: number;
    aCrear: number;
    aActualizar: number;
    duplicados: number;
    errores: number;
    pendientes: number;
    relaciones: number;
    porTipo: Record<string, number>;
    tiempoMs: number;
  };
}

/** FULL IMPORT RESULT */
export interface ImportResult {
  importId: string;
  fileName: string;
  totalMessages: number;
  registrosDetectados: number;
  creados: number;
  actualizados: number;
  duplicados: number;
  errores: number;
  pendientes: number;
  relaciones: number;
  tiempoSegundos: number;
  detalles: Array<{
    tipo: string;
    codigo?: string;
    estado: 'creado' | 'actualizado' | 'duplicado' | 'error' | 'pendiente';
    mensaje?: string;
  }>;
}
