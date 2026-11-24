# Especificación — Sección "Mi actividad" (Encuentra Campus)

## 1. Contexto y objetivo

### Contexto del problema
Con la base del MVP de **Encuentra Campus** ya operativa, los estudiantes pueden publicar objetos encontrados, explorar el listado general y enviar o gestionar solicitudes de reclamo desde el detalle de cada publicación. Sin embargo, actualmente no existe un espacio personal centralizado donde cada estudiante pueda consultar y hacer seguimiento a su propia actividad:
- Quienes publican varios objetos encontrados deben recorrer el listado general de toda la comunidad para ubicar sus publicaciones una por una y verificar si han recibido solicitudes de reclamo pendientes.
- Quienes han enviado solicitudes de reclamo no cuentan con una vista dedicada para revisar el estado de sus solicitudes (si siguen pendientes, si fueron aprobadas, si están en proceso de entrega o si fueron rechazadas y por qué motivo).

### Objetivo
Incorporar una sección unificada llamada **"Mi actividad"** que centralice de forma simple y clara el seguimiento personal del estudiante autenticado en dos pestañas:
- **Mis publicaciones:** para localizar rápidamente los objetos que el estudiante ha publicado, ver su estado actual e identificar cuáles tienen solicitudes de reclamo pendientes por revisar.
- **Mis reclamos:** para consultar el historial y estado actual de las solicitudes de reclamo que el estudiante ha enviado, incluyendo el motivo de rechazo cuando exista, y acceder fácilmente al detalle de cada objeto.

Esta funcionalidad complementa el MVP manteniendo todas las acciones de gestión (editar, eliminar, aprobar/rechazar reclamos, ver contacto aprobado y cerrar entregas) dentro del detalle de cada publicación, evitando duplicar complejidad en el listado.

---

## 2. Usuarios

| Perfil | Descripción | Capacidades en esta funcionalidad |
| --- | --- | --- |
| **Visitante (sin sesión)** | Persona que navega en la plataforma sin haberse autenticado. | Ve el acceso a **Mi actividad** en la navegación principal; al ingresar, recibe un aviso claro indicando que debe iniciar sesión o crear una cuenta para consultar su actividad. |
| **Estudiante autenticado (Publicante)** | Estudiante con sesión activa que ha creado una o más publicaciones de objetos encontrados. | Consulta la pestaña **Mis publicaciones**, busca por texto, filtra por estado o por publicaciones con reclamos pendientes, revisa el resumen y contador de reclamos pendientes y navega al detalle para gestionarlos. |
| **Estudiante autenticado (Solicitante)** | Estudiante con sesión activa que ha enviado una o más solicitudes de reclamo sobre objetos encontrados. | Consulta la pestaña **Mis reclamos**, busca por texto, filtra por estado del reclamo, revisa el estado y motivo de rechazo (si aplica) y navega al detalle de la publicación correspondiente. |

> Un mismo estudiante autenticado puede tener registros en ambas pestañas (como publicante y como solicitante) y alternar entre ellas libremente dentro de **Mi actividad**.

---

## 3. Historias de usuario

- **HU-11 (Acceso a Mi actividad):** Como estudiante, quiero acceder a una sección unificada de **Mi actividad** desde la navegación principal para consultar mis publicaciones y mis reclamos sin tener que buscarlos en el listado general.
- **HU-12 (Seguimiento de mis publicaciones):** Como publicante, quiero ver un listado paginado de mis publicaciones con su estado actual y la cantidad de reclamos pendientes que tiene cada una, para identificar rápidamente cuáles requieren mi atención y abrir su detalle.
- **HU-13 (Búsqueda y filtrado de mis publicaciones):** Como publicante con varias publicaciones, quiero buscar por texto y filtrar por estado o por *"Con reclamos pendientes"* para encontrar en segundos la publicación que necesito revisar.
- **HU-14 (Seguimiento de mis reclamos):** Como solicitante, quiero ver un listado paginado de todos los reclamos que he enviado junto con su estado actual, el estado del objeto y el motivo de rechazo (cuando aplique), para saber en qué etapa está cada solicitud y entrar al detalle cuando corresponda.
- **HU-15 (Búsqueda y filtrado de mis reclamos):** Como solicitante con múltiples reclamos, quiero buscar por texto y filtrar por estado del reclamo para ubicar rápidamente una solicitud específica.

---

## 4. Requisitos funcionales

