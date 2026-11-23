# Especificación del MVP — Encuentra Campus

## 1. Contexto y objetivo

### Contexto del problema
En la vida universitaria cotidiana es frecuente que los estudiantes encuentren objetos extraviados (celulares, carnés, llaves, cuadernos, accesorios, dispositivos electrónicos, entre otros) en aulas, pasillos, bibliotecas, cafeterías y demás zonas del campus. Actualmente no existe un canal centralizado, estructurado y confiable para reportar objetos encontrados, facilitar su búsqueda por parte de los dueños y verificar de manera segura la propiedad antes de realizar la entrega. Como resultado, muchos objetos se pierden definitivamente o quedan acumulados sin trazabilidad.

### Objetivo del MVP
Ofrecer una plataforma web centralizada enfocada exclusivamente en **objetos encontrados** dentro del campus universitario, que permita a los estudiantes:
- Publicar objetos hallados con su descripción, ubicación, características y hasta 3 fotografías.
- Indicar si conservan el objeto en custodia personal o si lo entregaron en un punto seguro del campus (como Portería, Bienestar o Biblioteca) para desligar su responsabilidad.
- Conectar con el posible dueño mediante comentarios públicos y un flujo de solicitudes de reclamo con verificación de propiedad (detalle privado y evidencia visual opcional).
- Consultar reportes e indicadores sobre los objetos encontrados y devueltos en el campus para comprender tendencias y efectividad de recuperación.

---

## 2. Usuarios

| Perfil | Descripción | Capacidades principales |
| --- | --- | --- |
| **Visitante (sin sesión)** | Cualquier persona que accede a la plataforma sin haberse autenticado. | Explorar el listado de objetos encontrados, buscar y filtrar publicaciones, ver el detalle público de cada objeto y consultar la sección de reportes del campus. |
| **Estudiante autenticado (Publicante)** | Estudiante registrado que encontró un objeto y crea una publicación. | Crear, editar y eliminar sus publicaciones (según reglas de integridad), gestionar los reclamos recibidos (aprobar/rechazar), actualizar el estado de entrega y comentar. |
| **Estudiante autenticado (Solicitante / Interesado)** | Estudiante registrado que busca un objeto propio o colabora con información. | Comentar en publicaciones abiertas, enviar solicitudes de reclamo con prueba de propiedad y visualizar el medio de contacto del publicante únicamente cuando su reclamo sea aprobado. |

> Un mismo estudiante autenticado puede actuar como publicante en unas publicaciones y como solicitante en otras. No existen roles administrativos ni de moderación en el MVP.

---

## 3. Historias de usuario

- **HU-01 (Acceso):** Como estudiante, quiero registrarme e iniciar sesión con mis datos básicos para poder publicar objetos encontrados, comentar y enviar o gestionar reclamos.
- **HU-02 (Publicar objeto encontrado):** Como estudiante que encontró un objeto, quiero registrar su información, ubicación, etiquetas, modalidad de custodia y hasta 3 fotos para que su dueño pueda identificarlo.
- **HU-03 (Guía de verificación al publicar):** Como estudiante que conserva un objeto encontrado, quiero recibir una recomendación clara de ocultar un detalle único del objeto y definir una pregunta de verificación para confirmar que quien lo reclame sea el verdadero dueño.
- **HU-04 (Entregar en punto seguro):** Como estudiante que prefirió dejar el objeto en Portería, Bienestar o Biblioteca, quiero indicarlo en la publicación para informar dónde reclamarlo y desligar mi responsabilidad.
- **HU-05 (Buscar y consultar):** Como estudiante que perdió un objeto, quiero buscar y filtrar publicaciones por texto, categoría, zona, estado o fecha para encontrar rápidamente si alguien lo halló.
- **HU-06 (Editar y eliminar):** Como publicante, quiero actualizar los datos, etiquetas o imágenes de mi publicación mientras esté abierta, o eliminarla si ya no aplica y no tiene reclamos en curso.
- **HU-07 (Comentar):** Como estudiante autenticado, quiero dejar comentarios públicos en una publicación abierta para hacer preguntas generales o aportar contexto.
- **HU-08 (Reclamar propiedad):** Como dueño de un objeto publicado en custodia personal, quiero enviar una solicitud de reclamo describiendo un detalle privado y adjuntando opcionalmente una imagen de evidencia para demostrar que es mío.
- **HU-09 (Validar y entregar):** Como publicante, quiero revisar los reclamos recibidos, aprobar el del verdadero dueño para compartir mi medio de contacto y marcar el objeto como devuelto al concretar la entrega (o revertirlo a disponible si la entrega falla).
- **HU-10 (Consultar reportes):** Como miembro de la comunidad universitaria, quiero ver reportes consolidados de objetos encontrados y devueltos por categoría, zona, tiempo de devolución y evolución mensual para conocer el comportamiento real del campus.

