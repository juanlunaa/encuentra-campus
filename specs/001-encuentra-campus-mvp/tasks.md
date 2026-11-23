# Lista de Tareas del MVP — Encuentra Campus

> **Referencias:** [constitution.md](../../docs/constitution.md) · [spec.md](./spec.md) · [plan.md](./plan.md)  
> Cada tarea está dimensionada para 20–30 minutos, ordenada por dependencias y con criterio verificable.

---

## Fase 1 — Base del proyecto, base de datos e infraestructura

- [ ] **T-01: Inicializar proyecto Next.js 16+ (App Router + Turbopack) en `code/`**
  - **Cubre:** Constitución #1, #3, #6 · `RNF-01`, `RNF-06`
  - **Alcance:** Configurar `package.json` con las dependencias aprobadas (`next`, `react`, `react-dom`, `mongodb`, `@aws-sdk/client-s3`, `zod`, `bcryptjs`, `jose`, `tailwindcss`), `next.config.ts` (imágenes remotas S3/R2), `.gitignore` y `.env.example`.
  - **Hecho cuando:** `npm run dev` levanta sin errores con Turbopack y `.env.example` documenta todas las variables de Atlas, JWT y S3/R2 sin exponer secretos.

- [ ] **T-02: Implementar conexión singleton a MongoDB Atlas y utilidades base (`mongodb.ts`, `errors.ts`, `catalogs.ts`)**
  - **Cubre:** Constitución #3, #4 · `RF-02.2`, `RF-02.3`, `RNF-01`
  - **Alcance:** Crear `src/lib/mongodb.ts`, `src/lib/errors.ts` (errores tipados con HTTP status y mensajes en español) y `src/lib/catalogs.ts` (categorías predeterminadas + `"Otra"` y puntos seguros de referencia de Sede B — Cedesarrollo).
  - **Hecho cuando:** Una prueba rápida de conexión a Atlas responde `ping: { ok: 1 }` usando `MONGODB_URI` desde `.env.local` y los errores de dominio devuelven JSON consistente en español.

- [ ] **T-03: Definir tipos TypeScript del dominio (`src/types/*`)**
  - **Cubre:** `RF-01`–`RF-09`
  - **Alcance:** Crear `user.ts`, `zone.ts`, `found-item.ts`, `claim.ts` y `report.ts` con identificadores en inglés exactamente alineados al modelo de datos de `plan.md`.
  - **Hecho cuando:** `npx tsc --noEmit` pasa sin errores y todos los campos del modelo JSON de `plan.md` están tipados.

- [ ] **T-04: Crear script `scripts/setup-db.ts` con `$jsonSchema` e índices**
  - **Cubre:** Constitución #4, #5 · `RNF-04` · Rúbrica (`$jsonSchema` e índices)
  - **Alcance:** Crear las 4 colecciones (`users`, `campus_zones`, `found_items`, `claims`) con sus validadores `$jsonSchema` en modo estricto y los 8 índices definidos en `plan.md` (incluyendo índice de texto, campos foráneos para `$lookup` e índice parcial único en `claims`).
  - **Hecho cuando:** Al ejecutar `setup-db.ts`, MongoDB Atlas tiene las 4 colecciones con `$jsonSchema` activo (rechaza un documento inválido) y todos los índices creados de forma idempotente.

- [ ] **T-05: Crear script de datos semilla `scripts/seed.ts` (≥ 1.000 documentos de Sede B — Cedesarrollo)**
  - **Cubre:** Constitución #5 · `RF-02.3`, `RNF-05` · Rúbrica (≥ 1.000 docs)
  - **Alcance:** Poblar las 6 zonas reales de Sede B — Cedesarrollo (`Bloque A`, `Bloque C`, `Bloque D`, `Bloque E`, `Bloque F`, `Zona social y Cafetería`), 60 usuarios, 700 `found_items` distribuidos en 12 meses (con ubicaciones reales como `C302`, `E203`, `D503`, comentarios y etiquetas) y 300 `claims` coherentes con los estados.
  - **Hecho cuando:** `seed.ts` ejecuta sin errores de `$jsonSchema` y el conteo total en Atlas supera los 1.000 documentos (1.066 totales) sin duplicados al re-ejecutarlo.