### RF-10 — Acceso y navegación de "Mi actividad"
- **RF-10.1:** El sistema debe mostrar el acceso a **Mi actividad** de forma permanente en la navegación principal, siguiendo el mismo comportamiento de visibilidad que la sección de publicar.
- **RF-10.2:** El acceso a **Mi actividad** en la navegación principal no debe mostrar indicadores numéricos (badges) de elementos pendientes o no leídos.
- **RF-10.3:** SI un visitante sin sesión intenta acceder a **Mi actividad**, ENTONCES el sistema debe mostrar una vista de acceso restringido con un mensaje claro en español explicando que necesita una sesión activa de estudiante y ofrecer las acciones para **Iniciar sesión** y **Crear cuenta** (consistente con el comportamiento de la sección de publicar).
- **RF-10.4:** MIENTRAS el usuario esté autenticado, CUANDO ingrese a **Mi actividad**, el sistema debe presentar dos pestañas claramente diferenciadas: **Mis publicaciones** y **Mis reclamos**, mostrando contadores informativos dentro de la propia sección.

### RF-11 — Pestaña "Mis publicaciones"
- **RF-11.1:** MIENTRAS el estudiante autenticado consulte la pestaña **Mis publicaciones**, el sistema debe mostrar únicamente las publicaciones creadas por ese estudiante, ordenadas por defecto de la más reciente a la más antigua y organizadas con paginación.
- **RF-11.2:** Para cada publicación listada en **Mis publicaciones**, el sistema debe mostrar un resumen con: fotografía principal (o marcador visual si no tiene imágenes), título, categoría, zona del campus, fecha de publicación o hallazgo, estado actual (`disponible`, `en_custodia_campus`, `en_reclamo` o `devuelto`) e indicador claro de la cantidad de reclamos pendientes asociados.
- **RF-11.3:** CUANDO el publicante seleccione una publicación desde **Mis publicaciones**, el sistema debe dirigirlo al detalle de esa publicación para realizar cualquier acción de gestión (revisar/aprobar/rechazar reclamos, editar, eliminar, confirmar entrega o revertir a disponible).
- **RF-11.4:** El listado de **Mis publicaciones** no debe incluir botones de acciones de modificación directa (como editar, eliminar o aprobar/rechazar reclamos en línea); toda gestión permanece centralizada en el detalle de la publicación.

### RF-12 — Búsqueda y filtrado en "Mis publicaciones"
- **RF-12.1:** CUANDO el publicante ingrese texto en el buscador de **Mis publicaciones**, el sistema debe filtrar el listado mostrando únicamente sus publicaciones que coincidan con el término buscado (por ejemplo, en título, descripción, ubicación o etiquetas).
- **RF-12.2:** CUANDO el publicante seleccione un filtro por estado (`disponible`, `en_custodia_campus`, `en_reclamo` o `devuelto`), el sistema debe mostrar únicamente sus publicaciones en ese estado.
- **RF-12.3:** CUANDO el publicante active el filtro rápido **Con reclamos pendientes**, el sistema debe mostrar únicamente sus publicaciones que tengan al menos una solicitud de reclamo en estado `pendiente`.
- **RF-12.4:** El sistema debe permitir combinar el buscador de texto con el filtro de estado y el filtro **Con reclamos pendientes**, reiniciando la paginación a la primera página cada vez que cambien los criterios.
- **RF-12.5:** SI el publicante aún no ha creado ninguna publicación, ENTONCES el sistema debe mostrar un estado vacío amigable invitándolo a publicar un objeto encontrado.
- **RF-12.6:** SI los filtros o el texto de búsqueda en **Mis publicaciones** no arrojan resultados, ENTONCES el sistema debe mostrar un estado vacío informativo con opción para limpiar los filtros aplicados.

### RF-13 — Pestaña "Mis reclamos"
- **RF-13.1:** MIENTRAS el estudiante autenticado consulte la pestaña **Mis reclamos**, el sistema debe mostrar únicamente las solicitudes de reclamo enviadas por ese estudiante, ordenadas por defecto de la más reciente a la más antigua y organizadas con paginación.
- **RF-13.2:** Para cada solicitud listada en **Mis reclamos**, el sistema debe mostrar un resumen con: datos básicos del objeto reclamado (fotografía principal o marcador visual, título, zona y estado actual de la publicación), fecha de envío del reclamo, estado del reclamo (`pendiente`, `aprobado`, `rechazado` o `cancelado` / no concretado) y enlace para abrir el detalle de la publicación.
- **RF-13.3:** DONDE un reclamo se encuentre en estado `rechazado` y cuente con un motivo registrado (escrito por el publicante o generado automáticamente al aprobarse otro reclamo), el sistema debe mostrar dicho motivo de forma clara en la tarjeta del reclamo.
- **RF-13.4:** MIENTRAS un reclamo se encuentre en estado `aprobado`, el sistema debe ocultar el medio de contacto del publicante en el listado de **Mis reclamos**, manteniéndolo visible exclusivamente al ingresar al detalle de la publicación (según las reglas de privacidad del MVP).
- **RF-13.5:** CUANDO el solicitante seleccione un elemento de **Mis reclamos**, el sistema debe dirigirlo al detalle de la publicación asociada.