---

## 4. Requisitos funcionales

### RF-01 — Registro, inicio y cierre de sesión
- **RF-01.1:** CUANDO un visitante envía el formulario de registro con nombre completo, correo electrónico válido no registrado previamente, contraseña, programa o facultad y medio de contacto (teléfono o WhatsApp), el sistema debe crear la cuenta del estudiante e iniciar su sesión.
- **RF-01.2:** SI un visitante intenta registrarse con un correo electrónico ya existente, un formato de correo inválido o campos obligatorios vacíos, ENTONCES el sistema debe rechazar el registro y mostrar un mensaje claro en español indicando el error.
- **RF-01.3:** CUANDO un estudiante registrado ingresa su correo y contraseña válidos, el sistema debe autenticarlo y habilitar las acciones de publicación, comentarios y reclamos.
- **RF-01.4:** SI las credenciales ingresadas son incorrectas, ENTONCES el sistema debe denegar el acceso y mostrar un mensaje de error claro sin revelar si el fallo corresponde al correo o a la contraseña.
- **RF-01.5:** CUANDO un estudiante autenticado solicita cerrar sesión, el sistema debe finalizar su sesión activa y devolverlo a estado de visitante.
- **RF-01.6:** El sistema debe aceptar cualquier correo electrónico con formato válido sin exigir dominio institucional ni verificación por correo.

### RF-02 — Creación de publicaciones de objetos encontrados
- **RF-02.1:** MIENTRAS un usuario esté autenticado, el sistema debe permitirle crear una publicación con: título, descripción general, categoría, zona o bloque del campus, detalle de ubicación (piso/salón o referencia exacta), fecha de hallazgo, etiquetas o características (opcionales), modalidad de custodia y de 0 a 3 imágenes adjuntas.
- **RF-02.2:** El sistema debe ofrecer una lista predeterminada de categorías comunes (Electrónica, Documentos y Carnés, Llaves, Accesorios y Ropa, Libros y Útiles, Morrales y Cartucheras) más la opción **Otra**, la cual habilita un campo de texto libre obligatorio para especificar la categoría.
- **RF-02.3:** El sistema debe ofrecer un catálogo predeterminado de zonas del campus correspondiente a la **Fundación Universitaria Tecnológico Comfenalco — Sede B (Cedesarrollo)** (concebido para ser configurable por sede/universidad en futuras versiones):
  - **Bloque A:** Salones Piso 1 (`A101–A105`), Bienestar Universitario (Piso 1), Biblioteca y salas semillero (Pisos 2–3), Dirección de Programa (Piso 4). *(Sin pisos 5 ni 6).*
  - **Bloque C:** Salones (`C101–C105`, `C301–C605`).
  - **Bloque D:** Salones (`D101–D105`, `D301–D605`) y Baños (en ambos extremos de todos los pisos).
  - **Bloque E:** Laboratorios de cómputo y Sala de sistemas (Pisos 1–3, `E101–E305`, acceso por Piso 1) y Laboratorios (Pisos 4–5, `E401–E505`, acceso por Piso 4).
  - **Bloque F:** Auditorio (Piso 1) y Salones (`F301–F605`).
  - **Zona social y Cafetería (Piso 2):** Cafetería, mesas y áreas comunes del segundo piso.