- [ ] **T-06: Implementar módulo de almacenamiento de imágenes S3/R2 (`src/lib/storage.ts`)**
  - **Cubre:** Constitución #3, #4 · `RF-02.6`, `RF-02.7`, `RF-04.4`, `RF-05.1`, `RF-07.5`
  - **Alcance:** Implementar validación de archivos (`JPG`, `PNG`, `WebP`, máximo 5 MB), subida al bucket S3/R2 devolviendo `{ url, key, mimeType, sizeBytes }` y eliminación por `key` (incluyendo helper de rollback si falla una imagen de un lote).
  - **Hecho cuando:** Se puede subir y borrar una imagen de prueba contra el bucket configurado, y cualquier archivo > 5 MB o con MIME inválido es rechazado con mensaje claro en español antes de subirlo.

---

## Fase 2 — Autenticación y sesión (`RF-01`)

- [ ] **T-07: Implementar capa de autenticación en servidor (`auth.ts`, `auth.validator.ts`, `user.repository.ts`, `auth.service.ts`)**
  - **Cubre:** `RF-01.1`–`RF-01.6`, `RNF-03`
  - **Alcance:** Hash/verificación con `bcryptjs`, firma/lectura de cookie `HttpOnly` con `jose`, validación Zod (cualquier correo válido, campos obligatorios) y detección de correo duplicado.
  - **Hecho cuando:** Las funciones de servicio registran un usuario con contraseña hasheada, rechazan correos repetidos y validan sesiones desde la cookie JWT.

- [ ] **T-08: Crear endpoints BFF de autenticación (`/api/auth/register`, `login`, `logout`, `me`)**
  - **Cubre:** `RF-01.1`–`RF-01.6`
  - **Alcance:** Exponer los 4 Route Handlers devolviendo mensajes claros en español y sin revelar si falló el correo o la contraseña en login.
  - **Hecho cuando:** Probando con `curl`/Thunder Client se completa el ciclo registro → `/api/auth/me` autenticado → logout → `/api/auth/me` sin sesión, y el login inválido devuelve `401` genérico.

- [ ] **T-09: Crear layout base, `Navbar`, `/register` y `/login`**
  - **Cubre:** `RF-01.1`–`RF-01.6`, `RNF-01`, `RNF-06`
  - **Alcance:** Implementar barra de navegación global (Explorar, Publicar, Reportes, Iniciar sesión / Cerrar sesión) y formularios de registro e inicio de sesión en español con manejo de errores.
  - **Hecho cuando:** Un estudiante puede registrarse, iniciar sesión y cerrar sesión desde el navegador viendo su nombre en la barra y recibiendo mensajes claros ante errores de validación.

---

## Fase 3 — Publicaciones de objetos encontrados y comentarios (`RF-02` a `RF-06`)

- [ ] **T-10: Implementar consulta de zonas (`zone.repository.ts` y `GET /api/zones`)**
  - **Cubre:** `RF-02.3`, `RF-03.2`
  - **Alcance:** Exponer las zonas activas de `campus_zones` ordenadas para alimentar formularios y filtros.
  - **Hecho cuando:** `GET /api/zones` devuelve las 6 zonas de Sede B — Cedesarrollo con sus pisos y referencias (`landmarks`).

