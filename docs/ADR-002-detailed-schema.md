# ADR-002: Esquema Detallado de Base de Datos

**Estado:** Aprobado  
**Contexto:** Especificación completa de tablas PostgreSQL + PostGIS para Interplay Maps.

---

## Tablas del Sistema

### `departments`

```sql
CREATE TABLE departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `municipalities`

```sql
CREATE TABLE municipalities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    north_bound     DOUBLE PRECISION,
    south_bound     DOUBLE PRECISION,
    east_bound      DOUBLE PRECISION,
    west_bound      DOUBLE PRECISION,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, department_id)
);
CREATE INDEX idx_municipalities_department ON municipalities(department_id);
```

### `projects`

```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, municipality_id)
);
CREATE INDEX idx_projects_municipality ON projects(municipality_id);
```

### `asset_types`

```sql
CREATE TABLE asset_types (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(20) NOT NULL UNIQUE,   -- MUFLAS, CAJAS, CTO, SPLITTERS, POSTES, NODOS, CAMARAS, EQUIPOS
    name        VARCHAR(100) NOT NULL,
    prefix      VARCHAR(5) NOT NULL,           -- MUF, CAJ, CTO, SPL, POS, NOD, CAM, EQP
    icon        VARCHAR(50),
    geometry_type VARCHAR(20) DEFAULT 'POINT',  -- POINT, LINESTRING, POLYGON
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO asset_types (code, name, prefix, icon, geometry_type) VALUES
    ('MUFLAS', 'Muflas', 'MUF', 'mufla', 'POINT'),
    ('CAJAS', 'Cajas', 'CAJ', 'caja', 'POINT'),
    ('CTO', 'CTO', 'CTO', 'cto', 'POINT'),
    ('SPLITTERS', 'Splitters', 'SPL', 'splitter', 'POINT'),
    ('POSTES', 'Postes', 'POS', 'poste', 'POINT'),
    ('NODOS', 'Nodos', 'NOD', 'nodo', 'POINT'),
    ('CAMARAS', 'Cámaras', 'CAM', 'camara', 'POINT'),
    ('EQUIPOS', 'Equipos', 'EQP', 'equipo', 'POINT');
```

### `geometries` (PostGIS)

```sql
CREATE TABLE geometries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id    UUID NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
    geom        GEOMETRY(GeometryZ, 4326) NOT NULL,  -- Point, LineString, Polygon, MultiPolygon
    srid        INTEGER DEFAULT 4326,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_geometries_asset ON geometries(asset_id);
CREATE INDEX idx_geometries_geom_gist ON geometries USING GIST (geom);
```

### `assets` (nueva versión)

```sql
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(20) NOT NULL UNIQUE,   -- MUF-000001, CAJ-000001
    name            VARCHAR(200) NOT NULL,
    asset_type_id   UUID NOT NULL REFERENCES asset_types(id),
    department_id   UUID NOT NULL REFERENCES departments(id),
    municipality_id UUID NOT NULL REFERENCES municipalities(id),
    project_id      UUID REFERENCES projects(id),
    latitude        DOUBLE PRECISION,              -- Mantener por compatibilidad con queries simples
    longitude       DOUBLE PRECISION,              -- Mantener por compatibilidad con queries simples
    status          asset_status DEFAULT 'ACTIVO',
    observations    TEXT,
    current_version INTEGER DEFAULT 1,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_assets_type ON assets(asset_type_id);
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_assets_municipality ON assets(municipality_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_coords ON assets(latitude, longitude);
```

### `asset_relationships` (Topología de Red)

```sql
CREATE TABLE asset_relationships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    target_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    relation_type   VARCHAR(50) NOT NULL,  -- FEEDS, DROP, CONNECTS_TO, SPLITS_FROM
    description     TEXT,                   -- Texto original: "Drop desde caja 3.4"
    metadata        JSONB,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_asset_id, target_asset_id, relation_type)
);
CREATE INDEX idx_asset_rels_source ON asset_relationships(source_asset_id);
CREATE INDEX idx_asset_rels_target ON asset_relationships(target_asset_id);
```

### `asset_versions`

```sql
CREATE TABLE asset_versions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL,
    snapshot    JSONB NOT NULL,           -- Estado completo del activo en esa versión
    changes     JSONB,                    -- Solo los campos que cambiaron
    changed_by  UUID REFERENCES users(id),
    change_type VARCHAR(50),              -- CREATED, UPDATED, MOVED, STATUS_CHANGED
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_id, version)
);
CREATE INDEX idx_asset_versions_asset ON asset_versions(asset_id);
```

### `asset_photos`

```sql
CREATE TABLE asset_photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    original_url    TEXT NOT NULL,
    thumbnail_url   TEXT NOT NULL,
    gps_latitude    DOUBLE PRECISION,
    gps_longitude   DOUBLE PRECISION,
    taken_at        TIMESTAMP WITH TIME ZONE,
    uploaded_by     UUID REFERENCES users(id),
    observations    TEXT,
    metadata        JSONB,               -- EXIF, dimensions, camera info
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_asset_photos_asset ON asset_photos(asset_id);
```

### `asset_health`

```sql
CREATE TABLE asset_health (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    connectivity    INTEGER DEFAULT 0,    -- 0-100
    photos          INTEGER DEFAULT 0,    -- 0-100
    data_quality    INTEGER DEFAULT 0,    -- 0-100
    location        INTEGER DEFAULT 0,    -- 0-100
    relationships   INTEGER DEFAULT 0,    -- 0-100
    overall_score   INTEGER DEFAULT 0,    -- Promedio ponderado
    calculated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_id, calculated_at)
);
CREATE INDEX idx_asset_health_asset ON asset_health(asset_id);
```

### `asset_confidence`

```sql
CREATE TABLE asset_confidence (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    score           INTEGER NOT NULL DEFAULT 0,  -- 0-100
    valid_coords    BOOLEAN DEFAULT FALSE,
    name_identified BOOLEAN DEFAULT FALSE,
    no_duplicates   BOOLEAN DEFAULT FALSE,
    has_photo       BOOLEAN DEFAULT FALSE,
    reviewed_by_admin BOOLEAN DEFAULT FALSE,
    calculated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_asset_confidence_asset ON asset_confidence(asset_id);
```

### `imports`

```sql
CREATE TABLE imports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          import_source NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    department_id   UUID NOT NULL REFERENCES departments(id),
    municipality_id UUID NOT NULL REFERENCES municipalities(id),
    project_id      UUID REFERENCES projects(id),
    asset_type_id   UUID REFERENCES asset_types(id),
    observations    TEXT,
    total_records   INTEGER DEFAULT 0,
    valid_records   INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    pending_review  INTEGER DEFAULT 0,
    imported_by     UUID REFERENCES users(id),
    raw_preview     TEXT,                 -- Primitivas líneas del archivo original
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_imports_municipality ON imports(municipality_id);
```

### `import_logs`

```sql
CREATE TABLE import_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id   UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
    stage       VARCHAR(50) NOT NULL,     -- PARSER, NORMALIZER, VALIDATOR, etc.
    level       log_level DEFAULT 'INFO', -- INFO, WARN, ERROR
    message     TEXT NOT NULL,
    details     JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_import_logs_import ON import_logs(import_id);
```

### `validation_queue`

```sql
CREATE TABLE validation_queue (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_data             JSONB NOT NULL,
    suggested_name       VARCHAR(200),
    suggested_latitude   DOUBLE PRECISION,
    suggested_longitude  DOUBLE PRECISION,
    reason               VARCHAR(255) NOT NULL,
    status               validation_status DEFAULT 'PENDIENTE',
    reviewed_by          UUID REFERENCES users(id),
    reviewed_at          TIMESTAMP WITH TIME ZONE,
    notes                TEXT,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_validation_status ON validation_queue(status);
```

### `layers`

```sql
CREATE TABLE layers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(50) NOT NULL UNIQUE,   -- INFRAESTRUCTURA, CLIENTES, COBERTURA, etc.
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    icon        VARCHAR(50),
    is_active   BOOLEAN DEFAULT TRUE,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO layers (code, name, sort_order) VALUES
    ('INFRAESTRUCTURA', 'Infraestructura', 1),
    ('CLIENTES', 'Clientes', 2),
    ('COBERTURA', 'Cobertura', 3),
    ('PROYECTOS', 'Proyectos', 4),
    ('MANTENIMIENTO', 'Mantenimiento', 5),
    ('INCIDENCIAS', 'Incidencias', 6),
    ('FOTOGRAFIAS', 'Fotografías', 7),
    ('TOPOLOGIA', 'Topología', 8);
```

### `layer_assets`

```sql
CREATE TABLE layer_assets (
    layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (layer_id, asset_id)
);
```

### `attachments`

```sql
CREATE TABLE attachments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,         -- PHOTO, PDF, PLAN, DOCUMENT
    filename    VARCHAR(255) NOT NULL,
    url         TEXT NOT NULL,
    mime_type   VARCHAR(100),
    size_bytes  BIGINT,
    metadata    JSONB,
    uploaded_by UUID REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_attachments_asset ON attachments(asset_id);
```

### `audit_logs`

```sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action      VARCHAR(100) NOT NULL,       -- ASSET_CREATED, ASSET_UPDATED, IMPORT_COMPLETED, etc.
    entity_type VARCHAR(50) NOT NULL,        -- ASSET, IMPORT, USER, MUNICIPALITY
    entity_id   UUID,
    user_id     UUID REFERENCES users(id),
    details     JSONB DEFAULT '{}',
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

### `users`

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    role          user_role DEFAULT 'VISUALIZADOR',
    avatar_url    TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Enums

```sql
CREATE TYPE asset_status AS ENUM ('ACTIVO', 'INACTIVO', 'EN_REVISION', 'DADO_BAJA');
CREATE TYPE user_role AS ENUM ('ADMIN', 'SUPERVISOR', 'VISUALIZADOR');
CREATE TYPE import_source AS ENUM ('WHATSAPP', 'EXCEL', 'CSV', 'KML', 'GPX', 'JSON');
CREATE TYPE validation_status AS ENUM ('PENDIENTE', 'APROBADO', 'CORREGIDO', 'FUSIONADO', 'RECHAZADO');
CREATE TYPE log_level AS ENUM ('INFO', 'WARN', 'ERROR');
```

---

### `attribute_definitions` (Plugin: atributos dinámicos por tipo de activo)

```sql
CREATE TABLE attribute_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_type_id   UUID NOT NULL REFERENCES asset_types(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,          -- puertos, capacidad, bandejas
    name            VARCHAR(100) NOT NULL,          -- Puertos, Capacidad, Bandejas
    field_type      VARCHAR(30) NOT NULL DEFAULT 'TEXT',  -- TEXT, NUMBER, BOOLEAN, SELECT, DATE
    options         JSONB,                          -- Para tipo SELECT: ["1:8","1:16","1:32"]
    is_required     BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER DEFAULT 0,
    unit            VARCHAR(30),                    -- unidades, dBm, km, mm
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_type_id, code)
);
CREATE INDEX idx_attr_defs_type ON attribute_definitions(asset_type_id);

-- Ejemplo: Atributos para Cajas
INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, is_required, sort_order)
SELECT id, 'puertos', 'Puertos', 'NUMBER', 'unidades', TRUE, 1 FROM asset_types WHERE code = 'CAJAS';

INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'potencia', 'Potencia', 'NUMBER', 'dBm', 2 FROM asset_types WHERE code = 'CAJAS';

INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'fibra', 'Fibra', 'TEXT', NULL, 3 FROM asset_types WHERE code = 'CAJAS';

-- Ejemplo: Atributos para Muflas
INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'capacidad', 'Capacidad', 'NUMBER', 'fusiones', 1 FROM asset_types WHERE code = 'MUFLAS';

INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'bandejas', 'Bandejas', 'NUMBER', 'unidades', 2 FROM asset_types WHERE code = 'MUFLAS';

INSERT INTO attribute_definitions (asset_type_id, code, name, field_type, unit, sort_order)
SELECT id, 'fusiones', 'Fusiones', 'NUMBER', 'unidades', 3 FROM asset_types WHERE code = 'MUFLAS';
```

### `asset_attributes` (Valores de atributos dinámicos por activo)

```sql
CREATE TABLE asset_attributes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    definition_id   UUID NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
    value           TEXT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_id, definition_id)
);
CREATE INDEX idx_asset_attrs_asset ON asset_attributes(asset_id);
CREATE INDEX idx_asset_attrs_def ON asset_attributes(definition_id);
```

### `health_score_config` (Health Score configurable por administradores)

```sql
CREATE TABLE health_score_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicator_code  VARCHAR(50) NOT NULL UNIQUE,  -- GPS, PHOTOS, RELATIONSHIPS, DATA, VALIDATION
    name            VARCHAR(100) NOT NULL,
    weight          INTEGER NOT NULL DEFAULT 20,   -- 0-100, todos deben sumar 100
    is_active       BOOLEAN DEFAULT TRUE,
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO health_score_config (indicator_code, name, weight) VALUES
    ('GPS', 'Ubicación GPS', 25),
    ('PHOTOS', 'Fotografías', 15),
    ('RELATIONSHIPS', 'Relaciones', 20),
    ('DATA', 'Calidad de Datos', 25),
    ('VALIDATION', 'Validación', 15);
```

### `confidence_score_config` (Confidence Score configurable)

```sql
CREATE TABLE confidence_score_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factor_code     VARCHAR(50) NOT NULL UNIQUE,  -- VALID_COORDS, NAME_IDENTIFIED, NO_DUPLICATES, HAS_PHOTO, REVIEWED
    name            VARCHAR(100) NOT NULL,
    weight          INTEGER NOT NULL DEFAULT 20,   -- 0-100, todos deben sumar 100
    is_active       BOOLEAN DEFAULT TRUE,
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO confidence_score_config (factor_code, name, weight) VALUES
    ('VALID_COORDS', 'Coordenadas válidas', 30),
    ('NAME_IDENTIFIED', 'Nombre identificado', 25),
    ('NO_DUPLICATES', 'Sin duplicados', 20),
    ('HAS_PHOTO', 'Tiene fotografía', 10),
    ('REVIEWED', 'Revisado por admin', 15);
```

### `sync_queue` (Preparación offline)

```sql
CREATE TABLE sync_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50) NOT NULL,          -- ASSET, MUNICIPALITY, LAYER
    entity_id       UUID NOT NULL,
    action          VARCHAR(20) NOT NULL,           -- CREATED, UPDATED, DELETED
    payload         JSONB NOT NULL,
    status          VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, SYNCED, FAILED
    device_id       VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at       TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_sync_status ON sync_queue(status);
CREATE INDEX idx_sync_device ON sync_queue(device_id);
```

## Resumen de tablas por categoría

| Categoría | Tablas |
|-----------|--------|
| **Core** | departments, municipalities, projects, asset_types, assets |
| **Plugin (atributos dinámicos)** | attribute_definitions, asset_attributes |
| **Spatial** | geometries (PostGIS) |
| **Topología** | asset_relationships |
| **Versionado** | asset_versions |
| **Multimedia** | asset_photos, attachments |
| **Calidad** | asset_health, asset_confidence |
| **Configuración (Health/Confidence)** | health_score_config, confidence_score_config |
| **Importación** | imports, import_logs |
| **Validación** | validation_queue |
| **Capas dinámicas** | layers, layer_assets |
| **Auditoría** | audit_logs |
| **Usuarios** | users |
| **Offline/Sync** | sync_queue |
