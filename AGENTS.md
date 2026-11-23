# AGENTS.md

## Proyecto
Plataforma web en Next.js para conectar a estudiantes que se hayan encontrado objetos que no les pertenecen (perdidos) con sus dueños. Esta plataforma tiene como objetivo el uso de MongoDB como base de datos, la gestion de la informacion mediante operaciones CRUD y consultas avanzadas con Aggregation Framework.

## Estilo
- Next.js 16+ con App Router y BFF para la seguridad de acceso al cluster de Atlas.
- Turbopack para compilacion del proyecto rapida.
- Identificadores en inglés; mensajes de usuario en español.

## Reglas
- Lee `docs/constitution.md` y la spec activa en `specs/` antes de tocar código.
- No añadas dependencias ni cambies el formato del JSON sin actualizar antes la spec.
- No modifiques archivos dentro de `specs/` salvo petición explícita.


<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
