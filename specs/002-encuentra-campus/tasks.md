# Lista de Tareas — Sección "Mi actividad" (Encuentra Campus)

> **Referencias:** [constitution.md](../../docs/constitution.md) · [spec.md](./spec.md) · [plan.md](./plan.md)  
> Cada tarea está dimensionada para 20–30 minutos, ordenada por dependencias, con trazabilidad de RF/RNF y criterio verificable.

---

## Fase 1 — Base de datos, tipos y validadores

- [x] **T-01: Agregar índices compuestos para "Mi actividad" en `scripts/setup-db.ts`**
  - **Cubre:** Constitución #4 · `RF-11.1`, `RF-13.1`, `RNF-03`
  - **Alcance:** Añadir en `indexDefinitions` de `scripts/setup-db.ts` los índices `idx_found_items_publisherId_createdAt` (`{ publisherId: 1, createdAt: -1 }` en `found_items`) e `idx_claims_claimantId_createdAt` (`{ claimantId: 1, createdAt: -1 }` en `claims`).
  - **Hecho cuando:** Al ejecutar `scripts/setup-db.ts`, ambos índices se crean de forma idempotente en MongoDB Atlas sin modificar ni romper los validadores `$jsonSchema` existentes.

- [x] **T-02: Definir contratos y DTOs de "Mi actividad" en `src/types/activity.ts`**
  - **Cubre:** Constitución #6 · `RF-10.4`, `RF-11.2`, `RF-13.2`, `RF-13.3`, `RF-13.4`, `RNF-01`
  - **Alcance:** Crear `src/types/activity.ts` con `ActivityTab`, `ActivityCountsDTO`, `ActivityItemSummaryDTO` (incluyendo `pendingClaimsCount`), `ActivityClaimSummaryDTO` (incluyendo resumen del objeto y `resolutionReason`, sin campos de contacto del publicante), filtros y tipos de respuesta paginada.
  - **Hecho cuando:** `npx tsc --noEmit` pasa sin errores y ningún tipo de `ActivityClaimSummaryDTO` expone `contactPhone` ni datos privados del publicante.

- [x] **T-03: Crear validadores Zod de consulta en `src/validators/activity.validator.ts`**
  - **Cubre:** Constitución #6 · `RF-12.1`–`RF-12.4`, `RF-14.1`–`RF-14.3`, `RNF-02`
  - **Alcance:** Implementar esquemas Zod para los query params de **Mis publicaciones** (`query`, `status`, `hasPendingClaims`, `page`, `limit`) y **Mis reclamos** (`query`, `status`, `page`, `limit`), normalizando espacios, booleanos y límites seguros de paginación con mensajes de validación en español.
  - **Hecho cuando:** `npx tsc --noEmit` pasa sin errores y los esquemas aceptan combinaciones válidas de filtros/búsqueda mientras rechazan estados o páginas inválidas con mensajes claros en español.

---

## Fase 2 — Repositorios, servicio y endpoints BFF

- [x] **T-04: Implementar agregación de "Mis publicaciones" en `src/repositories/found-item.repository.ts`**
  - **Cubre:** Constitución #3, #5 · `RF-10.4`, `RF-11.1`, `RF-11.2`, `RF-12.1`–`RF-12.4`, `RNF-03`, `RNF-05`
  - **Alcance:** Añadir `listByPublisher(publisherId, filters)` usando Aggregation Framework (`$match` por `publisherId`, `status` y búsqueda `$regex` escapada en título/descripción/etiquetas/ubicación; `$lookup` a `claims` filtrando `status: "pending"` para calcular `pendingClaimsCount`; filtro opcional `hasPendingClaims`; `$facet` con orden `{ createdAt: -1 }`, paginación y `$lookup` a `campus_zones`) y `countByPublisher(publisherId)`.
  - **Hecho cuando:** `npx tsc --noEmit` pasa sin errores y la agregación devuelve únicamente publicaciones del `publisherId` indicado, ordenadas de la más reciente a la más antigua, con `pendingClaimsCount` exacto y paginación correcta.