- **RF-02.4:** DONDE el publicante seleccione la modalidad de custodia personal (`disponible`), el sistema debe mostrar de forma visible una recomendación que indique describir solo lo general y reservar un detalle privado único (como fondo de pantalla, contenido interior, serial o sticker) y permitir registrar una pregunta de verificación opcional.
- **RF-02.5:** DONDE el publicante seleccione que entregó el objeto en un punto seguro del campus, el sistema debe exigir indicar el punto seguro donde lo dejó (por ejemplo, Portería, Bienestar Universitario — Bloque A Piso 1, Biblioteca — Bloque A Piso 2 o Dirección de Programa — Bloque A Piso 4) y registrar la publicación en estado permanente `en_custodia_campus`.
- **RF-02.6:** SI el publicante adjunta más de 3 imágenes, un archivo con formato distinto a `JPG`, `PNG` o `WebP`, o una imagen que supere los 5 MB, ENTONCES el sistema debe impedir el guardado y mostrar un mensaje de error claro.
- **RF-02.7:** SI ocurre un error durante la carga de cualquiera de las imágenes adjuntas, ENTONCES el sistema debe cancelar el guardado de la publicación y mostrar un mensaje claro para permitir reintentar.
- **RF-02.8:** SI un visitante sin sesión intenta crear una publicación, ENTONCES el sistema debe denegar la acción y solicitarle iniciar sesión.

### RF-03 — Exploración, búsqueda, filtrado y detalle de publicaciones
- **RF-03.1:** El sistema debe mostrar a cualquier visitante o estudiante autenticado un listado paginado u organizado de publicaciones de objetos encontrados, ordenadas por defecto de la más reciente a la más antigua.
- **RF-03.2:** CUANDO un usuario aplique búsqueda por texto libre o filtros por categoría, zona del campus, estado, etiquetas o rango de fechas, el sistema debe actualizar el listado mostrando únicamente las publicaciones coincidentes.
- **RF-03.3:** CUANDO un usuario seleccione una publicación, el sistema debe mostrar su detalle completo: información general, ubicación y modalidad de custodia, estado actual, etiquetas, imágenes adjuntas, nombre del publicante y comentarios públicos.
- **RF-03.4:** MIENTRAS una publicación no tenga un reclamo aprobado para el usuario que la consulta, el sistema debe ocultar el medio de contacto privado del publicante.

### RF-04 — Edición de publicaciones
- **RF-04.1:** MIENTRAS una publicación se encuentre en estado `disponible` o `en_custodia_campus`, CUANDO su publicante modifique sus datos generales, ubicación, etiquetas/características (agregar o quitar) o imágenes (agregar sin superar 3 en total o quitar existentes), el sistema debe validar los cambios y guardar la actualización.
- **RF-04.2:** SI un usuario distinto al publicante intenta editar una publicación, ENTONCES el sistema debe rechazar la operación e informar que no tiene permisos.
- **RF-04.3:** MIENTRAS una publicación se encuentre en estado `en_reclamo` o `devuelto`, el sistema debe impedir cualquier edición de sus datos, etiquetas o imágenes.
- **RF-04.4:** SI durante la edición se adjunta una imagen inválida o falla su carga, ENTONCES el sistema debe cancelar la actualización y mantener los datos previos intactos mostrando un mensaje de error claro.

### RF-05 — Eliminación de publicaciones con integridad
- **RF-05.1:** CUANDO el publicante solicite eliminar una publicación que no tenga reclamos pendientes ni aprobados, el sistema debe solicitar confirmación y, al confirmarse, eliminar la publicación junto con sus comentarios, reclamos rechazados e imágenes asociadas.
- **RF-05.2:** SI el publicante intenta eliminar una publicación que tiene al menos un reclamo pendiente o aprobado, ENTONCES el sistema debe impedir la eliminación y mostrar un mensaje claro explicando que existen reclamos activos asociados.
- **RF-05.3:** SI un usuario distinto al publicante intenta eliminar una publicación, ENTONCES el sistema debe rechazar la operación.