- [ ] **T-11: Implementar repositorio y servicio de publicaciones (`found-item.validator.ts`, `found-item.repository.ts`, `found-item.service.ts`)**
  - **Cubre:** `RF-02`, `RF-03`, `RF-04`, `RF-05`, `RF-06`, `RNF-02`, `RNF-04`
  - **Alcance:** Crear publicación (validando `"Otra"` + `customCategory`, custodia personal vs. punto seguro y 0–3 imágenes con rollback), listar con filtros/búsqueda/paginación, obtener detalle ocultando `contactPhone` salvo reclamo aprobado, editar con `$set`/`$push`/`$pull` bloqueado en `en_reclamo` y `devuelto`, eliminar bloqueando si hay reclamos `pending`/`approved` y limpiando S3/R2, y agregar/quitar comentarios con `$push`/`$pull`.
  - **Hecho cuando:** Todas las operaciones CRUD y reglas de permisos/integridad están implementadas y compilan sin errores de tipos.

- [ ] **T-12: Crear endpoints BFF de publicaciones y comentarios (`/api/items/**`)**
  - **Cubre:** `RF-02`, `RF-03`, `RF-04`, `RF-05`, `RF-06`
  - **Alcance:** Implementar `GET/POST /api/items` (aceptando `multipart/form-data` para fotos), `GET/PATCH/DELETE /api/items/[id]` y `POST/DELETE /api/items/[id]/comments/[commentId]`.
  - **Hecho cuando:** Se verifican vía HTTP: creación con fotos, filtros por texto/categoría/zona/estado/fechas, edición de etiquetas/imágenes, bloqueo de edición en `en_reclamo`/`devuelto`, bloqueo de borrado con reclamo activo y `$push`/`$pull` de comentarios.

- [ ] **T-13: Construir UI de exploración (`/`), filtros y tarjetas (`ItemFilters`, `ItemCard`)**
  - **Cubre:** `RF-03.1`, `RF-03.2`, `RNF-01`, `RNF-06`
  - **Alcance:** Listado paginado ordenado por fecha reciente, búsqueda por texto libre, filtros por categoría, zona de Sede B Cedesarrollo, estado, etiquetas y rango de fechas, más estado vacío claro.
  - **Hecho cuando:** Un visitante sin sesión puede explorar los > 700 objetos semilla, combinar filtros y ver resultados actualizados o mensaje de "Sin resultados" sin errores.

- [ ] **T-14: Construir UI de creación y edición de publicaciones (`/items/new`, `/items/[id]/edit`, `ItemForm`)**
  - **Cubre:** `RF-02.1`–`RF-02.8`, `RF-04.1`–`RF-04.4`
  - **Alcance:** Formulario con selector de categoría + campo condicional `Otra`, selector de zona/piso/salón de Sede B Cedesarrollo, guía visible de detalle privado en custodia personal, selector de punto seguro en `en_custodia_campus`, gestión de etiquetas y carga/eliminación de 0–3 imágenes con previsualización y validación.
  - **Hecho cuando:** Un usuario autenticado crea una publicación en cada modalidad (`disponible` y `en_custodia_campus`), la edita agregando/quitando etiquetas e imágenes, y ve errores claros si supera 3 fotos o 5 MB.

- [ ] **T-15: Construir UI de detalle de publicación, eliminación íntegra y comentarios (`/items/[id]`, `CommentSection`)**
  - **Cubre:** `RF-03.3`, `RF-03.4`, `RF-05.1`–`RF-05.3`, `RF-06.1`–`RF-06.5`
  - **Alcance:** Vista detallada con galería de fotos, badges de estado, datos de ubicación/custodia, botones de editar/eliminar con confirmación (solo publicante) y sección de comentarios públicos con borrado exclusivo del autor.
  - **Hecho cuando:** El detalle nunca expone el teléfono del publicante sin reclamo aprobado, los comentarios se crean y eliminan en vivo, y los botones de edición/comentario se deshabilitan según el estado (`en_reclamo` / `devuelto`).

---

## Fase 4 — Reclamos de propiedad y flujo de entrega (`RF-07`, `RF-08`)

