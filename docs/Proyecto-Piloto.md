# Proyecto Piloto — Interplay Maps

**Estado:** Implementado (a la espera de despliegue con datos reales)  
**Fecha:** 2026-07-16  
**Objetivo:** Validar que Interplay Maps representa fielmente la infraestructura física de Interplay y estandarizar el proceso de incorporación de municipios.

---

## Estructura del Piloto

El piloto se compone de 3 fases, cada una con herramientas específicas en la plataforma.

---

## Fase 1 — Preparación de Datos

### Herramientas disponibles

| Herramienta | Ubicación | Propósito |
|-------------|-----------|-----------|
| Importación WhatsApp | `/import` | Carga de chats reales |
| Importación Excel/CSV | `/import` | Carga de archivos existentes |
| Validación | `/validation` | Revisión y corrección de registros |
| Data Quality Dashboard | `/pilot/quality/:id` | Informe de calidad (ver abajo) |

### Informe de Calidad de Datos

Endpoint: `GET /api/v1/pilot/quality/:municipalityId`

Métricas calculadas automáticamente:

| Métrica | Descripción |
|---------|-------------|
| Total activos | Conteo completo |
| Por estado operativo | ACTIVO, EN_CONSTRUCCION, etc. |
| Por estado de certificación | PENDIENTE, VALIDADO, CERTIFICADO, HISTORICO |
| Por tipo | CAJAS, MUFLAS, etc. |
| Coordenadas inválidas | Null o fuera de rango |
| Huérfanos | Sin relaciones |
| Relaciones incompletas | Conectados solo por un lado |
| Sin fotografías | Assets sin AssetPhoto |
| Cobertura de fotos | % con al menos 1 foto |
| Cobertura de coordenadas | % con lat/lng válidos |
| Cobertura de relaciones | % con al menos 1 relación |
| Cobertura de verificación | % certificados |

---

## Fase 2 — Validación en Campo

### Flujo de Certificación

```
PENDIENTE ──→ VALIDADO ──→ CERTIFICADO
    ↑              │
    └── REQUIERE_REVISION
                       │
                       └──→ PENDIENTE (tras corrección)
```

Cada activo tiene dos estados independientes:

| Estado Operativo | Estado de Certificación | Significado |
|------------------|------------------------|-------------|
| ACTIVO | PENDIENTE | Existe pero no verificado |
| ACTIVO | VALIDADO | Verificado en campo |
| ACTIVO | CERTIFICADO | Validado + aprobado como oficial |
| RETIRADO | HISTORICO | Ya no existe en red |

### Recorrido Técnico (`/pilot/tour`)

Vista diseñada para trabajo en campo:

1. Seleccionar municipio
2. Activar GPS del dispositivo
3. El sistema lista activos pendientes ordenados por cercanía
4. Técnico valida cada activo con:

| Acción | Descripción |
|--------|-------------|
| ✅ Confirmado | Datos correctos, sin cambios |
| ✏️ Corregido | Se actualizaron coordenadas, nombre, etc. |
| ➕ Nuevo | Activo no registrado, se da de alta |
| ❌ Retirado | Activo ya no existe en campo |
| ⚠️ Requiere revisión | No se pudo verificar, pendiente |

Cada validación registra:
- Usuario, fecha/hora
- Ubicación GPS (automática o manual)
- Fotografías
- Observaciones

### Validación Masiva (`POST /api/v1/pilot/bulk`)

Operaciones disponibles:

| Operación | Descripción |
|-----------|-------------|
| `APPROVE` | Aprobar todos los PENDIENTE de un municipio |
| `RECALCULATE_HEALTH` | Recalcular Health Score de todo un municipio |
| `RECALCULATE_CONFIDENCE` | Recalcular Confidence Score |
| `REGENERATE_TOPOLOGY` | Regenerar relaciones topológicas |
| `CERTIFY` | Certificar todos los VALIDADO |
| `PUBLISH` | Publicar municipio (requiere ≥95%) |

---

## Fase 3 — Publicación

### Quality Gate

Un municipio solo puede publicarse cuando:

```
qualityScore >= 95%
```

El quality score se calcula como:

```
coveragePhotos * 0.25 +
coverageCoords * 0.25 +
coverageRelations * 0.20 +
coverageVerified * 0.30
```

### Estados del Municipio

| Estado | Descripción |
|--------|-------------|
| EN_PREPARACION | Carga inicial de datos |
| EN_VALIDACION | Técnicos validando en campo |
| EN_CERTIFICACION | Supervisores certificando |
| PUBLICADO | Versión oficial de la red |
| HISTORICO | Versión anterior (tras actualización) |

---

## Informe de Cierre del Piloto

Endpoint: `GET /api/v1/pilot/report/:municipalityId`

Genera automáticamente:

```
Municipio: Fresno
Departamento: Tolima
Período: 2026-07-01 → 2026-07-16

Resumen:
  Activos totales:          62
  Calidad inicial:         42%
  Calidad final:           96%
  Correcciones realizadas: 28
  Nuevos activos:           3
  Activos retirados:        1
  Fotografías agregadas:   45
  Relaciones verificadas:  38
  Tiempo total:            24 horas

Recomendaciones:
  1. Completar fotografías de Caja B.0.5
  2. Verificar relación Mufla Norte → Caja B.0.3
  3. Programar certificación de Mariquita
```

---

## Resumen de Implementación

### Schema (nuevos modelos)

| Modelo | Propósito |
|--------|-----------|
| `VerificationRecord` | Cada acción de validación en campo |
| `MunicipalityPilot` | Estado del piloto por municipio |
| `CertificationStatus` | Enum: PENDIENTE, VALIDADO, CERTIFICADO, HISTORICO |
| `VerificationAction` | Enum: CONFIRMADO, CORREGIDO, NUEVO, RETIRADO, REQ_REVISION |
| `PilotStatus` | Enum: EN_PREPARACION, EN_VALIDACION, EN_CERTIFICACION, PUBLICADO, HISTORICO |

### Backend (2 módulos, 6 archivos)

| Módulo | Archivos | Funcionalidad |
|--------|----------|---------------|
| `certification/` | 3 | Validar, certificar, rechazar, historial |
| `pilot/` | 3 | Calidad, bulk, publicar, reporte, tour |

### Frontend (4 páginas)

| Ruta | Archivo | Funcionalidad |
|------|---------|---------------|
| `/pilot` | `pilot/page.tsx` | Panel general del piloto |
| `/pilot/quality/:id` | `pilot/quality/[id]/page.tsx` | Quality dashboard técnico |
| `/pilot/tour` | `pilot/tour/page.tsx` | Recorrido técnico |
| `/pilot/report/:id` | `pilot/report/[id]/page.tsx` | Informe de cierre |

### Compilación

```
packages/shared: 0 errors
apps/backend:    0 errors (26 módulos)
apps/frontend:   0 errors (20 páginas)
Tests:          273 passed (229 shared + 44 backend)
```

---

## Próximos Pasos

1. **Desplegar** en un entorno con PostgreSQL
2. **Importar datos reales** de Fresno (municipio piloto sugerido: 1 mufla, 20-50 cajas)
3. **Ejecutar** el Data Quality Dashboard para establecer línea base
4. **Capacitar** al equipo técnico en el Recorrido Técnico
5. **Validar** en campo sector por sector
6. **Publicar** al alcanzar 95% de calidad
7. **Repetir** el proceso para los siguientes municipios

El objetivo final no es solo tener un municipio cargado, sino un **proceso repetible** para incorporar cualquier municipio futuro con el mismo nivel de calidad.