### RF-06 — Comentarios públicos
- **RF-06.1:** MIENTRAS una publicación se encuentre en estado `disponible`, `en_custodia_campus` o `en_reclamo`, CUANDO un estudiante autenticado envíe un comentario no vacío, el sistema debe publicarlo mostrando el nombre del autor y la fecha/hora.
- **RF-06.2:** SI un usuario intenta enviar un comentario vacío o compuesto únicamente por espacios, ENTONCES el sistema debe rechazarlo y mostrar un mensaje de validación.
- **RF-06.3:** CUANDO el autor de un comentario solicite eliminarlo, el sistema debe borrarlo de la publicación.
- **RF-06.4:** SI un usuario distinto al autor intenta eliminar un comentario, ENTONCES el sistema debe rechazar la operación.
- **RF-06.5:** MIENTRAS una publicación se encuentre en estado `devuelto`, el sistema debe impedir la creación de nuevos comentarios.

### RF-07 — Solicitudes de reclamo de propiedad
- **RF-07.1:** MIENTRAS una publicación se encuentre en estado `disponible`, CUANDO un estudiante autenticado distinto al publicante envíe una solicitud de reclamo con la descripción del detalle privado (o respuesta a la pregunta de verificación) y opcionalmente 1 imagen de evidencia (`JPG`, `PNG` o `WebP`, máximo 5 MB), el sistema debe registrar el reclamo en estado pendiente.
- **RF-07.2:** SI el publicante intenta enviar un reclamo sobre su propia publicación, ENTONCES el sistema debe impedir la acción y mostrar un mensaje explicativo.
- **RF-07.3:** SI un estudiante que ya tiene un reclamo pendiente sobre una publicación intenta enviar otro reclamo para la misma publicación, ENTONCES el sistema debe rechazarlo informando que ya existe una solicitud en curso.
- **RF-07.4:** MIENTRAS una publicación se encuentre en estado `en_custodia_campus`, `en_reclamo` o `devuelto`, el sistema debe impedir el envío de nuevos reclamos.
- **RF-07.5:** SI la imagen de evidencia del reclamo incumple formato o tamaño (máximo 5 MB) o falla su carga, ENTONCES el sistema debe cancelar el registro del reclamo y mostrar un mensaje de error claro.

### RF-08 — Evaluación de reclamos y cierre de entrega
- **RF-08.1:** CUANDO el publicante consulte los reclamos de su publicación, el sistema debe mostrarle únicamente a él la lista de solicitudes con el nombre del solicitante, su descripción/respuesta, imagen de evidencia (si la adjuntó), fecha y estado del reclamo.
- **RF-08.2:** CUANDO el publicante apruebe un reclamo pendiente, el sistema debe:
  1. Marcar ese reclamo como aprobado.
  2. Cambiar el estado de la publicación de `disponible` a `en_reclamo`.
  3. Rechazar automáticamente todos los demás reclamos pendientes de esa publicación registrando un motivo claro (por ejemplo, *"Se aprobó otro reclamo para esta publicación"*).
  4. Revelar el medio de contacto del publicante únicamente al solicitante cuyo reclamo fue aprobado.
- **RF-08.3:** CUANDO el publicante rechace un reclamo pendiente, el sistema debe marcarlo como rechazado (permitiendo un motivo opcional) y mantener la publicación en estado `disponible`.
- **RF-08.4:** MIENTRAS una publicación se encuentre en estado `en_reclamo`, CUANDO el publicante confirme que el objeto fue entregado físicamente, el sistema debe cambiar el estado a `devuelto` y registrar la fecha y hora de devolución.
- **RF-08.5:** MIENTRAS una publicación se encuentre en estado `en_reclamo`, CUANDO el publicante indique que la entrega no se concretó, el sistema debe revertir la publicación al estado `disponible`, cerrar el reclamo previamente aprobado como cancelado/no concretado y ocultar nuevamente el medio de contacto del publicante.
- **RF-08.6:** MIENTRAS una publicación se encuentre en estado `en_custodia_campus`, el sistema debe mantener dicho estado como cierre permanente en el MVP (sin transición a `en_reclamo` ni a `devuelto`).

