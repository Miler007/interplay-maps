# ADR-005: Refinements — GIS Engine, GeoJSON, Capas Dinámicas, Dashboard, Offline

**Estado:** Aprobado  
**Contexto:** Ajustes arquitectónicos finales antes del Sprint 1, basados en feedback de stakeholders.

---

## 1. GIS Engine

### Propósito

Módulo independiente para toda la lógica geoespacial. No mezclar con el módulo del mapa (que es solo visualización).

### Responsabilidades

```typescript
interface GISEngineService {
  // Consultas espaciales
  nearestNeighbor(lat: number, lng: number, type?: string, limit?: number): Promise<Asset[]>;
  
  // Buffers
  createBuffer(assetId: string, radiusMeters: number): Promise<Polygon>;
  
  // Intersecciones
  findIntersecting(buffer: Polygon, type?: string): Promise<Asset[]>;
  
  // Simplificación de geometrías
  simplify(geom: Geometry, tolerance: number): Geometry;
  
  // Clustering para mapa
  getClusterBounds(assets: Asset[], zoom: number): Cluster[];
  
  // Validaciones espaciales
  isWithinMunicipality(lat: number, lng: number, municipalityId: string): boolean;
  isValidCoordinate(lat: number, lng: number): boolean;
  
  // Cobertura
  calculateCoverage(polygon: Polygon): Coverage;
}
```

### Dependencias

```
gis-engine → Prisma (PostGIS)
gis-engine → GeometryService
gis-engine → MunicipalitiesService (para bounds)
```

No depende de:
- Map module (visualización)
- Dashboard
- Import pipeline

---

## 2. GeoJSON como Formato Estándar

### Principio

Toda respuesta del backend para el mapa debe ser GeoJSON válido (RFC 7946).

### Estructura

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "MUF-000001",
      "geometry": {
        "type": "Point",
        "coordinates": [-75.123456, 5.123456]
      },
      "properties": {
        "code": "MUF-000001",
        "name": "Mufla Norte",
        "type": "MUFLAS",
        "status": "ACTIVO",
        "department": "Tolima",
        "municipality": "Fresno",
        "confidenceScore": 85,
        "healthScore": 92,
        "layerIds": ["layer-1", "layer-3"],
        "attributes": {
          "capacidad": "48",
          "bandejas": "4",
          "fusiones": "12"
        },
        "relationships": [
          { "type": "FEEDS", "targetId": "CAJ-000001", "targetName": "Caja B.4.6" }
        ],
        "createdAt": "2026-07-16T00:00:00Z",
        "updatedAt": "2026-07-16T00:00:00Z"
      }
    }
  ]
}
```

### Beneficios

- Compatibilidad con cualquier motor GIS (Mapbox, Cesium, QGIS)
- Integración futura con herramientas externas sin transformaciones
- Estandarización de la API REST
- Soporte nativo en Leaflet, OpenLayers, MapLibre

### Transformación

El backend expone un endpoint específico que transforma assets → GeoJSON:

```
GET /api/v1/gis/geojson?municipalityId=x&type=CAJAS
→ FeatureCollection
```

---

## 3. Sistema de Capas Dinámicas

### Principio

Las capas NO están hardcodeadas en el frontend. Se obtienen desde la base de datos.

### Flujo

```
Frontend carga el mapa
       │
       ▼
GET /api/v1/gis/layers
       │
       ▼
Backend consulta layers (BD)
       │
       ▼
Frontend renderiza checkboxes/toggles
       │
       ▼
Usuario activa/desactiva capas
       │
       ▼
GET /api/v1/gis/geojson?layerIds=layer-1,layer-3
       │
       ▼
Backend filtra assets por capa
       │
       ▼
Frontend actualiza mapa
```

### Modelo de datos (ya en ADR-002)

```sql
layers          → catálogo de capas (INFRAESTRUCTURA, CLIENTES, COBERTURA, ...)
layer_assets    → relación N:M entre capas y activos
```

### API de Capas

```typescript
interface LayerService {
  getAll(): Promise<Layer[]>;              // Obtener todas las capas activas
  getAssets(layerId: string, filters?: FilterParams): Promise<GeoJSON.FeatureCollection>;
  addAssetToLayer(layerId: string, assetId: string): Promise<void>;
  removeAssetFromLayer(layerId: string, assetId: string): Promise<void>;
  createLayer(data: CreateLayerDTO): Promise<Layer>;
  updateLayer(id: string, data: UpdateLayerDTO): Promise<Layer>;
}
```

### Capas iniciales (seed)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| INFRAESTRUCTURA | Infraestructura | Todos los activos de red |
| CLIENTES | Clientes | Puntos de clientes (futuro) |
| COBERTURA | Cobertura | Áreas de cobertura (futuro) |
| PROYECTOS | Proyectos | Activos agrupados por proyecto |
| MANTENIMIENTO | Mantenimiento | Activos en mantenimiento |
| TOPOLOGIA | Topología | Relaciones entre activos |

---

## 4. Dashboard Desacoplado

### Arquitectura

```
Dashboard Controller
       │
       ▼