### RF-14 — Búsqueda y filtrado en "Mis reclamos"
- **RF-14.1:** CUANDO el solicitante ingrese texto en el buscador de **Mis reclamos**, el sistema debe filtrar el listado mostrando únicamente sus reclamos coincidentes (por ejemplo, por título o datos del objeto reclamado).
- **RF-14.2:** CUANDO el solicitante seleccione un filtro por estado del reclamo (`pendiente`, `aprobado`, `rechazado` o `cancelado`), el sistema debe mostrar únicamente sus reclamos en ese estado.
- **RF-14.3:** El sistema debe permitir combinar el buscador de texto con el filtro por estado del reclamo, reiniciando la paginación a la primera página cada vez que cambien los criterios.
- **RF-14.4:** SI el solicitante aún no ha enviado ningún reclamo, ENTONCES el sistema debe mostrar un estado vacío amigable invitándolo a explorar los objetos encontrados.
- **RF-14.5:** SI los filtros o el texto de búsqueda en **Mis reclamos** no arrojan resultados, ENTONCES el sistema debe mostrar un estado vacío informativo con opción para limpiar los filtros aplicados.

### RF-15 — Manejo de errores y consistencia de sesión
- **RF-15.1:** SI ocurre un error al consultar las publicaciones o reclamos del usuario en **Mi actividad**, ENTONCES el sistema debe mostrar un mensaje claro en español con una opción para reintentar, sin presentar fallos técnicos ni dejar la interfaz inutilizable.
- **RF-15.2:** SI la sesión del estudiante expira mientras interactúa con **Mi actividad** (al cambiar de pestaña, filtrar, buscar o paginar), ENTONCES el sistema debe informar que la sesión ha finalizado y presentar el acceso para iniciar sesión nuevamente.

---

## 5. Requisitos no funcionales

- **RNF-01 (Aislamiento y privacidad):** Cada estudiante autenticado solo puede visualizar sus propias publicaciones en **Mis publicaciones** y sus propios reclamos en **Mis reclamos**. Ningún dato privado de otros solicitantes ni el medio de contacto de publicantes debe exponerse en estos listados.
- **RNF-02 (Idioma y coherencia visual):** Toda la sección **Mi actividad**, sus pestañas, etiquetas de estado, filtros, estados vacíos y mensajes de error deben presentarse en español claro y mantener coherencia con los estados y terminología definidos en el MVP.
- **RNF-03 (Rendimiento y paginación):** La consulta, búsqueda y filtrado dentro de **Mi actividad** deben responder de forma ágil incluso cuando el usuario acumule un alto número de publicaciones o reclamos.
- **RNF-04 (Responsividad):** La vista de **Mi actividad**, sus pestañas, barra de búsqueda/filtros y tarjetas de resumen deben adaptarse correctamente tanto a pantallas de computador como a dispositivos móviles.
- **RNF-05 (Consistencia de datos):** Los estados mostrados en **Mi actividad** (estado de la publicación, conteo de reclamos pendientes y estado/motivo de cada reclamo) deben reflejar fielmente la información actualizada tras cualquier cambio realizado en el detalle de una publicación.

---

## 6. Casos límite

