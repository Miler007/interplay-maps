# ADR-003: Motor de Relaciones y Modelo Topológico

**Estado:** Aprobado  
**Contexto:** Definir cómo Interplay Maps modela y descubre relaciones entre activos de red.

---

## 1. Motor de Relaciones (Relationship Engine)

### Propósito

Analizar texto no estructurado (chats de WhatsApp, observaciones, descripciones) para detectar automáticamente relaciones jerárquicas entre activos y construir el grafo de red FTTH.

### Tipos de Relación

| Tipo | Código | Ejemplo |
|------|--------|---------|
| Alimenta | `FEEDS` | "Mufla Norte alimenta caja B.2.6" |
| Drop | `DROP` | "Drop desde caja 3.4" |
| Se conecta a | `CONNECTS_TO` | "Caja 5.2 conectada a splitter 1" |
| Divide desde | `SPLITS_FROM` | "Splitter A divide desde Nodo Central" |
| Pertenece a | `BELONGS_TO` | "Caja B.4.6 pertenece a proyecto Fresno Norte" |

### Patrones de Detección

```typescript
const RELATION_PATTERNS = [
  {
    type: 'FEEDS',
    patterns: [
      /(alimenta|alimentada|alimentado)\s*(?:desde|por|de)?\s*(.+)/i,
      /(.+?)\s*(?:alimenta|da\s*servicio|suministra)\s*(.+)/i,
    ],
  },
  {
    type: 'DROP',
    patterns: [
      /(?:drop|derivación|derivacion)\s*(?:desde|de)?\s*(.+)/i,
      /(.+?)\s*(?:tiene\s*drop|drop\s*a|deriva\s*a)\s*(.+)/i,
    ],
  },
  {
    type: 'CONNECTS_TO',
    patterns: [
      /(?:conecta|conectado|conectada)\s*(?:a|con|desde)?\s*(.+)/i,
      /(.+?)\s*(?:conecta|conectado|conectada)\s*(?:a|con)\s*(.+)/i,
    ],
  },
  {
    type: 'SPLITS_FROM',
    patterns: [
      /(?:split|divide|división)\s*(?:desde|de)?\s*(.+)/i,
      /(.+?)\s*(?:divide|split)\s*(?:desde|en)\s*(.+)/i,
    ],
  },
];
```

### Algoritmo

1. Extraer texto de: nombre, observaciones, raw_data de importación
2. Aplicar patrones de detección
3. Si se detecta una relación potencial, buscar ambos activos por nombre/código en la BD
4. Si existe coincidencia → crear relación
5. Si no existe → enviar a Validation Queue
6. Reconstruir grafo completo después de cada importación

---

## 2. Modelo Topológico

### Representación en Grafo

```
                   ┌──────────────┐
                   │  Nodo Central │
                   └──────┬───────┘
                          │ SPLITS_FROM
                          ▼
                   ┌──────────────┐
                   │   Splitter   │
                   └──────┬───────┘
                    ┌─────┼─────┐
                    │     │     │
                    ▼     ▼     ▼
                ┌────┐ ┌────┐ ┌────┐
                │Muf.│ │Muf.│ │Muf.│
                └┬───┘ └┬───┘ └┬───┘
                 │FEEDS │FEEDS │FEEDS
                 ▼      ▼      ▼
              ┌────┐ ┌────┐ ┌────┐
              │Caja│ │Caja│ │Caja│
              └┬───┘ └┬───┘ └┬───┘
               │DROP  │DROP  │DROP
               ▼      ▼      ▼
              ┌────┐ ┌────┐ ┌────┐
              │Caja│ │Caja│ │Caja│
              └────┘ └────┘ └────┘
```

### Servicios Topológicos

```typescript
interface TopologyService {
  // Obtener el subgrafo completo desde un activo
  getSubgraph(assetId: string, depth: number): Graph;

  // Encontrar camino entre dos activos
  findPath(fromAssetId: string, toAssetId: string): Asset[];

  // Detectar activos desconectados (sin relaciones)
  findOrphans(): Asset[];

  // Validar que la topología no tenga ciclos
  validateAcyclic(): boolean;

  // Obtener el árbol de dependencia ascendente
  getUpstream(assetId: string): Asset[];

  // Obtener todos los activos downstream
  getDownstream(assetId: string): Asset[];
}
```

### Visualización Topológica

En el mapa, el módulo `gis/topology/` debe poder:

- Dibujar líneas de conexión entre activos relacionados
- Colorear rutas según estado (activo, degradado, caído)
- Mostrar dirección del flujo (flechas)
- Resaltar camino desde origen hasta destino
- Agrupar por niveles jerárquicos

---

## 3. Health Score

### Fórmula

```
Health Score = (Connectivity × 0.30) + (Photos × 0.10) +
               (DataQuality × 0.20) + (Location × 0.20) +
               (Relationships × 0.20)
```

### Indicadores

| Indicador | Peso | Cálculo |
|-----------|------|---------|
| **Connectivity** | 30% | ¿Tiene relaciones topológicas? ¿Está conectado a la red? |
| **Photos** | 10% | Cantidad y calidad de fotografías asociadas |
| **DataQuality** | 20% | ¿Datos completos? ¿Nombre, código, tipo correctos? |
| **Location** | 20% | ¿Coordenadas precisas? ¿Validadas contra municipio? |
| **Relationships** | 20% | ¿Tiene relaciones definidas con otros activos? |

### Almacenamiento

El health score se calcula periódicamente (cada importación, cada edición) y se almacena en `asset_health` con timestamp, permitiendo ver la evolución histórica.
