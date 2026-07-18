# Onboarding de un Nuevo Municipio

## Requisitos previos
- [ ] Departamento creado en el sistema
- [ ] Tipo de activo existente (NODO, CAJA, CLIENTE)
- [ ] Proyecto creado para el municipio
- [ ] Capa creada en el mapa

## Paso 1: Importar datos
```
POST /api/v1/import/upload
```
- Archivo: WhatsApp export (.txt) o CSV
- Parámetros: municipalityId, projectId, userId

**O** inserción directa SQL para datos ya procesados:
1. Preparar CSV con formato: code, name, type, total_ports, free_ports, latitude, longitude
2. Ejecutar script de inserción contra Supabase
3. Verificar en GET /api/v1/assets?municipalityId=XXX

## Paso 2: Validar topología
- Ejecutar GET /api/v1/integrity?municipalityId=XXX
- Revisar cajas aisladas y relaciones sugeridas
- Crear relaciones manualmente vía API o SQL

## Paso 3: Certificar activos
- Revisar en /certification
- Validar en campo (corregir coordenadas, tomar fotos)
- Certificar vía API: PUT /api/v1/certification/:assetId/certify

## Paso 4: Generar baseline
```
POST /api/v1/baseline/:municipalityId
```
- Label: "v1.0 - Baseline Inicial"
- Verificar en GET /api/v1/baseline/:municipalityId

## Paso 5: Publicar
- Confirmar calidad > 95%
- Activar municipio en el mapa público
- Notificar al equipo

## Scripts de referencia
- `insertar_cajas.sql` — Plantilla para inserción de cajas
- `insertar_clientes.sql` — Plantilla para inserción de clientes
- `insertar_relaciones.sql` — Plantilla para relaciones
- `cleanup.sql` — Limpieza de datos de prueba
- `asignar_capa.sql` — Asignar activos a capa del mapa
- `baseline_fresno.sql` — Ejemplo de baseline