- [x] **T-05: Implementar agregación de "Mis reclamos" en `src/repositories/claim.repository.ts`**
  - **Cubre:** Constitución #3, #5 · `RF-10.4`, `RF-13.1`–`RF-13.4`, `RF-14.1`–`RF-14.3`, `RNF-01`, `RNF-03`, `RNF-05`
  - **Alcance:** Añadir `listByClaimant(claimantId, filters)` usando Aggregation Framework (`$match` por `claimantId` y `status`; `$lookup` a `found_items` proyectando solo datos públicos del objeto sin consultar `users` ni `contactPhone`; `$unwind` para descartar referencias huérfanas; `$lookup` a `campus_zones`; filtro de texto `$regex` escapado; `$facet` con orden `{ createdAt: -1 }` y paginación) y `countByClaimant(claimantId)`.
  - **Hecho cuando:** `npx tsc --noEmit` pasa sin errores y la agregación devuelve únicamente reclamos del `claimantId` con datos del objeto, `resolutionReason` y sin exponer teléfono del publicante.

- [x] **T-06: Implementar servicio de dominio `src/services/activity.service.ts`**
  - **Cubre:** Constitución #3 · `RF-10.4`, `RF-11`–`RF-15`, `RNF-01`, `RNF-05`
  - **Alcance:** Crear `activityService` con `listMyItems(userId, rawQuery)`, `listMyClaims(userId, rawQuery)` y `getActivityCounts(userId)`, validando `rawQuery` con `activity.validator.ts`, convirtiendo `userId` a `ObjectId` y retornando `{ items/claims, pagination, counts }`.
  - **Hecho cuando:** `npx tsc --noEmit` pasa sin errores y todos los métodos fuerzan el aislamiento estricto por el `userId` autenticado.

- [x] **T-07: Crear endpoints BFF `GET /api/activity/items` y `GET /api/activity/claims`**
  - **Cubre:** Constitución #3, #6 · `RF-11`, `RF-12`, `RF-13`, `RF-14`, `RF-15.1`, `RF-15.2`, `RNF-01`
  - **Alcance:** Crear `src/app/api/activity/items/route.ts` y `src/app/api/activity/claims/route.ts` verificando sesión con `authService.getCurrentSessionUser()` (respondiendo `401` con mensaje claro en español si no hay sesión o expiró), delegando a `activityService` y manejando errores con `toErrorResponse`.
  - **Hecho cuando:** Una petición sin cookie a ambos endpoints devuelve `401` en español, y una petición autenticada devuelve `200` con el contrato JSON de `plan.md` (sin `contactPhone` en `/api/activity/claims`).

---

## Fase 3 — Navegación y UI de "Mi actividad"

- [x] **T-08: Agregar enlace "Mi actividad" en `src/components/Navbar.tsx`**
  - **Cubre:** `RF-10.1`, `RF-10.2`, `RF-10.3`, `RNF-02`, `RNF-04`
  - **Alcance:** Añadir `{ href: "/activity", label: "Mi actividad" }` a `NAV_LINKS` (visible siempre en desktop y móvil, igual que *Publicar*) sin ningún badge numérico ni indicador de no leídos.
  - **Hecho cuando:** El enlace **"Mi actividad"** aparece en la barra de navegación (desktop y móvil), resalta como activo en `/activity` y no muestra badges numéricos.

