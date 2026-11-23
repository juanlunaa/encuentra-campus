# Constitución del Proyecto — Encuentra Campus

1. **Simplicidad del stack:** Usar Next.js 16+ (App Router + Turbopack) con BFF, driver oficial de MongoDB y almacenamiento compatible con S3 (S3/R2) para imágenes; no añadir dependencias sin actualizar antes la spec.
2. **Spec antes que código (SDD):** Toda funcionalidad, formato JSON o pipeline debe aprobarse en `specs/` antes de codificar; `specs/` no se modifica sin petición explícita.
3. **Separación de responsabilidades:** El cliente solo consume el BFF; la lógica de negocio, MongoDB Atlas y el acceso al bucket de imágenes viven exclusivamente en el servidor.
4. **Persistencia íntegra y segura:** Persistir datos en MongoDB Atlas (`$jsonSchema`, índices, integridad en borrados) e imágenes en bucket S3/R2 (solo URL/metadatos en MongoDB); credenciales únicamente en variables de entorno.
5. **Cumplimiento total de la rúbrica:** Garantizar embebidos, referencias `ObjectId`, arrays, CRUD web completo, ≥3 agregaciones (`$match`, `$group`, `$sort`, `$lookup`) y ≥1000 documentos iniciales.
6. **Idioma consistente:** Identificadores de código, rutas y campos de BD en inglés; interfaz, mensajes de usuario y documentación en español.