### RF-09 — Reportes e indicadores del campus
- **RF-09.1:** El sistema debe ofrecer una sección de **Reportes** accesible desde la navegación principal con los siguientes 4 reportes presentados de forma clara (tablas y/o gráficos):
  1. **Resumen por categoría:** Total de objetos encontrados y total/porcentaje de objetos devueltos agrupados por categoría, con filtro opcional por rango de fechas y estado.
  2. **Top 5 zonas del campus:** Ranking ordenado de mayor a menor de las 5 zonas o bloques del campus con mayor cantidad de objetos encontrados.
  3. **Tiempo promedio de devolución:** Tiempo promedio (en horas o días) transcurrido entre la fecha de hallazgo/publicación y la fecha de devolución de los objetos en estado `devuelto`, agrupado por categoría.
  4. **Evolución mensual:** Cantidad de objetos encontrados frente a objetos devueltos agrupados mes a mes dentro de un rango de fechas seleccionable.
- **RF-09.2:** SI un filtro aplicado en los reportes no arroja registros coincidentes, ENTONCES el sistema debe mostrar un estado vacío informativo sin errores técnicos.

---

## 5. Requisitos no funcionales

- **RNF-01 (Idioma y claridad):** Toda la interfaz de usuario, etiquetas, guías, reportes y mensajes de validación o error deben presentarse en español claro y comprensible para estudiantes universitarios.
- **RNF-02 (Privacidad de datos de contacto):** El medio de contacto del publicante nunca debe exponerse públicamente en listados, detalles ni comentarios; solo debe ser visible para el solicitante con reclamo aprobado mientras la publicación esté `en_reclamo` o `devuelto`.
- **RNF-03 (Seguridad y autorización):** Las contraseñas deben almacenarse de forma protegida (nunca en texto plano). Toda operación de escritura debe verificar autenticación y permisos de propiedad del recurso antes de ejecutarse.
- **RNF-04 (Integridad y consistencia):** Los cambios de estado de publicaciones y reclamos deben mantener consistencia (no puede haber más de un reclamo aprobado simultáneamente por publicación ni publicaciones eliminadas con reclamos activos).
- **RNF-05 (Volumen inicial representativo):** La plataforma debe contar con un conjunto inicial de al menos 1.000 registros representativos del dominio para garantizar que búsquedas, filtros y reportes puedan evaluarse con datos realistas.
- **RNF-06 (Responsividad y rendimiento):** La interfaz debe ser usable en computador y móvil, y las operaciones de listado, búsqueda y consulta de reportes deben responder de forma ágil incluso con el volumen inicial de datos.

---

## 6. Casos límite