| Escenario | Comportamiento esperado |
| --- | --- |
| **Visitante sin sesión accede a "Mi actividad"** | Se muestra la vista de acceso restringido con mensaje claro y botones para **Iniciar sesión** y **Crear cuenta**, sin exponer datos. |
| **Sesión expirada durante la navegación** | Al filtrar, paginar o cambiar de pestaña con sesión vencida, se notifica al usuario y se muestra el acceso para iniciar sesión sin errores no controlados. |
| **Fallo al cargar el listado** | Se muestra un mensaje de error comprensible en español con acción para reintentar la carga. |
| **Usuario sin publicaciones ni reclamos** | Cada pestaña muestra su propio estado vacío amigable con un acceso directo contextual (publicar un objeto o explorar el listado general). |
| **Filtros o búsqueda sin coincidencias** | Se diferencia del estado "sin actividad previa" mostrando un mensaje indicando que no hay coincidencias para los filtros actuales y un botón para limpiarlos. |
| **Combinación de filtros sin resultados posibles** | Si en **Mis publicaciones** se combina **Con reclamos pendientes** con un estado que no admite reclamos pendientes (como `en_custodia_campus`, `en_reclamo` o `devuelto`), se muestra el estado vacío por filtros sin errores. |
| **Cambio de filtro o búsqueda desde página > 1** | La paginación se reinicia automáticamente a la página 1 para evitar mostrar una página vacía fuera de rango. |
| **Publicación sin fotografías adjuntas** | Se muestra un marcador visual limpio y consistente tanto en **Mis publicaciones** como en **Mis reclamos**. |
| **Reclamo rechazado sin motivo escrito** | Se muestra el estado `rechazado` de manera limpia sin mostrar etiquetas vacías ni textos rotos. |
| **Reclamo aprobado cuya entrega falla** | Cuando el publicante revierte la publicación a `disponible`, el reclamo aparece en **Mis reclamos** con estado `cancelado` / no concretado y al abrir el detalle ya no se muestra el contacto del publicante. |
| **Múltiples reclamos históricos del mismo usuario sobre el mismo objeto** | Si un reclamo previo fue rechazado o cancelado y el estudiante envió un nuevo reclamo posteriormente, cada solicitud aparece listada con su propia fecha y estado. |
| **Publicación eliminada por su publicante** | Al cumplirse la regla de integridad del MVP (donde eliminar una publicación también elimina sus reclamos rechazados), no deben quedar elementos rotos ni huérfanos en **Mis reclamos**. |

---

## 7. Fuera de alcance

Quedan explícitamente fuera del alcance de esta especificación:
- Acciones directas o en línea desde los listados de **Mi actividad** (editar, eliminar, aprobar/rechazar reclamos, cambiar estado de entrega o acciones masivas).
- Cancelación o retiro de solicitudes de reclamo pendientes por parte del solicitante.
- Mostrar el medio de contacto del publicante directamente dentro de las tarjetas de **Mis reclamos**.
- Badges, contadores de "no leídos" o sistema de notificaciones en la barra de navegación o por canales externos.
- Edición de datos de perfil o cuenta del estudiante (nombre, programa, medio de contacto o contraseña).
- Historial o listado de comentarios públicos realizados por el estudiante.

---

## 8. Criterios de finalización (Definition of Done)

Esta funcionalidad se considerará completa cuando se verifiquen todos los puntos siguientes:
1. El acceso a **Mi actividad** aparece en la navegación principal sin badge de no leídos y, al entrar sin sesión, presenta la vista de acceso restringido con opciones de inicio de sesión y registro (RF-10).
2. Un estudiante autenticado puede alternar entre **Mis publicaciones** y **Mis reclamos**, visualizando exclusivamente su propia información ordenada de más reciente a más antigua y paginada (RF-11, RF-13).
3. En **Mis publicaciones**, cada publicación muestra su resumen, estado actual, conteo de reclamos pendientes y enlaza al detalle; funcionan el buscador de texto, el filtro por estado y el filtro rápido **Con reclamos pendientes** (RF-11, RF-12).
4. En **Mis reclamos**, cada reclamo muestra el resumen del objeto, fecha, estado del reclamo, motivo de rechazo (cuando exista) y enlaza al detalle sin exponer el medio de contacto del publicante en el listado; funcionan el buscador de texto y el filtro por estado del reclamo (RF-13, RF-14).
5. Los estados vacíos diferenciados (sin registros propios vs. sin coincidencias por filtros), el manejo de errores con reintento y el comportamiento ante sesión expirada han sido verificados (RF-12, RF-14, RF-15).
6. Todos los casos límite de la sección 6 fueron comprobados sin errores no controlados, y toda la interfaz se encuentra en español consistente con el MVP.

---

## 9. Dudas abiertas

Sin dudas abiertas bloqueantes `[NECESITA ACLARACIÓN]`. Todas las decisiones funcionales (sección unificada **Mi actividad**, acciones centralizadas en el detalle, visibilidad del contacto únicamente en el detalle, motivo de rechazo visible en **Mis reclamos**, filtros + buscador + paginación, ausencia de badge en navegación, comportamiento sin sesión consistente con *Publicar* y límites de alcance) quedaron definidas con el solicitante.
