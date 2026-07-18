# Interplay Maps — Roadmap de Producto

## Fase 1: Core Platform ✅ *Completada*
- [x] Modelo de datos (31 tablas con PostGIS)
- [x] API REST (NestJS + Prisma + JWT)
- [x] Frontend base (Next.js + Leaflet)
- [x] Pipeline de importación WhatsApp
- [x] Motores de salud y confianza
- [x] Versionado de activos y baseline
- [x] Despliegue automatizado (Render + Cloudflare + GitHub Actions)

## Fase 2: Operation Zero 🔵 *En curso*
- [x] Importación de datos reales de Fresno (146 cajas, 979 clientes, 24 relaciones)
- [x] Baseline v1.0 de Fresno
- [ ] **Auditoría completa del municipio** *(siguiente)*
- [ ] Reconstrucción topológica (sugerencias)
- [ ] Network Integrity (diagnóstico permanente)
- [ ] Trazabilidad de datos (proveniencia)
- [ ] Certificación de activos (Pendiente → Validado → Certificado)
- [ ] Panel de indicadores de calidad
- [ ] Validación en campo del 95%+ de activos
- [ ] Publicación oficial de Fresno como primer municipio certificado

## Fase 3: Operations 🟡 *Próxima*
- Herramientas de mantenimiento en campo
- App móvil offline-first (PWA)
- Órdenes de trabajo y seguimiento
- Historial de mantenimiento por activo
- Reportes operativos para gerencia

## Fase 4: Intelligence 🟠 *Futura*
- Alertas predictivas de capacidad
- Detección automática de anomalías
- Análisis de cobertura y expansión
- Paneles ejecutivos con tendencias
- Recomendaciones de inversión en red

## Fase 5: AI Platform 🔴 *Futura*
- Visión artificial para reconocimiento de cajas y puertos
- Copiloto de red (asistente conversacional)
- Automatización de importación y validación
- Generación automática de topología desde fotos

## Fase 6: Enterprise Scale 🟣 *Futura*
- Multiempresa (organizaciones separadas)
- Alta disponibilidad y replicación geográfica
- Integración con ERPs y sistemas externos
- Marketplace de plugins y extensiones
- APIs públicas para desarrolladores

---

### Principio rector

> ¿Ayuda al equipo técnico a operar mejor la red o ayuda a la gerencia a tomar mejores decisiones?

Si la respuesta es **no**, esa funcionalidad no debe desarrollarse.