| Escenario | Comportamiento esperado |
| --- | --- |
| **Imagen inválida o muy pesada** | Se rechaza antes de guardar (formato distinto a `JPG`/`PNG`/`WebP` o tamaño > 5 MB) y se indica exactamente cuál archivo falló. |
| **Fallo al cargar imagen** | No se crea ni modifica la publicación o el reclamo; se informa el error y el usuario puede reintentar sin perder el resto del formulario. |
| **Más de 3 imágenes al editar** | Si la publicación ya tiene 2 imágenes y el publicante intenta agregar 2 más, el sistema bloquea la acción indicando el límite máximo de 3. |
| **Eliminación con reclamo activo** | Si existe al menos un reclamo pendiente o aprobado, el borrado se bloquea con un mensaje claro; el publicante debe resolver los reclamos primero. |
| **Múltiples reclamos simultáneos** | Al aprobar un reclamo, los demás pendientes pasan automáticamente a rechazados; si dos acciones de aprobación compiten, solo una puede prosperar. |
| **Entrega fallida tras aprobar reclamo** | El publicante revierte la publicación de `en_reclamo` a `disponible`, permitiendo recibir nuevos reclamos y ocultando nuevamente su contacto al solicitante anterior. |
| **Autorreclamo o reclamo duplicado** | El sistema bloquea ambos casos mostrando un mensaje explicativo. |
| **Categoría "Otra" sin especificar** | Si el usuario elige la categoría `Otra` y deja vacío el campo de texto libre, el sistema rechaza el formulario solicitando escribir la categoría. |
| **Edición en estado `en_reclamo` o `devuelto`** | Se deshabilita y rechaza cualquier edición de datos, etiquetas o imágenes mientras la publicación esté `en_reclamo` o `devuelto`. |
| **Acción sobre publicación `devuelto`** | Se deshabilitan y rechazan edición, nuevos comentarios y nuevos reclamos. |
| **Reportes o búsquedas sin datos** | Se muestra un mensaje claro indicando que no hay registros para los criterios seleccionados, sin fallos ni gráficos rotos. |
| **Sin objetos devueltos en una categoría** | En el reporte de tiempo promedio de devolución, solo se promedian objetos efectivamente devueltos (o se muestra "Sin devoluciones" en lugar de errores de división por cero). |

---

## 7. Fuera de alcance (Out of Scope del MVP)

Quedan explícitamente fuera del alcance de esta versión:
- Publicaciones de **"objetos perdidos"** (el MVP cubre únicamente objetos encontrados).
- Roles administrativos, de moderación o cuentas institucionales para Portería, Bienestar o Biblioteca.
- Chat en tiempo real o mensajería interna entre estudiantes.
- Notificaciones automáticas por correo electrónico, WhatsApp, SMS o notificaciones push.
- Verificación de correo electrónico al registrarse y flujo de recuperación/restablecimiento de contraseña.
- Restricción de registro a un dominio de correo institucional o inicio de sesión con proveedores externos (Google, Microsoft, etc.).
- Eliminación o desactivación de cuentas de usuario.

---

## 8. Criterios de finalización (Definition of Done del MVP)

El MVP se considerará completo cuando se verifiquen todos los puntos siguientes:
1. Un estudiante puede registrarse, iniciar sesión y cerrar sesión cumpliendo RF-01.
2. Un estudiante autenticado puede crear, consultar, buscar/filtrar, editar y eliminar publicaciones de objetos encontrados (incluyendo 0 a 3 imágenes, etiquetas y modalidad de custodia) cumpliendo RF-02 a RF-05.
3. Los comentarios públicos funcionan en publicaciones abiertas con eliminación exclusiva por su autor (RF-06).
4. El flujo completo de reclamos (envío con texto y 0–1 imagen de evidencia, aprobación con rechazo automático de pendientes, revelación controlada de contacto, cierre como `devuelto` y reversión a `disponible`) funciona según RF-07 y RF-08.
5. La sección de Reportes muestra los 4 reportes definidos en RF-09 con resultados precisos y filtros operativos sobre un conjunto mínimo de 1.000 documentos representativos.
6. Todos los casos límite y reglas de validación/integridad descritos en las secciones 4, 5 y 6 han sido verificados manualmente sin errores no controlados.
7. Toda la interfaz y mensajes al usuario están en español y no quedan puntos `[NECESITA ACLARACIÓN]` bloqueantes sin resolver.

---

## 9. Dudas abiertas

Sin dudas abiertas bloqueantes para el MVP. Todas las aclaraciones previas (catálogo de categorías con opción `Otra`, mapa de zonas de la Sede B - Cedesarrollo de Tecnológico Comfenalco, bloqueo de edición en `en_reclamo` y cierre permanente de `en_custodia_campus`) quedaron incorporadas en la especificación.
