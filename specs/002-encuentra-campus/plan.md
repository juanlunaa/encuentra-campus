# Plan Técnico — Sección "Mi actividad" (Encuentra Campus)

> **Referencias:** [constitution.md](../../docs/constitution.md) · [spec.md](./spec.md) · [MVP plan.md](../001-encuentra-campus-mvp/plan.md)  
> **Principio rector:** Next.js 16+ (App Router + Turbopack) como BFF, driver oficial `mongodb` contra MongoDB Atlas, **cero dependencias nuevas** (Constitución #1), lógica de negocio y consultas exclusivamente en servidor (Constitución #3), identificadores/rutas/campos de BD en inglés e interfaz/mensajes en español (Constitución #6).

---

## 1. Arquitectura y flujo de capas

La nueva sección **"Mi actividad"** (`/activity`) reutiliza exactamente la misma arquitectura en capas del MVP, sin introducir librerías adicionales ni exponer consultas de base de datos al cliente:

```text
Cliente (App Router UI — /activity)
   │  Navegación inicial SSR (valida sesión) + fetch HTTP JSON al BFF al filtrar/buscar/paginar/cambiar pestaña
   ▼
BFF — Route Handlers (src/app/api/activity/**)       ← Verifica sesión (JWT HttpOnly), valida query params (Zod) y mapea errores HTTP
   ▼
Servicio de dominio (src/services/activity.service.ts) ← Orquesta consultas por usuario autenticado, reglas de aislamiento y privacidad
   ▼
Repositorios (found-item.repository.ts, claim.repository.ts) ← Pipelines de Aggregation Framework ($match, $lookup, $sort, $facet)
   ▼
MongoDB Atlas (colecciones existentes found_items, claims, campus_zones + 2 nuevos índices compuestos)
```

### Dependencias (Constitución #1)
- **Ninguna dependencia nueva.** Se reutilizan `next`, `react`, `mongodb`, `zod`, `jose` y `tailwindcss` ya declarados en `package.json`.

---

## 2. Carpetas, módulos y archivos a crear o modificar

### Carpetas / módulos nuevos
- `src/app/activity/` — Página App Router de la sección **"Mi actividad"** (`RF-10`, `RF-11`, `RF-13`, `RF-15`).
- `src/app/api/activity/` — Namespace BFF dedicado a las consultas personales del estudiante autenticado (`RF-11`–`RF-15`), con subcarpetas:
  - `src/app/api/activity/items/`
  - `src/app/api/activity/claims/`
- `src/components/activity/` — Componentes modulares de la UI de **Mi actividad** para no sobrecargar `src/components/` (`RF-10`–`RF-15`).

### Árbol de cambios (con trazabilidad de RF)

```text
encuentra-campus/
├── scripts/
│   └── setup-db.ts                                  [MODIFY] 2 nuevos índices compuestos [RF-11, RF-13, RNF-03]
└── src/
    ├── types/
    │   └── activity.ts                              [NEW]    DTOs, filtros y respuestas paginadas de Mi actividad [RF-11..RF-14]
    ├── validators/
    │   └── activity.validator.ts                    [NEW]    Esquemas Zod de query params para ambas pestañas [RF-12, RF-14]
    ├── repositories/
    │   ├── found-item.repository.ts                 [MODIFY] Agregación listByPublisher + conteo de reclamos pendientes [RF-11, RF-12]
    │   └── claim.repository.ts                      [MODIFY] Agregación listByClaimant con $lookup a found_items y zonas [RF-13, RF-14]
    ├── services/
    │   └── activity.service.ts                      [NEW]    Lógica de negocio de Mi actividad, aislamiento y resumen de totales [RF-10..RF-15]
    ├── app/
    │   ├── activity/
    │   │   └── page.tsx                             [NEW]    Server Component: puerta de sesión (patrón /items/new) + carga inicial [RF-10, RF-11, RF-13]
    │   └── api/
    │       └── activity/
    │           ├── items/
    │           │   └── route.ts                     [NEW]    GET /api/activity/items (Mis publicaciones) [RF-11, RF-12, RF-15]
    │           └── claims/
    │               └── route.ts                     [NEW]    GET /api/activity/claims (Mis reclamos) [RF-13, RF-14, RF-15]
    └── components/
        ├── Navbar.tsx                               [MODIFY] Agregar enlace "Mi actividad" (/activity) sin badge [RF-10]
        └── activity/
            ├── ActivityClient.tsx                   [NEW]    Contenedor interactivo: pestañas, contadores, filtros, búsqueda, paginación y manejo de 401/errores [RF-10..RF-15]
            ├── ActivityItemCard.tsx                 [NEW]    Tarjeta resumen para "Mis publicaciones" con conteo de reclamos pendientes [RF-11]
            └── ActivityClaimCard.tsx                [NEW]    Tarjeta resumen para "Mis reclamos" con estado y motivo de rechazo (sin contacto) [RF-13]
```

### Detalle de archivos a modificar y crear

| Archivo | Acción | Responsabilidad | RF / RNF cubiertos |
| --- | --- | --- | --- |
| `scripts/setup-db.ts` | `[MODIFY]` | Agregar índices `idx_found_items_publisherId_createdAt` en `found_items` e `idx_claims_claimantId_createdAt` en `claims` de forma idempotente. | `RF-11.1`, `RF-13.1`, `RNF-03` |
| `src/types/activity.ts` | `[NEW]` | Definir `ActivityTab`, `ActivityItemSummaryDTO` (extiende resumen con `pendingClaimsCount`), `ActivityClaimSummaryDTO` (incluye resumen de objeto, estado y `resolutionReason`, sin teléfono del publicante), `ActivityCountsDTO`, `ActivityItemsFilters`, `ActivityClaimsFilters` y respuestas paginadas. | `RF-10.4`, `RF-11.2`, `RF-13.2`, `RF-13.3`, `RF-13.4`, `RNF-01` |
| `src/validators/activity.validator.ts` | `[NEW]` | Validar con Zod los parámetros `query`, `status`, `hasPendingClaims`, `page` y `limit` para `GET /api/activity/items`, y `query`, `status`, `page`, `limit` para `GET /api/activity/claims`, con mensajes de error en español. | `RF-12.1`–`RF-12.4`, `RF-14.1`–`RF-14.3`, `RNF-02` |
| `src/repositories/found-item.repository.ts` | `[MODIFY]` | Añadir `listByPublisher(publisherId, filters)` (pipeline con `$match`, `$lookup` a `claims` filtrando `status: "pending"`, filtro opcional `hasPendingClaims`, `$sort: { createdAt: -1 }`, `$facet` para paginación y `$lookup` a `campus_zones`) y `countByPublisher(publisherId)` para el contador de la pestaña. | `RF-10.4`, `RF-11.1`, `RF-11.2`, `RF-12.1`–`RF-12.4`, `RNF-03`, `RNF-05` |
| `src/repositories/claim.repository.ts` | `[MODIFY]` | Añadir `listByClaimant(claimantId, filters)` (pipeline con `$match`, `$lookup` a `found_items` proyectando solo datos públicos del objeto sin contacto, `$lookup` a `campus_zones`, filtro de texto sobre objeto/reclamo, `$sort: { createdAt: -1 }`, `$facet` para paginación) y `countByClaimant(claimantId)`. | `RF-10.4`, `RF-13.1`–`RF-13.4`, `RF-14.1`–`RF-14.3`, `RNF-01`, `RNF-03`, `RNF-05` |
| `src/services/activity.service.ts` | `[NEW]` | Orquestar `listMyItems(userId, rawQuery)`, `listMyClaims(userId, rawQuery)` y `getActivityCounts(userId)`; validar entrada con `activity.validator.ts` y garantizar que siempre se consulte estrictamente por `userId` de la sesión. | `RF-10.4`, `RF-11`–`RF-15`, `RNF-01`, `RNF-05` |
| `src/app/api/activity/items/route.ts` | `[NEW]` | Endpoint `GET /api/activity/items`: exige sesión activa (`401` si no existe o expiró), delega a `activityService.listMyItems` y retorna JSON con `items`, `pagination` y `counts`. | `RF-11`, `RF-12`, `RF-15.1`, `RF-15.2`, `RNF-01` |
| `src/app/api/activity/claims/route.ts` | `[NEW]` | Endpoint `GET /api/activity/claims`: exige sesión activa (`401` si no existe o expiró), delega a `activityService.listMyClaims` y retorna JSON con `claims`, `pagination` y `counts`. | `RF-13`, `RF-14`, `RF-15.1`, `RF-15.2`, `RNF-01` |
| `src/components/Navbar.tsx` | `[MODIFY]` | Agregar `{ href: "/activity", label: "Mi actividad" }` a `NAV_LINKS` (desktop y móvil), sin badge numérico. Al cerrar sesión, `router.refresh()` re-evaluará `/activity` mostrando la tarjeta de acceso restringido. | `RF-10.1`, `RF-10.2`, `RF-10.3` |
| `src/app/activity/page.tsx` | `[NEW]` | Server Component: verifica sesión con `authService.getCurrentSessionUser()`. Si `!user`, renderiza tarjeta centrada **"Inicia sesión para ver tu actividad"** con botones **Iniciar sesión** y **Crear cuenta** (idéntico al patrón de `src/app/items/new/page.tsx`). Si está autenticado, lee `searchParams` iniciales, carga los datos iniciales de la pestaña activa + contadores y monta `ActivityClient`. | `RF-10.3`, `RF-10.4`, `RF-11.1`, `RF-13.1` |
| `src/components/activity/ActivityClient.tsx` | `[NEW]` | Gestiona pestañas (**Mis publicaciones** / **Mis reclamos**) con contadores, buscador de texto con debounce/envío, selector de estado, toggle **"Con reclamos pendientes"** (solo en *Mis publicaciones*), paginación (reseteando a página 1 al cambiar criterios), sincronización de URL, estados vacíos diferenciados (sin actividad vs. sin coincidencias con botón *Limpiar filtros*), banner de error con botón *Reintentar* y detección de `401` (sesión expirada). | `RF-10.4`, `RF-11`–`RF-15`, `RNF-02`, `RNF-04` |
| `src/components/activity/ActivityItemCard.tsx` | `[NEW]` | Tarjeta resumen de solo lectura que enlaza a `/items/[id]`: muestra portada o placeholder, estado, título, categoría, zona, fecha y pastilla con cantidad de reclamos pendientes (cuando `pendingClaimsCount > 0` o indicando `0 pendientes`). Sin botones de edición/borrado/evaluación. | `RF-11.2`, `RF-11.3`, `RF-11.4`, `RNF-02`, `RNF-04` |
| `src/components/activity/ActivityClaimCard.tsx` | `[NEW]` | Tarjeta resumen de solo lectura que enlaza a `/items/[postId]`: muestra portada o placeholder del objeto, título, zona, estado de la publicación, fecha del reclamo, estado del reclamo (`Pendiente`, `Aprobado`, `Rechazado`, `Cancelado`) y bloque condicional con `resolutionReason` cuando el estado es `rejected` y el motivo no es vacío. Nunca muestra teléfono del publicante. | `RF-13.2`, `RF-13.3`, `RF-13.4`, `RF-13.5`, `RNF-01`, `RNF-02`, `RNF-04` |

---

## 3. Modelo de datos, índices y contratos BFF

### 3.1 Colecciones y `$jsonSchema` (sin cambios destructivos)
Las colecciones existentes en MongoDB Atlas (`users`, `campus_zones`, `found_items`, `claims`) ya contienen todas las referencias (`publisherId`, `postId`, `claimantId`, `zoneId`) y campos (`status`, `resolutionReason`, `createdAt`, `images`, `location`, `tags`) necesarios para cubrir `RF-10`–`RF-15`. **No se requiere modificar ningún `$jsonSchema` ni migrar documentos existentes.**

### 3.2 Nuevos índices en `scripts/setup-db.ts` (`RF-11.1`, `RF-13.1`, `RNF-03`)
Para garantizar respuestas ágiles cuando un estudiante acumule muchas publicaciones o reclamos y ordenar por defecto del más reciente al más antiguo:

```ts
{
  collection: COLLECTIONS.foundItems,
  spec: { publisherId: 1, createdAt: -1 },
  options: { name: "idx_found_items_publisherId_createdAt" },
},
{
  collection: COLLECTIONS.claims,
  spec: { claimantId: 1, createdAt: -1 },
  options: { name: "idx_claims_claimantId_createdAt" },
},
```

> El índice existente `idx_claims_postId_status` (`{ postId: 1, status: 1 }`) ya optimiza el `$lookup` que cuenta los reclamos `pending` por publicación en **Mis publicaciones**.

### 3.3 Pipelines de Aggregation Framework

1. **`foundItemRepository.listByPublisher(publisherId, filters)` (`RF-11`, `RF-12`):**
   - `$match`: `{ publisherId }` + `status` opcional + búsqueda `$or` con `$regex` escapado (case-insensitive) en `title`, `description`, `tags`, `location.roomOrDetail`, `location.floor` y `customCategory`.
   - `$lookup` hacia `claims` usando `let: { itemId: "$_id" }` con sub-pipeline `[{ $match: { $expr: { $and: [{ $eq: ["$postId", "$$itemId"] }, { $eq: ["$status", "pending"] }] } } }, { $count: "count" }]` para calcular `pendingClaimsCount`.
   - `$addFields`: `pendingClaimsCount: { $ifNull: [{ $arrayElemAt: ["$_pendingClaims.count", 0] }, 0] }`.
   - Si `hasPendingClaims === true`: `$match: { pendingClaimsCount: { $gt: 0 } }`.
   - `$facet`:
     - `metadata`: `[{ $count: "total" }]`
     - `data`: `[{ $sort: { createdAt: -1 } }, { $skip }, { $limit }, { $lookup` a `campus_zones` `}, { $project` limpiando auxiliares `}]`.

2. **`claimRepository.listByClaimant(claimantId, filters)` (`RF-13`, `RF-14`, `RNF-01`):**
   - `$match`: `{ claimantId }` + `status` opcional (`pending | approved | rejected | cancelled`).
   - `$lookup` hacia `found_items` (`localField: "postId"`, `foreignField: "_id"`) proyectando **únicamente** `_id`, `title`, `category`, `customCategory`, `status`, `zoneId`, `location`, `images` (nunca se consulta `users` ni `contactPhone`, garantizando `RF-13.4` y `RNF-01` desde el repositorio).
   - `$unwind: "$_item"` (garantiza que no aparezcan reclamos huérfanos si una publicación fue eliminada).
   - `$lookup` hacia `campus_zones` para obtener `zoneCode` y `zoneName` del objeto.
   - Si `query` está presente: `$match` con `$regex` escapado (case-insensitive) sobre `_item.title`, `_item.location.roomOrDetail`, `_zone.name` o `verificationAnswer`.
   - `$facet`:
     - `metadata`: `[{ $count: "total" }]`
     - `data`: `[{ $sort: { createdAt: -1 } }, { $skip }, { $limit }, { $project` con forma limpia para `ActivityClaimSummaryDTO` `}]`.

### 3.4 Ejemplos de contratos JSON del BFF

#### Ejemplo 1 — `GET /api/activity/items?status=disponible&hasPendingClaims=true&query=llaves&page=1&limit=10` (`RF-11`, `RF-12`)
```json
{
  "items": [
    {
      "id": "67421a9f8c1d4b0012a4e101",
      "title": "Llaves con llavero azul de motocicleta",
      "category": "Llaves",
      "customCategory": null,
      "status": "disponible",
      "zoneId": "674200018c1d4b0012a4e001",
      "zoneCode": "BLOQUE_A",
      "zoneName": "Bloque A",
      "location": {
        "floor": "Piso 2",
        "roomOrDetail": "Biblioteca, mesa junto a ventana"
      },
      "coverImage": {
        "url": "https://cdn.example.com/items/67421a9f/1.webp",
        "key": "items/67421a9f/1.webp",
        "mimeType": "image/webp",
        "sizeBytes": 184320
      },
      "imagesCount": 2,
      "pendingClaimsCount": 2,
      "foundAt": "2026-11-22T15:30:00.000Z",
      "createdAt": "2026-11-22T16:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "counts": {
    "totalItems": 8,
    "totalClaims": 3
  }
}
```

#### Ejemplo 2 — `GET /api/activity/claims?status=rejected&page=1&limit=10` (`RF-13`, `RF-14`, `RNF-01`)
```json
{
  "claims": [
    {
      "id": "67425b108c1d4b0012a4e250",
      "postId": "67421a9f8c1d4b0012a4e109",
      "status": "rejected",
      "resolutionReason": "Se aprobó otro reclamo para esta publicación.",
      "createdAt": "2026-11-21T19:15:00.000Z",
      "resolvedAt": "2026-11-22T10:05:00.000Z",
      "item": {
        "id": "67421a9f8c1d4b0012a4e109",
        "title": "Audífonos inalámbricos negros",
        "category": "Electrónica",
        "customCategory": null,
        "status": "en_reclamo",
        "zoneCode": "ZONA_SOCIAL",
        "zoneName": "Zona social y Cafetería",
        "coverImage": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "counts": {
    "totalItems": 8,
    "totalClaims": 3
  }
}
```
> **Nota de privacidad (`RF-13.4`, `RNF-01`):** Ningún campo de contacto (`contactPhone`, `email`) existe en `ActivityClaimSummaryDTO`; para ver el contacto en un reclamo `approved`, el estudiante debe navegar a `/items/[postId]`, donde ya aplica la validación de `foundItemService.getDetail`.

---

## 4. Decisiones técnicas justificadas (y alternativas descartadas)

| # | Decisión tomada | Justificación | Alternativa descartada | RF / Constitución |
| --- | --- | --- | --- | --- |
| **D1** | Crear endpoints BFF dedicados `GET /api/activity/items` y `GET /api/activity/claims` | Mantiene contratos claros, privados (exigen sesión `401`), con proyección y agregación específicas (`pendingClaimsCount`, datos del objeto en reclamos) sin ensuciar los endpoints públicos existentes. | Sobrecargar `GET /api/items?mine=true` y crear un `GET /api/claims` genérico, lo que mezclaría lógica pública y privada y complicaría validaciones y proyecciones. | `RF-11`–`RF-15`, Const. #3 |
| **D2** | Calcular `pendingClaimsCount` en tiempo de consulta mediante `$lookup` aprovechando `idx_claims_postId_status` | Garantiza consistencia absoluta (`RNF-05`) sin riesgo de desincronización al aprobar, rechazar, crear o revertir reclamos; evita modificar `$jsonSchema` de `found_items` ni tocar los flujos de escritura existentes. | Guardar un contador desnormalizado `pendingClaimsCount` en `found_items` y mantenerlo manualmente en cada operación de `claim.service.ts` (propenso a drift y requiere cambiar `$jsonSchema` y `seed.ts`). | `RF-11.2`, `RF-12.3`, `RNF-05`, Const. #4 |
| **D3** | Usar búsqueda `$regex` escapado (case-insensitive) dentro del subconjunto ya filtrado por `publisherId` o `claimantId` | Permite coincidencias parciales (por ejemplo, `"llav"` o `"A102"`), busca también en `location.roomOrDetail` y funciona tras `$lookup` en **Mis reclamos** (donde `$text` de MongoDB no puede ejecutarse sobre documentos unidos). Como el `$match` inicial acota por usuario con índice, el conjunto es pequeño y rápido. | Usar índice `$text` global de `found_items`: no soporta búsquedas parciales, no cubre `location.roomOrDetail` y no se puede usar en el pipeline de `claims` después del `$lookup`. | `RF-12.1`, `RF-14.1`, `RNF-03` |
| **D4** | Dos endpoints separados (uno por pestaña) que devuelven también `counts: { totalItems, totalClaims }` | Al cambiar filtros o paginar en una pestaña solo se consulta la colección necesaria, manteniendo los contadores de ambas pestañas siempre actualizados y precisos. | Un único endpoint monolítico `GET /api/activity` que ejecute ambas paginaciones en cada interacción (duplica trabajo innecesario en MongoDB). | `RF-10.4`, `RNF-03`, `RNF-05` |
| **D5** | Sincronizar pestaña activa, búsqueda, filtros y página en la URL (`/activity?tab=claims&status=pending&page=1`) | Permite compartir/recargar la vista sin perder el contexto y garantiza que al volver desde `/items/[id]` el usuario conserve su pestaña y filtros; además permite SSR limpio en `page.tsx`. | Guardar todo únicamente en estado local React (`useState`), perdiendo pestaña y filtros al recargar o regresar desde el detalle. | `RF-10.4`, `RF-11.3`, `RF-13.5` |
| **D6** | Agregar índices compuestos `{ publisherId: 1, createdAt: -1 }` y `{ claimantId: 1, createdAt: -1 }` en `scripts/setup-db.ts` | Evita *collection scans* y ordenamientos en memoria sobre `found_items` y `claims` (≥1.000 documentos), manteniendo el patrón idempotente del proyecto. | No agregar índices y depender de escaneo completo de colecciones (degrada rendimiento al crecer los datos). | `RF-11.1`, `RF-13.1`, `RNF-03`, Const. #4 |
| **D7** | Detectar respuestas HTTP `401` en `ActivityClient` para mostrar aviso de sesión expirada con acciones de inicio de sesión | Cumple `RF-15.2` de forma limpia cuando expira la cookie JWT mientras el usuario filtra o pagina, sin romper el estado de la interfaz ni mostrar errores genéricos. | Mostrar un error genérico `"Error al cargar"` o forzar un `window.location.reload()` abrupto sin explicar al estudiante que su sesión expiró. | `RF-15.2`, `RNF-02` |
| **D8** | Reutilizar tarjetas dedicadas `ActivityItemCard` y `ActivityClaimCard` en lugar de modificar `ItemCard` | `ItemCard` está optimizado para el feed público (autor, comentarios, etiquetas completas); las tarjetas de **Mi actividad** priorizan el seguimiento rápido (estado, contador de reclamos pendientes o motivo de rechazo) sin alterar el feed público. | Añadir múltiples props condicionales a `ItemCard.tsx`, aumentando acoplamiento y riesgo de regresiones en `/`. | `RF-11.2`, `RF-11.4`, `RF-13.2` |

---

## 5. Matriz de trazabilidad (Cobertura de RF y RNF)

| Requisito | Cobertura en el plan |
| --- | --- |
| **RF-10.1, RF-10.2** | `Navbar.tsx` agrega enlace permanente **"Mi actividad"** (`/activity`) sin badge numérico. |
| **RF-10.3** | `src/app/activity/page.tsx` muestra tarjeta de acceso restringido con **Iniciar sesión** y **Crear cuenta** cuando no hay sesión. |
| **RF-10.4** | `ActivityClient.tsx` + `activityService.getActivityCounts` muestran pestañas **Mis publicaciones** y **Mis reclamos** con contadores internos. |
| **RF-11.1–RF-11.4** | `found-item.repository.ts` (`listByPublisher`), `GET /api/activity/items`, `ActivityClient.tsx` y `ActivityItemCard.tsx` (resumen, estado, `pendingClaimsCount`, enlace a `/items/[id]`, sin botones de acción en línea). |
| **RF-12.1–RF-12.6** | `activity.validator.ts`, `found-item.repository.ts` (`query`, `status`, `hasPendingClaims`, reset a página 1) y `ActivityClient.tsx` (estados vacíos diferenciados con enlace a `/items/new` o botón *Limpiar filtros*). |
| **RF-13.1–RF-13.5** | `claim.repository.ts` (`listByClaimant`), `GET /api/activity/claims`, `ActivityClient.tsx` y `ActivityClaimCard.tsx` (resumen del objeto, estado, `resolutionReason` condicional, sin teléfono del publicante, enlace a `/items/[postId]`). |
| **RF-14.1–RF-14.5** | `activity.validator.ts`, `claim.repository.ts` (`query`, `status`, reset a página 1) y `ActivityClient.tsx` (estados vacíos diferenciados con enlace a `/` o botón *Limpiar filtros*). |
| **RF-15.1, RF-15.2** | Route Handlers (`/api/activity/*`) devuelven errores estructurados en español y `401` sin sesión; `ActivityClient.tsx` muestra mensaje de error con botón *Reintentar* y vista de sesión expirada ante `401`. |
| **RNF-01–RNF-05** | Aislamiento por `userId` de sesión en servidor, proyección sin `contactPhone`, UI 100% en español, nuevos índices compuestos en `setup-db.ts`, diseño responsivo Tailwind y conteos calculados en vivo. |

---

## 6. Estrategia de verificación (para la fase de implementación)

1. **Base de datos:** Ejecutar `scripts/setup-db.ts` y verificar creación idempotente de `idx_found_items_publisherId_createdAt` e `idx_claims_claimantId_createdAt`.
2. **Tipado y compilación:** Ejecutar verificación TypeScript (`npx tsc --noEmit`) y build de producción (`npm run build`).
3. **Pruebas manuales de casos clave y límite:**
   - Acceso sin sesión a `/activity` (muestra tarjeta igual a `/items/new`) y respuesta `401` directa en `/api/activity/items` y `/api/activity/claims`.
   - Pestaña **Mis publicaciones**: paginación, búsqueda de texto, filtro por estado, filtro *"Con reclamos pendientes"*, combinación sin resultados, reset a página 1 y navegación a `/items/[id]`.
   - Pestaña **Mis reclamos**: visualización de estados (`pendiente`, `aprobado`, `rechazado`, `cancelado`), motivo de rechazo (con y sin texto), verificación en Network/UI de ausencia de `contactPhone`, búsqueda de texto y filtro por estado.
   - Consistencia tras aprobar/rechazar/revertir un reclamo o eliminar una publicación desde `/items/[id]` y regresar a `/activity`.
   - Simulación de sesión expirada (`401`) y fallo de red en cliente (botón *Reintentar*).
