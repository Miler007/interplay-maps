export const ASSET_TYPES = ['MUFLAS', 'CAJAS', 'CTO', 'SPLITTERS', 'POSTES', 'NODOS', 'CAMARAS', 'EQUIPOS'] as const;

export const ASSET_STATUSES = ['ACTIVO', 'INACTIVO', 'EN_REVISION', 'DADO_BAJA'] as const;

export const USER_ROLES = ['ADMIN', 'SUPERVISOR', 'VISUALIZADOR'] as const;

export const IMPORT_SOURCES = ['WHATSAPP', 'EXCEL', 'CSV', 'KML', 'GPX', 'JSON'] as const;

export const VALIDATION_STATUSES = ['PENDIENTE', 'APROBADO', 'CORREGIDO', 'FUSIONADO', 'RECHAZADO'] as const;

export const CODE_PREFIXES: Record<string, string> = {
  MUFLAS: 'MUF',
  CAJAS: 'CAJ',
  CTO: 'CTO',
  SPLITTERS: 'SPL',
  POSTES: 'POS',
  NODOS: 'NOD',
  CAMARAS: 'CAM',
  EQUIPOS: 'EQP',
};

export const CONFIDENCE_WEIGHTS = {
  VALID_COORDINATES: 30,
  NAME_IDENTIFIED: 25,
  NO_DUPLICATES: 20,
  HAS_PHOTO: 10,
  REVIEWED_BY_ADMIN: 15,
} as const;

export const ASSET_TYPE_KEYWORDS: Record<string, string[]> = {
  CAJA: ['caja', 'cajas', 'box', 'nodo', 'cto'],
  MUFFLE: ['mufla', 'muflas', 'muffle', 'empalme'],
  CTO: ['cto', 'terminal'],
  SPLITTER: ['splitter', 'spliter'],
  POSTE: ['poste', 'postes', 'pole'],
  NODO: ['nodo', 'node', 'olt'],
};

export const RELATIONSHIP_PATTERNS = [
  { regex: /(?:drop|bajada|derivado?)\s*(?:desde|de)\s*(?:la\s*)?(?:caja|mufla)\s*([\w.\-]+)/i, relationType: 'ALIMENTADO_POR' },
  { regex: /(?:alimenta|alimenta\s*a|conecta\s*a)\s*(?:la\s*)?(?:caja|mufla)\s*([\w.\-]+)/i, relationType: 'ALIMENTA_A' },
  { regex: /(?:mufla|muffle|empalme)\s*([\w.\-]+)\s*(?:alimenta|conecta)\s*(?:la\s*)?(?:caja|mufla)\s*([\w.\-]+)/i, relationType: 'ALIMENTA_A' },
  { regex: /(?:conectad[oa]\s*(?:a|con)|(?:desde|hacia))\s*(?:la\s*)?(?:caja|mufla)\s*([\w.\-]+)/i, relationType: 'CONECTADO_A' },
  { regex: /(?:fibra|enlace|link)\s*(?:desde|entre)\s*(?:la\s*)?(?:caja|mufla)\s*([\w.\-]+)\s*(?:a|hacia|y)\s*(?:la\s*)?(?:caja|mufla)\s*([\w.\-]+)/i, relationType: 'ENLACE_FIBRA' },
  { regex: /(?:padre|parent|superior)\s*(?::|es)?\s*(?:la\s*)?(?:caja|mufla)\s*([\w.\-]+)/i, relationType: 'DEPENDE_DE' },
];

export const IGNORE_KEYWORDS = [
  'reiniciar', 'apagar', 'encender', 'prender', 'pantalla', 'telefono',
  'whatsapp', 'mensaje', 'llamada', 'bateria', 'cargar', 'sim',
  'hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'gracias',
  'ok', 'okey', 'dale', 'listo', 'entendido', 'confirmado',
];

export const COORDINATE_PATTERNS = [
  /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/,
  /(-?\d+\.\d+)\s+(-?\d+\.\d+)/,
  /coord(?:enadas)?\s*[:=]?\s*(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/i,
  /lat\s*[:=]?\s*(-?\d+\.\d+).*lon(?:g)?\s*[:=]?\s*(-?\d+\.\d+)/i,
  /(-?\d+\.\d+)\s*[\/\\,]\s*(-?\d+\.\d+)/,
];

export const POWER_PATTERNS = [
  /potencia\s*[:=]?\s*(-?\d+(?:\.\d+)?)\s*(?:db|dB)?/i,
  /pot\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i,
  /(?:-)?\d+(?:\.\d+)?\s*(?:db|dB)/i,
  /nivel\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i,
];

export const PORT_PATTERNS = [
  /puertos?\s*(?:libres?|ocupados?|totales?|disponibles?)?\s*[:=]?\s*(\d+)/i,
  /(\d+)\s*(?:puertos?|ports?)/i,
];

export const FIBER_PATTERNS = [
  /fibra\s*(?:de\s*)?(\d+)\s*(?:hilos?|fibras?|hebras?)?/i,
  /(\d+)\s*(?:hilos?|fibras?|hebras?)\s*(?:de\s*)?(?:fibra|fo)?/i,
];

export const COLOR_PATTERNS = [
  /color\s*[:=]?\s*(\w+)/i,
] as const;

export const DUPLICATE_DISTANCE_THRESHOLD_M = 5;
export const DUPLICATE_NAME_SIMILARITY_THRESHOLD = 0.8;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const PERFORMANCE_TARGET_MS = 30000; // 30 seconds for 10k messages