- [ ] **T-16: Implementar repositorio, servicio y endpoints BFF de reclamos (`claim.*`, `/api/items/[id]/claims`, `/api/claims/[claimId]`, `/api/items/[id]/status`)**
  - **Cubre:** `RF-07.1`–`RF-07.5`, `RF-08.1`–`RF-08.6`, `RNF-02`, `RNF-04`
  - **Alcance:** Crear reclamo con 0–1 imagen de evidencia (bloqueando autorreclamo, duplicado pendiente y estados distintos a `disponible`); listar reclamos solo para el publicante; aprobar atómicamente (`status: "disponible" → "en_reclamo"`) rechazando automáticamente los demás pendientes; rechazar reclamo; marcar `devuelto` registrando `returnedAt`; revertir a `disponible` cancelando el reclamo aprobado; mantener `en_custodia_campus` como cierre permanente.
  - **Hecho cuando:** Se verifica el ciclo completo por API: creación con evidencia, bloqueo de duplicado/autorreclamo, aprobación con rechazo automático de otros reclamos, revelación de `contactPhone` solo al aprobado, cierre como `devuelto` y reversión a `disponible`.

- [ ] **T-17: Construir UI de reclamos y cierre de entrega (`ClaimForm`, `ClaimList` integrados en `/items/[id]`)**
  - **Cubre:** `RF-07`, `RF-08`, `RNF-02`
  - **Alcance:** Formulario de solicitud de reclamo (mostrando la pregunta de verificación si existe + 0–1 foto de evidencia) para estudiantes distintos al publicante; panel privado de reclamos para el publicante (aprobar/rechazar con motivo, marcar como `devuelto` o revertir a `disponible`); tarjeta de contacto revelado visible únicamente para el solicitante aprobado.
  - **Hecho cuando:** Con dos cuentas de estudiante se completa de punta a punta: envío de reclamo con evidencia → aprobación → visualización de contacto únicamente para el dueño aprobado → confirmación de entrega (`devuelto`).

---

## Fase 5 — Reportes con Aggregation Framework (`RF-09`) y verificación final

- [ ] **T-18: Implementar los 4 pipelines de agregación (`report.validator.ts`, `report.repository.ts`, `report.service.ts` y `/api/reports/*`)**
  - **Cubre:** Constitución #5 · `RF-09.1`, `RF-09.2` · Rúbrica (≥ 3 agregaciones con `$match`, `$group`, `$sort`, `$lookup`)
  - **Alcance:** Implementar y exponer los 4 endpoints: `/api/reports/by-category`, `/api/reports/top-zones` (con `$lookup` a `campus_zones`), `/api/reports/avg-return-time` (evitando división por cero) y `/api/reports/monthly-trend` (`$dateToString`).
  - **Hecho cuando:** Los 4 endpoints devuelven métricas exactas sobre los ≥ 1.000 documentos semilla y retornan arreglos vacíos limpios cuando un filtro no tiene coincidencias.

- [ ] **T-19: Construir página de reportes (`/reports` y `ReportCharts`)**
  - **Cubre:** `RF-09.1`, `RF-09.2`, `RNF-01`, `RNF-06`
  - **Alcance:** Dashboard en español con filtros de rango de fechas y estado, tablas y gráficos simples (barras CSS/SVG sin librerías pesadas) para los 4 reportes y estados vacíos claros.
  - **Hecho cuando:** Al abrir `/reports` se visualizan los 4 reportes con datos reales de Sede B — Cedesarrollo y los filtros actualizan las vistas sin errores en consola.

- [ ] **T-20: Verificación integral de casos límite, rúbrica y compilación de producción**
  - **Cubre:** Todos los `RF-01`–`RF-09`, `RNF-01`–`RNF-06` y criterios de finalización de `spec.md`
  - **Alcance:** Ejecutar `npm run build` y probar manualmente cada escenario de la tabla de casos límite de `spec.md` (imagen > 5 MB, borrado bloqueado con reclamo activo, edición bloqueada en `en_reclamo`/`devuelto`, autorreclamo, reclamo duplicado, reversión a `disponible`, reportes vacíos, credenciales fuera de git).
  - **Hecho cuando:** `npm run build` finaliza con código `0`, todos los criterios de finalización de `spec.md` pasan y `git status` no expone ningún secreto ni `.env.local`.