- [x] **T-09: Crear tarjetas resumen `ActivityItemCard.tsx` y `ActivityClaimCard.tsx`**
  - **Cubre:** `RF-11.2`, `RF-11.3`, `RF-11.4`, `RF-13.2`, `RF-13.3`, `RF-13.4`, `RF-13.5`, `RNF-01`, `RNF-02`, `RNF-04`
  - **Alcance:** Crear `src/components/activity/ActivityItemCard.tsx` (foto o placeholder, estado, título, categoría, zona, fecha, indicador de `pendingClaimsCount` y enlace a `/items/[id]` sin botones de edición/borrado/evaluación) y `src/components/activity/ActivityClaimCard.tsx` (foto o placeholder del objeto, título, zona, estado de la publicación, fecha del reclamo, estado del reclamo, motivo de rechazo condicional cuando está `rejected` y tiene texto, y enlace a `/items/[postId]` sin contacto del publicante).
  - **Hecho cuando:** Ambas tarjetas compilan sin errores, manejan correctamente publicaciones sin foto y reclamos rechazados con/sin motivo, y no contienen acciones de modificación en línea ni teléfono del publicante.

- [x] **T-10: Implementar contenedor interactivo `src/components/activity/ActivityClient.tsx`**
  - **Cubre:** `RF-10.4`, `RF-11`–`RF-15`, `RNF-02`, `RNF-04`, `RNF-05`
  - **Alcance:** Crear `src/components/activity/ActivityClient.tsx` con:
    - Pestañas **Mis publicaciones** y **Mis reclamos** con contadores (`totalItems`, `totalClaims`).
    - Buscador de texto, selector de estado por pestaña y filtro rápido **Con reclamos pendientes** (solo en *Mis publicaciones*), reiniciando a página 1 al cambiar criterios y sincronizando query params en la URL.
    - Paginación, estados vacíos diferenciados (sin registros previos con enlace contextual vs. sin coincidencias con botón *Limpiar filtros*).
    - Manejo de error de carga con botón *Reintentar* (`RF-15.1`) y detección de HTTP `401` mostrando aviso de sesión expirada con acceso a iniciar sesión (`RF-15.2`).
  - **Hecho cuando:** Se puede alternar entre pestañas, buscar, filtrar, limpiar filtros y paginar desde la UI consumiendo únicamente `/api/activity/items` y `/api/activity/claims`, con estados vacíos, error reintentable y manejo de `401` funcionando.

- [x] **T-11: Crear página Server Component `src/app/activity/page.tsx`**
  - **Cubre:** `RF-10.3`, `RF-10.4`, `RF-11.1`, `RF-13.1`, `RNF-02`
  - **Alcance:** Crear `src/app/activity/page.tsx` verificando sesión en servidor con `authService.getCurrentSessionUser()`. Si no hay sesión, renderizar la tarjeta centrada **"Inicia sesión para ver tu actividad"** con botones **Iniciar sesión** y **Crear cuenta** (idéntica al patrón de `src/app/items/new/page.tsx`). Si hay sesión, leer `searchParams`, cargar los datos iniciales vía `activityService` y renderizar `ActivityClient`.
  - **Hecho cuando:** Entrar a `/activity` sin sesión muestra la tarjeta de inicio de sesión/registro; entrar con sesión renderiza inmediatamente la pestaña solicitada con datos reales y respeta parámetros iniciales de URL.

---

## Fase 4 — Verificación integral

- [x] **T-12: Verificación de build, tipos y checklist manual de casos límite**
  - **Cubre:** Todos (`RF-10`–`RF-15`, `RNF-01`–`RNF-05` y Sección 6 de `spec.md`)
  - **Alcance:** Ejecutar `npx tsc --noEmit` y `npm run build`; comprobar en navegador (desktop y móvil) los flujos de **Mis publicaciones** y **Mis reclamos**, combinación de filtros sin resultados, reset de paginación desde página > 1, actualización en vivo tras aprobar/rechazar/revertir un reclamo o borrar una publicación en `/items/[id]`, ausencia de `contactPhone` en respuestas de `/api/activity/claims`, error de red con *Reintentar* y sesión expirada (`401`).
  - **Hecho cuando:** `npx tsc --noEmit` y `npm run build` terminan con código 0 y todos los criterios de finalización (Sección 8 de `spec.md`) quedan verificados sin errores en consola ni fallos visuales.
