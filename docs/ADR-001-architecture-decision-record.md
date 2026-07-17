# ADR-001: Architecture Decision Record — Interplay Maps v1.0

**Estado:** Aprobado  
**Fecha:** 2026-07-16  
**Decisores:** Arquitecto, Tech Lead, Stakeholders de Interplay  
**Contexto:** Definir la arquitectura base de Interplay Maps antes de iniciar el Sprint 1.

---

## Índice

1. [Diagrama de Arquitectura del Sistema](#1-diagrama-de-arquitectura-del-sistema)
2. [Modelo Entidad-Relación (ERD)](#2-modelo-entidad-relación-erd)
3. [Diagrama de Módulos y Dependencias](#3-diagrama-de-módulos-y-dependencias)
4. [Pipeline Completo de Importación](#4-pipeline-completo-de-importación)
5. [Modelo Topológico](#5-modelo-topológico)
6. [Estrategia de Versionado y Auditoría](#6-estrategia-de-versionado-y-auditoría)
7. [Estrategia Multi-municipio y Expansión Futura](#7-estrategia-multi-municipio-y-expansión-futura)
8. [Documentación Adicional](#8-documentación-adicional)  
9. [Glosario](#9-glosario)

---

## 1. Diagrama de Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERPLAY MAPS                                    │
│                     Sistema Oficial de Gestión FTTH                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   FRONTEND (Next.js)│  │   BACKEND (NestJS)   │  │   EXTERNAL API      │
│                     │  │                     │  │   (Futuro)          │
│  React + TypeScript │◄─┤  API REST / EventBus │◄─┤                     │
│  TailwindCSS        │  │  WebSockets         │  │  - ERP              │
│  React Leaflet      │  │  Swagger Docs       │  │  - OSS              │
└─────────────────────┘  └──────────┬──────────┘  │  - CRM              │
                                    │              └─────────────────────┘
                                    ▼
          ┌─────────────────────────────────────────────────────────┐
          │                 EVENT BUS (EventEmitter2)               │
          │  Desacopla módulos: import → dashboard → map → audit    │
          └─────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   CORE MODULES      │  │   GIS MODULE        │  │   AI MODULE         │
│                     │  │                     │  │   (Futuro)          │
│  Auth               │  │  Map Viewer         │  │                     │
│  Municipalities     │  │  Layers             │  │  Image Recognition  │
│  Projects           │  │  Geometry           │  │  Chat Parsing       │
│  Import Pipeline    │  │  Topology           │  │  Anomaly Detection  │
│  Validation Center  │  │  Spatial Engine     │  │  Route Optimization │
│  Relationship Engine│  │  Geocoder           │  │                     │
│  Health/Confidence  │  │  Measurements       │  │                     │
│  Audit & Versions   │  │  GIS Editor         │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────────┐
          │           POSTGRESQL + POSTGIS                          │
          │                                                         │
          │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
          │  │ Core      │  │ Spatial   │  │ Audit     │           │
          │  │ - assets  │  │ - geo     │  │ - logs    │           │
          │  │ - users   │  │ - topo    │  │ - versions│           │
          │  │ - imports │  │ - bounds  │  │           │           │
          │  └───────────┘  └───────────┘  └───────────┘           │
          └─────────────────────────────────────────────────────────┘
```

### Principios Arquitectónicos

| Principio | Descripción |
|-----------|-------------|
| **Modularidad** | Cada módulo es independiente, testeable y reemplazable |
| **Desacoplamiento** | Comunicación mediante Event Bus, no llamadas directas |
| **Pipeline** | Los datos siempre pasan por todas las etapas antes de persistirse |
| **Inmutabilidad** | Nunca se sobrescriben datos; se crean nuevas versiones |
| **Preparación futura** | Módulos vacíos listos para IA, capas, geometrías complejas |

---

## 2. Modelo Entidad-Relación (ERD)

### Diagrama Conceptual

```
departments ──1:N── municipalities ──1:N── projects

departments ──1:N── assets
municipalities ──1:N── assets
projects ──1:N── assets

assets ──1:N── asset_versions         (historial completo)
assets ──1:N── asset_photos           (fotografías con metadatos)
assets ──1:N── asset_health           (health score histórico)
assets ──1:N── asset_relationships    (topología de red)
assets ──1:N── asset_confidence       (índice de confianza histórico)

assets ──1:1── geometries             (Point, LineString, Polygon, MultiPolygon)

imports ──1:N── import_logs
validation_queue
audit_logs
layers ──N:M── assets                 (un activo en múltiples capas)
attachments                           (PDF, planos, documentos)
users ──1:N── audit_logs
users ──1:N── validation_queue
users ──1:N── imports
```

> **Ver ADR-002** para el esquema detallado de cada tabla con tipos y constraints.

---

## 3. Diagrama de Módulos y Dependencias

### Estructura de Directorios (Backend)

```
apps/backend/src/
├── main.ts
├── app.module.ts
├── prisma/
├── common/                          # Guards, decorators, filters, interceptors
│
├── core/                            # Módulos base del negocio
│   ├── auth/
│   ├── users/
│   ├── municipalities/
│   │   ├── departments/
│   │   └── municipalities/
│   └── projects/
│
├── gis/                             # Módulo GIS completo
│   ├── map/                         # Visualización de mapa
│   ├── layers/                      # Sistema de capas
│   ├── geometry/                    # Point, LineString, Polygon, MultiPolygon
│   ├── topology/                    # Relaciones espaciales entre activos
│   ├── spatial/                     # Spatial Engine (cercanía, buffer, cobertura)
│   ├── geocoder/                    # Geocodificación inversa y directa
│   ├── measurements/                # Cálculos de distancia, área, cobertura
│   └── editor/                      # GIS Editor (mover, crear, editar en mapa)
│
├── assets/                          # CRUD de activos
│   ├── cajas/
│   ├── muflas/
│   ├── ctos/
│   ├── splitters/
│   ├── postes/
│   ├── nodos/
│   └── equipos/
│
├── import/                          # Pipeline de importación
│   ├── parsers/
│   │   ├── whatsapp/
│   │   ├── excel/
│   │   ├── csv/
│   │   ├── kml/
│   │   ├── gpx/
│   │   └── json/
│   ├── normalizers/                 # Limpieza de datos
│   ├── validators/                  # Validación de coordenadas, nombres
│   ├── deduplicator/                # Detección de duplicados
│   ├── relationship-engine/         # Análisis de relaciones textuales
│   ├── processors/                  # Pipeline orchestrator
│   └── confidence-engine/           # Índice de confianza
│
├── validation/                      # Centro de Validación
│
├── relationships/                   # Motor de Relaciones
│   ├── parser/                      # Analiza texto: "Drop desde caja 3.4"
│   ├── graph/                       # Construcción de grafo de red
│   └── analyzer/                    # Análisis topológico de relaciones
│
├── health/                          # Health Score
│   ├── calculators/
│   └── indicators/
│
├── confidence/                      # Confidence Score
│
├── attachments/                     # Archivos adjuntos
│   ├── photos/                      # Fotos con metadatos
│   └── documents/                   # PDF, planos, documentación
│
├── versions/                        # Versionado de activos
│
├── dashboard/                       # Estadísticas y reportes
│
├── audit/                           # Auditoría
│
├── events/                          # Event Bus
│
├── ai/                              # Módulo de IA (estructura preparada)
│   ├── image-recognition/
│   ├── chat-parser/
│   └── anomaly-detection/
│
└── external/                        # Integración con APIs externas
```

---

## 4. Pipeline Completo de Importación

### Flujo

```
Archivo (WhatsApp .txt, Excel .xlsx, CSV, KML, GPX, JSON)
    │
    ▼
┌─────────────────────────────────────────┐
│  1. RECEPCIÓN                           │
│  - Validar formato                      │
│  - Detectar tipo de archivo             │
│  - Extraer metadatos (fecha, usuario)   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. PARSER                              │
│  - WhatsApp: limpiar metadatos, emojis  │
│  - Excel/CSV: mapear columnas           │
│  - KML: extraer Placemarks              │
│  - GPX/JSON: estructura preparada       │
│  Output: Registros normalizados         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  3. NORMALIZER                          │
│  - Unificar mayúsculas/minúsculas       │
│  - Eliminar espacios innecesarios       │
│  - Corregir formato coordenadas         │
│  - Estandarizar nombres                 │
│    "Caja 18" = "CAJA-18" = "Caja18"    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  4. VALIDATOR                           │
│  - Coordenadas válidas (-90 a 90)       │
│  - Coordenadas dentro del municipio     │
│  - Nombre no vacío                      │
│  - Formato correcto                     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  5. RELATIONSHIP ENGINE                 │
│  - Analizar texto en busca de relaciones│
│  - "Drop desde caja 3.4" → relación     │
│  - "Alimentada desde mufla norte"       │
│  - Construir grafo de red               │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  6. DEDUPLICATOR                        │
│  - Buscar duplicados por coordenadas    │
│  - Buscar duplicados por nombre         │
│  - Si hay duda → Validation Queue       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  7. CONFIDENCE ENGINE                   │
│  - Calcular confidence score (0-100)    │
│  - Coordenadas: 30 pts                 │
│  - Nombre identificado: 25 pts          │
│  - Sin duplicados: 20 pts               │
│  - Con foto: 10 pts                     │
│  - Revisado admin: 15 pts               │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  8. REVIEW CENTER (si es necesario)     │
│  - Posible duplicado                    │
│  - Coordenadas fuera del municipio      │
│  - Nombre no reconocido                 │
│  - Registro ambiguo                     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  9. PERSISTENCIA                        │
│  - Guardar en base de datos             │
│  - Crear versión 1                      │
│  - Calcular health score inicial        │
│  - Emitir eventos:                      │
│    → Actualizar Dashboard               │
│    → Actualizar Mapa                    │
│    → Registrar Auditoría                │
│    → Actualizar Health Index            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 10. GIS UPDATE                          │
│  - Actualizar capas del mapa            │
│  - Recalcular topología                 │
│  - Actualizar spatial index             │
└─────────────────────────────────────────┘
```

---

## 8. Documentación Adicional

| Documento | Contenido |
|-----------|-----------|
| **ADR-001** | Este documento: Arquitectura general, ERD conceptual, módulos, pipeline |
| **ADR-002** | Esquema detallado de BD (DDL completo de +20 tablas) |
| **ADR-003** | Motor de Relaciones, modelo topológico, Health Score |
| **ADR-004** | Versionado, Auditoría, Event Bus, estrategia multi-municipio |
| **ADR-005** | Refinements: GIS Engine, GeoJSON, capas dinámicas, plugin asset types, scores configurables, dashboard desacoplado, offline, architecture review |

---

## 9. Glosario

| Término | Definición |
|---------|------------|
| **Activo** | Elemento de infraestructura física (caja, mufla, CTO, splitter, poste, nodo) |
| **Topología** | Representación de cómo los activos se conectan entre sí en la red |
| **Pipeline** | Secuencia de etapas que procesa datos desde la importación hasta la persistencia |
| **Health Score** | Indicador compuesto (0-100) configurable que refleja el estado general de un activo |
| **Confidence Score** | Indicador (0-100) configurable de qué tan confiable es la información |
| **Event Bus** | Sistema de mensajería que desacopla módulos mediante eventos |
| **GIS Engine** | Módulo independiente para lógica geoespacial (buffers, nearest neighbor, clustering) |
| **Plugin Asset Types** | Sistema extensible donde cada tipo de activo define sus propios atributos |
| **GeoJSON** | Formato estándar RFC 7946 para datos geoespaciales |
| **Capas Dinámicas** | Capas del mapa obtenidas desde la BD, no hardcodeadas |
| **Architecture Review** | Validación automática al final de cada sprint (deps, cobertura, estructura) |
| **Regression Suite** | Suite permanente que compara resultados contra baseline para detectar regresiones |

---

## 10. Quality Gate & Testing Infrastructure (Sprint 2.5)

### Testing Stack
- **Framework:** Jest + ts-jest
- **Coverage:** Istanbul (via Jest)
- **Fixture data:** Realistic WhatsApp chat export (`packages/shared/src/__tests__/fixtures/whatsapp-real.ts`)

### Test Locations
| Package | Location |
|---------|----------|
| Pipeline engine | `packages/shared/src/__tests__/*.test.ts` (8 files, 229 tests) |
| Backend services | `apps/backend/src/**/__tests__/*.spec.ts` (4 files, 44 tests) |

### Coverage Targets (per-module)
| Module | Lines | Branches |
|--------|-------|----------|
| `whatsapp-parser.ts` | 95% | 90% |
| `entity-extractor.ts` | 90% | 80% |
| `relationship-detector.ts` | 90% | 75% |
| `filters.ts` | 90% | 85% |
| `utils.ts` | 90% | 80% |

### Regression Suite Permanente
Archivo: `packages/shared/src/__tests__/regression-suite.test.ts`

Define un **baseline** con métricas esperadas del fixture real de WhatsApp. Cada ejecución compara:
- `detectedEntityCount` — no debe disminuir significativamente
- `relationshipFound` — no debe disminuir
- `noiseFiltered` — no debe disminuir
- `confidenceScores` — promedio no debe caer >20%

Cualquier desviación >20% del baseline marca el cambio como posible regresión y bloquea la integración hasta ser revisado.

### Architecture Review (ejecutado al final de cada sprint)
1. ✅ Circular dependencies — `madge --circular` (0 encontradas)
2. ✅ TypeScript compilation — `tsc --noEmit` (0 errores)
3. ✅ Coverage — Jest coverage thresholds
4. ✅ Security — 6 security test cases (XSS, invalid coords, empty, short, special chars, long line)
5. ✅ Performance — 10k messages < 30s (actual: 868ms)
6. ✅ Audit trail — ImportRecord, AssetVersion, ValidationQueue, AuditLog

### Current Test Results (Sprint 2.5)
```
Test Suites: 12 passed, 12 total
Tests:       273 passed, 273 total
Coverage:    Pipeline files 90-100% lines
Performance: 10k msgs en 868ms (target: 30s)
Regressions: 0 (baseline stable across 5 runs)
```
