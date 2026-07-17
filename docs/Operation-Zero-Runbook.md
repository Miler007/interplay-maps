# Operation Zero — Runbook

**Municipio:** Fresno, Tolima  
**Código de Lote:** FRESNO-2026-001  
**Responsable:** Equipo Técnico Interplay  
**Fecha inicio:** _______________

---

## Fase 1 — Congelar Datos de Origen

### Checklist

- [ ] Guardar TXT original de WhatsApp como `FRESNO-2026-001-whatsapp.txt`
- [ ] Guardar Excel(s) de inventario como `FRESNO-2026-001-inventario.xlsx`
- [ ] Guardar KML existente como `FRESNO-2026-001-base.kml`
- [ ] Asignar código de lote en el sistema: `FRESNO-2026-001`
- [ ] Registrar archivos fuente en `ImportRecord.sourceFiles`

### Comandos

```bash
# Crear directorio de respaldo
mkdir -p ./datos-fresno/FRESNO-2026-001

# Copiar archivos originales (NUNCA modificar originales)
cp /ruta/original/whatsapp.txt ./datos-fresno/FRESNO-2026-001/
cp /ruta/original/inventario.xlsx ./datos-fresno/FRESNO-2026-001/
cp /ruta/original/ mapa.kml ./datos-fresno/FRESNO-2026-001/
```

**Criterio de salida:** Los 4 items del checklist marcados como completos.

---

## Fase 2 — Primera Importación (Simulación)

### Procedimiento

1. Ingresar a `/import` en Interplay Maps
2. Seleccionar municipio: **Fresno**
3. Cargar archivo WhatsApp
4. Seleccionar **"Solo simular"** (modo simulación)
5. Ejecutar importación

### Registro de Resultados

| Métrica | Valor |
|---------|-------|
| Total mensajes procesados | |
| Activos detectados | |
| Relaciones detectadas | |
| Duplicados encontrados | |
| Coordenadas inválidas | |
| Errores | |
| Confianza promedio | |

### Revisión

- [ ] ¿Los activos detectados coinciden con el inventario conocido?
- [ ] ¿Las relaciones detectadas tienen sentido?
- [ ] ¿Los duplicados son reales o falsos positivos?
- [ ] Aprobar importación desde `/operation-zero`

**Criterio de salida:** Simulación aprobada por el responsable técnico.

---

## Fase 3 — Revisión Técnica

### Participantes

| Nombre | Rol | Fecha |
|--------|-----|-------|
| | Técnico de campo | |
| | Supervisor de red | |
| | Coordinador de operaciones | |

### Preguntas a responder por activo

Para cada activo en el sector piloto (1 mufla, 20-50 cajas):

1. **¿Esta caja realmente existe?** → Confirmar ubicación física
2. **¿La etiqueta/código corresponde?** → Verificar código en campo
3. **¿Las coordenadas son correctas?** → GPS del dispositivo
4. **¿La alimentación (mufla origen) es la esperada?** → Verificar topología
5. **¿Falta algún activo?** → Agregar como NUEVO
6. **¿Hay activos que ya no existen?** → Marcar como RETIRADO

### Herramienta

Usar **Recorrido Técnico** en `/pilot/tour`:

1. Seleccionar municipio **Fresno**
2. Activar GPS del dispositivo
3. El sistema ordena activos pendientes por cercanía
4. Validar uno por uno:
   - ✅ Confirmado — datos correctos
   - ✏️ Corregido — se actualizan datos
   - ➕ Nuevo — activo no registrado
   - ❌ Retirado — ya no existe
   - ⚠️ Requiere revisión — no se pudo verificar

### Registro de Validaciones

| Activo | Acción | GPS | Fotos | Observaciones |
|--------|--------|-----|-------|---------------|
| | | | | |
| | | | | |

**Criterio de salida:** 95%+ de activos del sector validados (VALIDADO o CERTIFICADO).

---

## Fase 4 — Importación Oficial

### Paso a paso

1. **Ejecutar importación definitiva** desde `/operation-zero`
   - Usar los mismos archivos de Fase 1 (nunca modificar originales)
   - La importación tomará los datos ya revisados como oficiales

2. **Crear Baseline v1.0** desde `/operation-zero/baselines`
   - El sistema toma un snapshot completo del municipio
   - Este snapshot será la referencia para futuras comparaciones

3. **Publicar municipio** desde `/pilot/quality/[id]`
   - El sistema verifica qualityScore >= 95%
   - Cambia estado a PUBLICADO

### Verificación Post-Publicación

- [ ] Dashboard ejecutivo muestra Fresno como PUBLICADO
- [ ] Baseline v1.0 aparece como activo
- [ ] Se puede navegar la topología desde `/topology`
- [ ] Se puede ver el árbol de infraestructura
- [ ] La reproducción de red (`/playback`) tiene el primer punto en el tiempo

---

## Informe de Cierre

```bash
# El sistema genera automáticamente:
GET /api/v1/pilot/report/{municipalityId}

# Descargar desde:
/pilot/report/[id]
```

El informe incluye:
- Calidad inicial vs final
- Correcciones realizadas
- Nuevos activos encontrados
- Activos retirados
- Fotografías agregadas
- Tiempo total invertido
- Recomendaciones

---

## Post-Operation Zero

### Indicadores de éxito

| Indicador | Objetivo |
|-----------|----------|
| Activos certificados | >95% |
| Calidad del municipio | >95% |
| Precisión del parser | >90% |
| Tiempo total de validación | <1 semana |
| Falsos duplicados | <5% |

### Próximos municipios

| Municipio | Características | Dificultad estimada |
|-----------|----------------|---------------------|
| Fresno | Piloto inicial, 62 activos | Baja |
| Mariquita | Más activos, otras convenciones | Media |
| Honda | Zona rural, datos menos estructurados | Alta |

### Hoja de ruta sugerida

```
Operation Zero ──→ Fresno (Jul 2026)
                        │
                        ├──→ Segundo municipio (Ago 2026)
                        │       │
                        │       └──→ Validar generalidad
                        │
                        └──→ Decidir siguiente producto:
                             Core | Operations | Intelligence | Mobile | AI
```
