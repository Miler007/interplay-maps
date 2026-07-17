export type CertificationStatus = 'PENDIENTE' | 'VALIDADO' | 'CERTIFICADO' | 'HISTORICO';

export type VerificationAction = 'CONFIRMADO' | 'CORREGIDO' | 'NUEVO' | 'RETIRADO' | 'REQUIERE_REVISION';

export type PilotStatus = 'EN_PREPARACION' | 'EN_VALIDACION' | 'EN_CERTIFICACION' | 'PUBLICADO' | 'HISTORICO';

export interface MunicipalityPilot {
  id: string;
  municipalityId: string;
  municipality?: any;
  pilotStatus: PilotStatus;
  totalAssets: number;
  validatedAssets: number;
  certifiedAssets: number;
  qualityScore: number;
  startedAt?: string;
  publishedAt?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRecord {
  id: string;
  assetId: string;
  action: VerificationAction;
  previousStatus?: CertificationStatus;
  newStatus: CertificationStatus;
  gpsLatitude?: number;
  gpsLongitude?: number;
  userId?: string;
  observations?: string;
  photoCount: number;
  createdAt: string;
}

export interface DataQualityReport {
  municipalityId: string;
  municipalityName: string;
  departmentName: string;
  pilotStatus: PilotStatus;
  qualityScore: number;
  totalAssets: number;
  validatedAssets: number;
  certifiedAssets: number;
  pendingAssets: number;
  byStatus: { status: string; count: number }[];
  byCertStatus: { certStatus: CertificationStatus; count: number }[];
  byType: { type: string; count: number }[];
  invalidCoords: number;
  duplicates: number;
  orphans: number;
  incompleteRelationships: number;
  withoutPhotos: number;
  coverage: { photos: number; coordinates: number; relationships: number; verified: number };
  adoptionMetrics: {
    avgValidationTimeMin: number;
    parserAccuracy: number;
    falseDuplicates: number;
    rejectedRelationships: number;
    manualCorrections: number;
    avgImportTimeMin: number;
  };
  generatedAt: string;
}

export interface BulkOperation {
  type: 'APPROVE' | 'RECALCULATE_HEALTH' | 'RECALCULATE_CONFIDENCE' | 'REGENERATE_TOPOLOGY' | 'CERTIFY' | 'PUBLISH';
  municipalityId?: string;
  assetIds?: string[];
  status?: string;
  userId?: string;
}

export interface BulkOperationResult {
  operation: BulkOperation['type'];
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

export interface PilotClosureReport {
  municipalityName: string;
  departmentName: string;
  totalAssets: number;
  initialQuality: number;
  finalQuality: number;
  correctionsMade: number;
  newAssets: number;
  retiredAssets: number;
  photosAdded: number;
  totalTimeSpentHours: number;
  verifiedRelationships: number;
  adoptionMetrics: {
    avgValidationTimeMin: number;
    parserAccuracy: number;
    falseDuplicates: number;
    rejectedRelationships: number;
  };
  recommendations: string[];
  generatedAt: string;
}

export interface MunicipalityBaseline {
  id: string;
  municipalityId: string;
  municipality?: any;
  version: string;
  label?: string;
  isActive: boolean;
  snapshot: any;
  totalAssets: number;
  totalSegments: number;
  totalRelations: number;
  qualityScore: number;
  createdById?: string;
  createdAt: string;
}

export interface BaselineDiff {
  fromVersion: string;
  toVersion: string;
  assetsAdded: number;
  assetsRemoved: number;
  assetsChanged: number;
  segmentsAdded: number;
  segmentsRemoved: number;
  relationsAdded: number;
  relationsRemoved: number;
  qualityChange: number;
  details: {
    added: any[];
    removed: any[];
    changed: any[];
  };
}

export interface OperationZeroChecklist {
  phase1: {
    rawWhatsAppSaved: boolean;
    excelSaved: boolean;
    kmlSaved: boolean;
    batchCodeAssigned: boolean;
  };
  phase2: {
    simulationRun: boolean;
    simulationReport: string;
    simulationApproved: boolean;
  };
  phase3: {
    technicalReviewDone: boolean;
    reviewedBy: string;
    reviewDate: string;
    pendingIssues: number;
  };
  phase4: {
    officialImportDone: boolean;
    baselineCreated: boolean;
    municipalityPublished: boolean;
  };
  overallProgress: number;
}
