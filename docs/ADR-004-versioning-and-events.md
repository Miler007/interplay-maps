# ADR-004: Versionado, Auditoría y Sistema de Eventos

**Estado:** Aprobado  
**Contexto:** Estrategias para inmutabilidad de datos, trazabilidad y desacoplamiento.

---

## 1. Estrategia de Versionado

### Principio

Nunca se sobrescribe información. Cada cambio genera una nueva versión.

### Flujo de Versionado

```
Usuario edita "Caja B.4.6"
         │
         ▼
┌─────────────────────────┐
│ 1. Capturar snapshot    │
│    Estado actual completo│
│    del activo en JSONB   │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 2. Calcular diff        │
│    Solo campos que      │
│    cambiaron            │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 3. Insertar versión     │
│    asset_versions:       │
│    version: N+1         │
│    snapshot: {completo} │
│    changes: {diff}      │
│    change_type: UPDATED │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 4. Actualizar activo    │
│    assets:               │
│    current_version: N+1 │
│    campos actualizados   │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 5. Emitir evento        │
│    asset.updated        │
└─────────────────────────┘
```

### API de Versiones

```typescript
interface VersionsService {
  // Listar versiones de un activo
  getVersions(assetId: string): AssetVersion[];

  // Obtener snapshot de una versión específica
  getVersion(assetId: string, version: number): AssetVersion;

  // Restaurar una versión anterior
  restore(assetId: string, version: number, userId: string): Asset;

  // Comparar dos versiones
  diff(assetId: string, v1: number, v2: number): Change[];
}
```

### Tipos de Cambio

| Tipo | Descripción |
|------|-------------|
| `CREATED` | Creación del activo (versión 1) |
| `UPDATED` | Modificación de datos |
| `MOVED` | Cambio de coordenadas |
| `STATUS_CHANGED` | Cambio de estado |
| `RELATION_ADDED` | Nueva relación topológica |
| `RELATION_REMOVED` | Relación eliminada |
| `RESTORED` | Restauración a versión anterior |

---

## 2. Estrategia de Auditoría

### Principio

Toda acción sobre el sistema debe quedar registrada con quién, cuándo, qué y desde dónde.

### Eventos Auditables

| Categoría | Eventos |
|-----------|---------|
| **Autenticación** | USER_LOGIN, USER_LOGOUT, LOGIN_FAILED |
| **Municipios** | DEPARTMENT_CREATED, MUNICIPALITY_CREATED, PROJECT_CREATED |
| **Activos** | ASSET_CREATED, ASSET_UPDATED, ASSET_MOVED, ASSET_DELETED, ASSET_RESTORED |
| **Importación** | IMPORT_STARTED, IMPORT_COMPLETED, IMPORT_FAILED |
| **Validación** | VALIDATION_APPROVED, VALIDATION_CORRECTED, VALIDATION_REJECTED, VALIDATION_MERGED |
| **Relaciones** | RELATIONSHIP_CREATED, RELATIONSHIP_DELETED |
| **Usuarios** | USER_CREATED, USER_ROLE_CHANGED, USER_DEACTIVATED |

### Consultas de Auditoría

```typescript
interface AuditQuery {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}
```

---

## 3. Sistema de Eventos (Event Bus)

### Tecnología

**NestJS EventEmitter2** (integrado con el framework).

### Flujo de Eventos

```
                ┌──────────────────────────────┐
                │         EVENT BUS             │
                │    (EventEmitter2)            │
                └──────────────────────────────┘
                         │        │
        ┌────────────────┼────────┼────────────────┐
        │                │        │                │
        ▼                ▼        ▼                ▼
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│ Dashboard  │   │    Map     │   │   Audit    │   │   Health   │
│ Module     │   │  Module    │   │  Module    │   │  Module    │
└────────────┘   └────────────┘   └────────────┘   └────────────┘
```

### Eventos Definidos

```typescript
const EVENTS = {
  ASSET: {
    CREATED: 'asset.created',
    UPDATED: 'asset.updated',
    MOVED: 'asset.moved',
    DELETED: 'asset.deleted',
    RESTORED: 'asset.restored',
  },
  IMPORT: {
    STARTED: 'import.started',
    COMPLETED: 'import.completed',
    FAILED: 'import.failed',
    PIPELINE_STAGE: 'import.pipeline.stage',
  },
  VALIDATION: {
    APPROVED: 'validation.approved',
    CORRECTED: 'validation.corrected',
    REJECTED: 'validation.rejected',
    MERGED: 'validation.merged',
  },
  RELATIONSHIP: {
    CREATED: 'relationship.created',
    DELETED: 'relationship.deleted',
  },
  HEALTH: {
    RECALCULATED: 'health.recalculated',
    THRESHOLD_BREACHED: 'health.threshold.breached',
  },
};
```

### Ejemplo de Uso

```typescript
// Emitir evento
this.eventEmitter.emit('asset.created', {
  assetId: newAsset.id,
  code: newAsset.code,
  userId: currentUser.id,
  timestamp: new Date(),
});

// Escuchar evento
@OnEvent('asset.created')
handleAssetCreated(payload: any) {
  // Actualizar dashboard
  // Actualizar mapa
  // Registrar auditoría
  // Recalcular health score
}
```

---

## 4. Estrategia Multi-municipio y Expansión

### Aislamiento por Municipio

Cada municipio es una unidad administrativa independiente:

- Los usuarios pueden tener permisos por municipio
- Las importaciones se asocian a un municipio específico
- Las capas del mapa se filtran por municipio
- Las estadísticas del dashboard se agrupan por municipio
- Los bounds geográficos validan coordenadas al importar

### Expansión Geográfica

Para agregar un nuevo municipio:

```sql
-- 1. Crear o usar departamento existente
INSERT INTO departments (name) VALUES ('Antioquia');

-- 2. Crear municipio con bounds opcionales
INSERT INTO municipalities (name, department_id, north_bound, south_bound, east_bound, west_bound)
VALUES ('Medellín', @deptId, 6.35, 6.10, -75.50, -75.65);

-- 3. Opcional: crear proyecto inicial
INSERT INTO projects (name, municipality_id)
VALUES ('Expansión Medellín Norte', @munId);
```

### Escalabilidad Horizontal

- La aplicación NestJS escala horizontalmente (múltiples instancias)
- PostgreSQL con PostGIS maneja millones de geometrías con índices GIST
- El Event Bus puede migrarse a Redis o RabbitMQ en el futuro
- La capa de base de datos puede particionarse por departamento si es necesario

---

## 5. Glosario ADR

| Término | Definición |
|---------|------------|
| **Activo** | Elemento de infraestructura física (caja, mufla, CTO, splitter, poste, nodo) |
| **Topología** | Representación de cómo los activos se conectan entre sí en la red |
| **Pipeline** | Secuencia de etapas que procesa datos desde la importación hasta la persistencia |
| **Health Score** | Indicador compuesto (0-100) que refleja el estado general de un activo |
| **Confidence Score** | Indicador (0-100) de qué tan confiable es la información de un activo |
| **Event Bus** | Sistema de mensajería que desacopla módulos mediante eventos |
| **GIS Editor** | Herramienta en el mapa para crear, mover y editar activos visualmente |
| **Spatial Engine** | Motor de análisis geoespacial (cercanía, cobertura, intersecciones) |
| **Versionado** | Almacenamiento de cada cambio como una nueva versión sin sobrescribir |