Dashboard Service (orquestador)
       │
       ├──► StatisticsService (agregaciones)
       │       ├──► AssetRepository
       │       ├──► ImportRepository
       │       ├──► ValidationRepository
       │       └──► HealthRepository
       │
       ├──► Event Bus (escucha cambios para invalidar caché)
       │
       └──► Cache (Redis opcional en futuro)
```

### Responsabilidades

- **DashboardService**: Orquesta llamadas a StatisticsService, aplica lógica de negocio
- **StatisticsService**: Único responsable de consultar la BD y agregar datos
- **DashboardController**: Solo recibe peticiones HTTP y delega
- **Nunca** el Dashboard consulta la BD directamente

---

## 5. Relationship Engine por Etapas

### Arquitectura (reemplaza el enfoque solo-regex)

```
Raw Text
    │
    ▼
┌──────────────────────┐
│ 1. Parser            │
 │  - Tokenización       │
   │  - Extracción de frases │
   └──────────────────────┘
    │
    ▼
┌──────────────────────┐
│ 2. Entity Extractor  │
│  - Identifica activos│
│    por nombre/código │
│  - Busca en BD       │
│  - Fuzzy matching    │
└──────────────────────┘
    │
    ▼
┌──────────────────────┐
│ 3. Relationship      │
│    Extractor         │
│  - Regex (primera    │
│    aproximación)     │
│  - NLP ligero        │
│  - Patrones de texto │
└──────────────────────┘
    │
    ▼
┌──────────────────────┐
│ 4. Validator         │
│  - ¿Existen ambos    │
│    activos?          │
│  - ¿Relación válida? │
│  - ¿Ciclos?          │
└──────────────────────┘
    │
    ▼
┌──────────────────────┐
│ 5. Graph Builder     │
│  - Construye grafo   │
│  - Valida topología  │
│  - Almacena en BD    │
└──────────────────────┘
```

Cada etapa implementa una interfaz común:

```typescript
interface PipelineStage<T, R> {
  execute(input: T, context: PipelineContext): Promise<R>;
  getName(): string;
}
```

Esto permite:
- Probar cada etapa individualmente
- Reemplazar Regex → IA en el futuro sin cambiar el pipeline
- Agregar logs por etapa
- Ejecutar stages en paralelo cuando sea posible

---

## 6. Import Pipeline Desacoplado

### Servicios independientes

```typescript
// Cada etapa es un servicio inyectable independiente
@Injectable()
class ParserService implements PipelineStage<File, RawRecord[]> { ... }

@Injectable()
class NormalizerService implements PipelineStage<RawRecord[], NormalizedRecord[]> { ... }

@Injectable()
class ValidatorService implements PipelineStage<NormalizedRecord[], ValidationResult> { ... }

@Injectable()
class RelationshipEngineService implements PipelineStage<NormalizedRecord[], Relationship[]> { ... }

@Injectable()
class DeduplicatorService implements PipelineStage<NormalizedRecord[], DedupResult> { ... }

@Injectable()
class ConfidenceEngineService implements PipelineStage<NormalizedRecord[], ConfidenceResult> { ... }

// Orquestador
@Injectable()
class ImportPipelineOrchestrator {
  constructor(
    private stages: PipelineStage<any, any>[],
    private eventEmitter: EventEmitter2,
  ) {}

  async execute(file: File, metadata: ImportMetadata): Promise<ImportResult> {
    let context = new PipelineContext(metadata);
    for (const stage of this.stages) {
      context.data = await stage.execute(context.data, context);
      this.eventEmitter.emit('import.pipeline.stage', {
        stage: stage.getName(),
        status: 'completed',
      });
    }
    return context.result;
  }
}
```

---

## 7. Asset Types como Plugin

### Sistema extensible

```
Nuevo tipo de activo = 3 pasos:
1. INSERT en asset_types ('CAMARAS', 'Cámaras', 'CAM', ...)
2. INSERT en attribute_definitions (atributos específicos del tipo)
3. Listo. Sin código nuevo.
```

### Ejemplo: registrar "Cámaras"

```sql
-- 1. Registrar tipo
INSERT INTO asset_types (code, name, prefix, geometry_type) VALUES
    ('CAMARAS', 'Cámaras', 'CAM', 'POINT');

-- 2. Definir atributos específicos
INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'resolucion', 'Resolución', 'TEXT', 'MP', 1 FROM asset_types WHERE code = 'CAMARAS';

INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'angulo_vision', 'Ángulo de Visión', 'NUMBER', 'grados', 2 FROM asset_types WHERE code = 'CAMARAS';

INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'ip', 'Dirección IP', 'TEXT', NULL, 3 FROM asset_types WHERE code = 'CAMARAS';
```

### API de atributos dinámicos

```typescript
interface AssetAttributesService {
  getDefinitions(assetTypeId: string): Promise<AttributeDefinition[]>;
  getAttributes(assetId: string): Promise<Record<string, string>>;
  setAttribute(assetId: string, definitionId: string, value: string): Promise<void>;
  validateRequired(assetId: string): Promise<ValidationError[]>;
}
```

---

## 8. Health Score y Confidence Score Configurables

### Health Score

Los pesos se almacenan en `health_score_config` y se cargan al calcular:

```typescript
async function calculateHealthScore(assetId: string): Promise<HealthScore> {
  const config = await prisma.healthScoreConfig.findMany({ where: { isActive: true } });
  const totalWeight = config.reduce((sum, c) => sum + c.weight, 0);

  // Calcular cada indicador (0-100)
  const indicators = {
    GPS: calculateGpsScore(asset),
    PHOTOS: calculatePhotosScore(asset),
    RELATIONSHIPS: calculateRelationshipsScore(asset),
    DATA: calculateDataScore(asset),
    VALIDATION: calculateValidationScore(asset),
  };

  // Ponderar según configuración
  const overall = Object.entries(indicators).reduce((sum, [code, score]) => {
    const cfg = config.find(c => c.indicatorCode === code);
    return sum + (score * (cfg?.weight || 0)) / totalWeight;
  }, 0);

  return { ...indicators, overallScore: Math.round(overall) };
}
```

### Confidence Score

Mismo patrón con `confidence_score_config`:

```typescript
async function calculateConfidenceScore(assetId: string): Promise<ConfidenceScore> {
  const config = await prisma.confidenceScoreConfig.findMany({ where: { isActive: true } });
  const totalWeight = config.reduce((sum, c) => sum + c.weight, 0);

  const factors = {
    VALID_COORDS: hasValidCoordinates(asset) ? 100 : 0,
    NAME_IDENTIFIED: isNameIdentified(asset) ? 100 : 0,
    NO_DUPLICATES: await hasNoDuplicates(asset) ? 100 : 0,
    HAS_PHOTO: await hasPhoto(asset) ? 100 : 0,
    REVIEWED: asset.reviewedBy ? 100 : 0,
  };

  const score = Object.entries(factors).reduce((sum, [code, value]) => {
    const cfg = config.find(c => c.factorCode === code);
    return sum + (value * (cfg?.weight || 0)) / totalWeight;
  }, 0);

  return { ...factors, score: Math.round(score) };
}
```

---

## 9. Preparación para Offline

### Estrategia

No implementar ahora, pero la arquitectura lo soporta mediante:

1. **`sync_queue`** — tabla que registra todos los cambios pendientes de sincronizar
2. **GeoJSON** como formato de intercambio (fácil de cachear en cliente)
3. **Service Layer** — toda la lógica de negocio detrás de servicios, no de controladores
4. **Event Bus** — los eventos pueden encolarse para sincronización diferida

### En el futuro, el flujo offline sería:

```
Técnico en campo (app móvil)
    │
    ├──► Descarga datos (GeoJSON cacheado)
    │
    ├──► Trabaja offline
    │       ├──► Edita activos
    │       ├──► Crea nuevos
    │       ├──► Toma fotos
    │       └──► Los cambios se guardan en sync_queue local
    │
    └──► Cuando hay conexión:
            ├──► sync_queue → API
            ├──► Server procesa y versiona
            └──► Server responde con cambios nuevos
```

---

## 10. Architecture Review Automática

### Proceso

Al final de cada sprint, ejecutar validación automática:

```bash
# 1. Verificar dependencias circulares
npm run depcruise apps/backend/src -- --validate

# 2. Verificar cobertura de pruebas
npm run test:coverage -- --threshold=80

# 3. Verificar que los módulos cumplen ADR
npm run adr:validate

# 4. Lint y type-check
npm run lint && npm run typecheck
```

### Herramientas

| Herramienta | Propósito |
|-------------|-----------|
| `dependency-cruiser` | Validar dependencias entre módulos |
| `jest --coverage` | Cobertura de pruebas |
| Script ADR validator | Validar estructura de directorios vs ADR |
| ESLint + TypeScript | Calidad de código |

---

## Resumen de cambios vs ADR original

| Aspecto | ADR original | ADR-005 (refinado) |
|---------|-------------|-------------------|
| **Asset Types** | Catálogo fijo | Plugin con atributos dinámicos |
| **Geometrías** | Solo Point | Point, LineString, Polygon, MultiPolygon |
| **Health Score** | Pesos fijos en código | Pesos configurables en BD |
| **Confidence Score** | Pesos fijos en código | Pesos configurables en BD |
| **Relationship Engine** | Regex únicamente | Pipeline por etapas (Parser→Extractor→Validator→Graph) |
| **Import Pipeline** | Servicio monolítico | Etapas independientes con interfaz común |
| **Dashboard** | Consulta BD directa | StatisticsService intermediario |
| **Capas** | Mencionadas | Sistema dinámico desde BD |
| **GIS** | Módulo map/ | GIS Engine separado (spatial, geocoder, editor) |
| **API Mapa** | Coordenadas sueltas | GeoJSON estándar (FeatureCollection) |
| **Offline** | No considerado | sync_queue preparado |
| **Calidad** | No especificado | Architecture Review automática por sprint |
