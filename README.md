# Encuentra Campus

Plataforma web universitaria para conectar a estudiantes que encuentran objetos perdidos dentro del campus con sus dueños. Desarrollada con **Next.js (App Router + BFF)**, **TypeScript** y **MongoDB Atlas** usando el driver oficial de Node.js, validación nativa con `$jsonSchema`, índices optimizados y consultas analíticas con el **Aggregation Framework**.

---

## Stack tecnológico

- **Framework:** Next.js 16+ (App Router, Turbopack, Route Handlers como BFF)
- **Lenguaje y UI:** TypeScript, React 19, Tailwind CSS v4
- **Base de datos:** MongoDB Atlas (`mongodb` driver oficial, sin ORM)
- **Validación:** Zod (BFF) + `$jsonSchema` (MongoDB)
- **Autenticación:** JWT (`jose`) en cookie `HttpOnly` + hash de contraseñas (`bcryptjs`)
- **Almacenamiento de imágenes:** Bucket compatible con S3 (`@aws-sdk/client-s3` — AWS S3 / Cloudflare R2)

---

## Estructura del repositorio

```text
encuentra-campus/
├── docs/                           # Documentación técnica y de diseño
│   ├── constitution.md             # Reglas y principios del proyecto
│   ├── modelo-datos.md             # Diseño y modelado de datos inicial
│   └── report-queries.md           # Documentación de pipelines de agregación
├── specs/                          # Especificación, plan y tareas (SDD)
│   └── 001-encuentra-campus-mvp/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
├── scripts/                        # Scripts de inicialización y carga de datos
│   ├── setup-db.ts                 # Crea colecciones, $jsonSchema e índices
│   └── seed.ts                     # Carga inicial determinística (>1,000 docs)
├── src/
│   ├── app/                        # Páginas App Router y endpoints BFF (/api/*)
│   ├── components/                 # Componentes de interfaz reutilizables
│   ├── lib/                        # Conexión MongoDB, Auth JWT, S3, catálogos
│   ├── repositories/               # Acceso a datos y pipelines de agregación
│   ├── services/                   # Lógica de negocio e integridad referencial
│   ├── types/                      # Tipos TypeScript de documentos y DTOs
│   └── validators/                 # Esquemas Zod para requests del BFF
├── .env.example                    # Plantilla de variables de entorno
├── .gitignore
├── AGENTS.md
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Requisitos previos

- **Node.js** 22+ (con soporte nativo para `--env-file` y ejecución directa de `.ts` en scripts)
- **Cluster de MongoDB Atlas** (o instancia de MongoDB accesible mediante `MONGODB_URI`)
- **Bucket S3 / Cloudflare R2** (para carga de fotografías de objetos y evidencias)

---

## Instalación y puesta en marcha

1. **Instalar dependencias:**

   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**

   Copia `.env.example` como `.env.local` y completa tus credenciales:

   ```bash
   cp .env.example .env.local
   ```

   Variables requeridas en `.env.local`:
   - `MONGODB_URI` y `MONGODB_DB_NAME`
   - `JWT_SECRET` (cadena aleatoria de mínimo 32 caracteres)
   - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`

3. **Inicializar colecciones, esquemas `$jsonSchema` e índices en MongoDB:**

   ```bash
   npm run db:setup
   ```

4. **Cargar datos iniciales (seed):**

   ```bash
   npm run db:seed
   ```

5. **Ejecutar el servidor de desarrollo:**

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo con Turbopack |
| `npm run build` | Compila la aplicación para producción |
| `npm run start` | Inicia la aplicación compilada en modo producción |
| `npm run typecheck` | Verifica tipos con TypeScript (`tsc --noEmit`) |
| `npm run db:setup` | Crea/actualiza colecciones, validadores `$jsonSchema` e índices |
| `npm run db:seed` | Pobla la base de datos con datos de prueba reproducibles |

---

## Funcionalidades principales

- **Autenticación y sesiones:** Registro, inicio y cierre de sesión con cookies `HttpOnly` (`/api/auth/*`).
- **Gestión de objetos encontrados (CRUD):** Publicación con fotografías y ubicación por zona del campus, búsqueda y filtros combinados, edición (`$set`), comentarios embebidos (`$push` / `$pull`), cambio de estado y eliminación con control de integridad referencial.
- **Reclamos de pertenencia:** Creación de solicitudes con descripción privada/evidencia y resolución por el publicador (`/api/items/[id]/claims`, `/api/claims/[claimId]`).
- **Reportes analíticos (`/reports`):** 4 pipelines de **Aggregation Framework** (`$match`, `$group`, `$sort`, `$lookup`, `$unwind`, `$dateToString`, `$avg`):
  1. Resumen por categoría y tasa de devolución
  2. Top 5 zonas del campus (`$lookup` con `campus_zones`)
  3. Tiempo promedio de devolución
  4. Evolución mensual

---

## Documentación adicional

- [Constitución del proyecto](./docs/constitution.md)
- [Consultas de Aggregation Framework](./docs/report-queries.md)
- [Modelo de datos](./docs/modelo-datos.md)
- [Especificación MVP](./specs/001-encuentra-campus-mvp/spec.md) · [Plan técnico](./specs/001-encuentra-campus-mvp/plan.md) · [Tareas](./specs/001-encuentra-campus-mvp/tasks.md)
